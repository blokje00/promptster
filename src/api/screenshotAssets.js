import { base44 } from "@/api/base44Client";
import { createEntityApi } from "@/api/createEntityApi";

/**
 * ScreenshotAsset entity API. Created server-side by the `uploadScreenshot`
 * backend function (see src/api/functions.js); the frontend mostly reads
 * these by public_url through the `analyzeScreenshotWithCache` function
 * rather than filtering the entity directly, so this module only exposes
 * plain CRUD plus the standard hooks for the rare direct read.
 *
 * Cache keys: `['screenshotAssets']` (all), `['screenshotAssets', email]`
 * (list), `['screenshotAsset', id]` (one).
 *
 * Fields of note (base44/entities/ScreenshotAsset.jsonc): user_id, project_id,
 * task_id, bucket, path, public_url, filename, content_type, size_bytes,
 * vision_analysis (cache of analyzeScreenshotVision's result, see
 * src/lib/ai/screenshotAnalysis.js — the client-side port of the former
 * analyzeScreenshotWithCache/entry.ts backend function).
 */
const screenshotAssetApi = createEntityApi("ScreenshotAsset", {
  keyBase: "screenshotAssets",
  oneKeyBase: "screenshotAsset",
});

export const keys = screenshotAssetApi.keys;
export const listMine = screenshotAssetApi.listMine;
export const get = screenshotAssetApi.get;
export const create = screenshotAssetApi.create;
export const update = screenshotAssetApi.update;
export const remove = screenshotAssetApi.remove;

export const useList = screenshotAssetApi.useList;
export const useOne = screenshotAssetApi.useOne;
export const useCreate = screenshotAssetApi.useCreate;
export const useUpdate = screenshotAssetApi.useUpdate;
export const useRemove = screenshotAssetApi.useRemove;

/**
 * Find the caller's ScreenshotAsset by its public_url, mirroring the lookup
 * the old analyzeScreenshotWithCache/entry.ts backend function did with
 * `base44.entities.ScreenshotAsset.filter({ public_url: screenshotUrl })`.
 * No explicit `created_by` filter is added: RLS (base44/entities/ScreenshotAsset.jsonc)
 * already scopes reads to the owner, so this only ever sees the caller's
 * own rows.
 *
 * @param {string} url
 * @returns {Promise<object|null>} the first matching asset, or null.
 */
export async function findByUrl(url) {
  if (!url) return null;
  const result = await base44.entities.ScreenshotAsset.filter({ public_url: url });
  const list = Array.isArray(result) ? result : (result?.data ?? []);
  return list.length > 0 ? list[0] : null;
}

/**
 * Persist a fresh vision_analysis cache payload on an existing
 * ScreenshotAsset row. Thin wrapper around `update` so the call site in
 * src/lib/ai/screenshotAnalysis.js reads clearly.
 *
 * @param {string} id
 * @param {object} visionAnalysis
 */
export function updateVisionAnalysis(id, visionAnalysis) {
  return update(id, { vision_analysis: visionAnalysis });
}
