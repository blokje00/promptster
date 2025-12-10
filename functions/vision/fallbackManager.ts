import { fetchAndDecodeImage, normalizeImageSize } from "./imageDecoder.ts";
import { performOCR, terminateOCR } from "./ocrEngine.ts";
import { detectRegionsFromOCR } from "./layoutDetector.ts";
import { classifyRegionsHeuristic } from "./classifier.ts";
import { analyzeSemanticStructure, type SemanticOCRResult } from "./semanticAnalyzer.ts";
import { detectComponents, type VisionStructure } from "./componentClassifier.ts";
import { OCRLevel } from "./ocrConfig.ts";
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
  enableSemanticAnalysis: boolean;  // Level 3
  enableComponentDetection: boolean; // Level 4
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
      enableSemanticAnalysis: true,  // Level 3 enabled by default
      enableComponentDetection: true, // Level 4 enabled by default
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

      // Try Classification (Level 2.5)
      if (this.config.enableClassification && regions.length > 0) {
        try {
          regions = classifyRegionsHeuristic(regions);
        } catch (error) {
          console.warn('Classification failed, keeping unclassified regions:', error);
        }
      }

      // Level 3: Semantic Analysis
      let semanticResult: SemanticOCRResult | null = null;
      if (this.config.enableSemanticAnalysis && ocrResult) {
        try {
          semanticResult = analyzeSemanticStructure(ocrResult, normalized);
        } catch (error) {
          console.warn('Semantic analysis failed:', error);
        }
      }

      // Level 4: Component Detection
      let visionStructure: VisionStructure | null = null;
      if (this.config.enableComponentDetection && semanticResult) {
        try {
          visionStructure = detectComponents(semanticResult.semanticBlocks, normalized);
        } catch (error) {
          console.warn('Component detection failed:', error);
        }
      }

      const processingTime = Date.now() - startTime;
      
      return this.buildResult(url, normalized, ocrResult, regions, processingTime, semanticResult, visionStructure);
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

  private buildResult(
    url: string, 
    imageData: any, 
    ocrResult: any, 
    regions: any[], 
    processingTime: number,
    semanticResult?: SemanticOCRResult | null,
    visionStructure?: VisionStructure | null
  ): VisionResult {
    const summary = this.generateLevelAwareSummary(imageData, ocrResult, regions, semanticResult, visionStructure);
    
    // Determine OCR level achieved
    let ocrLevel = OCRLevel.BASIC;
    if (ocrResult && regions.length > 0) ocrLevel = OCRLevel.LEVEL_2;
    if (regions.some((r: any) => r.role)) ocrLevel = OCRLevel.LEVEL_2_5;
    if (semanticResult) ocrLevel = OCRLevel.LEVEL_3;
    if (visionStructure) ocrLevel = OCRLevel.LEVEL_4;
    
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
      // Level 3 data (optional)
      semanticBlocks: semanticResult?.semanticBlocks,
      layoutRelations: semanticResult?.layoutRelations,
      // Level 4 data (optional)
      visionStructure: visionStructure,
      metadata: {
        processingTime,
        ocrAvailable: !!ocrResult,
        layoutAvailable: regions.length > 0,
        classificationAvailable: regions.some((r: any) => r.role),
        analysisLevel: this.level,
        ocrLevel
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

  private generateLevelAwareSummary(
    imageData: any, 
    ocrResult: any, 
    regions: any[],
    semanticResult?: SemanticOCRResult | null,
    visionStructure?: VisionStructure | null
  ): string {
    const buttonCount = regions.filter((r: any) => r.role === 'button').length;
    const headingCount = regions.filter((r: any) => r.role === 'heading').length;
    const inputCount = regions.filter((r: any) => r.role === 'input').length;
    const wordCount = ocrResult ? ocrResult.text.split(/\s+/).filter((w: string) => w.length > 0).length : 0;

    let summary = `Screenshot (${imageData.width}x${imageData.height}px) with ${regions.length} detected regions. `;
    
    if (wordCount > 0) {
      summary += `Contains ${wordCount} words. `;
    }
    
    // Level 3/4 summary
    if (visionStructure) {
      summary += `[Level 4] Detected ${visionStructure.metadata.componentCount} UI components: `;
      summary += visionStructure.metadata.detectedTypes.slice(0, 5).join(', ');
      if (visionStructure.metadata.detectedTypes.length > 5) {
        summary += `, and ${visionStructure.metadata.detectedTypes.length - 5} more.`;
      }
    } else if (semanticResult) {
      summary += `[Level 3] ${semanticResult.metadata.blockCount} semantic blocks with ${semanticResult.metadata.relationshipCount} relationships. `;
    } else {
      // Level 2 summary
      const components = [];
      if (buttonCount > 0) components.push(`${buttonCount} buttons`);
      if (headingCount > 0) components.push(`${headingCount} headings`);
      if (inputCount > 0) components.push(`${inputCount} inputs`);
      
      if (components.length > 0) {
        summary += components.join(', ') + '.';
      }
    }

    return summary.trim();
  }
}