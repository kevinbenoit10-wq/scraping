import { Receipt, ReceiptItem, ItemClaim } from '../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const APP_SECRET = process.env.EXPO_PUBLIC_APP_SECRET ?? '';

export async function parseReceiptImage(base64Image: string): Promise<Receipt> {
  const response = await fetch(`${API_URL}/parse-receipt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image, secret: APP_SECRET }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error ?? `Server error ${response.status}`);
  }

  const parsed = await response.json();

  const items: ReceiptItem[] = parsed.items.map(
    (item: Omit<ReceiptItem, 'id'>, index: number) => ({
      id: `item-${index}`,
      name: item.name,
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      totalPrice: Number(item.totalPrice) || 0,
      ticketIndex: 0,
    })
  );

  return {
    items,
    subtotal: Number(parsed.subtotal) || items.reduce((s, i) => s + i.totalPrice, 0),
    tax: Number(parsed.tax) || 0,
    deliveryFee: Number(parsed.deliveryFee) || 0,
    total: Number(parsed.total) || 0,
    currency: parsed.currency || 'EUR',
  };
}

export function expandItemsByQuantity(receipt: Receipt): Receipt {
  const expanded: ReceiptItem[] = receipt.items.flatMap((item) => {
    if (item.quantity <= 1) return [item];
    return Array.from({ length: item.quantity }, (_, i) => ({
      ...item,
      id: `${item.id}-q${i}`,
      name: item.quantity > 1 ? `${item.name} (${i + 1})` : item.name,
      quantity: 1,
      totalPrice: item.unitPrice || item.totalPrice / item.quantity,
    }));
  });
  return { ...receipt, items: expanded };
}

export function mergeReceipts(receipts: Receipt[]): Receipt {
  if (receipts.length === 1) return receipts[0];
  const items: ReceiptItem[] = receipts.flatMap((r, ri) =>
    r.items.map((item, i) => ({ ...item, id: `r${ri}-item-${i}`, ticketIndex: ri }))
  );
  const subtotal = receipts.reduce((s, r) => s + r.subtotal, 0);
  const tax = receipts.reduce((s, r) => s + r.tax, 0);
  const deliveryFee = receipts.reduce((s, r) => s + r.deliveryFee, 0);
  return {
    items,
    subtotal,
    tax,
    deliveryFee,
    total: subtotal + tax + deliveryFee,
    currency: receipts[0].currency,
  };
}

export function calculateSummaries(
  receipt: Receipt,
  claims: ItemClaim[]
) {
  const peopleMap = new Map<
    string,
    {
      name: string;
      items: { item: ReceiptItem; portionCount: number; portionCost: number }[];
      subtotal: number;
    }
  >();

  for (const claim of claims) {
    const item = receipt.items.find((i) => i.id === claim.itemId);
    if (!item) continue;

    if (!peopleMap.has(claim.personName)) {
      peopleMap.set(claim.personName, {
        name: claim.personName,
        items: [],
        subtotal: 0,
      });
    }

    const totalClaimedPortions = claims
      .filter((c) => c.itemId === claim.itemId)
      .reduce((s, c) => s + c.portionCount, 0);

    const portionCost =
      totalClaimedPortions > 0
        ? (item.totalPrice / totalClaimedPortions) * claim.portionCount
        : 0;

    const person = peopleMap.get(claim.personName)!;
    person.items.push({ item, portionCount: claim.portionCount, portionCost });
    person.subtotal += portionCost;
  }

  const people = Array.from(peopleMap.values());
  const totalClaimed = people.reduce((s, p) => s + p.subtotal, 0);
  const deliveryFeeShare = people.length > 0 ? receipt.deliveryFee / people.length : 0;

  return people.map((person) => {
    const taxShare =
      totalClaimed > 0 ? (person.subtotal / totalClaimed) * receipt.tax : 0;
    return {
      name: person.name,
      items: person.items,
      subtotal: person.subtotal,
      taxShare,
      deliveryFeeShare,
      total: person.subtotal + taxShare + deliveryFeeShare,
    };
  });
}
