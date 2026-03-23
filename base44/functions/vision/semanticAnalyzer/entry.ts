/**
 * Level 3: Semantic OCR Analysis
 * Detects UI relationships, hierarchies, and semantic blocks
 */

import type { OCRResult } from "./ocrEngine.ts";
import type { ImageData } from "./imageDecoder.ts";
import { OCR_CONFIG } from "./ocrConfig.ts";

export interface SemanticBlock {
  id: string;
  type: 'text' | 'label' | 'value' | 'action' | 'heading' | 'description';
  text: string;
  bbox: { x: number; y: number; width: number; height: number };
  confidence: number;
  relationships: SemanticRelationship[];
  hierarchy: {
    level: number;
    parent?: string;
    children: string[];
  };
}

export interface SemanticRelationship {
  type: 'label-to-input' | 'button-to-icon' | 'heading-to-content' | 'sibling' | 'parent-child';
  targetId: string;
  confidence: number;
  direction?: 'left' | 'right' | 'above' | 'below';
}

export interface SemanticOCRResult {
  semanticBlocks: SemanticBlock[];
  layoutRelations: LayoutRelation[];
  metadata: {
    blockCount: number;
    relationshipCount: number;
    hierarchyDepth: number;
  };
}

export interface LayoutRelation {
  fromId: string;
  toId: string;
  relation: 'above' | 'below' | 'left-of' | 'right-of' | 'contains' | 'adjacent';
  distance: number;
}

/**
 * Perform Level 3 semantic analysis on OCR output
 */
export function analyzeSemanticStructure(
  ocrResult: OCRResult,
  imageData: ImageData
): SemanticOCRResult {
  // 1. Create semantic blocks from OCR words/lines
  const blocks = createSemanticBlocks(ocrResult, imageData);
  
  // 2. Detect relationships between blocks
  const enrichedBlocks = detectRelationships(blocks, imageData);
  
  // 3. Build hierarchy
  const hierarchicalBlocks = buildHierarchy(enrichedBlocks, imageData);
  
  // 4. Analyze layout relations
  const layoutRelations = analyzeLayoutRelations(hierarchicalBlocks);
  
  return {
    semanticBlocks: hierarchicalBlocks,
    layoutRelations,
    metadata: {
      blockCount: hierarchicalBlocks.length,
      relationshipCount: hierarchicalBlocks.reduce((sum, b) => sum + b.relationships.length, 0),
      hierarchyDepth: Math.max(...hierarchicalBlocks.map(b => b.hierarchy.level), 0)
    }
  };
}

/**
 * Create semantic blocks from OCR output
 */
function createSemanticBlocks(ocrResult: OCRResult, imageData: ImageData): SemanticBlock[] {
  const blocks: SemanticBlock[] = [];
  
  // Group words into logical blocks based on proximity
  const wordGroups = groupWordsByProximity(ocrResult.words, imageData.width);
  
  wordGroups.forEach((group, idx) => {
    const text = group.map(w => w.text).join(' ');
    
    // Skip very short blocks
    if (text.split(/\s+/).length < OCR_CONFIG.L3_MIN_WORDS_FOR_BLOCK && text.length < 3) {
      return;
    }
    
    const bbox = computeBoundingBox(group.map(w => w.bbox));
    const avgConfidence = group.reduce((sum, w) => sum + w.confidence, 0) / group.length;
    
    // Infer block type from content and position
    const type = inferBlockType(text, bbox, imageData);
    
    blocks.push({
      id: `block-${idx}`,
      type,
      text,
      bbox,
      confidence: avgConfidence,
      relationships: [],
      hierarchy: {
        level: 0,
        children: []
      }
    });
  });
  
  return blocks;
}

/**
 * Detect relationships between semantic blocks
 */
function detectRelationships(blocks: SemanticBlock[], imageData: ImageData): SemanticBlock[] {
  const enriched = blocks.map(block => ({ ...block }));
  const maxDist = imageData.width * OCR_CONFIG.L3_MAX_RELATIONSHIP_DISTANCE;
  
  for (let i = 0; i < enriched.length; i++) {
    for (let j = i + 1; j < enriched.length; j++) {
      const blockA = enriched[i];
      const blockB = enriched[j];
      
      const distance = computeCenterDistance(blockA.bbox, blockB.bbox);
      
      if (distance > maxDist) continue;
      
      // Detect label-to-input patterns
      if (blockA.type === 'label' && blockB.type === 'value') {
        const direction = getRelativePosition(blockA.bbox, blockB.bbox);
        if (direction === 'left' || direction === 'above') {
          blockA.relationships.push({
            type: 'label-to-input',
            targetId: blockB.id,
            confidence: 0.8,
            direction
          });
        }
      }
      
      // Detect heading-to-content patterns
      if (blockA.type === 'heading' && blockB.type === 'description') {
        if (getRelativePosition(blockA.bbox, blockB.bbox) === 'above') {
          blockA.relationships.push({
            type: 'heading-to-content',
            targetId: blockB.id,
            confidence: 0.75
          });
        }
      }
      
      // Detect siblings (same vertical level)
      if (Math.abs(blockA.bbox.y - blockB.bbox.y) < 20) {
        blockA.relationships.push({
          type: 'sibling',
          targetId: blockB.id,
          confidence: 0.7
        });
      }
    }
  }
  
  return enriched;
}

/**
 * Build hierarchy from flat blocks
 */
