# Receipt Splitter — Project Context

## Wat is dit?
Een React Native app (Expo) waarmee je bonnetjes kan scannen en de rekening eerlijk kan splitsen tussen vrienden. Je kan meerdere bonnetjes tegelijk scannen (multi-ticket flow).

## Tech stack
- **App**: React Native + Expo SDK 54, TypeScript
- **Navigatie**: React Navigation (native stack)
- **AI**: Anthropic Claude claude-sonnet-4-6 via eigen VPS backend
- **Backend**: Node.js + Express op VPS, via Cloudflare Tunnel bereikbaar

---

## App flow
1. **HomeScreen** — landingspagina met "Scan Receipt" knop
2. **ScanScreen** — foto nemen of uploaden, meerdere bonnetjes mogelijk, elke bon wordt apart getoond in een lijst
3. **ClaimScreen** — personen toevoegen en aanduiden wie wat besteld heeft (multi-ticket: items gegroepeerd per bon)
4. **SummaryScreen** — overzicht per persoon: wat ze besteld hebben, BTW-aandeel, leveringskosten, totaal

---

## Architectuur

### App → Backend
De app stuurt base64 afbeeldingen naar de VPS backend. **Nooit** rechtstreeks naar Anthropic.

```
App → https://api.splitr.eu → Cloudflare Tunnel → VPS:3001 → Anthropic API
```

### Authenticatie
De app stuurt een `APP_SECRET` mee in elke request. De server valideert dit.

### Env variabelen (app, lokaal .env)
```
EXPO_PUBLIC_API_URL=https://api.splitr.eu
EXPO_PUBLIC_APP_SECRET=mijngeheimesecret123
```

**Let op**: `EXPO_PUBLIC_` variabelen worden ingebakken in de app bundle bij het builden. Het secret is dus extraheerbaar uit de APK, maar gecombineerd met HTTPS en rate limiting is dit acceptabel voor een store app.

---

## VPS & Backend

### Server
- **IP**: 141.95.29.115
- **OS**: Ubuntu
- **Backend map**: `~/backend/server.js`
- **Poort**: 3001
- **Process manager**: PM2 (`pm2 logs receipt-backend`)

### Backend draaien
```bash
pm2 restart receipt-backend
pm2 logs receipt-backend --lines 0
```

### Env variabelen backend (`~/backend/.env`)
```
ANTHROPIC_API_KEY=...
APP_SECRET=mijngeheimesecret123
PORT=3001
```

### Rate limiting
Max 10 requests per minuut per IP op `/parse-receipt` via `express-rate-limit`.

---

## Cloudflare Tunnel

### Domein
`splitr.eu` — gekocht op Namecheap, nameservers wijzen naar Cloudflare.

### Subdomein
`api.splitr.eu` → VPS:3001

### Tunnel
- Naam: `splitr`
- ID: `2d08584c-b519-443a-a788-a8bbc16abd10`
- Config: `/home/ubuntu/.cloudflared/config.yml`
- Draait als systemd service (start automatisch bij reboot)

### Tunnel beheren
```bash
sudo systemctl status cloudflared
sudo systemctl restart cloudflared
```

---

## Git branches
- **`claude/receipt-bill-splitter-SP63Z`** — dit is de ACTIEVE lokale branch van de gebruiker. Altijd naar deze branch pushen!
- `claude/review-app-finalization-ZqTwQ` — oude branch, niet meer gebruiken

**Belangrijk**: er waren veel merge conflicten tussen deze twee branches. De gebruiker lost die altijd op met `--ours` (lokale versie bewaren). Push voortaan **alleen** naar `claude/receipt-bill-splitter-SP63Z`.

---

## Bekende problemen & history

### Multi-ticket logic
De app ondersteunt meerdere bonnetjes. Items hebben een `ticketIndex` veld. `mergeReceipts()` in `receiptParser.ts` combineert meerdere `Receipt[]` tot één. `ClaimScreen` gebruikt een `listData` array met `header` en `item` rows per ticket.

### Types
- `ReceiptItem` heeft een `ticketIndex: number` veld
- `RootStackParamList`: `Claim` en `Summary` gebruiken `receipts: Receipt[]` (meervoud), niet `receipt`

### Verwijderde packages
- `@anthropic-ai/sdk` — zat vroeger in de app, nu verwijderd. Zit alleen nog op de VPS.
- `expo-camera` — niet nodig, `expo-image-picker` regelt camera access
- `@react-navigation/bottom-tabs` — niet gebruikt

### Taal
App is volledig in het Engels (was Nederlands). Bedoeld voor de App Store.

---

## Lokale workflow gebruiker
```bash
git pull origin claude/receipt-bill-splitter-SP63Z
npx expo start --lan --clear
```

Bij conflicten:
```bash
git checkout --ours <bestand>
git add <bestand>
git commit -m "Resolve conflict"
```
