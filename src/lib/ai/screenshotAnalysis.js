/**
 * Client-side screenshot vision analysis + caching.
 *
 * Ported from base44/functions/analyzeScreenshotVision/entry.ts and
 * base44/functions/analyzeScreenshotWithCache/entry.ts: this Base44 plan
 * has no backend functions (every /functions/* call returns 402 "Functions
 * are blocked"), so vision analysis now runs in the browser — it calls the
 * Nous Research vision model directly via src/lib/nousClient.js and caches
 * the result on the ScreenshotAsset row via src/api/screenshotAssets.js.
 *
 * The two backend functions used `base44.functions.invoke()` to fetch the
 * image and read its dimensions server-side (a Range request for the PNG/
 * JPEG header); the browser has no equivalent low-level fetch-and-parse, so
 * dimensions are read with `new Image()` instead, defaulting to 1920x1080
 * on error or timeout exactly like the backend defaulted before it could
 * parse a header.
 *
 * Exports return the same response shape the backend functions did (via
 * their `ok()`/`fail()` envelope helpers, see base44/functions/utils/http),
 * so the existing callers (RetryModal, OCRDebugModal, ThoughtCard,
 * TaskInputArea, ScreenshotUploader, usePromptGeneration,
 * useMultipromptState — all via src/api/functions.js) work unchanged.
 *
 * @module screenshotAnalysis
 */
import { invokeLLM, getNousConfig } from "@/lib/nousClient";
import { screenshotVisionPrompt, screenshotVisionSchema } from "@/lib/prompts";
import * as screenshotAssets from "@/api/screenshotAssets";

const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;
const DIMENSION_TIMEOUT_MS = 5000;

/**
 * Read an image's natural pixel dimensions in the browser. Never rejects:
 * resolves to the 1920x1080 default (matching the backend's pre-header-read
 * default) on load error or after a 5s timeout.
 *
 * @param {string} imageUrl
 * @returns {Promise<{width: number, height: number}>}
 */
function readImageDimensions(imageUrl) {
  return new Promise((resolve) => {
    let settled = false;
    let timer;

    const finish = (width, height) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ width, height });
    };

    timer = setTimeout(() => finish(DEFAULT_WIDTH, DEFAULT_HEIGHT), DIMENSION_TIMEOUT_MS);

    try {
      const img = new Image();
      img.onload = () => finish(img.naturalWidth || DEFAULT_WIDTH, img.naturalHeight || DEFAULT_HEIGHT);
      img.onerror = () => finish(DEFAULT_WIDTH, DEFAULT_HEIGHT);
      img.src = imageUrl;
    } catch {
      finish(DEFAULT_WIDTH, DEFAULT_HEIGHT);
    }
  });
}

/**
 * Spatial layout relations between regions — ported byte-identical from
 * analyzeScreenshotVision/entry.ts's generateLayoutRelations.
 *
 * @param {Array<object>} regions
 * @returns {Array<{fromId: string, toId: string, relation: string, distance: number}>}
 */
function generateLayoutRelations(regions) {
  if (!Array.isArray(regions) || regions.length === 0) return [];

  const relations = [];

  for (let i = 0; i < regions.length; i++) {
    for (let j = i + 1; j < regions.length; j++) {
      const r1 = regions[i];
      const r2 = regions[j];

      if (!r1?.bbox || !r2?.bbox) continue;
      if (typeof r1.bbox.x !== 'number' || typeof r2.bbox.x !== 'number') continue;

      const cx1 = r1.bbox.x + (r1.bbox.width || 0) / 2;
      const cy1 = r1.bbox.y + (r1.bbox.height || 0) / 2;
      const cx2 = r2.bbox.x + (r2.bbox.width || 0) / 2;
      const cy2 = r2.bbox.y + (r2.bbox.height || 0) / 2;

      const dx = cx2 - cx1;
      const dy = cy2 - cy1;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 300) {
        const relationType = Math.abs(dx) > Math.abs(dy)
          ? (dx > 0 ? 'right_of' : 'left_of')
          : (dy > 0 ? 'below' : 'above');

        relations.push({
          fromId: r1.id,
          toId: r2.id,
          relation: relationType,
          distance: Math.round(distance)
        });
      }
    }
  }

  return relations;
}

/**
 * Resolve the image URL to analyze: a direct url/screenshotUrl wins, else
 * look up the caller's ScreenshotAsset by id. RLS already scopes that
 * lookup to the owner (see src/api/screenshotAssets.js), so no host
 * allow-list is needed here the way the backend needed one.
 */
async function resolveImageUrl({ url, screenshotUrl, screenshotId }) {
  const direct = url || screenshotUrl;
  if (direct) return direct;

  if (!screenshotId) {
    throw new Error('Missing screenshot reference (screenshotId or screenshotUrl/url required)');
  }

  const asset = await screenshotAssets.get(screenshotId);
  if (!asset?.public_url) {
    throw new Error('Screenshot not found');
  }
  return asset.public_url;
}

/**
 * Run LLM vision analysis (OCR + layout) on one screenshot. Client-side
 * port of analyzeScreenshotVision/entry.ts: resolves the image, reads its
 * pixel dimensions, sends it to the Nous vision model, and returns the
 * same success shape the backend's `ok({...})` response had.
 *
 * @param {{url?: string, screenshotId?: string, screenshotUrl?: string, projectId?: string, level?: string}} params
 * @returns {Promise<object>}
 * @throws {Error} when the image can't be resolved or the LLM call fails — callers already catch.
 */