function buildHierarchy(blocks: SemanticBlock[], imageData: ImageData): SemanticBlock[] {
  const hierarchical = blocks.map(b => ({ ...b }));
  
  // Sort by Y position (top to bottom)
  hierarchical.sort((a, b) => a.bbox.y - b.bbox.y);
  
  // Assign hierarchy levels based on size and position
  hierarchical.forEach((block, idx) => {
    // Headings at top = level 0
    if (block.type === 'heading' || (block.bbox.y < imageData.height * 0.2 && block.bbox.height > 30)) {
      block.hierarchy.level = 0;
    }
    // Labels and actions = level 1
    else if (block.type === 'label' || block.type === 'action') {
      block.hierarchy.level = 1;
    }
    // Values and descriptions = level 2
    else {
      block.hierarchy.level = 2;
    }
    
    // Link parent-child based on relationships
    block.relationships
      .filter(r => r.type === 'heading-to-content' || r.type === 'label-to-input')
      .forEach(rel => {
        const child = hierarchical.find(b => b.id === rel.targetId);
        if (child) {
          child.hierarchy.parent = block.id;
          block.hierarchy.children.push(child.id);
        }
      });
  });
  
  return hierarchical;
}

/**
 * Analyze spatial layout relations
 */
function analyzeLayoutRelations(blocks: SemanticBlock[]): LayoutRelation[] {
  const relations: LayoutRelation[] = [];
  
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i];
      const b = blocks[j];
      
      const distance = computeCenterDistance(a.bbox, b.bbox);
      const relation = determineLayoutRelation(a.bbox, b.bbox);
      
      if (relation) {
        relations.push({
          fromId: a.id,
          toId: b.id,
          relation,
          distance
        });
      }
    }
  }
  
  return relations;
}

// Helper functions

function groupWordsByProximity(words: any[], imageWidth: number): any[][] {
  if (words.length === 0) return [];
  
  const threshold = imageWidth * OCR_CONFIG.PROXIMITY_THRESHOLD;
  const clusters: any[][] = [];
  const used = new Set<number>();

  for (let i = 0; i < words.length; i++) {
    if (used.has(i)) continue;
    
    const cluster = [words[i]];
    used.add(i);
    
    for (let j = i + 1; j < words.length; j++) {
      if (used.has(j)) continue;
      
      const distance = computeCenterDistance(words[i].bbox, words[j].bbox);
      if (distance < threshold) {
        cluster.push(words[j]);
        used.add(j);
      }
    }
    
    clusters.push(cluster);
  }

  return clusters;
}

function computeBoundingBox(bboxes: any[]): { x: number; y: number; width: number; height: number } {
  const minX = Math.min(...bboxes.map(b => b.x));
  const minY = Math.min(...bboxes.map(b => b.y));
  const maxX = Math.max(...bboxes.map(b => b.x + b.width));
  const maxY = Math.max(...bboxes.map(b => b.y + b.height));
  
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function computeCenterDistance(bbox1: any, bbox2: any): number {
  const cx1 = bbox1.x + bbox1.width / 2;
  const cy1 = bbox1.y + bbox1.height / 2;
  const cx2 = bbox2.x + bbox2.width / 2;
  const cy2 = bbox2.y + bbox2.height / 2;
  
  return Math.sqrt((cx2 - cx1) ** 2 + (cy2 - cy1) ** 2);
}

function inferBlockType(text: string, bbox: any, imageData: ImageData): SemanticBlock['type'] {
  const wordCount = text.split(/\s+/).length;
  const area = bbox.width * bbox.height;
  const relativeY = bbox.y / imageData.height;
  
  // Heading: top area, larger font, short text
  if (relativeY < 0.25 && wordCount <= 6 && bbox.height > 25) {
    return 'heading';
  }
  
  // Action: button-like keywords
  if (/^(submit|save|cancel|delete|edit|add|create|send|login|sign|ok|yes|no|confirm|back|next)/i.test(text)) {
    return 'action';
  }
  
  // Label: short, ends with colon or question mark
  if ((wordCount <= 4 && /[:?]$/.test(text)) || /^(name|email|password|address|phone|date|time|title|description):/i.test(text)) {
    return 'label';
  }
  
  // Value: short, no punctuation
  if (wordCount <= 3 && area < 8000 && !/[.,:;!?]$/.test(text)) {
    return 'value';
  }
  
  // Description: longer text
  if (wordCount > 6) {
    return 'description';
  }
  
  return 'text';
}

function getRelativePosition(bboxA: any, bboxB: any): 'left' | 'right' | 'above' | 'below' {
  const centerAX = bboxA.x + bboxA.width / 2;
  const centerAY = bboxA.y + bboxA.height / 2;
  const centerBX = bboxB.x + bboxB.width / 2;
  const centerBY = bboxB.y + bboxB.height / 2;
  
  const dx = Math.abs(centerBX - centerAX);
  const dy = Math.abs(centerBY - centerAY);
  
  if (dy > dx) {
    return centerAY < centerBY ? 'above' : 'below';
  } else {
    return centerAX < centerBX ? 'left' : 'right';
  }
}

function determineLayoutRelation(bboxA: any, bboxB: any): LayoutRelation['relation'] | null {
  const centerAX = bboxA.x + bboxA.width / 2;
  const centerAY = bboxA.y + bboxA.height / 2;
  const centerBX = bboxB.x + bboxB.width / 2;
  const centerBY = bboxB.y + bboxB.height / 2;
  
  const dx = centerBX - centerAX;
  const dy = centerBY - centerAY;
  
  // Contains check
  if (bboxA.x <= bboxB.x && bboxA.y <= bboxB.y &&
      bboxA.x + bboxA.width >= bboxB.x + bboxB.width &&
      bboxA.y + bboxA.height >= bboxB.y + bboxB.height) {
    return 'contains';
  }
  
  // Directional relations
  if (Math.abs(dy) > Math.abs(dx)) {
    return dy > 0 ? 'above' : 'below';
  } else {
    return dx > 0 ? 'left-of' : 'right-of';
  }
}