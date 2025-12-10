import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { VisionPipeline } from "./vision/fallbackManager.ts";

export interface VisionRegion {
  id: string;
  bbox: { x: number; y: number; width: number; height: number };
  text?: string;
  role?: "button" | "input" | "link" | "heading" | "label" | "image" | "card" | "other";
  confidence: number;
}

export interface VisionResult {
  sourceUrl: string;
  width: number;
  height: number;
  summary: string;
  regions: VisionRegion[];
  // Level 3 fields (optional)
  semanticBlocks?: any[];
  layoutRelations?: any[];
  // Level 4 fields (optional)
  visionStructure?: any;
  metadata: {
    processingTime: number;
    ocrAvailable: boolean;
    layoutAvailable: boolean;
    classificationAvailable: boolean;
    analysisLevel?: string;
    ocrLevel?: string;
    error?: string;
  };
}

/**
 * Vision Analysis Backend Function
 * Analyzes screenshots using OCR, layout detection, and UI classification
 * Pro-only feature
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for Pro subscription (optional - remove if all users should have access)
    // Uncomment below to enforce Pro-only access
    /*
    const plans = await base44.asServiceRole.entities.SubscriptionPlan.list();
    const userPlan = plans.find(p => p.id === user.plan_id);
    
    if (!userPlan || userPlan.name !== 'Pro') {
      return Response.json({ 
        error: 'Pro subscription required for vision analysis' 
      }, { status: 403 });
    }
    */

    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return Response.json({ 
        error: 'Invalid URL parameter' 
      }, { status: 400 });
    }

    // Create vision pipeline with Level 3 & 4 support
    const pipeline = new VisionPipeline({
      timeoutMs: 30000,
      enableOCR: true,
      enableLayout: true,
      enableClassification: true,
      enableSemanticAnalysis: true,     // Level 3
      enableComponentDetection: true    // Level 4
    });

    const result = await pipeline.analyze(url);

    return Response.json(result);

  } catch (error) {
    console.error('Vision analysis error:', error);
    return Response.json({ 
      error: `Vision analysis failed: ${error.message}` 
    }, { status: 500 });
  }
});