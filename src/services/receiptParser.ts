import Anthropic from '@anthropic-ai/sdk';
import { Receipt, ReceiptItem } from '../types';

const client = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '',
  dangerouslyAllowBrowser: true,
});

const PARSE_PROMPT = `Analyze this receipt image and extract all items. Return a JSON object with this exact structure:
{
  "items": [
    {
      "name": "Item name",
      "quantity": 1,
      "unitPrice": 2.50,
      "totalPrice": 2.50
    }
  ],
  "subtotal": 10.00,
  "tax": 1.20,
  "total": 11.20,
  "currency": "EUR"
}

Rules:
- Extract every line item on the receipt
- If quantity is not shown, assume 1
- unitPrice = totalPrice / quantity
- subtotal = sum of all item totalPrices
- If tax is not shown separately, set tax to 0
- total = subtotal + tax
- currency: use EUR for Belgium/Netherlands, USD for USA, etc. Default to EUR
- Return ONLY the JSON, no other text`;

export async function parseReceiptImage(base64Image: string): Promise<Receipt> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: PARSE_PROMPT,
          },
        ],
      },
    ],
  });

  const textContent = message.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  let jsonText = textContent.text.trim();
  const codeBlock = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) jsonText = codeBlock[1].trim();
  const parsed = JSON.parse(jsonText);

  const items: ReceiptItem[] = parsed.items.map(
    (item: Omit<ReceiptItem, 'id'>, index: number) => ({
      id: `item-${index}`,
      name: item.name,
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      totalPrice: Number(item.totalPrice) || 0,
    })
  );

  return {
    items,
    subtotal: Number(parsed.subtotal) || items.reduce((s, i) => s + i.totalPrice, 0),
    tax: Number(parsed.tax) || 0,
    total: Number(parsed.total) || 0,
    currency: parsed.currency || 'EUR',
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

  const totalClaimed = Array.from(peopleMap.values()).reduce(
    (s, p) => s + p.subtotal,
    0
  );

  return Array.from(peopleMap.values()).map((person) => {
    const taxShare =
      totalClaimed > 0 ? (person.subtotal / totalClaimed) * receipt.tax : 0;
    return {
      name: person.name,
      items: person.items,
      subtotal: person.subtotal,
      taxShare,
      total: person.subtotal + taxShare,
    };
  });
}
