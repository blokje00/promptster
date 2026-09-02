import { withAuth, ok, fail } from '../utils/http/entry.ts';
import { invokeLLM, getLLMConfig } from '../utils/nousLLM/entry.ts';
import { screenshotVisionPrompt, screenshotVisionSchema } from '../utils/prompts/entry.ts';

/**
 * Advanced screenshot vision analysis using the Nous Research vision model
 * 100% Deno-compatible - NO BROWSER APIs
 * Returns standardized data structure for OCR Debug Panel
 */

// Hosts the app's own screenshot storage actually resolves to (see
// src/lib/app-params.js: VITE_BASE44_SERVER_URL / VITE_BASE44_APP_BASE_URL
// both default to https://base44.app; uploadScreenshot/entry.ts and
// src/components/lib/uploadFile.jsx get their public URL from the same
// base44.integrations.Core.UploadFile call). Extra hosts (e.g. a CDN in
// front of storage) can be added via SCREENSHOT_URL_ALLOWLIST without a
// code change.
const DEFAULT_SCREENSHOT_HOSTS = ['base44.app'];

Deno.serve(withAuth({ name: 'analyzeScreenshotVision' }, async ({ base44, body }) => {
  const startTime = Date.now();

  const { url, screenshotId, screenshotUrl, projectId, level = 'full' } = body || {};
  const resolvedUrl = url || screenshotUrl;

  if (!resolvedUrl && !screenshotId) {
    return fail('Missing screenshot reference (screenshotId or screenshotUrl/url required)', 400);
  }

  const envAllowlist = (Deno.env.get('SCREENSHOT_URL_ALLOWLIST') || '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);

  let imageUrl = resolvedUrl;

  if (screenshotId && !imageUrl) {
    try {
      // Caller-scoped client, not asService Role: RLS (created_by) restricts
      // this to the caller's own ScreenshotAsset rows.
      const assets = await base44.entities.ScreenshotAsset.filter({
        id: screenshotId
      });

      if (!assets || assets.length === 0) {
        return fail('Screenshot not found', 404);
      }

      imageUrl = assets[0].public_url;
      console.log('[analyzeScreenshotVision] Resolved URL:', imageUrl);
    } catch (error) {
      return fail('Failed to fetch screenshot: ' + error.message, 500);
    }
  }

  if (!imageUrl) {
    return fail('Could not resolve image URL', 400);
  }

  // Accept the URL when it points at known screenshot storage, or when it is
  // one of the caller's own uploaded screenshots (RLS-scoped lookup by
  // public_url), so a storage host we did not anticipate still works.
  let allowed = isAllowedScreenshotUrl(imageUrl, envAllowlist);
  if (!allowed) {
    const own = await base44.entities.ScreenshotAsset
      .filter({ public_url: imageUrl })
      .catch(() => []);
    allowed = Array.isArray(own) && own.length > 0;
  }
  if (!allowed) {
    return fail('Screenshot URL not allowed', 400);
  }

  console.log('[analyzeScreenshotVision] Analyzing:', imageUrl, '| Level:', level);

  // Get dimensions without downloading the whole image: a Range request
  // for the first 64 KB is enough to read a PNG IHDR chunk or scan JPEG
  // SOF markers near the start of the file. The model fetches the full
  // image itself for the actual vision analysis.
  let width = 1920;
  let height = 1080;

  try {
    const MAX_BYTES = 65536;
    const imageResponse = await fetch(imageUrl, {
      headers: { Range: `bytes=0-${MAX_BYTES - 1}` }
    });
    if (imageResponse.ok) {
      const buffer = await imageResponse.arrayBuffer();
      const uint8 = new Uint8Array(buffer.slice(0, MAX_BYTES));

      if (uint8[0] === 0x89 && uint8[1] === 0x50) { // PNG
        width = (uint8[16] << 24) | (uint8[17] << 16) | (uint8[18] << 8) | uint8[19];
        height = (uint8[20] << 24) | (uint8[21] << 16) | (uint8[22] << 8) | uint8[23];
      } else if (uint8[0] === 0xFF && uint8[1] === 0xD8) { // JPEG
        let offset = 2;
        while (offset < uint8.length - 9) {
          if (uint8[offset] === 0xFF && (uint8[offset + 1] === 0xC0 || uint8[offset + 1] === 0xC2)) {
            height = (uint8[offset + 5] << 8) | uint8[offset + 6];
            width = (uint8[offset + 7] << 8) | uint8[offset + 8];
            break;
          }
          offset++;
        }
      }
    }
  } catch (error) {
    console.warn('[analyzeScreenshotVision] Could not read dimensions:', error.message);
  }

  // LLM Vision analysis
  const prompt = screenshotVisionPrompt({ level });

  try {
    const result = await invokeLLM({
      prompt,
      file_urls: [imageUrl],
      response_json_schema: screenshotVisionSchema
    });

    const regions = Array.isArray(result.regions) ? result.regions : [];
    const semanticBlocks = Array.isArray(result.semanticBlocks) ? result.semanticBlocks : [];
    const layoutRelations = generateLayoutRelations(regions);

    // Determine achieved level
    let achievedLevel = 'level_2';
    if (semanticBlocks.length > 0 && layoutRelations.length > 0) {
      achievedLevel = 'level_3';
    }
    if (result.detectedComponents && result.detectedComponents.length > 0) {
      achievedLevel = 'level_4';
    }

    const processingTime = Date.now() - startTime;

    // Build OCR object
    const ocrData = {
      text: regions.map(r => r.text).filter(Boolean).join(' '),
      summary: result.summary || "UI screenshot analyzed",
      regions: regions,
      lines: regions.filter(r => r.type === 'text' || r.type === 'heading')
    };

    // Build vision structure for Level 4
    const visionStructure = result.detectedComponents && result.detectedComponents.length > 0 ? {
      components: regions,
      metadata: {
        componentCount: regions.length,
        detectedTypes: [...new Set(regions.map(r => r.type))],
        layoutPattern: result.layoutPattern || 'unknown'
      },
      layoutTree: null
    } : null;

    console.log('[analyzeScreenshotVision] Success in', processingTime, 'ms | Level:', achievedLevel);

    return ok({
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
        model: getLLMConfig().visionModel
      }
    });

  } catch (error) {
    console.error('[analyzeScreenshotVision] LLM failed:', error);
    const processingTime = Date.now() - startTime;

    return fail(error.message, 500, {
      mode: 'vision-error',
      sourceUrl: imageUrl,
      width,
      height,
      ocr: { text: '', summary: 'Analysis failed', regions: [], lines: [] },
      regions: [],
      semanticBlocks: [],
      layoutRelations: [],
      visionStructure: null,
      metadata: {
        processingTime,
        ocrAvailable: false,
        layoutAvailable: false,
        classificationAvailable: false,
        analysisLevel: 'failed',
        ocrLevel: 'failed',
        error: error.message,
        method: 'llm_vision'
      }
    });
  }
}));

/**
 * Generate spatial layout relations between regions
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
 * Whether `url` is allowed to be fetched server-side for vision analysis:
 * must be https, and its hostname must equal (or be a subdomain of) one of
 * the app's own screenshot storage hosts, or one from the optional
 * SCREENSHOT_URL_ALLOWLIST env var (comma-separated hostnames).
 */
export function isAllowedScreenshotUrl(url: string, allowlist: string[] = []): boolean {
  if (!url || typeof url !== 'string') return false;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') return false;

  const host = parsed.hostname.toLowerCase();
  const allowedHosts = [...DEFAULT_SCREENSHOT_HOSTS, ...allowlist];

  return allowedHosts.some((allowedRaw) => {
    const allowed = allowedRaw.toLowerCase().trim();
    if (!allowed) return false;
    return host === allowed || host.endsWith(`.${allowed}`);
  });
}
