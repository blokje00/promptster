import { withAuth, ok, fail } from '../utils/http/entry.ts';

/**
 * Smart screenshot analysis with caching
 * Checks if screenshot already has vision_analysis, if so returns cached result
 * Otherwise calls analyzeScreenshotVision and caches result
 */

Deno.serve(withAuth({ name: 'analyzeScreenshotWithCache' }, async ({ base44, user, body }) => {
  const startTime = Date.now();

  const { screenshotUrl, level = 'full', forceRefresh = false } = body || {};

  if (!screenshotUrl) {
    return fail('Missing screenshotUrl', 400);
  }

  console.log('[analyzeWithCache] Checking cache for:', screenshotUrl);

  // Try to find existing ScreenshotAsset with cached analysis
  const assets = await base44.entities.ScreenshotAsset.filter({
    public_url: screenshotUrl
  });

  const existingAsset = assets && assets.length > 0 ? assets[0] : null;

  // If cached analysis exists and not forcing refresh, return it
  if (existingAsset?.vision_analysis && !forceRefresh) {
    const cacheAge = Date.now() - new Date(existingAsset.vision_analysis.analyzedAt).getTime();
    console.log('[analyzeWithCache] Cache HIT (age:', Math.round(cacheAge / 1000), 'seconds)');

    return ok({
      cached: true,
      cacheAge: Math.round(cacheAge / 1000),
      ...existingAsset.vision_analysis,
      metadata: {
        ...existingAsset.vision_analysis.metadata,
        processingTime: Date.now() - startTime,
        cached: true
      }
    });
  }

  console.log('[analyzeWithCache] Cache MISS - running fresh analysis');

  // No cache or forced refresh - run analysis
  const analysisResult = await base44.functions.invoke('analyzeScreenshotVision', {
    screenshotUrl,
    level
  });

  if (!analysisResult?.data?.ok) {
    return fail(analysisResult?.data?.error || 'Analysis failed', 500);
  }

  const visionData = analysisResult.data;

  // Prepare cached payload. Includes mode/sourceUrl/imageUrl/projectId so a
  // cache hit and a cache miss return the exact same shape.
  const cachePayload = {
    mode: visionData.mode,
    sourceUrl: visionData.sourceUrl,
    imageUrl: visionData.imageUrl,
    projectId: visionData.projectId,
    ocr: visionData.ocr,
    regions: visionData.regions,
    semanticBlocks: visionData.semanticBlocks,
    layoutRelations: visionData.layoutRelations,
    visionStructure: visionData.visionStructure,
    width: visionData.width,
    height: visionData.height,
    summary: visionData.summary,
    metadata: visionData.metadata,
    analyzedAt: new Date().toISOString()
  };

  // Update or create ScreenshotAsset with cached analysis
  if (existingAsset) {
    console.log('[analyzeWithCache] Updating cache for existing asset:', existingAsset.id);
    await base44.entities.ScreenshotAsset.update(existingAsset.id, {
      vision_analysis: cachePayload
    });
  } else {
    console.log('[analyzeWithCache] Creating new asset with cache');
    // Create basic asset record with vision data
    try {
      await base44.entities.ScreenshotAsset.create({
        user_id: user.id,
        bucket: 'screenshots',
        path: screenshotUrl.split('/').pop(),
        public_url: screenshotUrl,
        filename: screenshotUrl.split('/').pop(),
        content_type: 'image/png',
        vision_analysis: cachePayload
      });
    } catch (error) {
      console.warn('[analyzeWithCache] Could not create asset (might already exist):', error.message);
    }
  }

  console.log('[analyzeWithCache] Analysis complete and cached in', Date.now() - startTime, 'ms');

  return ok({
    cached: false,
    ...visionData,
    metadata: {
      ...visionData.metadata,
      processingTime: Date.now() - startTime,
      cached: false
    }
  });
}));
