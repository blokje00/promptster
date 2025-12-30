/**
 * Level 4: Vision-to-Code Component Classifier
 * Detects UI components and builds component trees
 */

import type { SemanticBlock } from "./semanticAnalyzer.ts";
import type { ImageData } from "./imageDecoder.ts";
import { OCR_CONFIG, type ComponentType } from "./ocrConfig.ts";

export interface DetectedComponent {
  id: string;
  type: ComponentType;
  bbox: { x: number; y: number; width: number; height: number };
  confidence: number;
  text?: string;
  attributes: Record<string, any>;
  children: string[];
  parent?: string;
}

export interface VisionStructure {
  components: DetectedComponent[];
  layoutTree: LayoutNode;
  metadata: {
    componentCount: number;
    treeDepth: number;
    detectedTypes: ComponentType[];
  };
}

export interface LayoutNode {
  componentId: string;
  children: LayoutNode[];
  layoutType: 'vertical' | 'horizontal' | 'grid' | 'absolute';
}

/**
 * Perform Level 4 component detection and structure analysis
 */
export function detectComponents(
  semanticBlocks: SemanticBlock[],
  imageData: ImageData
): VisionStructure {
  // 1. Classify components from semantic blocks
  const components = classifyComponents(semanticBlocks, imageData);
  
  // 2. Build layout tree
  const layoutTree = buildLayoutTree(components, imageData);
  
  // 3. Enrich with relationships
  const enrichedComponents = enrichComponents(components, layoutTree);
  
  return {
    components: enrichedComponents,
    layoutTree,
    metadata: {
      componentCount: enrichedComponents.length,
      treeDepth: calculateTreeDepth(layoutTree),
      detectedTypes: [...new Set(enrichedComponents.map(c => c.type))]
    }
  };
}

/**
 * Classify components from semantic blocks
 */
function classifyComponents(
  blocks: SemanticBlock[],
  imageData: ImageData
): DetectedComponent[] {
  const components: DetectedComponent[] = [];
  
  blocks.forEach((block, idx) => {
    const features = extractFeatures(block, imageData);
    const type = classifyComponentType(block, features);
    const confidence = calculateConfidence(block, features, type);
    
    // Only add if confidence meets threshold
    if (confidence >= OCR_CONFIG.L4_MIN_COMPONENT_CONFIDENCE) {
      components.push({
        id: `comp-${idx}`,
        type,
        bbox: block.bbox,
        confidence,
        text: block.text,
        attributes: buildAttributes(block, features, type),
        children: [],
        parent: undefined
      });
    }
  });
  
  return components;
}

/**
 * Extract visual and semantic features
 */
function extractFeatures(block: SemanticBlock, imageData: ImageData): Record<string, any> {
  const { bbox, text, type: semanticType } = block;
  const area = bbox.width * bbox.height;
  const aspectRatio = bbox.width / bbox.height;
  const relativeX = bbox.x / imageData.width;
  const relativeY = bbox.y / imageData.height;
  const wordCount = text.split(/\s+/).length;
  
  return {
    area,
    aspectRatio,
    relativeX,
    relativeY,
    wordCount,
    semanticType,
    hasBorder: detectBorder(bbox, imageData),
    hasIcon: detectIcon(text),
    isInteractive: isInteractiveText(text),
    isFormField: isFormFieldText(text),
    position: categorizePosition(relativeX, relativeY)
  };
}

/**
 * Classify component type based on features
 */
