import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createEntityApi } from "@/api/createEntityApi";

/**
 * LearnedPattern entity API. Unlike most entities here, the app reads this
 * PROJECT-scoped rather than user-scoped (see LearnedPatternsPanel.jsx,
 * AIBackoffice.jsx) — patterns are learned per project, and every project
 * already belongs to one user via RLS.
 *
 * Cache keys: `['learnedPatterns']` (all — prefix, also invalidated by the
 * `synthesizePreferences` / `analyzeRetrospectiveFeedback` functions in
 * src/api/functions.js), `['learnedPatterns', projectId]` (byProject — this
 * IS the literal key LearnedPatternsPanel.jsx / AIBackoffice.jsx already use),
 * `['learnedPattern', id]` (one).
 *
 * Fields of note (base44/entities/LearnedPattern.jsonc): project_id,
 * pattern_type ("preference_synthesis" | "retrospective" | "task_decomposition"),
 * pattern_text, domain, confidence, sample_size, success_rate, is_active.
 */
const learnedPatternApi = createEntityApi("LearnedPattern", {
  keyBase: "learnedPatterns",
  oneKeyBase: "learnedPattern",
});

export const keys = {
  ...learnedPatternApi.keys,
  byProject: (projectId) => ["learnedPatterns", projectId],
};

export const get = learnedPatternApi.get;
export const create = learnedPatternApi.create;
export const update = learnedPatternApi.update;
export const remove = learnedPatternApi.remove;
export const useOne = learnedPatternApi.useOne;
export const useCreate = learnedPatternApi.useCreate;
export const useUpdate = learnedPatternApi.useUpdate;
export const useRemove = learnedPatternApi.useRemove;

/** Patterns for one project, newest first (matches LearnedPatternsPanel.jsx). */
export async function listByProject(projectId) {
  if (!projectId) return [];
  const patterns = await base44.entities.LearnedPattern.filter({ project_id: projectId });
  const list = Array.isArray(patterns) ? patterns : (patterns?.data ?? []);
  return [...list].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
}

export function useByProject(projectId, queryOptions = {}) {
  return useQuery({
    queryKey: keys.byProject(projectId),
    queryFn: () => listByProject(projectId),
    enabled: !!projectId,
    ...queryOptions,
  });
}
