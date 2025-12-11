import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Advanced screenshot vision analysis using AI Vision API
 * 100% Deno-compatible - NO BROWSER APIs
 * 
 * Uses LLM with vision capabilities for superior OCR and UI analysis
 */

Deno.serve(async (req) => {
  const startTime = Date.now();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      console.error('[analyzeScreenshotVision] Unauthorized access attempt');
      return Response.json({ 
        ok: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const body = await req.json();
    console.log('[analyzeScreenshotVision] ===== INCOMING BODY =====');
    console.log('[analyzeScreenshotVision]', JSON.stringify(body, null, 2));
    console.log('[analyzeScreenshotVision] ============================');

    const { url, screenshotId, screenshotUrl, projectId, level = 'full' } = body;

    // Flexible URL resolution
    const resolvedUrl = url || screenshotUrl;

    // Validate request
    if (!resolvedUrl && !screenshotId) {
      console.error('[analyzeScreenshotVision] Missing screenshot reference');
      return Response.json({ 
        ok: false,
        error: 'Missing screenshot reference (screenshotId or screenshotUrl/url required)' 
      }, { status: 400 });
    }

    let imageUrl = resolvedUrl;
    
    // If screenshotId provided, fetch from database
    if (screenshotId && !imageUrl) {
      try {
        const assets = await base44.asServiceRole.entities.ScreenshotAsset.filter({ 
          id: screenshotId 
        });
        
        if (!assets || assets.length === 0) {
          console.error('[analyzeScreenshotVision] Screenshot not found:', screenshotId);
          return Response.json({ 
            ok: false,
            error: 'Screenshot not found in database' 
          }, { status: 404 });
        }
        
        imageUrl = assets[0].public_url;
        console.log('[analyzeScreenshotVision] Resolved URL from screenshotId:', imageUrl);
      } catch (error) {
        console.error('[analyzeScreenshotVision] Failed to fetch screenshot from DB:', error);
        return Response.json({ 
          ok: false,
          error: 'Failed to fetch screenshot: ' + error.message 
        }, { status: 500 });
      }
    }

    if (!imageUrl) {
      console.error('[analyzeScreenshotVision] No image URL after resolution');
      return Response.json({ 
        ok: false,
        error: 'Could not resolve image URL from provided parameters' 
      }, { status: 400 });
    }

    console.log('[analyzeScreenshotVision] Starting analysis for:', imageUrl);
    console.log('[analyzeScreenshotVision] Project ID:', projectId || 'none');
    console.log('[analyzeScreenshotVision] Analysis level:', level);

    // Get image dimensions using pure header parsing (no browser APIs)
    let width = 1920;
    let height = 1080;
    
    try {
      const imageResponse = await fetch(imageUrl);
      if (imageResponse.ok) {
        const buffer = await imageResponse.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        
        // Parse dimensions from image headers (no createImageBitmap!)
        if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50) { // PNG
          width = (uint8Array[16] << 24) | (uint8Array[17] << 16) | (uint8Array[18] << 8) | uint8Array[19];
          height = (uint8Array[20] << 24) | (uint8Array[21] << 16) | (uint8Array[22] << 8) | uint8Array[23];
          console.log('[analyzeScreenshotVision] PNG dimensions:', width, 'x', height);
        } else if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8) { // JPEG
          let offset = 2;
          while (offset < uint8Array.length - 9) {
            if (uint8Array[offset] === 0xFF && (uint8Array[offset + 1] === 0xC0 || uint8Array[offset + 1] === 0xC2)) {
              height = (uint8Array[offset + 5] << 8) | uint8Array[offset + 6];
              width = (uint8Array[offset + 7] << 8) | uint8Array[offset + 8];
              console.log('[analyzeScreenshotVision] JPEG dimensions:', width, 'x', height);
              break;
            }
            offset++;
          }
        }
      }
    } catch (error) {
      console.warn('[analyzeScreenshotVision] Could not determine image dimensions:', error.message);
    }

    // Use LLM Vision API for analysis (NO local image processing)
    const analysisPrompt = level === 'full' 
      ? `Analyze this UI screenshot in comprehensive detail:

1. **Component Detection**: Identify ALL UI elements (buttons, inputs, headings, cards, images, links, labels, icons)
2. **Layout Structure**: Describe the visual hierarchy, sections, and spatial relationships
3. **Text Content**: Extract ALL visible text with approximate positions (as percentage of image dimensions)
4. **Semantic Blocks**: Group related elements into functional blocks (header, nav, form, content areas)
5. **Interaction Points**: Identify ALL clickable/interactive elements
6. **Design Patterns**: Note colors, spacing, typography, layout patterns

Provide detailed analysis as JSON with this exact structure:
{
  "summary": "Brief overview of the UI and its purpose",
  "regions": [
    {
      "id": "region-1",
      "type": "button|input|heading|card|image|link|label|text",
      "text": "visible text content",
      "role": "primary_action|form_input|navigation|content|etc",
      "bbox": {"x": 10, "y": 20, "width": 100, "height": 50},
      "confidence": 0.95
    }
  ],
  "semanticBlocks": [
    {
      "id": "block-1",
      "type": "header|navigation|form|content_section|footer",
      "text": "combined text from this block",
      "components": ["region-1", "region-2"],
      "hierarchy": {"level": 0}
    }
  ],
  "layoutPattern": "grid|flex|absolute|list",
  "detectedComponents": ["Button", "Input", "Card", "Heading"]
}`
      : `Extract the main text content and identify key UI elements from this screenshot.

Return as JSON:
{
  "summary": "Brief description",
  "regions": [
    {"id": "region-1", "type": "text|button|input", "text": "content", "bbox": {"x": 0, "y": 0, "width": 0, "height": 0}, "confidence": 0.9}
  ],
  "semanticBlocks": [],
  "layoutPattern": "simple",
  "detectedComponents": []
}`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
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
      
      console.log('[analyzeScreenshotVision] LLM Vision completed successfully');
      
      // Validate and normalize output
      const regions = Array.isArray(result.regions) ? result.regions : [];
      const semanticBlocks = Array.isArray(result.semanticBlocks) ? result.semanticBlocks : [];
      
      console.log('[analyzeScreenshotVision] Extracted', regions.length, 'regions and', semanticBlocks.length, 'semantic blocks');
      
      // Generate layout relations from regions
      const layoutRelations = generateLayoutRelations(regions);
      console.log('[analyzeScreenshotVision] Generated', layoutRelations.length, 'layout relations');
      
      // Determine achieved level
      let achievedLevel = 'level_2';
      if (semanticBlocks.length > 0 && layoutRelations.length > 0) {
        achievedLevel = 'level_3';
      }
      if (result.detectedComponents && result.detectedComponents.length > 0) {
        achievedLevel = 'level_4';
      }
      
      const processingTime = Date.now() - startTime;
      
      const enrichedResult = {
        ok: true,
        sourceUrl: imageUrl,
        imageUrl,
        projectId: projectId || null,
        width,
        height,
        summary: result.summary || "UI screenshot analyzed",
        regions,
        semanticBlocks,
        layoutRelations,
        visionStructure: null,
        metadata: {
          processingTime,
          ocrAvailable: true,
          layoutAvailable: regions.length > 0,
          classificationAvailable: regions.length > 0,
          analysisLevel: achievedLevel,
          ocrLevel: achievedLevel,
          requestedLevel: level,
          method: 'llm_vision'
        }
      };

      console.log('[analyzeScreenshotVision] ✓ Analysis completed in', processingTime, 'ms');
      console.log('[analyzeScreenshotVision] ✓ Achieved level:', achievedLevel);
      
      return Response.json(enrichedResult);
      
    } catch (error) {
      console.error('[analyzeScreenshotVision] LLM Vision failed:', error);
      return Response.json({
        ok: false,
        sourceUrl: imageUrl,
        imageUrl,
        projectId: projectId || null,
        width,
        height,
        summary: 'Analysis failed: ' + error.message,
        regions: [],
        semanticBlocks: [],
        layoutRelations: [],
        visionStructure: null,
        metadata: {
          processingTime: Date.now() - startTime,
          ocrAvailable: false,
          layoutAvailable: false,
          classificationAvailable: false,
          analysisLevel: 'failed',
          error: error.message
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[analyzeScreenshotVision] Top-level error:', error);
    return Response.json({ 
      ok: false,
      error: 'Vision analysis failed: ' + error.message,
      stack: Deno.env.get('NODE_ENV') === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});

/**
 * Generate spatial layout relations between regions
 * Pure JavaScript - no browser APIs
 */
function generateLayoutRelations(regions) {
  if (!Array.isArray(regions) || regions.length === 0) {
    return [];
  }

  const relations = [];
  
  for (let i = 0; i < regions.length; i++) {
    for (let j = i + 1; j < regions.length; j++) {
      const r1 = regions[i];
      const r2 = regions[j];
      
      if (!r1?.bbox || !r2?.bbox) continue;
      if (typeof r1.bbox.x !== 'number' || typeof r2.bbox.x !== 'number') continue;
      
      const centerX1 = r1.bbox.x + (r1.bbox.width || 0) / 2;
      const centerY1 = r1.bbox.y + (r1.bbox.height || 0) / 2;
      const centerX2 = r2.bbox.x + (r2.bbox.width || 0) / 2;
      const centerY2 = r2.bbox.y + (r2.bbox.height || 0) / 2;
      
      const dx = centerX2 - centerX1;
      const dy = centerY2 - centerY1;
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