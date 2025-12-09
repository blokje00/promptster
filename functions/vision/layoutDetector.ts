import type { ImageData } from "./imageDecoder.ts";
import type { OCRResult } from "./ocrEngine.ts";

export interface Region {
  id: string;
  bbox: { x: number; y: number; width: number; height: number };
  text?: string;
  confidence: number;
}

/**
 * Detect layout regions using OCR + heuristics (lightweight fallback)
 */
export function detectRegionsFromOCR(ocrResult: OCRResult, imageData: ImageData): Region[] {
  const regions: Region[] = [];
  
  // Group words into visual regions using proximity clustering
  const clusters = clusterWordsByProximity(ocrResult.words, imageData.width);
  
  clusters.forEach((cluster, idx) => {
    const bbox = computeBoundingBox(cluster.map(w => w.bbox));
    const text = cluster.map(w => w.text).join(' ');
    const avgConfidence = cluster.reduce((sum, w) => sum + w.confidence, 0) / cluster.length;
    
    regions.push({
      id: `region-${idx}`,
      bbox,
      text,
      confidence: avgConfidence
    });
  });

  return regions;
}

/**
 * Cluster words by spatial proximity
 */
function clusterWordsByProximity(words: any[], imageWidth: number): any[][] {
  if (words.length === 0) return [];
  
  const threshold = imageWidth * 0.03; // 3% of image width
  const clusters: any[][] = [];
  const used = new Set<number>();

  for (let i = 0; i < words.length; i++) {
    if (used.has(i)) continue;
    
    const cluster = [words[i]];
    used.add(i);
    
    // Find nearby words
    for (let j = i + 1; j < words.length; j++) {
      if (used.has(j)) continue;
      
      const distance = computeDistance(words[i].bbox, words[j].bbox);
      if (distance < threshold) {
        cluster.push(words[j]);
        used.add(j);
      }
    }
    
    clusters.push(cluster);
  }

  return clusters;
}

function computeDistance(bbox1: any, bbox2: any): number {
  const cx1 = bbox1.x + bbox1.width / 2;
  const cy1 = bbox1.y + bbox1.height / 2;
  const cx2 = bbox2.x + bbox2.width / 2;
  const cy2 = bbox2.y + bbox2.height / 2;
  
  return Math.sqrt((cx2 - cx1) ** 2 + (cy2 - cy1) ** 2);
}

function computeBoundingBox(bboxes: any[]): { x: number; y: number; width: number; height: number } {
  const minX = Math.min(...bboxes.map(b => b.x));
  const minY = Math.min(...bboxes.map(b => b.y));
  const maxX = Math.max(...bboxes.map(b => b.x + b.width));
  const maxY = Math.max(...bboxes.map(b => b.y + b.height));
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}