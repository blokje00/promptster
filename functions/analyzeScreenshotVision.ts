import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { runOcrAndLayout, analyzeSemanticStructure, detectComponents } from './vision/visionPipeline.js';

/**
 * Advanced screenshot vision analysis with Level 3 & Level 4 support
 * Provides OCR, layout detection, component classification, and semantic analysis
 * 
 * NO BROWSER APIs - Server-side compatible only
 */
Deno.serve(async (req) => {
  const startTime = Date.now();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      console.error('[analyzeScreenshotVision] Unauthorized access attempt');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log('[analyzeScreenshotVision] ===== INCOMING BODY =====');
    console.log('[analyzeScreenshotVision]', JSON.stringify(body, null, 2));
    console.log('[analyzeScreenshotVision] ============================');

    const { url, screenshotId, screenshotUrl, projectId, level = 'full' } = body;

    // Flexible URL resolution: accept url, screenshotUrl, or screenshotId
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
    
    // If screenshotId provided, fetch from database (even if URL was also provided as fallback)
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

    // Step 1: Try OCR/Layout pipeline first (defensive)
    let ocrResult = null;
    try {
      ocrResult = await runOcrAndLayout({ imageUrl, projectId });
      console.log('[analyzeScreenshotVision] OCR/layout pipeline completed');
    } catch (error) {
      console.warn('[analyzeScreenshotVision] OCR/layout pipeline failed, falling back to LLM:', error.message);
    }

    // Step 2: Fetch image dimensions using server-compatible method (Deno-compatible)
    let width = 1920;
    let height = 1080;
    
    try {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        console.warn('[analyzeScreenshotVision] Failed to fetch image for dimensions');
      } else {
        const buffer = await imageResponse.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        
        // Simple dimension extraction without createImageBitmap
        // For PNG: read IHDR chunk at byte 16-24
        if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50) { // PNG signature
          width = (uint8Array[16] << 24) | (uint8Array[17] << 16) | (uint8Array[18] << 8) | uint8Array[19];
          height = (uint8Array[20] << 24) | (uint8Array[21] << 16) | (uint8Array[22] << 8) | uint8Array[23];
          console.log('[analyzeScreenshotVision] PNG dimensions:', width, 'x', height);
        } else if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8) { // JPEG signature
          // Simple JPEG dimension extraction from SOF marker
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

    // Step 3: LLM Vision Analysis (base analysis or fallback if OCR failed)
    let result;
    try {
      const analysisPrompt = `Analyze this UI screenshot in detail:

1. **Component Detection**: Identify all UI elements (buttons, inputs, headings, cards, images, links, labels)
2. **Layout Structure**: Describe the visual hierarchy and spatial relationships
3. **Text Content**: Extract all visible text with approximate positions
4. **Semantic Blocks**: Group related elements into functional blocks
5. **Interaction Points**: Identify clickable/interactive elements

Provide analysis as JSON with this structure:
{
  "summary": "Brief overview of the UI",
  "regions": [
    {
      "id": "region-1",
      "type": "button/input/heading/card/etc",
      "text": "visible text",
      "role": "primary_action/form_input/etc",
      "bbox": {"x": 0, "y": 0, "width": 100, "height": 50},
      "confidence": 0.95
    }
  ],
  "semanticBlocks": [
    {
      "id": "block-1",
      "type": "header/navigation/form/content_section",
      "text": "combined text",
      "components": ["region-1", "region-2"],
      "hierarchy": {"level": 0}
    }
  ],
  "layoutPattern": "grid/flex/absolute",
  "detectedComponents": ["Button", "Input", "Card"]
}`;

      result = await base44.integrations.Core.InvokeLLM({
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

    // Step 4: Validate and normalize LLM output
    let regions = Array.isArray(result.regions) ? result.regions : [];
    let semanticBlocks = Array.isArray(result.semanticBlocks) ? result.semanticBlocks : [];
    
    console.log('[analyzeScreenshotVision] LLM returned', regions.length, 'regions and', semanticBlocks.length, 'semantic blocks');

    // Step 5: Semantic Analysis (Level 3) - defensive
    let semanticResult = null;
    if (regions.length > 0 && (level === 'full' || level === 'level_3' || level === 'level_4')) {
      try {
        // Try using the OCR result if available, otherwise use LLM regions
        const baseResult = ocrResult || { regions, width, height };
        semanticResult = analyzeSemanticStructure(baseResult);
        
        // Use semantic blocks from analysis if we got them
        if (semanticResult.semanticBlocks && semanticResult.semanticBlocks.length > 0) {
          semanticBlocks = semanticResult.semanticBlocks;
        }
        
        console.log('[analyzeScreenshotVision] Semantic analysis completed');
      } catch (error) {
        console.warn('[analyzeScreenshotVision] Semantic analysis failed, using LLM data:', error.message);
        semanticResult = { semanticBlocks: [], layoutRelations: [] };
      }
    }

    // Step 6: Generate layout relations (with fallback)
    let layoutRelations = semanticResult?.layoutRelations || [];
    if (layoutRelations.length === 0 && regions.length > 0) {
      try {
        layoutRelations = generateLayoutRelations(regions);
        console.log('[analyzeScreenshotVision] Generated', layoutRelations.length, 'layout relations');
      } catch (error) {
        console.warn('[analyzeScreenshotVision] Failed to generate layout relations:', error.message);
      }
    }

    // Step 7: Component Detection (Level 4) - defensive
    let visionStructure = null;
    if (regions.length > 0 && level === 'level_4') {
      try {
        const baseResult = ocrResult || { regions, width, height };
        visionStructure = detectComponents(baseResult, semanticResult);
        
        if (visionStructure) {
          console.log('[analyzeScreenshotVision] Level 4 component detection completed');
        } else {
          console.warn('[analyzeScreenshotVision] Level 4 returned null, falling back to Level 3');
        }
      } catch (error) {
        console.warn('[analyzeScreenshotVision] Component detection failed, falling back to Level 3:', error.message);
      }
    }

    // Step 8: Build final response with all defensive checks
    const processingTime = Date.now() - startTime;
    
    // Determine actual analysis level achieved
    let achievedLevel = 'level_2';
    if (visionStructure) {
      achievedLevel = 'level_4';
    } else if (semanticBlocks.length > 0 || layoutRelations.length > 0) {
      achievedLevel = 'level_3';
    } else if (regions.length > 0) {
      achievedLevel = 'level_2';
    }
    
    const enrichedResult = {
      ok: true,
      sourceUrl: imageUrl,
      imageUrl,
      projectId: projectId || null,
      width,
      height,
      summary: result.summary || "UI screenshot analyzed",
      regions: Array.isArray(regions) ? regions : [],
      semanticBlocks: Array.isArray(semanticBlocks) ? semanticBlocks : [],
      layoutRelations: Array.isArray(layoutRelations) ? layoutRelations : [],
      visionStructure: visionStructure || null,
      ocr: ocrResult || null,
      metadata: {
        processingTime,
        ocrAvailable: !!ocrResult,
        layoutAvailable: regions.length > 0,
        classificationAvailable: visionStructure !== null,
        analysisLevel: achievedLevel,
        ocrLevel: achievedLevel,
        requestedLevel: level
      }
    };

    console.log('[analyzeScreenshotVision] ✓ Analysis completed in', processingTime, 'ms');
    console.log('[analyzeScreenshotVision] ✓ Achieved level:', achievedLevel, '(requested:', level, ')');
    console.log('[analyzeScreenshotVision] ✓ Regions:', regions.length, '| Semantic blocks:', semanticBlocks.length, '| Relations:', layoutRelations.length);
    
    return Response.json(enrichedResult);

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

function generateLayoutRelations(regions) {
  if (!Array.isArray(regions) || regions.length === 0) {
    return [];
  }

  const relations = [];
  
  for (let i = 0; i < regions.length; i++) {
    for (let j = i + 1; j < regions.length; j++) {
      const r1 = regions[i];
      const r2 = regions[j];
      
      // Guard against missing or invalid bbox
      if (!r1?.bbox || !r2?.bbox) continue;
      if (typeof r1.bbox.x !== 'number' || typeof r2.bbox.x !== 'number') continue;
      
      const centerX1 = r1.bbox.x + r1.bbox.width / 2;
      const centerY1 = r1.bbox.y + r1.bbox.height / 2;
      const centerX2 = r2.bbox.x + r2.bbox.width / 2;
      const centerY2 = r2.bbox.y + r2.bbox.height / 2;
      
      const dx = centerX2 - centerX1;
      const dy = centerY2 - centerY1;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 300) {
        let relationType;
        if (Math.abs(dx) > Math.abs(dy)) {
          relationType = dx > 0 ? 'right_of' : 'left_of';
        } else {
          relationType = dy > 0 ? 'below' : 'above';
        }
        
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

function inferAttributes(region) {
  if (!region) return {};
  
  const attrs = {};
  
  if (region.text) {
    attrs.text = region.text;
  }
  
  if (region.type === 'button' && region.text) {
    const cleanText = String(region.text).replace(/\s+/g, '');
    attrs.onClick = `handle${cleanText}`;
  }
  
  if (region.type === 'input') {
    attrs.placeholder = region.text || 'Enter text...';
  }
  
  return attrs;
}