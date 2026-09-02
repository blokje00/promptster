# Refactorplan Promptster

Datum: 2026-09-02. Basis: code-review van de complete repo (10 zoekrondes, 5 verificatierondes, 1 sweep, 1 klikpad-analyse; 61 kandidaten, waarvan 9 weerlegd). Doelen van Patrick: **snelheid**, **code-intelligentie** (één duidelijke plek per verantwoordelijkheid, controleerbaar met tests en poorten) en **afslanking**. Extra wens: vanuit de Multiprompt-pagina met één klik naar bewerken.

Zie ook [[CLAUDE]] voor de architectuurafspraken die dit plan volgt.

## Cijfers nu

| Meting                           | Stand                                                 |
| -------------------------------- | ----------------------------------------------------- |
| Broncode `src/` zonder shadcn-ui | ± 16.900 regels in 190 bestanden                      |
| shadcn-ui componenten            | 4.075 regels, 50 bestanden (7 nergens gebruikt)       |
| Backend `base44/functions`       | 3.290 regels, 30 bestanden (6 leeg)                   |
| npm-afhankelijkheden             | 55 runtime + 24 dev                                   |
| Bundle eerste lading             | entry 410 KB + Multiprompt 204 KB (na elkaar geladen) |
| Tests                            | 37/37 groen, alleen mock + LLM-module                 |
| Lint / typecheck frontend        | 173 fouten, 74 waarschuwingen / 1.241 fouten          |
| Typecheck backend                | 18 fouten (alle in de vision-spiegel)                 |

## Fase 0: eerst dichten (bugs en veiligheid), 1 à 2 dagen

Alles hieronder is bevestigd op regelniveau.

1. **Datalek screenshots.** `analyzeScreenshotVision` zoekt een `ScreenshotAsset` met service-role op alleen `id`. Fix: filter ook op `created_by: user.email`, of gebruik de gewone client zodat de rijregels gelden.
2. **Knop "Delete all DEMO data" wist echte data.** `MaintenanceTools` matcht het woord "demo" in vrije tekst en verwijdert hard. Advies: knop en handler helemaal verwijderen (past bij het eerder verwijderen van de demo-machinerie).
3. **Betaalde LLM-functies zonder poort.** `invokeLLM`, `decomposeTask`, `synthesizePreferences`, `analyzeRetrospectiveFeedback`, `applyFeedbackToPreferences` controleren alleen "ingelogd". Fix: `hasProAccess` uit `utils/entitlements` toepassen plus een eenvoudige limiet per gebruiker per uur.
4. **`ProjectStructure`**\*\* aanmaken is admin-only\*\* in het schema, terwijl AI Backoffice voor iedereen open is. Fix: `create` op `created_by` zetten zoals `update`/`delete`; `structureMutation` een `onError` geven.
5. **LLM-antwoord niet gecontroleerd tegen het schema** (`utils/nousLLM`). Fix: na het parsen de verplichte sleutels uit `response_json_schema` controleren en anders een duidelijke `LLMError` gooien; in de drie aanroepers de arrays met een lege lijst als terugval lezen.
6. **OCR-data verschuift naar het verkeerde screenshot** bij één mislukte analyse (`usePromptGeneration`). Fix: analyses op URL indexeren in plaats van op positie.
7. **Verouderde closure herhaalt betaalde redeneerstap** bij elke klik op Improve. Fix: `reasoningSteps` en `handleToggleReasoning` in de afhankelijkheden, of de redenering met een `ref` bijhouden.
8. **Server haalt willekeurige URL op** (`analyzeScreenshotVision`) en stuurt die door naar Nous. Fix: alleen URL's van de eigen Base44-opslag toestaan, of het `screenshotId` verplicht maken.
9. **Geen ****`read`****-regel** op `UserProfile` en `ProjectStructure`. Fix: `read: created_by` toevoegen; eerst het platform-default checken (open vraag 1).
10. **Verkeerde cache-sleutel** na opsplitsen of brainstormen (`['thoughts']` vs `['activeThoughts', email]`). Fix: volgt automatisch uit fase 4 punt 1; tot die tijd de juiste sleutel gebruiken.
11. **Instellingen blijven 5 minuten oud** na opslaan in AI Backoffice (drie cache-sleutels voor dezelfde `me()`-aanroep). Fix: zie fase 3 punt 1.
12. **Ongedaan maken van een verbeterde prompt wordt niet bewaard**; oude tekst komt terug. Fix: bij lege waarde `localStorage.removeItem`.
13. **Stack traces naar de browser** in vier backend-functies. Fix: alleen loggen, nooit meesturen.
14. **Foutmelding van de backend gaat verloren** in `src/components/lib/invokeLLM.jsx`: de SDK gooit bij een fout een kale netwerkfout, de dode `status`-tak vangt niets. Fix: `catch` op de fout en `error.response.data.error` doorgeven.
15. \*\*Kleine fouten in \*\***`utils/nousLLM`** (eigen code van vandaag): JSON-extractie struikelt over een `[` in de omliggende tekst; elke 400 wordt blind opnieuw geprobeerd (dubbele kosten); geen timeout; weigering van het model wordt een generieke melding. Testbestand herstelt `fetch` niet in `afterEach`.
16. **`runPrompt`**\*\* maakt van elke fout een 500\*\*, ook bij een 429 van Nous; en 36 logregels in 141 regels code, inclusief e-mailadres. Fix: status uit `LLMError` doorgeven, loggen via `utils/logger`.
17. **Velden buiten het schema**: `Thought.estimated_complexity` (geschreven maar niet gedeclareerd), `UserProfile.subscription_status` (gelezen door admin-statistieken, niet gedeclareerd). Fix: declareren of het gebruik verwijderen (open vraag 2).
18. **Paginaweergave-tracker** schrijft e-mail en user-agent vóór cookietoestemming en doet per navigatie een extra `me()`. Fix: alleen na toestemming, gebruiker uit `useAuth()`.

