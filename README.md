# Promptster

Promptster verzamelt losse gedachten en taken per project, bouwt daar met start- en eindtemplates één verbeterde prompt van voor AI-codeertools, en bewaart het resultaat in een kluis met afvinkbare controlepunten. React 18 + Vite op het Base44-platform; LLM-aanroepen lopen via Nous Research.

## Documentatie

- [[QUICKSTART]]: installeren, draaien, eerste test, kwaliteitspoorten.
- [[CLAUDE]]: architectuur en afspraken voor mens en AI-assistent (commando's, datalaag, backend-patroon, valkuilen).
- [[TEST_README]]: testomgeving, SDK-mock, hooks en backend-code testen.
- [[REFACTOR_PLAN]]: het verbeterplan van 2026-09-02 en de status per fase.

## In één oogopslag

| Onderdeel                                       | Waar                                  |
| ----------------------------------------------- | ------------------------------------- |
| Pagina's en hooks                               | `src/pages/`, `src/components/hooks/` |
| Datalaag (één module per entity)                | `src/api/`                            |
| Backend-functies (Deno, op het Base44-platform) | `base44/functions/`                   |
| Entity-schema's met rijregels                   | `base44/entities/`                    |
| Tests                                           | `src/tests/`                          |

