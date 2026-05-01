# Receipt Splitter

Een iOS/Android app om bonnetjes te scannen en de rekening eerlijk te splitsen.

## Features

- 📷 Scan een bon met de camera of importeer een foto
- 🤖 Automatische herkenning van items via Claude Vision AI
- 👥 Voeg personen toe en duid aan wie wat heeft besteld
- 💰 Automatische berekening per persoon (incl. BTW-verdeling)

## Setup

### 1. Installeer dependencies

```bash
npm install
```

### 2. Stel je API key in

Kopieer `.env.example` naar `.env` en vul je Anthropic API key in:

```bash
cp .env.example .env
```

Bewerk `.env`:
```
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...
```

Haal een API key op via [console.anthropic.com](https://console.anthropic.com).

### 3. Start de app

```bash
npx expo start
```

Scan de QR-code met de **Expo Go** app op je iPhone, of druk op `i` voor de iOS simulator.

## App flow

1. **Home** — Start scherm
2. **Scan** — Maak foto van bon of kies uit galerij
3. **Items kiezen** — Voeg namen toe, duid per persoon aan wat ze hebben besteld (stepper per item)
4. **Overzicht** — Gedetailleerd overzicht per persoon met totaalbedrag

## Technologie

- [Expo](https://expo.dev) / React Native
- [Claude Vision API](https://anthropic.com) voor OCR en item-extractie
- React Navigation voor schermnavigatie
- TypeScript
