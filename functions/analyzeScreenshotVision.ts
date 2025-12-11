import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { VisionPipeline } from './vision/fallbackManager.ts';

export interface VisionRegion {
  id: string;
  bbox: { x: number; y: number; width: number; height: number };
  text?: string;
  role?: string;
  confidence: number;
}

export interface VisionResult {
  sourceUrl: string;
  width: number;
  height: number;
  summary: string;
  regions: VisionRegion[];
  metadata: {
    processingTime: number;
    ocrAvailable: boolean;
    layoutAvailable: boolean;
    classificationAvailable: boolean;
    analysisLevel: string;
    ocrLevel?: string;
    error?: string;
  };
  semanticBlocks?: any[];
  layoutRelations?: any[];
  visionStructure?: any;
}

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

    // Initialize vision pipeline with fallback strategy
    const pipeline = new VisionPipeline({
      enableOCR: true,
      enableLayout: true,
      enableClassification: true,
      timeoutMs: 45000 // 45 seconds max
    });

    // Run base analysis (Level 2-2.5: OCR + Layout + Classification)
    const baseResult = await pipeline.analyze(imageUrl);

    // Enrich with Level 3 & Level 4 if requested
    let enrichedResult = baseResult;
    
    if (level === 'full' || level === 'level_3' || level === 'level_4') {
      enrichedResult = await enrichWithAdvancedAnalysis(
        baseResult, 
        imageUrl, 
        base44,
        level === 'level_4'
      );
    }

    return Response.json(enrichedResult);

  } catch (error) {
    console.error('Vision analysis error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});

/**
 * Enrich with Level 3 (Semantic OCR) and Level 4 (Vision-to-Code) analysis
 */
async function enrichWithAdvancedAnalysis(
  baseResult: VisionResult, 
  imageUrl: string,
  base44: any,
  includeLevel4: boolean
): Promise<VisionResult> {
  
  // Level 3: Semantic Block Analysis
  const semanticBlocks = await generateSemanticBlocks(baseResult);
  const layoutRelations = await detectLayoutRelations(baseResult);
  
  // Level 4: Vision-to-Code Structure (if requested)
  let visionStructure = null;
  if (includeLevel4) {
    visionStructure = await generateVisionStructure(baseResult, base44, imageUrl);
  }

  return {
    ...baseResult,
    semanticBlocks,
    layoutRelations,
    visionStructure,
    metadata: {
      ...baseResult.metadata,
      ocrLevel: visionStructure ? 'level_4' : 'level_3'
    }
  };
}

/**
 * Level 3: Generate semantic blocks with hierarchy and relationships
 */
async function generateSemanticBlocks(result: VisionResult): Promise<any[]> {
  const blocks: any[] = [];
  
  result.regions.forEach((region, idx) => {
    const block = {
      id: `block-${idx}`,
      type: mapRoleToSemanticType(region.role),
      text: region.text || '',
      bbox: region.bbox,
      confidence: region.confidence,
      hierarchy: inferHierarchy(region, result.regions),
      relationships: inferRelationships(region, result.regions)
    };
    
    blocks.push(block);
  });

  return blocks;
}

function mapRoleToSemanticType(role?: string): string {
  const roleMap: Record<string, string> = {
    'button': 'action_button',
    'input': 'input_field',
    'link': 'navigation_link',
    'heading': 'section_header',
    'label': 'descriptor_label',
    'card': 'content_card',
    'image': 'visual_element',
    'other': 'generic_block'
  };
  
  return roleMap[role || 'other'] || 'generic_block';
}

function inferHierarchy(region: VisionRegion, allRegions: VisionRegion[]): any {
  // Simple hierarchy based on size and position
  const area = region.bbox.width * region.bbox.height;
  const avgArea = allRegions.reduce((sum, r) => sum + (r.bbox.width * r.bbox.height), 0) / allRegions.length;
  
  let level = 2; // Default mid-level
  if (area > avgArea * 2) level = 0; // Top-level (large elements)
  else if (area > avgArea) level = 1; // Section-level
  else if (area < avgArea / 2) level = 3; // Detail-level (small elements)
  
  return { level, depth: level };
}

function inferRelationships(region: VisionRegion, allRegions: VisionRegion[]): any[] {
  const relationships: any[] = [];
  const centerX = region.bbox.x + region.bbox.width / 2;
  const centerY = region.bbox.y + region.bbox.height / 2;
  
  allRegions.forEach((other, idx) => {
    if (other.id === region.id) return;
    
    const otherCenterX = other.bbox.x + other.bbox.width / 2;
    const otherCenterY = other.bbox.y + other.bbox.height / 2;
    const distance = Math.sqrt(
      Math.pow(centerX - otherCenterX, 2) + 
      Math.pow(centerY - otherCenterY, 2)
    );
    
    // Only track close relationships
    if (distance < 200) {
      const relType = detectRelationType(region, other);
      if (relType) {
        relationships.push({
          type: relType,
          targetId: other.id,
          distance: Math.round(distance)
        });
      }
    }
  });
  
  return relationships;
}

function detectRelationType(from: VisionRegion, to: VisionRegion): string | null {
  // Label → Input relationship
  if (from.role === 'label' && to.role === 'input') {
    if (Math.abs(from.bbox.y - to.bbox.y) < 50) return 'labels';
  }
  
  // Heading → Content relationship
  if (from.role === 'heading' && to.role !== 'heading') {
    if (from.bbox.y < to.bbox.y && Math.abs(from.bbox.y - to.bbox.y) < 100) return 'describes';
  }
  
  // Button → Form relationship
  if (from.role === 'button' && to.role === 'input') return 'submits';
  
  // Generic proximity
  return 'near';
}

/**
 * Level 3: Detect layout relationships (spatial logic)
 */
async function detectLayoutRelations(result: VisionResult): Promise<any[]> {
  const relations: any[] = [];
  
  for (let i = 0; i < result.regions.length; i++) {
    for (let j = i + 1; j < result.regions.length; j++) {
      const r1 = result.regions[i];
      const r2 = result.regions[j];
      
      const relation = detectSpatialRelation(r1, r2);
      if (relation) {
        relations.push({
          fromId: r1.id,
          toId: r2.id,
          relation: relation.type,
          distance: relation.distance
        });
      }
    }
  }
  
  return relations;
}

function detectSpatialRelation(r1: VisionRegion, r2: VisionRegion): { type: string; distance: number } | null {
  const centerX1 = r1.bbox.x + r1.bbox.width / 2;
  const centerY1 = r1.bbox.y + r1.bbox.height / 2;
  const centerX2 = r2.bbox.x + r2.bbox.width / 2;
  const centerY2 = r2.bbox.y + r2.bbox.height / 2;
  
  const dx = centerX2 - centerX1;
  const dy = centerY2 - centerY1;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Only consider close elements
  if (distance > 300) return null;
  
  // Determine direction
  if (Math.abs(dx) > Math.abs(dy)) {
    return { type: dx > 0 ? 'right_of' : 'left_of', distance: Math.round(distance) };
  } else {
    return { type: dy > 0 ? 'below' : 'above', distance: Math.round(distance) };
  }
}

/**
 * Level 4: Vision-to-Code structure with LLM enhancement
 */
async function generateVisionStructure(
  result: VisionResult, 
  base44: any,
  imageUrl: string
): Promise<any> {
  
  // Build basic component structure from regions
  const components = result.regions.map((region, idx) => ({
    id: region.id,
    type: inferComponentType(region),
    text: region.text || '',
    bbox: region.bbox,
    confidence: region.confidence,
    attributes: inferAttributes(region),
    parent: null, // Will be populated by hierarchy analysis
    children: []
  }));

  // Use LLM to enhance understanding (if available)
  try {
    const imageBuffer = await fetch(imageUrl).then(r => r.arrayBuffer());
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    const dataUrl = `data:image/png;base64,${base64Image}`;
    
    const llmPrompt = `Analyze this UI screenshot and identify:
1. Component types (button, input, card, modal, etc.)
2. Layout structure (grid, flex, absolute positioning)
3. Visual hierarchy
4. Interactive elements

Current detected regions: ${JSON.stringify(result.regions.map(r => ({ role: r.role, text: r.text })))}

Provide insights as JSON with: { insights: string, componentTypes: string[], layoutPattern: string }`;

    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt: llmPrompt,
      file_urls: [dataUrl],
      response_json_schema: {
        type: "object",
        properties: {
          insights: { type: "string" },
          componentTypes: { type: "array", items: { type: "string" } },
          layoutPattern: { type: "string" }
        }
      }
    });

    return {
      components,
      layoutTree: buildLayoutTree(components),
      llmInsights: llmResponse,
      metadata: {
        componentCount: components.length,
        detectedTypes: [...new Set(components.map(c => c.type))],
        enhancedWithLLM: true
      }
    };
  } catch (error) {
    console.warn('LLM enhancement failed, returning basic structure:', error);
    
    return {
      components,
      layoutTree: buildLayoutTree(components),
      metadata: {
        componentCount: components.length,
        detectedTypes: [...new Set(components.map(c => c.type))],
        enhancedWithLLM: false
      }
    };
  }
}