export async function analyzeScreenshotVision({ url, screenshotId, screenshotUrl, projectId, level = 'full' } = {}) {
  const startTime = Date.now();

  const imageUrl = await resolveImageUrl({ url, screenshotUrl, screenshotId });
  const { width, height } = await readImageDimensions(imageUrl);

  const prompt = screenshotVisionPrompt({ level });

  let result;
  try {
    result = await invokeLLM({
      prompt,
      file_urls: [imageUrl],
      response_json_schema: screenshotVisionSchema
    });
  } catch (error) {
    throw new Error(error?.message || 'Screenshot vision analysis failed');
  }

  const regions = Array.isArray(result.regions) ? result.regions : [];
  const semanticBlocks = Array.isArray(result.semanticBlocks) ? result.semanticBlocks : [];
  const layoutRelations = generateLayoutRelations(regions);

  let achievedLevel = 'level_2';
  if (semanticBlocks.length > 0 && layoutRelations.length > 0) {
    achievedLevel = 'level_3';
  }
  if (result.detectedComponents && result.detectedComponents.length > 0) {
    achievedLevel = 'level_4';
  }

  const processingTime = Date.now() - startTime;

  const ocrData = {
    text: regions.map((r) => r.text).filter(Boolean).join(' '),
    summary: result.summary || "UI screenshot analyzed",
    regions,
    lines: regions.filter((r) => r.type === 'text' || r.type === 'heading')
  };

  const visionStructure = result.detectedComponents && result.detectedComponents.length > 0 ? {
    components: regions,
    metadata: {
      componentCount: regions.length,
      detectedTypes: [...new Set(regions.map((r) => r.type))],
      layoutPattern: result.layoutPattern || 'unknown'
    },
    layoutTree: null
  } : null;

  return {
    ok: true,
    mode: 'vision-llm-v1',
    sourceUrl: imageUrl,
    imageUrl,
    projectId: projectId || null,
    width,
    height,
    summary: result.summary || "UI screenshot analyzed",
    ocr: ocrData,
    regions,
    semanticBlocks,
    layoutRelations,
    visionStructure,
    metadata: {
      processingTime,
      ocrAvailable: true,
      layoutAvailable: regions.length > 0,
      classificationAvailable: regions.length > 0,
      analysisLevel: achievedLevel,
      ocrLevel: achievedLevel,
      requestedLevel: level,
      method: 'llm_vision',
      model: getNousConfig().visionModel
    }
  };
}

/**
 * Smart screenshot analysis with caching. Client-side port of
 * analyzeScreenshotWithCache/entry.ts: returns the cached vision_analysis
 * from the matching ScreenshotAsset row when present (and not forcing a
 * refresh), otherwise runs `analyzeScreenshotVision` and persists the
 * result on that row.
 *
 * @param {{screenshotUrl: string, level?: string, forceRefresh?: boolean}} params
 * @returns {Promise<object>}
 * @throws {Error} when screenshotUrl is missing or analysis fails.
 */
export async function analyzeScreenshotWithCache({ screenshotUrl, level = 'full', forceRefresh = false } = {}) {
  if (!screenshotUrl) {
    throw new Error('Missing screenshotUrl');
  }

  const startTime = Date.now();
  const asset = await screenshotAssets.findByUrl(screenshotUrl);

  if (asset?.vision_analysis && !forceRefresh) {
    const cacheAge = Math.round((Date.now() - new Date(asset.vision_analysis.analyzedAt).getTime()) / 1000);

    return {
      ok: true,
      cached: true,
      cacheAge,
      ...asset.vision_analysis,
      metadata: {
        ...asset.vision_analysis.metadata,
        processingTime: Date.now() - startTime,
        cached: true
      }
    };
  }

  const analysis = await analyzeScreenshotVision({ screenshotUrl, level });

  // Same shape the backend's cachePayload wrote onto ScreenshotAsset.vision_analysis.
  const cachePayload = {
    mode: analysis.mode,
    sourceUrl: analysis.sourceUrl,
    imageUrl: analysis.imageUrl,
    projectId: analysis.projectId,
    ocr: analysis.ocr,
    regions: analysis.regions,
    semanticBlocks: analysis.semanticBlocks,
    layoutRelations: analysis.layoutRelations,
    visionStructure: analysis.visionStructure,
    width: analysis.width,
    height: analysis.height,
    summary: analysis.summary,
    metadata: analysis.metadata,
    analyzedAt: new Date().toISOString()
  };

  if (asset) {
    await screenshotAssets.updateVisionAnalysis(asset.id, cachePayload);
  }

  return { ok: true, cached: false, ...analysis };
}

/**
 * Fire-and-forget "prime the cache" vision analysis for one screenshot URL,
 * always at level "full". Equivalent to the old
 * `functions.analyzeScreenshotUrl(url)` wrapper.
 *
 * @param {string} url
 * @returns {Promise<object>}
 */
export function analyzeScreenshotUrl(url) {
  return analyzeScreenshotWithCache({ screenshotUrl: url, level: 'full' });
}
