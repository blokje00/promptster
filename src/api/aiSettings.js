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

/**
 * Create-or-update the current user's AISettings row (there's at most one in
 * practice — see the module doc above). Looks up the user's existing rows
 * and, if one exists, sends `patch` as a partial update (the backend merges
 * partial payloads server-side, same as e.g. src/api/thoughts.js softDelete);
 * otherwise creates a fresh row with `patch` plus `created_by`. On create,
 * `patch` must satisfy the entity's required fields itself (currently just
 * `improve_prompt_instruction`, see base44/entities/AISettings.jsonc) —
 * this helper does not fill in defaults for the caller.
 */
export async function upsertMine(email, patch) {
  if (!email) throw new Error("upsertMine requires a signed-in user's email");
  const existing = await aiSettingsApi.listMine(email);
  const row = existing[0];
  if (row) {
    return aiSettingsApi.update(row.id, patch);
  }
  return aiSettingsApi.create({ ...patch, created_by: email });
}