function classifyComponentType(block: SemanticBlock, features: any): ComponentType {
  const { text, type: semanticType } = block;
  const { aspectRatio, area, wordCount, hasIcon, isInteractive, isFormField, position } = features;
  
  // Button detection
  if (semanticType === 'action' || isInteractive) {
    if (area < 15000 && aspectRatio > 1.5 && aspectRatio < 6) {
      return 'Button';
    }
  }
  
  // Input field detection
  if (isFormField || (aspectRatio > 3 && area < 20000 && wordCount <= 2)) {
    return 'Input';
  }
  
  // Card detection
  if (area > 30000 && aspectRatio > 0.8 && aspectRatio < 3) {
    return 'Card';
  }
  
  // Modal detection (centered, large)
  if (features.position === 'center' && area > 50000) {
    return 'Modal';
  }
  
  // Alert detection
  if (/^(error|warning|success|info|alert|notice)/i.test(text)) {
    return 'Alert';
  }
  
  // Tab detection
  if (features.position === 'top' && aspectRatio > 2 && area < 15000) {
    return 'Tab';
  }
  
  // Table detection (multiple aligned rows)
  if (aspectRatio > 2 && area > 40000) {
    return 'Table';
  }
  
  // List detection
  if (wordCount > 3 && aspectRatio < 0.5) {
    return 'List';
  }
  
  // Form detection (multiple fields)
  if (area > 25000 && /form|name|email|password|address/i.test(text)) {
    return 'Form';
  }
  
  // Dropdown detection
  if (/select|choose|pick|dropdown/i.test(text) && area < 12000) {
    return 'Dropdown';
  }
  
  // Checkbox/Radio detection
  if (/^\[\s*\]|^\(\s*\)/.test(text.trim()) || area < 500) {
    if (text.includes('(')) return 'Radio';
    return 'Checkbox';
  }
  
  // Link detection
  if (/^https?:\/\/|www\.|\.com|\.org/.test(text) || semanticType === 'label' && wordCount <= 4) {
    return 'Link';
  }
  
  // Image detection (little/no text, large area)
  if (wordCount <= 2 && area > 20000) {
    return 'Image';
  }
  
  // Icon detection
  if (hasIcon || (area < 2000 && wordCount <= 1)) {
    return 'Icon';
  }
  
  // Badge detection
  if (area < 5000 && wordCount <= 2 && /^\d+$|^new$|^beta$/i.test(text.trim())) {
    return 'Badge';
  }
  
  // Divider detection
  if ((aspectRatio > 10 || aspectRatio < 0.1) && area < 2000) {
    return 'Divider';
  }
  
  // Header/Footer/Sidebar detection
  if (features.position === 'top' && area > 20000) return 'Header';
  if (features.position === 'bottom' && area > 15000) return 'Footer';
  if (features.position === 'left' || features.position === 'right') {
    if (area > 30000) return 'Sidebar';
  }
  
  // Navigation detection
  if (position === 'top' || position === 'left') {
    if (/home|about|contact|menu|nav/i.test(text)) {
      return 'Navigation';
    }
  }
  
  // Container/Grid detection (large, contains others)
  if (area > 40000) {
    return 'Container';
  }
  
  return 'Unknown';
}

/**
 * Calculate classification confidence
 */
function calculateConfidence(block: SemanticBlock, features: any, type: ComponentType): number {
  let confidence = block.confidence;
  
  // Boost confidence for strong indicators
  if (type === 'Button' && features.isInteractive) confidence += 0.1;
  if (type === 'Input' && features.isFormField) confidence += 0.15;
  if (type === 'Card' && features.hasBorder) confidence += 0.1;
  if (type === 'Alert' && /error|warning|success/i.test(block.text)) confidence += 0.2;
  
  return Math.min(confidence, 1.0);
}

/**
 * Build attributes object for component
 */
function buildAttributes(block: SemanticBlock, features: any, type: ComponentType): Record<string, any> {
  const attrs: Record<string, any> = {
    semanticType: block.type,
    position: features.position,
    area: features.area,
    aspectRatio: features.aspectRatio
  };
  
  // Type-specific attributes
  if (type === 'Button') {
    attrs.variant = inferButtonVariant(block.text);
    attrs.size = features.area < 5000 ? 'sm' : features.area > 15000 ? 'lg' : 'md';
  }
  
  if (type === 'Input') {
    attrs.inputType = inferInputType(block.text);
  }
  
  if (type === 'Alert') {
    attrs.severity = inferAlertSeverity(block.text);
  }
  
  return attrs;
}

/**
 * Build layout tree from components
 */
function buildLayoutTree(components: DetectedComponent[], imageData: ImageData): LayoutNode {
  // Find root (largest container or Header)
  const root = components.find(c => c.type === 'Container' || c.type === 'Header') || components[0];
  
  if (!root) {
    return { componentId: 'root', children: [], layoutType: 'vertical' };
  }
  
  const tree = buildTreeRecursive(root, components, imageData);
  return tree;
}

function buildTreeRecursive(
  component: DetectedComponent,
  allComponents: DetectedComponent[],
  imageData: ImageData
): LayoutNode {
  // Find children (components contained within this component's bbox)
  const children = allComponents.filter(c => {
    if (c.id === component.id) return false;
    return isContainedIn(c.bbox, component.bbox);
  });
  
  // Determine layout type from children arrangement
  const layoutType = inferLayoutType(children);
  
  // Build child nodes
  const childNodes = children.map(child => buildTreeRecursive(child, allComponents, imageData));
  
  return {
    componentId: component.id,
    children: childNodes,
    layoutType
  };
}

