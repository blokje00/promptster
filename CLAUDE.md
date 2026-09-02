# `CLAUDE.md`

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Wat dit project is

Promptster is een React 18 + Vite single-page app op het **Base44-platform** (hosted backend: database-entities, auth, serverless functions). De app verzamelt losse gedachten/taken per project, bouwt daar met start- en eindtemplates een verbeterde prompt van voor AI-codeertools, en bewaart het resultaat als Item in een "vault" met afvinkbare controlepunten (Checks). LLM-aanroepen lopen via Nous Research, niet via Base44-credits.

Eén gebruiker (Patrick), niet commercieel: geen abonnementen, geen PRO-poort, alle functies staan open voor de ingelogde gebruiker.

Er is **geen lokale backend**. Ook `npm run dev` praat met de live Base44-backend van app `68f4bcd57ca6479c7acf2f47`. Alleen de tests gebruiken een mock. **Uitrollen = committen en pushen naar \*\*\*\*\*\*\*\*\*\*\*\*****`origin/main`**; Base44 pakt de repo automatisch op (frontend-build via `base44/config.jsonc`, functies en entity-schema's uit `base44/`). Controleer daarna met `curl -s -o /dev/null -w '%{http_code}' https://base44.app/api/apps/68f4bcd57ca6479c7acf2f47/functions/<naam>`: 401 betekent uitgerold, 404 nog niet. Snelstart: [[QUICKSTART]]. Verbeterplan en status: [[REFACTOR_PLAN]].

## Commando's

```bash
npm run dev            # Vite dev-server (tegen live backend)
npm run build          # productie-build naar dist/
npm run lint           # eslint over src/ (ui-map en platform-boilerplate uitgezonderd)
npm run lint:fix
npm run typecheck      # tsc met checkJs via jsconfig.json
npm test               # vitest watch-mode
npm run test:run       # eenmalig
npm run test:coverage  # coverage-rapport in coverage/index.html
npx vitest run src/tests/base44/auth.test.js     # één testbestand
npx vitest run -t "should create a new Todo"      # één test op naam
```

Stand op 2026-09-02 na de refactor: `test:run` 111 tests groen in 9 bestanden. `lint` 0 fouten (56 waarschuwingen over ongebruikte variabelen); **lint is een poort in CI** (`.github/workflows/ci.yml` draait test, build en lint bij elke push). `typecheck` meldt \~1240 oude fouten en is informatief. De RTK-hook vat uitvoer samen; gebruik `rtk proxy <cmd>` voor ruwe uitvoer.

## Omgeving en configuratie

- `.env.development`, `.env.test` en `.env.example` staan in git ondanks `.env.*` in `.gitignore` (geforceerd toegevoegd). `.env` zelf niet. Backend-geheimen staan als secret op het Base44-platform; `.env.example` noemt alleen de namen. De Nous-sleutel heet daar **`nousresearch`** (`NOUS_API_KEY` werkt als alias); optioneel `NOUS_TEXT_MODEL`, `NOUS_VISION_MODEL`, `NOUS_TIMEOUT_MS`, `SCREENSHOT_URL_ALLOWLIST`.
- `src/lib/app-params.js` leest **`VITE_BASE44_BACKEND_URL`** eerst, dan `VITE_BASE44_SERVER_URL`. URL-parameters `?app_id=`, `?server_url=`, `?access_token=` overschrijven de env en worden in localStorage bewaard onder `base44_*`.
- `base44/.app.jsonc` is gitignored en komt van `base44 link` (Base44 CLI, niet in devDependencies). Patrick heeft geen betaald Base44-account meer maar kan wel secrets zetten in het dashboard; uitrollen gaat uitsluitend via git push (zie boven).
- Path-alias `@/` → `src/` komt uit `@base44/vite-plugin`; `vitest.config.js` en `jsconfig.json` definiëren hem apart. `vitest.config.js` vertaalt bovendien Deno's `npm:@base44/sdk@x` naar het geïnstalleerde pakket, zodat backend-modules testbaar zijn.
- `.open-knowledge/` maakt van elke markdown-file in de repo een Open Knowledge-document (ook dit bestand). Lezen en schrijven via de MCP-tools; de editor maakt van losse bestandsnamen met `.md` een link, zet ze dus in backticks.

## Architectuur

### Routing en shell

`src/main.jsx` → `src/App.jsx`: `QueryClientProvider` → `AuthProvider` → `Router`. Routes komen uit twee tabellen:

- `src/pages.config.js` — **auto-gegenereerd door Base44**. Enige handmatig te wijzigen waarde: `mainPage` (nu `Multiprompt`). `App.jsx` prefetcht die pagina direct bij het opstarten via `prefetchPage` uit `src/components/PrefetchLink.jsx`.
- `src/routes.config.js` — toegangsniveau per pagina: `public`, `protected` (standaard) of `admin`. `RouteGuard` (`src/components/auth/RouteGuard.jsx`) is de **enige** plek die dat afdwingt; pagina's doen geen eigen rolcontrole meer (alleen `enabled:` op queries).

`src/Layout.jsx` wordt één keer gemount (ThemeProvider, LanguageProvider, Header, ErrorBoundary, CookieConsent, PageViewTracker). Links bouw je met `createPageUrl("PaginaNaam")` uit `src/utils/index.ts`. Nieuwe pagina = bestand in `src/pages/` + regel in `PAGES` + regel in `ROUTES` + regel in de `prefetchers` van PrefetchLink.

### Datalaag

- **Alle data via ****`src/api/<entity>.js`****.** Elke module is gebouwd op `src/api/createEntityApi.js` en exporteert `keys` (`keys.all` is het invalidatie-prefix), plain functies (`listMine`, `get`, `create`, `update`, `remove`) en hooks (`useList`, `useOne`, `useCreate`, `useUpdate`, `useRemove`). Mutatie-hooks invalideren zelf hun prefix. Domeinvarianten: `thoughts.js` (`useActiveThoughts`, `useDeletedThoughts`, `softDelete`, `restore`, `invalidateThoughtCaches`), `items.js` (`useOpenChecksCount`), `learnedPatterns.js`, `supportTickets.js`, `featureContentBlocks.js`, `appSettings.js`, `pageViews.js`. Backend-functies roep je aan via `src/api/functions.js` (geeft `response.data` terug, gooit de fouttekst van de backend).
- **Direct ****`@/api/base44Client`**** importeren mag alleen** in `src/api/*`, `src/lib/AuthContext.jsx`, `src/components/lib/uploadFile.jsx`, `uploadImage.jsx`, `invokeLLM.jsx` en het platform-boilerplate (`VisualEditAgent`, `NavigationTracker`, `PageNotFound`). Pagina's en componenten nooit.
- **Auth**: `useAuth()` uit `src/lib/AuthContext.jsx` (query key `['authUser']`) is de enige bron voor de ingelogde gebruiker en biedt ook `updateMe(data)`, `logout(redirectUrl?)`, `loginWithProvider(provider, returnTo)` en `refreshUser()`. Geen eigen `auth.me()`-queries meer.
- **LLM: nooit** `base44.integrations.Core.InvokeLLM`. Frontend: `invokeLLM()` uit `src/components/lib/invokeLLM.jsx` → backend-functie `invokeLLM`. Backend: `invokeLLM` uit `base44/functions/utils/nousLLM/entry.ts` (Nous Research; tekst `deepseek/deepseek-v4-flash-0731`, beeld `deepseek/deepseek-v4-flash-vision-exp` zodra `file_urls` meegaat; met `response_json_schema` komt een geparst én tegen het schema gecontroleerd object terug). Promptteksten staan in `src/lib/prompts.js` en `base44/functions/utils/prompts/entry.ts`, niet inline.
- **TanStack Query v5**, globale instellingen in `src/lib/query-client.js`: staleTime 5 min, geen retry, één foutmelding per query per 30 s via sonner (`meta: { silent: true }` zet die uit).
- Toasts: **sonner**. Statuswaarden van Items en controlepunten uit `src/components/lib/status.js` (volgt `base44/entities/Item.jsonc`), geen losse strings.

### Domeinmodel en hoofdflow

`Project` → `Thought` (taak, optioneel met screenshots en `vision_analysis`) → `PromptTemplate` (start/end) → gegenereerde prompt (`usePromptGeneration`) → opgeslagen als `Item` (type `multiprompt`, met `task_checks`) → pagina **Checks** → **Dashboard**/vault. `PromptFeedback` en `LearnedPattern` voeden via `synthesizePreferences` en `applyFeedbackToPreferences` terug in latere prompts.

Op Multiprompt geldt: klik op een taakkaart = bewerken (ook met toetsenbord), checkbox = selecteren, ⋯-menu = overige acties; het promptvoorbeeld is een bewerkbaar tekstveld; de succesmelding na opslaan linkt naar Checks. De pagina zelf is dun; logica zit in `src/components/hooks/`.

### Backend: `base44/`

- `base44/entities/*.jsonc` — JSON-schema per entity inclusief `rls` (welke gebruiker welke rijen mag lezen/schrijven). Gebruikersdata: alle vier regels op `created_by: {{user.email}}`; beheerderscontent (`AppSetting`, `FeatureContentBlock`, `FeatureBlock`, `ResearchPaper`) publiek leesbaar, admin-schrijfbaar. Velden die de code schrijft moeten in het schema staan.
- `base44/functions/<naam>/entry.ts` — **Deno** functions, gebouwd op `utils/http/entry.ts`: `Deno.serve(withAuth({ name, admin?, cors? }, async ({ req, base44, user, body }) => …))`, antwoorden met `ok({...})` → `{ ok: true, ... }` en `fail(msg, status)` → `{ ok: false, error }`. Nooit `stack` naar de client. `withAuth` leest alleen JSON-bodies; uploads lezen zelf `req.formData()`. Gedeeld: `utils/nousLLM`, `utils/prompts`, `utils/logger`. Er is geen PRO-poort (eén gebruiker). `analyzeScreenshotVision` accepteert screenshot-URL's van Base44-opslag, uit `SCREENSHOT_URL_ALLOWLIST`, of die overeenkomen met een eigen `ScreenshotAsset`.
- **Spiegel van het platform**: `vision/*` bevat zes lege bestanden en imports die lokaal niet kloppen, `saveTask` importeert een ontbrekende `rateLimiter`. Niet "repareren" zonder te weten wat er gedeployed is. `tsconfig.json` en `deno.d.ts` dienen alleen om de IDE stil te houden.

### Overige afspraken

- JS/JSX, geen TypeScript (behalve `src/utils/index.ts` en de Deno-functies). UI-componenten: 25 shadcn/ui new-york bestanden in `src/components/ui/`; ontbrekende voeg je toe met `npx shadcn add <component>`.
- UI-teksten via `t('key')` uit `useLanguage()`; `src/components/i18n/translations.jsx` is Engels-only.
- `VisualEditAgent`, `NavigationTracker` en de `sandbox:*` postMessage-hooks in `main.jsx` zijn Base44-platformboilerplate. Laten staan; ze zijn uitgesloten van lint en typecheck.
- De knop "Delete all DEMO data" (instellingen) werkt in twee stappen (scan, bevestig), matcht alleen namen die met "DEMO" beginnen en verwijdert taken zacht. `PageViewTracker` schrijft alleen na cookietoestemming.
- `.coderabbit.yaml` reviewt PR's op GitHub.

## Tests

Vitest + jsdom + Testing Library; details in [[TEST_README]]. De SDK-mock (`src/tests/mocks/base44Mock.js`) gedraagt zich als de echte SDK: `filter(query, sort, limit)`, `functions.invoke` geeft `{ data, status }` en verwerpt bij fouten; configureer functies met `setMockFunctionResponse`. Hooks test je door `@/api/base44Client` en `@/lib/AuthContext` te mocken (voorbeeld: `src/tests/api/createEntityApi.test.jsx`). Backend-modules (`utils/http`, `utils/nousLLM`, `utils/prompts`) hebben eigen tests; zet `// @vitest-environment node` bovenaan als er geen DOM nodig is.
