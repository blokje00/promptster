import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Advanced screenshot vision analysis using AI Vision API
 * 100% Deno-compatible - NO BROWSER APIs
 * Returns standardized data structure for OCR Debug Panel
 */

Deno.serve(async (req) => {
  const startTime = Date.now();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      console.error('[analyzeScreenshotVision] Unauthorized');
      return Response.json({ 
        ok: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const body = await req.json();
    console.log('[analyzeScreenshotVision] Request:', JSON.stringify(body, null, 2));

    const { url, screenshotId, screenshotUrl, projectId, level = 'full' } = body;
    const resolvedUrl = url || screenshotUrl;

    if (!resolvedUrl && !screenshotId) {
      return Response.json({ 
        ok: false,
        error: 'Missing screenshot reference (screenshotId or screenshotUrl/url required)' 
      }, { status: 400 });
    }

    let imageUrl = resolvedUrl;
    
    if (screenshotId && !imageUrl) {
      try {
        const assets = await base44.asServiceRole.entities.ScreenshotAsset.filter({ 
          id: screenshotId 
        });
        
        if (!assets || assets.length === 0) {
          return Response.json({ 
            ok: false,
            error: 'Screenshot not found' 
          }, { status: 404 });
        }
        
        imageUrl = assets[0].public_url;
        console.log('[analyzeScreenshotVision] Resolved URL:', imageUrl);
      } catch (error) {
        return Response.json({ 
          ok: false,
          error: 'Failed to fetch screenshot: ' + error.message 
        }, { status: 500 });
      }
    }

    if (!imageUrl) {
      return Response.json({ 
        ok: false,
        error: 'Could not resolve image URL' 
      }, { status: 400 });
    }

    console.log('[analyzeScreenshotVision] Analyzing:', imageUrl, '| Level:', level);

    // Get dimensions (no createImageBitmap!)
    let width = 1920;
    let height = 1080;
    
    try {
      const imageResponse = await fetch(imageUrl);
      if (imageResponse.ok) {
        const buffer = await imageResponse.arrayBuffer();
        const uint8 = new Uint8Array(buffer);
        
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
    const prompt = level === 'full' 
      ? `Analyze this UI screenshot comprehensively:

1. Extract ALL visible text (OCR)
2. Identify UI components (buttons, inputs, headings, cards, images, links, labels)
3. Describe layout structure and spatial relationships
4. Group related elements into semantic blocks

Return JSON:
{
  "summary": "brief description",
  "regions": [
    {"id": "r1", "type": "button|input|heading|card|text", "text": "...", "role": "...", "bbox": {"x": 0, "y": 0, "width": 0, "height": 0}, "confidence": 0.9}
  ],
  "semanticBlocks": [
    {"id": "b1", "type": "header|form|content", "text": "...", "components": ["r1"], "hierarchy": {"level": 0}}
  ],
  "layoutPattern": "grid|flex|list",
  "detectedComponents": ["Button", "Input"]
}`
      : `Extract main text and identify key UI elements.

Return JSON:
{
  "summary": "brief description",
  "regions": [{"id": "r1", "type": "text", "text": "...", "bbox": {"x": 0, "y": 0, "width": 0, "height": 0}, "confidence": 0.9}],
  "semanticBlocks": [],
  "layoutPattern": "simple",
  "detectedComponents": []
}`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [imageUrl],
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            regions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  type: { type: "string" },
                  text: { type: "string" },
                  role: { type: "string" },
                  bbox: {
                    type: "object",
                    properties: {
                      x: { type: "number" },
                      y: { type: "number" },
                      width: { type: "number" },
                      height: { type: "number" }
                    }
                  },
                  confidence: { type: "number" }
                }
              }
            },
            semanticBlocks: { 
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  type: { type: "string" },
                  text: { type: "string" },
                  components: { type: "array", items: { type: "string" } },
                  hierarchy: {
                    type: "object",
                    properties: {
                      level: { type: "number" }
                    }
                  }
                }
              }
            },
            layoutPattern: { type: "string" },
            detectedComponents: { type: "array", items: { type: "string" } }
          }
        }
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
      
      const response = {
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
          model: 'gpt-4o-vision'
        }
      };

      console.log('[analyzeScreenshotVision] ✓ Success in', processingTime, 'ms | Level:', achievedLevel);
      return Response.json(response);
      
    } catch (error) {
      console.error('[analyzeScreenshotVision] LLM failed:', error);
      const processingTime = Date.now() - startTime;
      
      return Response.json({
        ok: false,
        mode: 'vision-error',
        error: error.message,
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
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[analyzeScreenshotVision] Fatal error:', error);
    return Response.json({ 
      ok: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});

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