function inferComponentType(region: VisionRegion): string {
  const roleToComponent: Record<string, string> = {
    'button': 'Button',
    'input': 'Input',
    'link': 'Link',
    'heading': 'Heading',
    'label': 'Label',
    'card': 'Card',
    'image': 'Image',
    'other': 'Container'
  };
  
  return roleToComponent[region.role || 'other'] || 'Container';
}

function inferAttributes(region: VisionRegion): Record<string, any> {
  const attrs: Record<string, any> = {};
  
  if (region.text) {
    attrs.text = region.text;
  }
  
  if (region.role === 'button' && region.text) {
    attrs.onClick = `handle${region.text.replace(/\s+/g, '')}`;
  }
  
  if (region.role === 'input') {
    attrs.placeholder = region.text || 'Enter text...';
  }
  
  return attrs;
}

function buildLayoutTree(components: any[]): any {
  // Simple tree structure based on containment
  const root = {
    type: 'root',
    children: [] as string[]
  };
  
  // Sort by size (largest first)
  const sorted = [...components].sort((a, b) => {
    const areaA = a.bbox.width * a.bbox.height;
    const areaB = b.bbox.width * b.bbox.height;
    return areaB - areaA;
  });
  
  // Build containment hierarchy
  sorted.forEach((comp) => {
    let parent = null;
    
    // Find smallest containing component
    for (const candidate of sorted) {
      if (candidate.id === comp.id) continue;
      
      const candidateArea = candidate.bbox.width * candidate.bbox.height;
      const compArea = comp.bbox.width * comp.bbox.height;
      
      if (candidateArea > compArea && isContained(comp.bbox, candidate.bbox)) {
        if (!parent || (candidate.bbox.width * candidate.bbox.height) < (parent.bbox.width * parent.bbox.height)) {
          parent = candidate;
        }
      }
    }
    
    if (parent) {
      comp.parent = parent.id;
      parent.children.push(comp.id);
    } else {
      root.children.push(comp.id);
    }
  });
  
  return root;
}

function isContained(inner: any, outer: any): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    (inner.x + inner.width) <= (outer.x + outer.width) &&
    (inner.y + inner.height) <= (outer.y + outer.height)
  );
}