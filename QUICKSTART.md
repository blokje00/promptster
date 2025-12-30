# 🚀 Base44 Test Omgeving - Quick Start

Je Base44 testomgeving is klaar! Hier is alles wat je moet weten.

## ✅ Wat is er geïnstalleerd?

- ✅ Vitest (test framework)
- ✅ React Testing Library
- ✅ Base44 Mock Client
- ✅ Test configuratie
- ✅ Voorbeeld tests
- ✅ Environment bestanden

## 🎯 Snel Starten

### 1. Tests Draaien

```bash
# Start tests in watch mode (blijft draaien)
npm test

# Eenmalig alle tests uitvoeren
npm run test:run

# Tests met visuele UI
npm run test:ui

# Tests met coverage rapport
npm run test:coverage
```

### 2. Environment Setup

Kopieer de environment template en vul je gegevens in:

```bash
cp .env.example .env
```

Bewerk `.env` en vul in:
- `VITE_BASE44_APP_ID` - Je Base44 app ID (al ingevuld: `68f4bcd57ca6479c7acf2f47`)
- `VITE_BASE44_AUTH_TOKEN` - (Optioneel) Voor authenticatie tests

### 3. Je Eerste Test Schrijven

Maak een nieuw bestand in `src/tests/`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockBase44Client } from './mocks/base44Mock';

describe('Mijn Feature', () => {
  let client;

  beforeEach(() => {
    client = createMockBase44Client({
      appId: '68f4bcd57ca6479c7acf2f47',
      token: 'mock-token',
    });
  });

  it('should werk zoals verwacht', async () => {
    const result = await client.entities.MijnEntity.list();
    expect(result).toBeDefined();
  });
});
```

## 📚 Bestaande Tests

Alle tests zijn al geschreven en werken:

```
✓ src/tests/base44/entities.test.js (11 tests)
✓ src/tests/base44/auth.test.js (7 tests)  
✓ src/tests/base44/integrations.test.js (7 tests)
✓ src/tests/components/example.test.jsx (1 test)

Total: 26 tests passing ✅
```

## 🔧 Veelgebruikte Commando's

```bash
# Development server starten
npm run dev

# Build voor productie
npm run build

# Linting
npm run lint

# Tests (verschillende opties)
npm test              # Watch mode
npm run test:run      # Eenmalig
npm run test:ui       # Met UI
npm run test:coverage # Met coverage
```

## 📖 Belangrijke Bestanden

- `vitest.config.js` - Test configuratie
- `src/tests/setup.js` - Test setup (wordt automatisch geladen)
- `src/tests/mocks/base44Mock.js` - Mock Base44 client
- `.env.test` - Test environment variabelen
- `.env.development` - Development environment variabelen

## 💡 Tips

### Mock Data Resetten

```javascript
import { resetMockData } from './mocks/base44Mock';

beforeEach(() => {
  resetMockData(); // Begin elke test met schone data
});
```

### Custom Entities Toevoegen

```javascript
import { addMockEntity } from './mocks/base44Mock';

addMockEntity('Product', [
  { id: '1', name: 'Product A', price: 99.99 },
  { id: '2', name: 'Product B', price: 149.99 },
]);
```

### Component Testen

```javascript
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

it('should render component', () => {
  render(
    <BrowserRouter>
      <MijnComponent />
    </BrowserRouter>
  );
  
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

## 🎨 Test UI

Voor een visuele interface:

```bash
npm run test:ui
```

Dit opent een browser met:
- ✅ Live test resultaten
- ✅ Code coverage visualization
- ✅ Test file browser
- ✅ Console output per test

## 📊 Coverage Rapport

Na het draaien van `npm run test:coverage` vind je een HTML rapport in:

```
coverage/index.html
```

Open dit in je browser voor gedetailleerde coverage informatie.

## 🔗 Nuttige Links

- [Vitest Documentatie](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/)
- [Base44 SDK Docs](https://www.npmjs.com/package/@base44/sdk)
- Volledige test documentatie: zie `TEST_README.md`

## ❓ Hulp Nodig?

- Kijk in `TEST_README.md` voor gedetailleerde documentatie
- Bekijk de voorbeeld tests in `src/tests/base44/`
- De mock client in `src/tests/mocks/base44Mock.js` heeft comments

## 🎉 Je Bent Klaar!

Run `npm test` om te beginnen. Veel succes met testen! 🚀
