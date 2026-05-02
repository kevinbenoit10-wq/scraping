import Anthropic from '@anthropic-ai/sdk';
import { Receipt, ReceiptItem } from '../types';

const API_TIMEOUT_MS = 30_000;
const MAX_ITEMS = 50;
const MAX_PRICE = 10_000;

const client = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '',
  dangerouslyAllowBrowser: true,
});

const PARSE_PROMPT = `Analyze this receipt image and extract all items and discounts. Return a JSON object with this exact structure:
{
  "items": [
    {
      "name": "Item name",
      "quantity": 1,
      "unitPrice": 2.50,
      "totalPrice": 2.50,
      "individualDiscount": 0.00
    }
  ],
  "subtotal": 10.00,
  "jointDiscount": 0.00,
  "tax": 1.20,
  "deliveryFee": 2.99,
  "total": 14.19,
  "currency": "EUR"
}

Rules:
- Extract every food/product line item on the receipt (do NOT include delivery fee or discounts as items)
- If quantity is not shown, assume 1
- unitPrice = price per unit BEFORE any individual discount
- individualDiscount: if the receipt shows a discount/reduction for a specific item (e.g. "korting", "actie", "promo" next to that item), set this to the discount amount (positive number). Otherwise 0
- totalPrice = (unitPrice * quantity) - individualDiscount
- subtotal = sum of all item totalPrices (after individual discounts)
- jointDiscount: any discount applied to the whole order (e.g. promo code, loyalty discount, "korting op bestelling", voucher). Use a positive number. If none, set to 0
- If tax is not shown separately, set tax to 0
- deliveryFee: extract any delivery, shipping, or service fee shown on the receipt. If none, set to 0
- total = subtotal - jointDiscount + tax + deliveryFee
- currency: use EUR for Belgium/Netherlands, USD for USA, etc. Default to EUR
- Return ONLY the JSON, no other text`;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function sanitizePrice(value: unknown): number {
  const n = Number(value);
  if (!isFinite(n) || n < 0) return 0;
  return clamp(n, 0, MAX_PRICE);
}

function sanitizeName(value: unknown): string {
  if (typeof value !== 'string') return 'Onbekend item';
  return value.replace(/[<>"'&]/g, '').slice(0, 100).trim() || 'Onbekend item';
}

export async function parseReceiptImage(base64Image: string): Promise<Receipt> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let message: Awaited<ReturnType<typeof client.messages.create>>;
  try {
    message = await client.messages.create(
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: 'image/jpeg', data: base64Image },
              },
              { type: 'text', text: PARSE_PROMPT },
            ],
          },
        ],
      },
      { signal: controller.signal }
    );
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Verzoek duurde te lang. Probeer opnieuw.');
    }
    throw new Error('Kon de bon niet verwerken. Controleer je internetverbinding en probeer opnieuw.');
  } finally {
    clearTimeout(timeoutId);
  }

  const textContent = message.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Kon de bon niet lezen. Probeer een duidelijkere foto.');
  }

  let jsonText = textContent.text.trim();
  const codeBlock = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) jsonText = codeBlock[1].trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Kon de bon niet lezen. Probeer een duidelijkere foto.');
  }

  if (!Array.isArray(parsed.items)) {
    throw new Error('Geen items gevonden op de bon.');
  }

  const items: ReceiptItem[] = (parsed.items as Record<string, unknown>[])
    .slice(0, MAX_ITEMS)
    .map((item, index) => ({
      id: `item-${index}`,
      name: sanitizeName(item.name),
      quantity: clamp(Math.round(Number(item.quantity) || 1), 1, 100),
      unitPrice: sanitizePrice(item.unitPrice),
      totalPrice: sanitizePrice(item.totalPrice),
      individualDiscount: sanitizePrice(item.individualDiscount),
    }));

  return {
    items,
    subtotal: sanitizePrice(parsed.subtotal) || items.reduce((s, i) => s + i.totalPrice, 0),
    jointDiscount: sanitizePrice(parsed.jointDiscount),
    tax: sanitizePrice(parsed.tax),
    deliveryFee: sanitizePrice(parsed.deliveryFee),
    total: sanitizePrice(parsed.total),
    currency: typeof parsed.currency === 'string' ? parsed.currency.slice(0, 3).toUpperCase() : 'EUR',
  };
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