## Fase 1: klikpaden Multiprompt, halve dag

Uitgangspunt is het patroon dat al werkt op Dashboard: één klik op de hele kaart opent `EditItem?id=` via `createPageUrl`, binnenliggende knoppen stoppen de klik.

- **Promptvoorbeeld bewerkbaar.** `PromptPreview` toont de prompt in een alleen-lezen vak terwijl `setImprovedPrompt` al wordt doorgegeven en nooit gebruikt. Vervang het vak door een `Textarea` gekoppeld aan die setter.
- **Succesmelding wordt een link.** `SuccessBanner` zegt "Check progress in Vault" maar is niet klikbaar. Geef het id van het zojuist opgeslagen Item mee en link naar `EditItem?id=` (of naar Checks, open vraag 5).
- **Taakkaart als geheel klikbaar.** In `ThoughtCard` opent alleen een klik precies op de tekst het bewerken, via een `div` zonder toetsenbordondersteuning. Maak de kaart zelf het klikdoel (`role="button"`, `tabIndex`, Enter/Spatie), toon een potlood en handcursor, en laat checkbox, badges en menu de klik stoppen.
- **Dode bedrading weg.** `TasksList` monteert een `TaskDecomposer` die nooit kan openen (`onDecompose` wordt in `ThoughtCard` nooit aangeroepen; die gebruikt `TaskDecomposerDialog`). Houd één opsplits-dialoog over. `TemplateSelector` heeft geen enkele importeur.
- **Vuistregel** voor de hele pagina: klik = bewerken, checkbox = selecteren, ⋯-menu = overige acties.

## Fase 2: afslanking, 1 dag

