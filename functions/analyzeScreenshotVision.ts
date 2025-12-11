import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Advanced screenshot vision analysis with Level 3 & Level 4 support
 * Provides OCR, layout detection, component classification, and semantic analysis
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, screenshotId, level = 'full' } = await req.json();

    let imageUrl = url;
    
    // If screenshotId provided, fetch from database
    if (screenshotId && !url) {
      const assets = await base44.asServiceRole.entities.ScreenshotAsset.filter({ 
        id: screenshotId 
      });
      
      if (!assets || assets.length === 0) {
        return Response.json({ error: 'Screenshot not found' }, { status: 404 });
      }
      
      imageUrl = assets[0].public_url;
    }

    if (!imageUrl) {
      return Response.json({ error: 'url or screenshotId required' }, { status: 400 });
    }

    // Use LLM Vision for analysis (simplified approach without heavy OCR dependencies)
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
      }
    });

    // Fetch image dimensions
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    const imageBitmap = await createImageBitmap(imageBlob);
    const width = imageBitmap.width;
    const height = imageBitmap.height;

    // Enrich response with metadata
    const enrichedResult = {
      sourceUrl: imageUrl,
      width,
      height,
      summary: result.summary || "UI screenshot analyzed",
      regions: result.regions || [],
      semanticBlocks: result.semanticBlocks || [],
      layoutRelations: generateLayoutRelations(result.regions || []),
      visionStructure: level === 'level_4' ? {
        components: (result.regions || []).map(r => ({
          id: r.id,
          type: r.type,
          text: r.text,
          bbox: r.bbox,
          confidence: r.confidence,
          attributes: inferAttributes(r),
          parent: null,
          children: []
        })),
        layoutTree: { type: 'root', children: (result.regions || []).map(r => r.id) },
        metadata: {
          componentCount: (result.regions || []).length,
          detectedTypes: result.detectedComponents || [],
          enhancedWithLLM: true
        }
      } : null,
      metadata: {
        processingTime: 0,
        ocrAvailable: true,
        layoutAvailable: true,
        classificationAvailable: true,
        analysisLevel: level === 'level_4' ? 'level_4' : 'level_3',
        ocrLevel: level === 'level_4' ? 'level_4' : 'level_3'
      }
    };

    return Response.json(enrichedResult);

  } catch (error) {
    console.error('Vision analysis error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});

function generateLayoutRelations(regions) {
  const relations = [];
  
  for (let i = 0; i < regions.length; i++) {
    for (let j = i + 1; j < regions.length; j++) {
      const r1 = regions[i];
      const r2 = regions[j];
      
      if (!r1.bbox || !r2.bbox) continue;
      
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
  const attrs = {};
  
  if (region.text) {
    attrs.text = region.text;
  }
  
  if (region.type === 'button' && region.text) {
    attrs.onClick = `handle${region.text.replace(/\s+/g, '')}`;
  }
  
  if (region.type === 'input') {
    attrs.placeholder = region.text || 'Enter text...';
  }
  
  return attrs;
}