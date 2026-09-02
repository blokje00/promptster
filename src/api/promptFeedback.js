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
