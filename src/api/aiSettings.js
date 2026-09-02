import { createEntityApi } from "@/api/createEntityApi";

/**
 * AISettings entity API. One row per user in practice (AIBackoffice.jsx
 * reads `settings[0]`) but modelled as a list like every other user-scoped
 * entity — the RLS only guarantees created_by === user.email, not uniqueness.
 *
 * Cache keys: `['aiSettings']` (all), `['aiSettings', email]` (list —
 * identical to the `['aiSettings', currentUser?.email]` key AIBackoffice.jsx
 * uses today), `['aiSetting', id]` (one).
 *
 * Fields of note (base44/entities/AISettings.jsonc): improve_prompt_instruction,
 * model_preference ("default" | "creative" | "precise"),
 * enable_context_suggestions, enable_verbalized_sampling,
 * enable_reasoning_transparency.
 */
const aiSettingsApi = createEntityApi("AISettings", { keyBase: "aiSettings", oneKeyBase: "aiSetting" });

export const keys = aiSettingsApi.keys;
export const listMine = aiSettingsApi.listMine;
export const get = aiSettingsApi.get;
export const create = aiSettingsApi.create;
export const update = aiSettingsApi.update;
export const remove = aiSettingsApi.remove;

export const useList = aiSettingsApi.useList;
export const useOne = aiSettingsApi.useOne;
export const useCreate = aiSettingsApi.useCreate;
export const useUpdate = aiSettingsApi.useUpdate;
export const useRemove = aiSettingsApi.useRemove;