| Wat                                                                                                                                                | Regels      | Waarom veilig                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| `src/api/entities.js`, `functions.js`, `integrations.js`                                                                                           | 79          | 0 importeurs; noemt Stripe-functies die niet bestaan                                  |
| `useSaveButton`, `useAddItemAutosave`, `useAppSettings`, `ui/SaveButton`, `lib/UltimateSaveButton`                                                 | 595         | 0 importeurs; `useReliableSaveButton` en `useAutosaveField` zijn de levende varianten |
| `lib/UltimateToggle`, `analytics/SocialShareButtons`                                                                                               | 397         | 0 importeurs                                                                          |
| `admin/OCRDebugPanel`                                                                                                                              | 348         | `OCRDebugModal` is de gebruikte kopie (89 % gelijk)                                   |
| `ui/use-toast`, `ui/toaster`, `ui/sonner`, `<Toaster />` in `App.jsx`                                                                              | 195         | niemand roept `useToast` aan; sonner is de enige toast                                |
| `multiprompt/TemplateSelector`, dubbele opsplits-dialoog                                                                                           | ± 300       | zie fase 1                                                                            |
| 12 lege bestanden (`pages/Home`, `pages/AdminFeatures`, `lib/supabaseClient`, `features/PromptGuardStory`, `i18n/translations/*`)                  | 0           | 0 bytes; de 6 lege `vision/*` blijven staan (platform-spiegel)                        |
| Stripe/trial-restanten: `AdminSettings` toggle `stripe_enabled`, `AdminSettingsHelp` Stripe-passages, `AdminStats` abonnementsblok                 | ± 150       | de backend-functies bestaan niet in deze repo                                         |
| npm: `react-hot-toast`, `happy-dom`, `@hookform/resolvers`, `react-markdown`, `zod`                                                                | 5 pakketten | 0 importeurs                                                                          |
| npm via ongebruikte shadcn-bestanden: `embla-carousel-react`, `input-otp`, `vaul`, `cmdk`, `react-resizable-panels`, `react-hook-form`, `recharts` | 7 pakketten | alleen bereikbaar via `ui/*` die zelf nergens geïmporteerd worden                     |

Totaal: ruim 2.000 regels en 12 pakketten. Niet aanraken: `vision/*` (spiegel van het platform), `VisualEditAgent`, `NavigationTracker`, `pages.config.js`.

## Fase 3: snelheid, 1 dag

1. **Eén bron voor de ingelogde gebruiker.** `['currentUser']` in 17 bestanden, `['currentUserSettings']` en `['authUser']` halen dezelfde `me()` op: 2 à 3 netwerkrondes per paginalading. Alles via `useAuth()`; na `updateMe` één invalidatie. Lost ook fase 0 punt 11 op.
2. **Paginaweergave-tracker** zonder eigen `me()` en alleen na toestemming (fase 0 punt 18).
3. **Eerste lading.** De landingspagina (Multiprompt, 204 KB) wordt pas geladen nadat de entry-bundel (410 KB) is uitgevoerd. Laad de hoofdpagina niet lazy, of voeg een `modulepreload` toe. `framer-motion` (108 KB) laadt terecht alleen op Dashboard.
4. **Backend parallel.** `synthesizePreferences` en `analyzeRetrospectiveFeedback` schrijven 3 tot 15 records na elkaar; `exportUserData` haalt Items en Projects na elkaar; `hardDeleteOldTasks` doet per taak drie aanroepen (tot 1.000 taken). Overal `Promise.all` of batchen.
5. **Afbeelding niet meer zelf downloaden** in `analyzeScreenshotVision` alleen om breedte en hoogte te lezen; het model haalt de afbeelding toch zelf op. Weglaten of een Range-request op de eerste kilobyte.
6. **Kleine renderwinst.** Contextwaarden van `AuthContext` en `LanguageContext` memoizen; de `recentErrorToasts`-Map opruimen.

Verwachte winst: 1 à 2 netwerkrondes minder per pagina, één ronde minder bij eerste bezoek, backend-functies met meerdere writes 3 tot 10 keer sneller.

## Fase 4: code-intelligentie, 2 à 3 dagen

1. **Datalaag per entity** in `src/api/<entity>.js`: queries, mutaties, query keys en invalidatie op één plek. Vervangt 63 directe SDK-imports, 26 losse cache-sleutels en 17 handgemaakte `created_by`-filters; `useUserEntities` wordt de interne bouwsteen. Dit is ook de naad waarop hook- en paginatests mogelijk worden.
2. **Gedeelde constanten** voor statussen en types, afgeleid van de entity-schema's (`open/success/failed/retried`, itemtypes, focus\_type). Nu 36 losse stringvergelijkingen in 7 bestanden.
3. **Backend-basis** in `base44/functions/utils/http`: `withAuth(handler)` (auth, 401, CORS, foutafhandeling zonder stack) en `ok()`/`fail()` voor één antwoordvorm. Verwijdert 17 keer dezelfde boilerplate en 5 verschillende envelopvormen. De PRO-poort uit `utils/entitlements` gebruiken in `runPrompt` én de vijf ongegate functies.
4. **`utils/nousLLM`**\*\* afmaken\*\*: schemacontrole, gerichte retry, timeout, weigeringsmelding (fase 0 punt 5 en 15).
5. **Promptteksten in één module** (`src/lib/prompts.js` en `base44/functions/utils/prompts`). Nu 21 inline templates, waarvan 4 vrijwel identieke in `AIBackoffice`.
6. **Testfundament**: mock gelijk aan de SDK (`functions.invoke` geeft `{data, status}`, `filter(query, sort)`); eerste hook-tests via de datalaag; `fetch` herstellen in teardown.
7. **Poorten**: lint en typecheck uitbreiden naar `src/lib` en `src/hooks`; GitHub Actions met lint, test en build; `npm ci` (node\_modules heeft SDK 0.8.40, lockfile 0.8.44).
8. **Navigatie op één plek**: Header-links en `routes.config.js` lopen uiteen (AI Backoffice staat in het admin-menu, route is `protected`).

