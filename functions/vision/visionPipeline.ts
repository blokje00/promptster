/**
 * Unified Vision Pipeline - Orchestrates OCR, layout detection, and classification
 * Server-side compatible, no browser APIs
 */

/**
 * Run OCR and layout detection on an image URL
 * @param {Object} params - { imageUrl, projectId }
 * @returns {Promise<Object>} OCR result with regions
 */
export async function runOcrAndLayout({ imageUrl, projectId }) {
  console.log('[visionPipeline] Starting OCR and layout for:', imageUrl);
  
  try {
    // For now, return minimal structure that downstream code expects
    // Full OCR with Tesseract can be added later if needed
    const result = {
      text: "",
      words: [],
      lines: [],
      regions: [],
      width: 1920,
      height: 1080
    };
    
    console.log('[visionPipeline] OCR/layout completed (minimal mode)');
    return result;
  } catch (error) {
    console.error('[visionPipeline] OCR/layout failed:', error);
    throw new Error(`OCR/layout failed: ${error.message}`);
  }
}

/**
 * Analyze semantic structure from OCR results
 * @param {Object} ocrResult - Output from runOcrAndLayout
 * @returns {Object} Semantic blocks and layout relations
 */
export function analyzeSemanticStructure(ocrResult) {
  console.log('[visionPipeline] Analyzing semantic structure');
  
  try {
    const regions = Array.isArray(ocrResult?.regions) ? ocrResult.regions : [];
    
    if (regions.length === 0) {
      return {
        semanticBlocks: [],
        layoutRelations: []
      };
    }
    
    // Group regions into semantic blocks based on proximity and type
    const semanticBlocks = groupIntoSemanticBlocks(regions);
    const layoutRelations = generateLayoutRelations(regions);
    
    console.log('[visionPipeline] Generated', semanticBlocks.length, 'semantic blocks');
    return { semanticBlocks, layoutRelations };
  } catch (error) {
    console.error('[visionPipeline] Semantic analysis failed:', error);
    return { semanticBlocks: [], layoutRelations: [] };
  }
}

/**
 * Detect and classify UI components
 * @param {Object} ocrResult - Output from runOcrAndLayout
 * @param {Object} semanticResult - Output from analyzeSemanticStructure
 * @returns {Object} Vision structure with classified components
 */
export function detectComponents(ocrResult, semanticResult) {
  console.log('[visionPipeline] Detecting components');
  
  try {
    const regions = Array.isArray(ocrResult?.regions) ? ocrResult.regions : [];
    
    if (regions.length === 0) {
      return null;
    }
    
    // Classify each region as a specific component type
    const components = regions.map(region => ({
      id: region.id,
      type: classifyComponent(region),
      text: region.text || '',
      bbox: region.bbox,
      confidence: region.confidence || 0.8,
      attributes: inferComponentAttributes(region),
      parent: null,
      children: []
    }));
    
    const componentTypes = [...new Set(components.map(c => c.type))];
    
    console.log('[visionPipeline] Detected', components.length, 'components');
    
    return {
      components,
      layoutTree: { type: 'root', children: components.map(c => c.id) },
      metadata: {
        componentCount: components.length,
        detectedTypes: componentTypes,
        enhancedWithLLM: false
      }
    };
  } catch (error) {
    console.error('[visionPipeline] Component detection failed:', error);
    return null;
  }
}

// Helper functions

function groupIntoSemanticBlocks(regions) {
  // Simple grouping: treat each region as its own block for now
  return regions.map((region, idx) => ({
    id: `block-${idx}`,
    type: inferBlockType(region),
    text: region.text || '',
    bbox: region.bbox,
    confidence: region.confidence || 0.7,
    components: [region.id],
    hierarchy: { level: 0 }
  }));
}

function generateLayoutRelations(regions) {
  const relations = [];
  
  for (let i = 0; i < regions.length; i++) {
    for (let j = i + 1; j < regions.length; j++) {
      const r1 = regions[i];
      const r2 = regions[j];
      
      if (!r1?.bbox || !r2?.bbox) continue;
      
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

function inferBlockType(region) {
  const text = (region.text || '').toLowerCase();
  
  if (text.includes('nav') || text.includes('menu')) return 'navigation';
  if (text.includes('header') || text.includes('title')) return 'header';
  if (text.includes('form') || text.includes('input')) return 'form';
  if (text.includes('button') || text.includes('submit')) return 'action';
  
  return 'content_section';
}

function classifyComponent(region) {
  const text = (region.text || '').toLowerCase();
  const role = region.role || '';
  
  if (role === 'button' || text.match(/^(submit|save|cancel|delete|edit)/)) return 'Button';
  if (role === 'input' || text.match(/input|enter|type/)) return 'Input';
  if (role === 'heading' || text.length < 50) return 'Heading';
  if (role === 'link') return 'Link';
  if (role === 'image') return 'Image';
  if (role === 'card') return 'Card';
  
  return 'Text';
}

function inferComponentAttributes(region) {
  const attrs = {};
  
  if (region.text) {
    attrs.text = region.text;
  }
  
  if (region.role === 'button' && region.text) {
    const cleanText = String(region.text).replace(/\s+/g, '');
    attrs.onClick = `handle${cleanText}`;
  }
  
  if (region.role === 'input') {
    attrs.placeholder = region.text || 'Enter text...';
  }
  
  return attrs;
}