function isContainedIn(inner: any, outer: any): boolean {
  return inner.x >= outer.x &&
         inner.y >= outer.y &&
         inner.x + inner.width <= outer.x + outer.width &&
         inner.y + inner.height <= outer.y + outer.height;
}

function inferLayoutType(children: DetectedComponent[]): 'vertical' | 'horizontal' | 'grid' | 'absolute' {
  if (children.length === 0) return 'vertical';
  
  // Check if children are aligned vertically
  const avgY = children.reduce((sum, c) => sum + c.bbox.y, 0) / children.length;
  const verticalAlignment = children.every(c => Math.abs(c.bbox.y - avgY) < 50);
  
  if (verticalAlignment) return 'horizontal';
  
  // Check if children form a grid (multiple rows and columns)
  const uniqueYs = [...new Set(children.map(c => Math.round(c.bbox.y / 50)))];
  const uniqueXs = [...new Set(children.map(c => Math.round(c.bbox.x / 50)))];
  
  if (uniqueYs.length > 2 && uniqueXs.length > 2) return 'grid';
  
  return 'vertical';
}

function enrichComponents(components: DetectedComponent[], tree: LayoutNode): DetectedComponent[] {
  const enriched = components.map(c => ({ ...c }));
  
  // Set parent-child relationships from tree
  function traverseTree(node: LayoutNode, parentId?: string) {
    const component = enriched.find(c => c.id === node.componentId);
    if (component) {
      component.parent = parentId;
      component.children = node.children.map(child => child.componentId);
    }
    
    node.children.forEach(child => traverseTree(child, node.componentId));
  }
  
  traverseTree(tree);
  
  return enriched;
}

function calculateTreeDepth(node: LayoutNode, depth = 0): number {
  if (node.children.length === 0) return depth;
  return Math.max(...node.children.map(child => calculateTreeDepth(child, depth + 1)));
}

// Helper functions

function detectBorder(bbox: any, imageData: ImageData): boolean {
  // Simple heuristic: components near edges or with specific aspect ratios
  return bbox.x < 50 || bbox.y < 50 || 
         bbox.x + bbox.width > imageData.width - 50 ||
         bbox.y + bbox.height > imageData.height - 50;
}

function detectIcon(text: string): boolean {
  return text.length <= 2 || /^[✓✗×✕✖▲▼◀▶←→↑↓☰⋮⚙🔍📧📱💡⚠]/.test(text);
}

function isInteractiveText(text: string): boolean {
  return /^(click|tap|press|submit|save|cancel|delete|edit|add|create|send|login|signup|register|ok|yes|no|confirm|accept|decline|back|next|continue|skip|close)/i.test(text);
}

function isFormFieldText(text: string): boolean {
  return /^(name|email|password|username|phone|address|city|state|zip|country|message|comment|search|query)$/i.test(text);
}

function categorizePosition(relX: number, relY: number): 'top' | 'bottom' | 'left' | 'right' | 'center' {
  if (relY < 0.2) return 'top';
  if (relY > 0.8) return 'bottom';
  if (relX < 0.2) return 'left';
  if (relX > 0.8) return 'right';
  return 'center';
}

function inferButtonVariant(text: string): 'primary' | 'secondary' | 'danger' | 'ghost' {
  if (/submit|save|create|confirm|accept|login|signup|send/i.test(text)) return 'primary';
  if (/delete|remove|cancel|decline|no/i.test(text)) return 'danger';
  if (/close|skip|back/i.test(text)) return 'ghost';
  return 'secondary';
}

function inferInputType(text: string): string {
  if (/email/i.test(text)) return 'email';
  if (/password/i.test(text)) return 'password';
  if (/phone|tel/i.test(text)) return 'tel';
  if (/search/i.test(text)) return 'search';
  if (/date/i.test(text)) return 'date';
  if (/number|age|zip/i.test(text)) return 'number';
  return 'text';
}

function inferAlertSeverity(text: string): 'error' | 'warning' | 'success' | 'info' {
  if (/error|fail|invalid|incorrect/i.test(text)) return 'error';
  if (/warning|caution|attention/i.test(text)) return 'warning';
  if (/success|complete|done|saved/i.test(text)) return 'success';
  return 'info';
}