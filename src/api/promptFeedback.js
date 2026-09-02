import { base44 } from "@/api/base44Client";
import { createEntityApi } from "@/api/createEntityApi";

/**
 * PromptFeedback entity API.
 *
 * Cache keys: `['promptFeedback']` (all), `['promptFeedback', email]` (list —
 * identical to the `['promptFeedback', currentUser?.email]` key
 * FeedbackInsights.jsx uses today), `['promptFeedbackItem', id]` (one).
 *
 * Fields of note (base44/entities/PromptFeedback.jsonc): project_id, rating
 * ("excellent" | "good" | "okay" | "poor"), what_worked, what_failed,
 * applied_to_preferences. Applying learnings from a feedback row goes through
 * the `applyFeedbackToPreferences` backend function (see src/api/functions.js),
 * not a plain entity update.
 */
const promptFeedbackApi = createEntityApi("PromptFeedback", {
  keyBase: "promptFeedback",
  oneKeyBase: "promptFeedbackItem",
});

export const keys = promptFeedbackApi.keys;
export const listMine = promptFeedbackApi.listMine;
export const get = promptFeedbackApi.get;
export const create = promptFeedbackApi.create;
export const update = promptFeedbackApi.update;
export const remove = promptFeedbackApi.remove;

export const useList = promptFeedbackApi.useList;
export const useOne = promptFeedbackApi.useOne;
export const useCreate = promptFeedbackApi.useCreate;
export const useUpdate = promptFeedbackApi.useUpdate;
export const useRemove = promptFeedbackApi.useRemove;

/**
 * The three extra query shapes the client-side ports of the learning
 * functions need (src/lib/ai/learning.js), matching what the old backend
 * functions (synthesizePreferences / analyzeRetrospectiveFeedback /
 * applyFeedbackToPreferences) used to query for directly.
 */

/** PromptFeedback rows for one project + rating (synthesizePreferences). */
export async function listByProjectAndRating(projectId, rating) {
  if (!projectId) return [];
  const rows = await base44.entities.PromptFeedback.filter({ project_id: projectId, rating });
  return Array.isArray(rows) ? rows : (rows?.data ?? []);
}

/**
 * All PromptFeedback rows for a project, or every row the signed-in user can
 * see (via RLS) when projectId is falsy — mirrors the backend's
 * `filter({ project_id: project_id || undefined })` (analyzeRetrospectiveFeedback).
 */
export async function listByProjectOrAll(projectId) {
  const rows = await base44.entities.PromptFeedback.filter({ project_id: projectId || undefined });
  return Array.isArray(rows) ? rows : (rows?.data ?? []);
}

/**
 * Look up one PromptFeedback row by id via `.filter`, not `.get` — a missing
 * id resolves to an empty array instead of throwing, so callers can turn it
 * into a plain "not found" error (applyFeedbackToPreferences).
 */
export async function listById(feedbackId) {
  if (!feedbackId) return [];
  const rows = await base44.entities.PromptFeedback.filter({ id: feedbackId });
  return Array.isArray(rows) ? rows : (rows?.data ?? []);
}
