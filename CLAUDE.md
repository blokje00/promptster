# `CLAUDE.md`

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Wat dit project is

Promptster is een React 18 + Vite single-page app op het **Base44-platform**. De app verzamelt losse gedachten/taken per project, bouwt daar met start- en eindtemplates een verbeterde prompt van voor AI-codeertools, en bewaart het resultaat als Item in een "vault" met afvinkbare controlepunten (Checks).

Eén gebruiker (Patrick), niet commercieel: geen abonnementen, geen PRO-poort, alle functies staan open voor de ingelogde gebruiker.

**Het Base44-plan heeft geen backend-functies.** Elke aanroep van `/functions/*` geeft 402 ("Functions are blocked"); secrets in het Base44-dashboard zijn daardoor onbruikbaar. Alleen de database (entities), auth en hosting werken. Daarom draait **alle AI in de browser**, rechtstreeks tegen Nous Research (CORS staat open), en bestaat `base44/` alleen nog uit `entities/` en `config.jsonc`. Ook `npm run dev` praat met de live Base44-backend van app `68f4bcd57ca6479c7acf2f47`; alleen de tests gebruiken een mock.

**Uitrollen = committen en pushen naar ****`origin/main`**; Base44 bouwt de frontend uit de repo (`base44/config.jsonc`) en leest de entity-schema's uit `base44/entities/`. Controleer daarna de GitHub Actions-run (`gh run list --limit 1`). Snelstart: [[QUICKSTART]]. Verbeterplan en status: [[REFACTOR_PLAN]].

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
npx vitest run src/tests/lib/nousClient.test.js   # één testbestand
npx vitest run -t "should create a new Todo"      # één test op naam
```

Stand op 2026-09-02: `test:run` 123 tests groen in 11 bestanden. `lint` 0 fouten (54 waarschuwingen over ongebruikte variabelen); **lint is een poort in CI** (`.github/workflows/ci.yml`: test, build, lint bij elke push). `typecheck` meldt \~1240 oude fouten en is informatief. De RTK-hook vat uitvoer samen; gebruik `rtk proxy <cmd>` voor ruwe uitvoer.

## Omgeving en configuratie

- `.env.development`, `.env.test` en `.env.example` staan in git ondanks `.env.*` in `.gitignore`. `.env` zelf niet. Er zijn geen backend-geheimen meer.
- **Nous-sleutel**: wordt één keer ingevoerd bij AI Backoffice en opgeslagen in de `AISettings`-rij van de gebruiker (velden `nous_api_key`, optioneel `nous_text_model`, `nous_vision_model`; RLS: alleen leesbaar door de eigenaar). `NousKeyLoader` (`src/components/ai/`, gemount in `Layout`) laadt hem na inloggen in `src/lib/nousClient.js` via `configureNous()`. Nooit in code, bundle of env.
- `src/lib/app-params.js` leest **`VITE_BASE44_BACKEND_URL`** eerst, dan `VITE_BASE44_SERVER_URL`. URL-parameters `?app_id=`, `?server_url=`, `?access_token=` overschrijven de env en worden in localStorage bewaard onder `base44_*`.
- `base44/.app.jsonc` is gitignored en komt van `base44 link`. Patrick heeft geen betaald Base44-account meer; uitrollen gaat uitsluitend via git push.
- Path-alias `@/` → `src/` komt uit `@base44/vite-plugin`; `vitest.config.js` en `jsconfig.json` definiëren hem apart.
- `.open-knowledge/` maakt van elke markdown-file een Open Knowledge-document (ook dit bestand). Lezen en schrijven via de MCP-tools; de editor maakt van losse bestandsnamen met `.md` een link, zet ze dus in backticks.

## Architectuur

### Routing en shell

`src/main.jsx` → `src/App.jsx`: `QueryClientProvider` → `AuthProvider` → `Router`. Routes komen uit `src/pages.config.js` (**auto-gegenereerd door Base44**; alleen `mainPage` wijzigen, nu `Multiprompt`; `App.jsx` prefetcht die pagina direct) en `src/routes.config.js` (toegang `public`/`protected`/`admin`). `RouteGuard` is de enige plek die toegang afdwingt. `src/Layout.jsx` wordt één keer gemount (ThemeProvider, LanguageProvider, Header, ErrorBoundary, CookieConsent, PageViewTracker, NousKeyLoader). Links via `createPageUrl("PaginaNaam")`. Nieuwe pagina = bestand in `src/pages/` + regel in `PAGES` + `ROUTES` + de `prefetchers` van `PrefetchLink`.

### Datalaag en AI

- **Alle data via ****`src/api/<entity>.js`**, gebouwd op `src/api/createEntityApi.js`: `keys` (`keys.all` is het invalidatie-prefix), plain functies (`listMine`, `get`, `create`, `update`, `remove`) en hooks (`useList`, `useOne`, `useCreate`, `useUpdate`, `useRemove`; mutatie-hooks invalideren zelf). Domeinvarianten in `thoughts.js` (actief/verwijderd, `softDelete`, `restore`), `items.js`, `learnedPatterns.js`, `promptFeedback.js`, `supportTickets.js`, `featureContentBlocks.js`, `appSettings.js`, `pageViews.js`, `screenshotAssets.js`, `aiSettings.js` (`upsertMine`). `src/api/auth.js` biedt `me()`/`updateMe()` voor code buiten React.
- **Direct ****`@/api/base44Client`**** importeren mag alleen** in `src/api/*`, `src/lib/AuthContext.jsx`, `src/components/lib/uploadFile.jsx`, `uploadImage.jsx` en het platform-boilerplate (`VisualEditAgent`, `NavigationTracker`, `PageNotFound`).
- **Auth**: `useAuth()` (`src/lib/AuthContext.jsx`, key `['authUser']`) is de enige bron voor de gebruiker: `updateMe`, `logout(redirectUrl?)`, `loginWithProvider`, `refreshUser`.
- **AI**: `invokeLLM()` uit `src/components/lib/invokeLLM.jsx` → `src/lib/nousClient.js` (tekst `deepseek/deepseek-v4-flash-0731`, beeld `deepseek/deepseek-v4-flash-vision-exp` zodra `file_urls` meegaat; met `response_json_schema` komt een geparst én tegen het schema gecontroleerd object terug; timeout, gerichte retry, weigeringsmelding). Nooit `base44.integrations.Core.InvokeLLM`. De vroegere backend-functies leven nu als client-side services: `src/lib/ai/screenshotAnalysis.js` (vision + cache op `ScreenshotAsset.vision_analysis`), `src/lib/ai/learning.js` (taak opsplitsen, patronen, feedback), `src/lib/maintenance.js`, `src/lib/adminStats.js`; `src/api/functions.js` is de facade met de oude namen. Promptteksten staan in `src/lib/prompts.js`.
- **TanStack Query v5**, globale instellingen in `src/lib/query-client.js`: staleTime 5 min, geen retry, één foutmelding per query per 30 s via sonner (`meta: { silent: true }` zet die uit). Toasts: **sonner**. Statuswaarden uit `src/components/lib/status.js`.

### Domeinmodel en hoofdflow

`Project` → `Thought` (taak, optioneel met screenshots en `vision_analysis`) → `PromptTemplate` (start/end) → gegenereerde prompt (`usePromptGeneration`) → opgeslagen als `Item` (type `multiprompt`, met `task_checks`) → pagina **Checks** → **Dashboard**/vault. `PromptFeedback` en `LearnedPattern` voeden via `learning.js` terug in latere prompts.

