/**
 * Data layer barrel (Fase 4, punt 1 of REFACTOR_PLAN.md).
 *
 * One module per Base44 entity (projects, templates, thoughts, items,
 * aiSettings, promptFeedback, learnedPatterns, projectStructures,
 * screenshotAssets, supportTickets), all built on createEntityApi.js, plus
 * functions.js for backend function calls.
 *
 * Conventions:
 * - Each module exports `keys` (query-key builders), plain async functions
 *   (listMine/get/create/update/remove — usable outside components, e.g.
 *   inside another mutation) and hooks (useList/useOne/useCreate/useUpdate/
 *   useRemove — usable inside components, wire up TanStack Query automatically).
 * - `keys.all` is the invalidation PREFIX for that entity; `keys.list(email, filters)`
 *   and `keys.one(id)` are exact keys. List keys reuse the exact strings the
 *   app already uses (e.g. ['items', email], ['projects', email]) so pages
 *   still on useUserEntities and pages migrated to this API share one cache
 *   entry — no double fetching during migration.
 * - Prefer the hooks in components; use the plain functions from non-React
 *   code (other mutations, tests, one-off scripts).
 * - Never import base44Client directly from a page or component — go through
 *   this layer so cache keys and invalidation stay centralized. The only
 *   files allowed to import "@/api/base44Client" directly are the modules
 *   under src/api/ itself.
 * - Never call base44.functions.invoke("invokeLLM", ...) or
 *   base44.integrations.Core.InvokeLLM directly — use
 *   src/components/lib/invokeLLM.jsx (frontend) which goes through the
 *   Nous-backed backend function, not Base44's metered LLM credits.
 */

export * as projects from "@/api/projects";
export * as templates from "@/api/templates";
export * as thoughts from "@/api/thoughts";
export * as items from "@/api/items";
export * as aiSettings from "@/api/aiSettings";
export * as promptFeedback from "@/api/promptFeedback";
export * as learnedPatterns from "@/api/learnedPatterns";
export * as projectStructures from "@/api/projectStructures";
export * as screenshotAssets from "@/api/screenshotAssets";
export * as supportTickets from "@/api/supportTickets";
export * as appSettings from "@/api/appSettings";
export * as pageViews from "@/api/pageViews";
export * as featureContentBlocks from "@/api/featureContentBlocks";
export * as functions from "@/api/functions";
export { createEntityApi } from "@/api/createEntityApi";