## Volgorde, omvang, risico

| Fase                 | Omvang      | Risico                        | Bewijs bij oplevering                          |
| -------------------- | ----------- | ----------------------------- | ---------------------------------------------- |
| 0 Dichten            | 1 à 2 dagen | laag, gerichte fixes          | tests per fix, handmatige controle datalek     |
| 1 Klikpaden          | halve dag   | laag                          | schermafdrukken van de drie klikken            |
| 2 Afslanking         | 1 dag       | laag (0 importeurs)           | build groen, bundelgrootte voor/na             |
| 3 Snelheid           | 1 dag       | midden (cache-sleutels)       | netwerkpaneel: aantal `me()`-aanroepen voor/na |
| 4 Code-intelligentie | 2 à 3 dagen | midden, in stappen per entity | lint/typecheck-aantallen, nieuwe hook-tests    |

Fase 0 en 1 kunnen direct. Fase 2 vóór 3 en 4, zodat de omzetting minder bestanden raakt.

## Open vragen voor Patrick

1. Wat doet Base44 bij een ontbrekende `read`-regel: alles open of alles dicht?
2. Laat het platform ongedeclareerde velden vallen of bewaart het ze stil?
3. Moeten brainstorm, varianten, opsplitsen en UPSE-analyse ook achter de PRO-poort? Ze kosten nu geld op de Nous-sleutel.
4. Knop "Delete all DEMO data" helemaal weg? Advies: ja.
5. Waar moet de succesmelding na opslaan naartoe: de bewerkpagina van het Item of de Checks-pagina?

## Status na uitvoering (2026-09-02, zelfde dag)

Het plan is in vier golven uitgevoerd met 20 subagenten (5 Haiku voor mechanisch werk, 15 Sonnet voor alles wat cache-sleutels of gedrag raakt), elk met strikt gescheiden bestanden. Niets is gecommit of gedeployed; alles staat in de werkboom.

| Meting                                 | Vóór                                    | Na                                                                               |
| -------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------- |
| Tests                                  | 26 in 4 bestanden                       | 111 in 9 bestanden, groen                                                        |
| Lint                                   | 173 fouten, 74 waarschuwingen           | 0 fouten, 56 waarschuwingen; lint is nu een CI-poort                             |
| Typecheck frontend / backend           | 1.241 / 18                              | 1.238 / 17 (alle 17 in de vision-spiegel)                                        |
| shadcn-ui bestanden                    | 50 (4.075 regels)                       | 25 (1.253 regels)                                                                |
| npm runtime-pakketten                  | 55                                      | 43                                                                               |
| Regels code (git, getrackt)            |                                         | −10.177 / +2.540, plus 2.057 in nieuwe bestanden: netto ruim 5.500 regels minder |
| Bestanden die de SDK direct importeren | 63                                      | 6 (auth, uploads, LLM-helper, platform-boilerplate)                              |
| `auth.me()` per paginalading           | 2 à 3                                   | 1                                                                                |
| Eerste lading                          | entry 410 KB, daarna Multiprompt 204 KB | entry 425 KB en Multiprompt 193 KB, nu parallel geladen                          |

