# Promptster: snel starten

Alles wat je nodig hebt om te ontwikkelen en te testen staat al klaar. Uitleg van de architectuur: [[CLAUDE]]. Volledige testdocumentatie: [[TEST_README]]. Lopend verbeterplan: [[REFACTOR_PLAN]].

## 1. Installeren en draaien

```bash
npm ci                 # exact de versies uit package-lock
npm run dev            # Vite dev-server; praat met de LIVE Base44-backend
npm run build          # productie-build naar dist/
```

Er is geen lokale backend. `.env.development` staat in git en wijst al naar de juiste app. Backend-geheimen (zoals `NOUS_API_KEY` voor de LLM) staan op het Base44-platform, nooit in de repo; de namen staan in `.env.example`.

## 2. Tests

```bash
npm test               # watch-mode
npm run test:run       # eenmalig (dit draait ook in CI)
npm run test:ui        # grafische interface
npm run test:coverage  # rapport in coverage/index.html
```

Stand: 7 testbestanden, 78 tests. Tests gebruiken een mock van de Base44 SDK (`src/tests/mocks/base44Mock.js`); er gaat niets naar buiten.

## 3. Je eerste test

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockBase44Client, resetMockData, addMockEntity } from '../mocks/base44Mock';

describe('Projecten', () => {
  let client;

  beforeEach(() => {
    resetMockData();
    addMockEntity('Project', [
      { id: '1', name: 'Alpha', created_by: 'test@example.com', updated_date: '2026-09-01T10:00:00Z' },
      { id: '2', name: 'Beta',  created_by: 'test@example.com', updated_date: '2026-09-02T10:00:00Z' },
    ]);
    client = createMockBase44Client({ token: 'mock-token' });
  });

  it('sorteert nieuwste eerst', async () => {
    const result = await client.entities.Project.filter({ created_by: 'test@example.com' }, '-updated_date');
    expect(result.map(p => p.name)).toEqual(['Beta', 'Alpha']);
  });
});
```

Een hook of pagina testen? Mock `@/api/base44Client` en `@/lib/AuthContext` en render met een `QueryClientProvider`; voorbeeld in `src/tests/api/createEntityApi.test.jsx`.

## 4. Kwaliteitspoorten

```bash
npm run lint           # 0 fouten is de norm; CI blokkeert bij fouten
npm run typecheck      # informatief; oude schuld van ~1200 meldingen
```

## 5. Waar zit wat

- Pagina's: `src/pages/`, logica in `src/components/hooks/`.
- Data: uitsluitend via `src/api/<entity>.js` (hooks en plain functies); nooit rechtstreeks de SDK importeren in pagina's of componenten.
- LLM: `src/components/lib/invokeLLM.jsx` (browser) en `base44/functions/utils/nousLLM` (backend).
- Backend-functies: `base44/functions/<naam>/entry.ts`, gebouwd op `utils/http` (`withAuth`, `ok`, `fail`).

