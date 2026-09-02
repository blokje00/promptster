# Promptster

Promptster verzamelt losse gedachten en taken per project, bouwt daar met start- en eindtemplates één verbeterde prompt van voor AI-codeertools, en bewaart het resultaat in een kluis met afvinkbare controlepunten. React 18 + Vite op het Base44-platform (database, auth, hosting; geen backend-functies op dit plan). Alle AI loopt rechtstreeks vanuit de browser via Nous Research; de sleutel voer je in bij AI Backoffice.

## Documentatie

- [[QUICKSTART]]: installeren, draaien, eerste test, kwaliteitspoorten.
- [[CLAUDE]]: architectuur en afspraken voor mens en AI-assistent (commando's, datalaag, backend-patroon, valkuilen).
- [[TEST_README]]: testomgeving, SDK-mock, hooks en backend-code testen.
- [[REFACTOR_PLAN]]: het verbeterplan van 2026-09-02 en de status per fase.

## In één oogopslag

| Onderdeel                                 | Waar                                                         |
| ----------------------------------------- | ------------------------------------------------------------ |
| Pagina's en hooks                         | `src/pages/`, `src/components/hooks/`                        |
| Datalaag (één module per entity)          | `src/api/`                                                   |
| AI-diensten in de browser (Nous Research) | `src/lib/nousClient.js`, `src/lib/ai/`, `src/lib/prompts.js` |
| Entity-schema's met rijregels             | `base44/entities/`                                           |
| Tests                                     | `src/tests/`                                                 |

