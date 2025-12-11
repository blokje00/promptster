import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Advanced screenshot vision analysis with Level 3 & Level 4 support
 * Provides OCR, layout detection, component classification, and semantic analysis
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
    console.log('[analyzeScreenshotVision] Request body:', JSON.stringify(body));

    const { url, screenshotId, level = 'full' } = body;

    // Validate request
    if (!url && !screenshotId) {
      console.error('[analyzeScreenshotVision] Missing screenshot reference');
      return Response.json({ 
        error: 'Missing screenshot reference: provide either url or screenshotId' 
      }, { status: 400 });
    }

    let imageUrl = url;
    
    // If screenshotId provided, fetch from database
    if (screenshotId && !url) {
      try {
        const assets = await base44.asServiceRole.entities.ScreenshotAsset.filter({ 
          id: screenshotId 
        });
        
        if (!assets || assets.length === 0) {
          console.error('[analyzeScreenshotVision] Screenshot not found:', screenshotId);
          return Response.json({ error: 'Screenshot not found' }, { status: 404 });
        }
        
        imageUrl = assets[0].public_url;
        console.log('[analyzeScreenshotVision] Resolved URL from screenshotId:', imageUrl);
      } catch (error) {
        console.error('[analyzeScreenshotVision] Failed to fetch screenshot:', error);
        return Response.json({ error: 'Failed to fetch screenshot: ' + error.message }, { status: 500 });
      }
    }

    if (!imageUrl) {
      console.error('[analyzeScreenshotVision] No image URL after resolution');
      return Response.json({ error: 'Could not resolve image URL' }, { status: 400 });
    }

    console.log('[analyzeScreenshotVision] Starting analysis for:', imageUrl);

    // Step 1: Fetch image dimensions
    let width = 1920;
    let height = 1080;
    
    try {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        console.warn('[analyzeScreenshotVision] Failed to fetch image for dimensions');
      } else {
        const imageBlob = await imageResponse.blob();
        const imageBitmap = await createImageBitmap(imageBlob);
        width = imageBitmap.width;
        height = imageBitmap.height;
        console.log('[analyzeScreenshotVision] Image dimensions:', width, 'x', height);
      }
    } catch (error) {
      console.warn('[analyzeScreenshotVision] Could not determine image dimensions:', error.message);
    }

    // Step 2: LLM Vision Analysis (base analysis)
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
      });
      console.log('[analyzeScreenshotVision] LLM Vision completed successfully');
    } catch (error) {
      console.error('[analyzeScreenshotVision] LLM Vision failed:', error);
      return Response.json({
        sourceUrl: imageUrl,
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

    // Step 3: Validate and normalize LLM output
    const regions = Array.isArray(result.regions) ? result.regions : [];
    const semanticBlocks = Array.isArray(result.semanticBlocks) ? result.semanticBlocks : [];
    
    console.log('[analyzeScreenshotVision] LLM returned', regions.length, 'regions and', semanticBlocks.length, 'semantic blocks');

    // Step 4: Generate layout relations (with fallback)
    let layoutRelations = [];
    try {
      layoutRelations = generateLayoutRelations(regions);
      console.log('[analyzeScreenshotVision] Generated', layoutRelations.length, 'layout relations');
    } catch (error) {
      console.warn('[analyzeScreenshotVision] Failed to generate layout relations:', error.message);
    }

    // Step 5: Generate Level 4 structure if requested (with fallback)
    let visionStructure = null;
    if (level === 'level_4' && regions.length > 0) {
      try {
        visionStructure = {
          components: regions.map(r => ({
          id: r.id,
          type: r.type,
          text: r.text,
          bbox: r.bbox,
          confidence: r.confidence,
          attributes: inferAttributes(r),
            parent: null,
            children: []
          })),
          layoutTree: { type: 'root', children: regions.map(r => r.id) },
          metadata: {
            componentCount: regions.length,
            detectedTypes: result.detectedComponents || [],
            enhancedWithLLM: true
          }
        };
        console.log('[analyzeScreenshotVision] Level 4 structure generated');
      } catch (error) {
        console.warn('[analyzeScreenshotVision] Failed to generate Level 4 structure, falling back:', error.message);
      }
    }

    // Step 6: Build final response
    const processingTime = Date.now() - startTime;
    const enrichedResult = {
      sourceUrl: imageUrl,
      width,
      height,
      summary: result.summary || "UI screenshot analyzed",
      regions,
      semanticBlocks,
      layoutRelations,
      visionStructure,
      metadata: {
        processingTime,
        ocrAvailable: true,
        layoutAvailable: regions.length > 0,
        classificationAvailable: regions.length > 0,
        analysisLevel: visionStructure ? 'level_4' : (semanticBlocks.length > 0 ? 'level_3' : 'level_2'),
        ocrLevel: visionStructure ? 'level_4' : (semanticBlocks.length > 0 ? 'level_3' : 'level_2')
      }
    };

    console.log('[analyzeScreenshotVision] Analysis completed in', processingTime, 'ms');
    return Response.json(enrichedResult);

  } catch (error) {
    console.error('[analyzeScreenshotVision] Top-level error:', error);
    return Response.json({ 
      error: 'Vision analysis failed: ' + error.message,
      stack: error.stack,
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