Op Multiprompt geldt: klik op een taakkaart = bewerken (ook met toetsenbord), checkbox = selecteren, ⋯-menu = overige acties; het promptvoorbeeld is een bewerkbaar tekstveld; de succesmelding na opslaan linkt naar Checks. De pagina is dun; logica zit in `src/components/hooks/`.

### Backend: `base44/entities`

JSON-schema per entity inclusief `rls` (welke gebruiker welke rijen mag lezen/schrijven). Gebruikersdata: alle vier regels op `created_by: {{user.email}}`; beheerderscontent (`AppSetting`, `FeatureContentBlock`, `FeatureBlock`, `ResearchPaper`) publiek leesbaar, admin-schrijfbaar. Velden die de code schrijft moeten in het schema staan. Vanuit de browser stamp je `created_by` zelf op `create` (zie `aiSettings.upsertMine`).

### Overige afspraken

- JS/JSX, geen TypeScript (behalve `src/utils/index.ts`). 25 shadcn/ui bestanden in `src/components/ui/`; ontbrekende via `npx shadcn add <component>`.
- UI-teksten via `t('key')` uit `useLanguage()`; `translations.jsx` is Engels-only.
- `VisualEditAgent`, `NavigationTracker` en de `sandbox:*` postMessage-hooks in `main.jsx` zijn Base44-platformboilerplate; laten staan, uitgesloten van lint en typecheck.
- "Delete all DEMO data" (instellingen) werkt in twee stappen, matcht alleen namen die met "DEMO" beginnen en verwijdert taken zacht. `PageViewTracker` schrijft alleen na cookietoestemming. Onderzoeksdocumenten linken direct naar arXiv.
- `.coderabbit.yaml` reviewt PR's op GitHub.

## Tests

Vitest + jsdom + Testing Library; details in [[TEST_README]]. De SDK-mock (`src/tests/mocks/base44Mock.js`) gedraagt zich als de echte SDK (`filter(query, sort, limit)`, `functions.invoke` → `{ data, status }`, `setMockFunctionResponse`). Hooks test je door `@/api/base44Client` en `@/lib/AuthContext` te mocken (voorbeeld `src/tests/api/createEntityApi.test.jsx`). De AI-services hebben eigen tests in `src/tests/lib/` met `@/lib/nousClient` gemockt; `fetch` wordt alleen in `nousClient.test.js` gemockt en in `afterEach` hersteld.
