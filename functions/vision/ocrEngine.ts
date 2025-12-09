import { createWorker, type Worker } from "npm:tesseract.js@5.0.4";
import type { ImageData } from "./imageDecoder.ts";

let ocrWorker: Worker | null = null;

/**
 * Initialize OCR worker (call once, reuse)
 */
export async function initOCR(): Promise<void> {
  if (ocrWorker) return;
  
  ocrWorker = await createWorker('eng', 1, {
    workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
    langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-simd.wasm.js',
  });
}

/**
 * Terminate OCR worker (cleanup)
 */
export async function terminateOCR(): Promise<void> {
  if (ocrWorker) {
    await ocrWorker.terminate();
    ocrWorker = null;
  }
}

export interface OCRWord {
  text: string;
  bbox: { x: number; y: number; width: number; height: number };
  confidence: number;
}

export interface OCRResult {
  text: string;
  words: OCRWord[];
  lines: Array<{ text: string; bbox: { x: number; y: number; width: number; height: number } }>;
}

/**
 * Perform OCR on image
 * @param imageData - RGBA image data
 * @returns Extracted text with bounding boxes
 */
export async function performOCR(imageData: ImageData): Promise<OCRResult> {
  await initOCR();
  
  if (!ocrWorker) {
    throw new Error('OCR worker not initialized');
  }

  // Convert ImageData to format Tesseract expects
  const canvas = {
    width: imageData.width,
    height: imageData.height,
    data: imageData.data
  };

  const { data } = await ocrWorker.recognize(canvas);

  // Extract words with bounding boxes
  const words: OCRWord[] = data.words.map(w => ({
    text: w.text,
    bbox: {
      x: w.bbox.x0,
      y: w.bbox.y0,
      width: w.bbox.x1 - w.bbox.x0,
      height: w.bbox.y1 - w.bbox.y0
    },
    confidence: w.confidence / 100
  }));

  // Extract lines
  const lines = data.lines.map(l => ({
    text: l.text,
    bbox: {
      x: l.bbox.x0,
      y: l.bbox.y0,
      width: l.bbox.x1 - l.bbox.x0,
      height: l.bbox.y1 - l.bbox.y0
    }
  }));

  return {
    text: data.text,
    words,
    lines
  };
}