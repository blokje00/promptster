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
 * analyzeScreenshotWithCache/entry.ts).
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
