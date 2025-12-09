import { fetchAndDecodeImage, normalizeImageSize } from "./imageDecoder.ts";
import { performOCR, terminateOCR } from "./ocrEngine.ts";
import { detectRegionsFromOCR } from "./layoutDetector.ts";
import { classifyRegionsHeuristic } from "./classifier.ts";
import type { VisionResult, VisionRegion } from "../analyzeScreenshotVision.ts";

export enum AnalysisLevel {
  FULL = 'full',          // OCR + Layout + Classification
  BASIC = 'basic',        // OCR + Simple regions
  MINIMAL = 'minimal',    // Image metadata only
  FAILED = 'failed'       // Could not analyze
}

export interface FallbackConfig {
  enableOCR: boolean;
  enableLayout: boolean;
  enableClassification: boolean;
  timeoutMs: number;
}

export class VisionPipeline {
  private config: FallbackConfig;
  private level: AnalysisLevel = AnalysisLevel.FULL;

  constructor(config: Partial<FallbackConfig> = {}) {
    this.config = {
      enableOCR: true,
      enableLayout: true,
      enableClassification: true,
      timeoutMs: 30000,
      ...config
    };
  }

  async analyze(url: string): Promise<VisionResult> {
    const startTime = Date.now();
    
    try {
      // Always try to fetch image
      const imageData = await this.fetchWithTimeout(url, this.config.timeoutMs);
      const normalized = normalizeImageSize(imageData, 1920);
      
      // Try OCR
      let ocrResult = null;
      if (this.config.enableOCR) {
        try {
          ocrResult = await performOCR(normalized);
        } catch (error) {
          console.warn('OCR failed, degrading to BASIC level:', error);
          this.level = AnalysisLevel.BASIC;
        }
      }

      // Try Layout
      let regions = [];
      if (this.config.enableLayout && ocrResult) {
        try {
          regions = detectRegionsFromOCR(ocrResult, normalized);
        } catch (error) {
          console.warn('Layout detection failed:', error);
          this.level = AnalysisLevel.MINIMAL;
        }
      }

      // Try Classification
      if (this.config.enableClassification && regions.length > 0) {
        try {
          regions = classifyRegionsHeuristic(regions);
        } catch (error) {
          console.warn('Classification failed, keeping unclassified regions:', error);
        }
      }

      const processingTime = Date.now() - startTime;
      
      return this.buildResult(url, normalized, ocrResult, regions, processingTime);
    } catch (error) {
      this.level = AnalysisLevel.FAILED;
      return this.buildErrorResult(url, error, Date.now() - startTime);
    } finally {
      // Cleanup
      await terminateOCR();
    }
  }

  private async fetchWithTimeout(url: string, timeoutMs: number) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const imageData = await fetchAndDecodeImage(url);
      clearTimeout(timeout);
      return imageData;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  private buildResult(url: string, imageData: any, ocrResult: any, regions: any[], processingTime: number): VisionResult {
    const summary = this.generateLevelAwareSummary(imageData, ocrResult, regions);
    
    return {
      sourceUrl: url,
      width: imageData.width,
      height: imageData.height,
      summary,
      regions: regions.map(r => ({
        id: r.id,
        bbox: r.bbox,
        text: r.text,
        role: r.role,
        confidence: r.confidence
      })),
      metadata: {
        processingTime,
        ocrAvailable: !!ocrResult,
        layoutAvailable: regions.length > 0,
        classificationAvailable: regions.some((r: any) => r.role),
        analysisLevel: this.level
      }
    };
  }

  private buildErrorResult(url: string, error: any, processingTime: number): VisionResult {
    return {
      sourceUrl: url,
      width: 0,
      height: 0,
      summary: `Analysis failed: ${error.message}. Vision analysis is currently unavailable.`,
      regions: [],
      metadata: {
        processingTime,
        ocrAvailable: false,
        layoutAvailable: false,
        classificationAvailable: false,
        analysisLevel: AnalysisLevel.FAILED,
        error: error.message
      }
    };
  }

  private generateLevelAwareSummary(imageData: any, ocrResult: any, regions: any[]): string {
    const buttonCount = regions.filter((r: any) => r.role === 'button').length;
    const headingCount = regions.filter((r: any) => r.role === 'heading').length;
    const inputCount = regions.filter((r: any) => r.role === 'input').length;
    const wordCount = ocrResult ? ocrResult.text.split(/\s+/).filter((w: string) => w.length > 0).length : 0;

    let summary = `Screenshot (${imageData.width}x${imageData.height}px) with ${regions.length} detected regions. `;
    
    if (wordCount > 0) {
      summary += `Contains ${wordCount} words. `;
    }
    
    const components = [];
    if (buttonCount > 0) components.push(`${buttonCount} buttons`);
    if (headingCount > 0) components.push(`${headingCount} headings`);
    if (inputCount > 0) components.push(`${inputCount} inputs`);
    
    if (components.length > 0) {
      summary += components.join(', ') + '.';
    }

    return summary.trim();
  }
}