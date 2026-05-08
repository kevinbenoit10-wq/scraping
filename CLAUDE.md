# Splitr — Project Context

## Wat is dit?
Een React Native app (Expo) waarmee je bonnetjes kan scannen en de rekening eerlijk kan splitsen tussen vrienden. Twee modi: klassiek scannen of real-time Table Mode waarbij iedereen zelf claimt via de browser.

## Tech stack
- **App**: React Native + Expo SDK 54, TypeScript
- **Navigatie**: React Navigation (native stack)
- **AI**: Anthropic Claude claude-sonnet-4-6 via eigen VPS backend
- **Backend**: Node.js + Express + Socket.io op VPS, via Cloudflare Tunnel bereikbaar
- **Lokale opslag**: AsyncStorage (history)
- **Theme**: `src/theme.ts` — kleuren (C) en PERSON_COLORS, gebaseerd op app icon (warm beige + terracotta)

---

## App flow

### Splash
- `src/components/SplashAnimation.tsx` — toont `assets/icon.png`, schuift na ~1s naar rechts weg
- Rendeert over de navigator in `App.tsx` via `showSplash` state

### Scan & Split
1. **HomeScreen** → "Scan & Split"
2. **ScanScreen** — foto nemen of uploaden, meerdere bonnetjes mogelijk
3. **ClaimScreen** — personen toevoegen, items toewijzen per persoon (gebruikt `receipts[]`, mergeReceipts intern)
4. **SummaryScreen** — overzicht per persoon + automatisch opslaan in History

### Table Mode
1. **HomeScreen** → "Table Mode"
2. **ScanScreen** — zelfde scan flow, navigeert daarna naar TableModeHost
3. **TableModeHostScreen** — QR code tonen, live claims bijhouden, host kan zelf ook claimen
   - Items met quantity > 1 worden uitgebreid via `expandItemsByQuantity()` zodat elk item apart claimbaar is
   - Bij finish: summaries berekend en meegestuurd via `close_session` event
4. Gasten openen `splitr.eu/join/:code` in browser (geen app nodig), claimen items, zien eigen totaal na finish
5. **SummaryScreen** — ontvangt `[expandedReceipt]` als receipts array

### History
- **HistoryScreen** — lijst van alle vorige splits
- Per split: datum, modus, totaal, per persoon betaald/niet betaald toggle
- Deduplicatie: zelfde total+currency binnen 10 seconden wordt niet dubbel opgeslagen

---

## Navigatie
- Na "Done" op SummaryScreen: `navigation.reset` naar Home (stack wordt leeggemaakt)
- TableModeHost heeft `headerBackVisible: false` en reset ook de stack bij finish
- Zo komt men nooit terug op een "Creating session..." scherm

---

## Architectuur

### App → Backend
```
App → https://api.splitr.eu → Cloudflare Tunnel → VPS:3001 → Anthropic API
```
Voor Table Mode: app verbindt ook via Socket.io met `api.splitr.eu`.

### Authenticatie
De app stuurt een `APP_SECRET` mee in elke request. De server valideert dit.
⚠️ `EXPO_PUBLIC_APP_SECRET` is zichtbaar in de app bundle — aanvaardbaar voor persoonlijk gebruik.

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
- **Web join pagina**: `~/backend/join.html`
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
Socket.io toegevoegd. Sessies in memory, automatisch verwijderd na 2 uur.
Referentiebestand voor VPS-aanpassingen: `backend-table-mode.js` in de repo.

**Socket events:**
- `create_session` — host maakt sessie aan
- `join_session` — host of gast joinen (duplicate names worden geblokkeerd)
- `claim_item` — item claimen (server valideert dat name === socket.data.name)
- `unclaim_item` — claim verwijderen
- `close_session` — host beëindigt, summaries worden gebroadcast via `session_closed`
- `session_state` — gestuurd naar nieuwe deelnemer bij join
- `session_update` — gebroadcast bij elke claim-wijziging

---

## Cloudflare Tunnel

### Domeinen
- `splitr.eu` → VPS:3001 (homepage + privacy policy + join pagina)
- `api.splitr.eu` → VPS:3001 (API + Socket.io)

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

## Kleurthema (`src/theme.ts`)
```
C.bg           #EDE6D8  — warm beige achtergrond
C.card         #FAF6EF  — kaart/surface
C.primary      #C04B2B  — terracotta rood
C.primaryDark  #9B3820  — donkerder terracotta
C.primaryLight #F5E8E3  — lichte tint
C.text         #2C1A10  — warm donkerbruin
C.textMuted    #9B7B6A  — gedempt warm
C.border       #DDD0BC  — warme rand
```

---

## Packages
- `@react-native-async-storage/async-storage` ~2.1.0
- `react-native-svg` ~15.11.2
- `react-native-qrcode-svg` ~6.3.14
- `socket.io-client` ~4.8.1

---

## Git branches
- **`claude/review-app-finalization-ZqTwQ`** — actieve branch waar Claude naar pusht
- Gebruiker werkt lokaal op `claude/receipt-bill-splitter-SP63Z` en pullt van `claude/review-app-finalization-ZqTwQ`

Bij conflicten: `git checkout --theirs <file> && git add <file> && git commit --no-edit`

---

## Bekende beperkingen
- `EXPO_PUBLIC_APP_SECRET` zichtbaar in bundle — aanvaardbaar voor persoonlijk gebruik
- XSS in join.html via innerHTML — laag risico voor beperkte gebruikersgroep
- Socket.io sessions in memory — herstart van PM2 wist alle actieve sessies

---

## Types
- `ReceiptItem`: `id, name, quantity, unitPrice, totalPrice, ticketIndex`
- `RootStackParamList`: `Claim` en `Summary` gebruiken `receipts: Receipt[]`
- `Summary` heeft optionele `mode?: 'scan-split' | 'table-mode'`
- `HistoryEntry`: `id, date, mode, currency, total, payments: PaymentRecord[]`

---

## App Store status
- Apple rejection opgelost:
  1. **Spam** → Table Mode toegevoegd (gasten joinen via browser, uniek)
  2. **iPad bug** → `requireFullScreen: true` in app.json
- **Volgende stap**: `eas init` → `eas build --platform ios` → `eas submit --platform ios`

---

## Lokale workflow
```bash
git pull origin claude/review-app-finalization-ZqTwQ
npm install
npx expo start --lan --clear
```
