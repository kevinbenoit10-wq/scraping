# Splitr — Project Context

## Wat is dit?
Een React Native app (Expo) waarmee je bonnetjes kan scannen en de rekening eerlijk kan splitsen tussen vrienden. Twee modi: klassiek scannen of real-time Table Mode waarbij iedereen zelf claimt via de browser.

## Tech stack
- **App**: React Native + Expo SDK 54, TypeScript
- **Navigatie**: React Navigation (native stack)
- **AI**: Anthropic Claude claude-sonnet-4-6 via eigen VPS backend
- **Backend**: Node.js + Express + Socket.io op VPS, via Cloudflare Tunnel bereikbaar
- **Lokale opslag**: AsyncStorage (history)

---

## App flow

### Scan & Split (bestaand)
1. **HomeScreen** → "Scan & Split"
2. **ScanScreen** — foto nemen of uploaden, meerdere bonnetjes mogelijk
3. **ClaimScreen** — personen toevoegen, items toewijzen per persoon
4. **SummaryScreen** — overzicht per persoon + automatisch opslaan in History

### Table Mode (nieuw)
1. **HomeScreen** → "Table Mode"
2. **ScanScreen** — zelfde scan flow, navigeert daarna naar TableModeHost
3. **TableModeHostScreen** — QR code tonen, live claims bijhouden
4. Gasten openen `api.splitr.eu/join/:code` in browser (geen app nodig), claimen hun items
5. **SummaryScreen** — zelfde summary, opgeslagen in History

### History (nieuw)
- **HistoryScreen** — lijst van alle vorige splits
- Per split: datum, modus, totaal, per persoon betaald/niet betaald toggle

---

## Architectuur

### App → Backend
```
App → https://api.splitr.eu → Cloudflare Tunnel → VPS:3001 → Anthropic API
```
Voor Table Mode: app verbindt ook via Socket.io met `api.splitr.eu`.

### Authenticatie
De app stuurt een `APP_SECRET` mee in elke request. De server valideert dit.

### Env variabelen (app, lokaal .env)
```
EXPO_PUBLIC_API_URL=https://api.splitr.eu
EXPO_PUBLIC_APP_SECRET=mijngeheimesecret123
```

---

## VPS & Backend

### Server
- **IP**: 141.95.29.115
- **OS**: Ubuntu
- **Backend map**: `~/backend/server.js`
- **Poort**: 3001
- **Process manager**: PM2

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
API_URL=https://api.splitr.eu
```

### Rate limiting
Max 10 requests per minuut per IP op `/parse-receipt` via `express-rate-limit`.

### Table Mode backend
Socket.io toegevoegd. Sessies worden in memory bewaard, automatisch verwijderd na 2 uur.
Referentie voor de VPS-aanpassingen: `backend-table-mode.js` in de repo.

---

## Cloudflare Tunnel

### Domeinen
- `splitr.eu` → VPS:3001 (homepage + privacy policy)
- `api.splitr.eu` → VPS:3001 (API + Socket.io + join pagina)

### Tunnel
- Naam: `splitr`
- ID: `2d08584c-b519-443a-a788-a8bbc16abd10`
- Config: `/etc/cloudflared/config.yml`
- Draait als systemd service

```bash
sudo systemctl status cloudflared
sudo systemctl restart cloudflared
```

---

## Packages (nieuw toegevoegd)
- `@react-native-async-storage/async-storage` ~2.1.0
- `react-native-svg` ~15.11.2
- `react-native-qrcode-svg` ~6.3.14
- `socket.io-client` ~4.8.1

---

## Git branches
- **`claude/review-app-finalization-ZqTwQ`** — actieve branch waar Claude naar pusht
- Gebruiker werkt lokaal op `claude/receipt-bill-splitter-SP63Z` en merged/pullt van `claude/review-app-finalization-ZqTwQ`

Bij conflicten altijd `--ours` gebruiken (lokale versie bewaren).

---

## Bekende problemen & history

### Multi-ticket logic
Items hebben een `ticketIndex` veld. `mergeReceipts()` combineert meerdere receipts. ClaimScreen groepeert items per ticket.

### Types
- `ReceiptItem`: heeft `ticketIndex: number`
- `RootStackParamList`: `Claim` en `Summary` gebruiken `receipts: Receipt[]`
- `Summary` heeft optionele `mode?: 'scan-split' | 'table-mode'` param

### Verwijderde packages
- `@anthropic-ai/sdk` — alleen nog op VPS
- `expo-camera` — niet nodig
- `@react-navigation/bottom-tabs` — niet gebruikt

---

## App Store status
- Apple rejection ontvangen om 2 redenen:
  1. **Spam** — te gelijkaardig aan andere apps → opgelost met Table Mode (uniek: gasten joinen via browser, geen app nodig)
  2. **iPad bug** — app laadde geen content op iPad → opgelost met `requireFullScreen: true` in app.json
- Nog te doen: nieuwe EAS build maken + resubmitten

---

## Pending tasks
- [ ] App visueel cleaner maken (minder "AI gegenereerd" uitzicht)
- [ ] Testen van Table Mode + History op echte telefoon
- [ ] Nieuwe EAS build maken
- [ ] Resubmitten naar Apple App Store

---

## Lokale workflow gebruiker
```bash
git pull origin claude/review-app-finalization-ZqTwQ
npm install
npx expo start --lan --clear
```