**Gedaan.** Fase 0 volledig (alle 18 punten; punt 3 bewust anders: de LLM-functies blijven vrij op besluit van Patrick). Fase 1 volledig (promptvoorbeeld bewerkbaar, succesmelding linkt naar Checks, taakkaart als geheel klikbaar met toetsenbord, dode dialoog en template-kiezer weg). Fase 2 volledig plus 13 extra shadcn-bestanden zonder importeurs. Fase 3 volledig; de landingspagina laadt nu parallel via een prefetch in `App.jsx` (het platform-bestand `pages.config.js` is niet aangeraakt). Fase 4: datalaag in `src/api/` (12 modules), gedeelde statusconstanten, backend-basis `utils/http` op alle 17 functies, LLM-module met schemacontrole, timeout, gerichte retry en weigeringsmelding, promptteksten in twee modules met 33 tests, testmock gelijk aan de SDK, lint-scope verbreed, CI-workflow, `.coderabbit.yaml` gecorrigeerd. Auth is volledig gecentraliseerd (`updateMe`, `logout(url)`, `loginWithProvider` in `AuthContext`).

**Nog open.**

- 56 lint-waarschuwingen over ongebruikte variabelen: elk geval apart bekijken (kan een vergeten stuk logica verraden).
- Typecheck-schuld (\~1.240 meldingen) blijft informatief in CI.
- Header toont AI Backoffice in het admin-menu terwijl de route `protected` is; keuze voor Patrick: menu verplaatsen of route op `admin`.
- Screenshot-URL-toegestane hosts staan op `base44.app` afgeleid uit de configuratie; als uploads op een andere host staan, `SCREENSHOT_URL_ALLOWLIST` zetten.

**Niet live getest.** Alle bewijs is statisch (tests, build, lint, type-check). Er is geen enkele echte aanroep naar Nous gedaan (jouw regel: eerst vragen bij betaalde aanroepen) en de app is niet ingelogd doorgeklikt. Na deployen: één keer Improve Prompt, één screenshot-analyse, brainstorm en de DEMO-scan draaien.

**Voor Patrick.**

1. `NOUS_API_KEY` als secret zetten in het Base44-dashboard; de sleutel uit de chat roteren.
2. `base44/` (functies én entity-schema's) deployen; controleren of `seedDemoData` nog op het platform bestaat en die verwijderen.
3. Committen in stappen (voorstel: fase 0+1, fase 2, fase 3, fase 4), zodat elke stap apart terug te draaien is.

## Update: geen backend-functies op dit plan (2026-09-02, avond)

Na de eerste push bleek uit een controle van de live endpoints dat het Base44-account **geen backend-functies** mag draaien: elke aanroep van `/functions/*` geeft 402 met "Functions are blocked - app owner lacks backend functions capability", ook voor niet-bestaande namen. De database antwoordt normaal (200). Secrets in het dashboard zijn daardoor onbruikbaar, want alleen functies kunnen die lezen. Patrick koos: alles naar de browser, functiemap weg.

**Uitgevoerd.**

- `src/lib/nousClient.js`: browser-versie van de LLM-module (zelfde gedrag: schemacontrole, gerichte retry, timeout, weigeringsmelding); Nous staat browseraanroepen toe (CORS open, gecontroleerd).
- Sleutelbeheer: nieuwe velden `nous_api_key`, `nous_text_model`, `nous_vision_model` op `AISettings`; invoer bij AI Backoffice; `NousKeyLoader` laadt de sleutel na inloggen. De sleutel staat nergens in code, bundle of env.
- Client-side diensten met dezelfde in- en uitvoer als de oude functies: `src/lib/ai/screenshotAnalysis.js`, `src/lib/ai/learning.js`, `src/lib/maintenance.js`, `src/lib/adminStats.js`; `src/api/functions.js` is een facade met de oude namen, zodat de aanroepers niet hoefden te veranderen. Promptteksten van de backend zijn woordelijk gelijk overgezet naar `src/lib/prompts.js` (geverifieerd per functie).
- Verwijderd: `base44/functions/` (17 functies, 3 hulpmodules), de PRO-poort, de backend-tests en de Vitest-vertaalregel voor `npm:`. Onderzoeksdocumenten linken direct naar arXiv. Statistieken zijn beperkt tot het eigen account (de rijregels laten geen andere accounts zien).
- Stand: 123 tests groen in 11 bestanden, 0 lintfouten (54 waarschuwingen), build groen.

**Voor Patrick.** Na de push: log in, ga naar AI Backoffice, vul de Nous-sleutel in en sla op. Test daarna één keer Improve Prompt, een screenshot-analyse en brainstorm. Alle bewijs tot nu toe is statisch; er is niet live met de sleutel getest.
