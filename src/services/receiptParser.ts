import { Receipt, ReceiptItem } from '../types';

const API_TIMEOUT_MS = 30_000;

export async function parseReceiptImage(base64Image: string): Promise<Receipt> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
  const appSecret = process.env.EXPO_PUBLIC_APP_SECRET ?? '';

  if (!apiUrl) {
    throw new Error('API URL is niet geconfigureerd. Stel EXPO_PUBLIC_API_URL in.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api/parse-receipt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${appSecret}`,
      },
      body: JSON.stringify({ base64Image }),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Verzoek duurde te lang. Probeer opnieuw.');
    }
    throw new Error('Kon de server niet bereiken. Controleer je internetverbinding.');
  } finally {
    clearTimeout(timeoutId);
  }

  let data: Record<string, unknown>;
  try {
    data = await response.json();
  } catch {
    throw new Error('Onverwacht antwoord van de server. Probeer opnieuw.');
  }

  if (!response.ok) {
    const msg = typeof data.error === 'string' ? data.error : 'Er is een fout opgetreden.';
    throw new Error(msg);
  }

  return data as unknown as Receipt;
}

export function calculateSummaries(
  receipt: Receipt,
  claims: import('../types').ItemClaim[]
) {
  const peopleMap = new Map<
    string,
    {
      name: string;
      items: { item: ReceiptItem; portionCount: number; portionCost: number }[];
      subtotal: number;
      individualDiscountShare: number;
    }
  >();

  for (const claim of claims) {
    const item = receipt.items.find((i) => i.id === claim.itemId);
    if (!item) continue;

    if (!peopleMap.has(claim.personName)) {
      peopleMap.set(claim.personName, { name: claim.personName, items: [], subtotal: 0, individualDiscountShare: 0 });
    }

    const totalClaimedPortions = claims
      .filter((c) => c.itemId === claim.itemId)
      .reduce((s, c) => s + c.portionCount, 0);

    const portionCost = totalClaimedPortions > 0
      ? (item.totalPrice / totalClaimedPortions) * claim.portionCount : 0;

    const portionDiscount = totalClaimedPortions > 0
      ? (item.individualDiscount / totalClaimedPortions) * claim.portionCount : 0;

    const person = peopleMap.get(claim.personName)!;
    person.items.push({ item, portionCount: claim.portionCount, portionCost });
    person.subtotal += portionCost;
    person.individualDiscountShare += portionDiscount;
  }

  const people = Array.from(peopleMap.values());
  const totalClaimed = people.reduce((s, p) => s + p.subtotal, 0);
  const deliveryFeeShare = people.length > 0 ? receipt.deliveryFee / people.length : 0;

  return people.map((person) => {
    const jointDiscountShare = totalClaimed > 0
      ? (person.subtotal / totalClaimed) * receipt.jointDiscount : 0;
    const taxShare = totalClaimed > 0
      ? (person.subtotal / totalClaimed) * receipt.tax : 0;
    return {
      name: person.name,
      items: person.items,
      subtotal: person.subtotal,
      individualDiscountShare: person.individualDiscountShare,
      jointDiscountShare,
      taxShare,
      deliveryFeeShare,
      total: person.subtotal - jointDiscountShare + taxShare + deliveryFeeShare,
    };
  });
}
