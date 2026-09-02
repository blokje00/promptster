# Base44 Testomgeving

Vitest + jsdom + Testing Library. Alle tests draaien tegen een mock van de Base44 SDK die zich gedraagt als het echte pakket; er gaat niets naar buiten. Stand op 2026-09-02: 7 testbestanden, 78 tests, allemaal groen. Snelstart: zie [[QUICKSTART]].

## Structuur

```
src/tests/
  setup.js                      # jsdom-mocks (matchMedia, IntersectionObserver, ResizeObserver); veilig in node-tests
  mocks/base44Mock.js           # mock van @base44/sdk, gelijk aan het echte gedrag
  base44/entities.test.js       # entities: list / filter(query, sort, limit) / get / create / update / delete
  base44/auth.test.js           # auth: me, updateMe, isAuthenticated, redirectToLogin, loginWithProvider, logout
  base44/integrations.test.js   # functions.invoke en Core-integraties
  base44/nousLLM.test.js        # backend LLM-module (fetch en Deno.env gemockt)
  base44/http.test.js           # backend-basis withAuth / ok / fail (node-omgeving)
  api/createEntityApi.test.jsx  # datalaag: hooks en plain functies
  components/example.test.jsx   # voorbeeld componenttest
```

## Commando's

```bash
npm test                                          # watch-mode
npm run test:run                                  # eenmalig
npm run test:ui                                   # grafische interface
npm run test:coverage                             # rapport in coverage/index.html
npx vitest run src/tests/base44/auth.test.js      # één bestand
npx vitest run -t "should create a new Todo"      # één test op naam
```

## De mock gebruiken

```javascript
import { createMockBase44Client, resetMockData, addMockEntity, setMockFunctionResponse } from '../mocks/base44Mock';

const client = createMockBase44Client({ appId: '68f4bcd57ca6479c7acf2f47', token: 'mock-token' });

// Entities: sortering is het TWEEDE argument, net als in de echte SDK
const projects = await client.entities.Project.filter({ created_by: 'test@example.com' }, '-updated_date');

// Aangemaakte records krijgen created_by, created_date en updated_date
await client.entities.Project.create({ name: 'Nieuw' });

// Backend-functies: invoke geeft { data, status } terug
setMockFunctionResponse('runPrompt', { ok: true, result: 'verbeterde prompt' });
const { data } = await client.functions.invoke('runPrompt', { prompt: '...' });

// Fout simuleren: een handler die een status geeft → invoke verwerpt met error.response.data
setMockFunctionResponse('runPrompt', () => ({ status: 500, data: { ok: false, error: 'Nous-sleutel (secret nousresearch) ontbreekt' } }));
```

Gebruik `resetMockData()` in `beforeEach` en `addMockEntity('Naam', [...])` om eigen records te zaaien.

## Hooks en pagina's testen

Mock de ingang van de datalaag, niet de pagina. Alle app-code gaat via `src/api/*`, en die modules importeren de SDK uit één bestand:

```javascript
vi.mock('@/api/base44Client', () => ({ base44: createMockBase44Client({ token: 'mock-token' }) }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ currentUser: { email: 'test@example.com' } }) }));

const { result } = renderHook(() => projects.useList(), { wrapper: withQueryClient });
await waitFor(() => expect(result.current.data).toHaveLength(2));
```

Zie `src/tests/api/createEntityApi.test.jsx` voor een compleet voorbeeld met `QueryClientProvider`.

## Backend-code testen

Deno-functies importeren de SDK als `npm:@base44/sdk@0.8.6`. De testconfiguratie (`vitest.config.js`) vertaalt die schrijfwijze naar het geïnstalleerde pakket, zodat pure backend-modules (`utils/http`, `utils/nousLLM`, `utils/prompts`) rechtstreeks te importeren zijn.

- Zet `// @vitest-environment node` bovenaan als de test geen DOM nodig heeft.
- Mock `fetch` via `globalThis.fetch = vi.fn()` en zet het origineel terug in `afterEach`.
- Mock `Deno.env` met `globalThis.Deno = { env: { get: (k) => env[k] } }`.
- Mock de SDK met `vi.mock('@base44/sdk', () => ({ createClientFromRequest: () => mockClient }))`.

## Tegen de echte API

Niet doen in tests: de app zelf praat al met de live backend (`npm run dev`), en tests met echte data zijn traag en niet herhaalbaar. Wil je toch iets live controleren, doe dat in de browser.
