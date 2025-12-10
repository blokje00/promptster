/**
 * OCR Configuration & Level Definitions
 * Centralized config for OCR pipeline levels
 */

export enum OCRLevel {
  /** Level 1: Basic text extraction only */
  BASIC = 'basic',
  
  /** Level 2: Text + bounding boxes */
  LEVEL_2 = 'level_2',
  
  /** Level 2.5: Level 2 + heuristic classification */
  LEVEL_2_5 = 'level_2_5',
  
  /** Level 3: Semantic OCR with relationships */
  LEVEL_3 = 'level_3',
  
  /** Level 4: Vision-to-Code with component trees */
  LEVEL_4 = 'level_4',
  
  /** Failed analysis */
  FAILED = 'failed'
}

export const OCR_CONFIG = {
  /** Maximum image dimension before downscaling */
  MAX_DIMENSION: 1920,
  
  /** OCR processing timeout (ms) */
  TIMEOUT_MS: 30000,
  
  /** Minimum confidence threshold for text recognition */
  MIN_CONFIDENCE: 0.5,
  
  /** Proximity threshold for word clustering (% of image width) */
  PROXIMITY_THRESHOLD: 0.03,
  
  /** Level 3: Minimum words for semantic block */
  L3_MIN_WORDS_FOR_BLOCK: 2,
  
  /** Level 3: Maximum distance for relationship detection */
  L3_MAX_RELATIONSHIP_DISTANCE: 0.08,
  
  /** Level 4: Minimum confidence for component detection */
  L4_MIN_COMPONENT_CONFIDENCE: 0.6,
  
  /** Level 4: Component type mappings */
  L4_COMPONENT_TYPES: [
    'Button',
    'Input',
    'Card',
    'Modal',
    'Alert',
    'Tab',
    'Table',
    'List',
    'Form',
    'Dropdown',
    'Checkbox',
    'Radio',
    'Link',
    'Image',
    'Icon',
    'Badge',
    'Divider',
    'Header',
    'Footer',
    'Sidebar',
    'Navigation',
    'Container',
    'Grid',
    'Unknown'
  ] as const
};

export type ComponentType = typeof OCR_CONFIG.L4_COMPONENT_TYPES[number];