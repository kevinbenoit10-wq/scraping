require('dotenv').config();

const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3001;
const APP_SECRET = process.env.APP_SECRET;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is not set in server/.env');
  process.exit(1);
}
if (!APP_SECRET) {
  console.error('APP_SECRET is not set in server/.env');
  process.exit(1);
}

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

app.use(helmet());
app.use(express.json({ limit: '5mb' }));

// 5 requests per 10 minutes per IP
const scanLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Te veel verzoeken. Probeer over 10 minuten opnieuw.' });
  },
});

function requireAppSecret(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth || auth !== `Bearer ${APP_SECRET}`) {
    return res.status(401).json({ error: 'Niet geautoriseerd.' });
  }
  next();
}

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
- individualDiscount: if the receipt shows a discount for a specific item, set this to the discount amount. Otherwise 0
- totalPrice = (unitPrice * quantity) - individualDiscount
- subtotal = sum of all item totalPrices
- jointDiscount: any discount on the whole order. Use a positive number. If none, set to 0
- If tax is not shown separately, set tax to 0
- deliveryFee: any delivery/shipping fee. If none, set to 0
- total = subtotal - jointDiscount + tax + deliveryFee
- currency: use EUR for Belgium/Netherlands, USD for USA. Default to EUR
- Return ONLY the JSON, no other text`;

const MAX_ITEMS = 50;
const MAX_PRICE = 10_000;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function sanitizePrice(value) {
  const n = Number(value);
  if (!isFinite(n) || n < 0) return 0;
  return clamp(n, 0, MAX_PRICE);
}

function sanitizeName(value) {
  if (typeof value !== 'string') return 'Onbekend item';
  return value.replace(/[<>"'&]/g, '').slice(0, 100).trim() || 'Onbekend item';
}

app.post('/api/parse-receipt', scanLimiter, requireAppSecret, async (req, res) => {
  const { base64Image } = req.body;

  if (!base64Image || typeof base64Image !== 'string') {
    return res.status(400).json({ error: 'Ongeldige afbeelding.' });
  }

  if (base64Image.length > 4 * 1024 * 1024) {
    return res.status(413).json({ error: 'Afbeelding is te groot. Maximaal 3 MB.' });
  }

  let message;
  try {
    message = await client.messages.create({
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
    });
  } catch (err) {
    console.error('Anthropic API error:', err?.message ?? err);
    return res.status(502).json({ error: 'Kon de bon niet verwerken. Probeer opnieuw.' });
  }

  const textContent = message.content.find((c) => c.type === 'text');
  if (!textContent) {
    return res.status(502).json({ error: 'Kon de bon niet lezen. Probeer een duidelijkere foto.' });
  }

  let jsonText = textContent.text.trim();
  const codeBlock = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) jsonText = codeBlock[1].trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return res.status(502).json({ error: 'Kon de bon niet lezen. Probeer een duidelijkere foto.' });
  }

  if (!Array.isArray(parsed.items)) {
    return res.status(502).json({ error: 'Geen items gevonden op de bon.' });
  }

  const items = parsed.items.slice(0, MAX_ITEMS).map((item, index) => ({
    id: `item-${index}`,
    name: sanitizeName(item.name),
    quantity: clamp(Math.round(Number(item.quantity) || 1), 1, 100),
    unitPrice: sanitizePrice(item.unitPrice),
    totalPrice: sanitizePrice(item.totalPrice),
    individualDiscount: sanitizePrice(item.individualDiscount),
  }));

  res.json({
    items,
    subtotal: sanitizePrice(parsed.subtotal) || items.reduce((s, i) => s + i.totalPrice, 0),
    jointDiscount: sanitizePrice(parsed.jointDiscount),
    tax: sanitizePrice(parsed.tax),
    deliveryFee: sanitizePrice(parsed.deliveryFee),
    total: sanitizePrice(parsed.total),
    currency: typeof parsed.currency === 'string' ? parsed.currency.slice(0, 3).toUpperCase() : 'EUR',
  });
});

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use((_req, res) => res.status(404).json({ error: 'Niet gevonden.' }));

app.listen(PORT, () => console.log(`Receipt proxy server running on port ${PORT}`));
