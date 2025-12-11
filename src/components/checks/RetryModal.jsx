import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import ScreenshotUploader from "@/components/media/ScreenshotUploader";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

/**
 * RetryModal - Guided flow for creating structured retry prompts
 * Requires: screenshot + user explanation → generates structured retry prompt
 */
export default function RetryModal({ 
  isOpen, 
  onClose, 
  task, 
  onConfirm,
  projectId
}) {
  const [screenshots, setScreenshots] = useState([]);
  const [userExplanation, setUserExplanation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visionAnalysis, setVisionAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setScreenshots([]);
      setUserExplanation("");
      setVisionAnalysis(null);
    }
  }, [isOpen]);

  // Auto-analyze screenshots when added (with caching)
  useEffect(() => {
    if (screenshots.length > 0 && !visionAnalysis && !isAnalyzing) {
      analyzeScreenshots();
    }
  }, [screenshots]);

  const analyzeScreenshots = async () => {
    if (screenshots.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      const results = [];
      for (const url of screenshots) {
        console.log('[RetryModal] Analyzing screenshot (with cache):', url);
        const response = await base44.functions.invoke('analyzeScreenshotWithCache', {
          screenshotUrl: url,
          level: 'full'
        });
        
        if (response.data?.ok) {
          results.push(response.data);
          console.log('[RetryModal] ✓ Analysis', response.data.cached ? 'from cache' : 'completed');
        }
      }
      
      if (results.length > 0) {
        setVisionAnalysis(results);
        toast.success('📸 Screenshot analysis complete', {
          description: results[0].cached ? 'Using cached analysis' : 'Fresh analysis saved'
        });
      }
    } catch (error) {
      console.error('[RetryModal] Vision analysis failed:', error);
      toast.error('⚠️ Screenshot analysis failed', {
        description: 'Will use screenshot without analysis'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate structured retry prompt with OCR vision data
  const generateRetryPrompt = () => {
    if (!task) return "";

    const originalTask = task.full_description || task.task_name;
    const hasScreenshot = screenshots.length > 0;
    const hasExplanation = userExplanation.trim().length > 0;

    if (!hasScreenshot && !hasExplanation) {
      return "⚠️ Please add screenshot and explanation to generate preview";
    }

    // Include OCR vision analysis if available
    let visionSection = '';
    let screenshotsPayload = [];
    
    if (visionAnalysis && visionAnalysis.length > 0) {
      const analysis = visionAnalysis[0];
      visionSection = `\n**OCR Vision Analysis:**
- Detected UI elements: ${analysis.regions?.length || 0} regions
- Text content: "${analysis.ocr?.text?.substring(0, 200) || 'No text detected'}..."
- Layout level: ${analysis.metadata?.ocrLevel || 'basic'}
`;

      // Build structured screenshots payload with OCR vision data
      screenshotsPayload = screenshots.map((url, idx) => {
        const analysisData = visionAnalysis[idx] || visionAnalysis[0];
        return {
          id: url,
          pageHint: task?.target_page || "Checks page",
          componentHint: task?.target_component || "Failed task",
          domain: task?.target_domain || "UI",
          ocrVision: {
            ocr: analysisData.ocr,
            regions: analysisData.regions,
            semanticBlocks: analysisData.semanticBlocks,
            layoutRelations: analysisData.layoutRelations,
            visionStructure: analysisData.visionStructure,
            width: analysisData.width,
            height: analysisData.height,
            summary: analysisData.summary
          }
        };
      });
    } else {
      // Fallback without OCR vision
      screenshotsPayload = screenshots.map(url => ({
        id: url,
        pageHint: task?.target_page || "Checks page",
        componentHint: task?.target_component || "Failed task",
        domain: task?.target_domain || "UI",
        ocrVision: "PENDING_ANALYSIS"
      }));
    }

    const prompt = `**Retry — Task Correction Request**

**1. User screenshot evidence**
${hasScreenshot ? `Attached screenshot shows the area where the issue occurs.` : "⚠️ Screenshot required"}
${visionSection}
${hasExplanation ? `User observation: ${userExplanation.trim()}` : ""}

**2. Original task description**
${originalTask}

**3. What was expected**
• The task should have produced the following elements, functions, or UI changes:
  ${originalTask.split('\n')[0]}

**4. What was wrong or missing**
• Based on the screenshot and user feedback:
  ${userExplanation.trim() || "⚠️ Please describe what is missing or incorrect"}
• Specific issues:
  - Elements not visible or not rendered
  - Functions not working correctly
  - Incorrect styling or layout
  - Missing functionality

**5. Required corrections**
• Review the screenshot carefully
• Identify exactly which specific part failed
• Make the following corrections:
  - Add missing elements
  - Fix incorrect implementations
  - Ensure all UI elements are visible and properly styled
  - Verify functionality works as intended
  - Check dark mode compatibility if applicable
• Validate the changes work correctly before marking as complete

**Context:**
- Original task: ${task.itemTitle}
- Project: ${task.projectId || "No project"}

**Screenshots JSON:**
\`\`\`json
${JSON.stringify({ screenshots: screenshotsPayload }, null, 2)}
\`\`\`
`;

    return prompt;
  };

  const handleConfirm = async () => {
    if (screenshots.length === 0) {
      toast.error('Screenshot required', {
        description: 'Please upload at least one screenshot showing the issue'
      });
      return;
    }

    // Verify all screenshot URLs are valid
    const invalidUrls = screenshots.filter(url => !url || !url.startsWith('http'));
    if (invalidUrls.length > 0) {
      console.error('[RetryModal] Invalid screenshot URLs detected:', invalidUrls);
      toast.error('⚠️ Invalid screenshot URLs', {
        description: 'Some screenshots failed to upload correctly. Please re-upload.',
        duration: 8000
      });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('[RetryModal] ✓ Creating retry with', screenshots.length, 'screenshot(s)');
      console.log('[RetryModal] Screenshot URLs:', screenshots);
      const structuredPrompt = generateRetryPrompt();
      
      // Build screenshots payload with OCR vision
      const screenshotsPayload = screenshots.map((url, idx) => {
        const analysisData = visionAnalysis?.[idx] || visionAnalysis?.[0];
        if (analysisData) {
          return {
            id: url,
            pageHint: task?.target_page || "Checks page",
            componentHint: task?.target_component || "Failed task",
            domain: task?.target_domain || "UI",
            ocrVision: {
              ocr: analysisData.ocr,
              regions: analysisData.regions,
              semanticBlocks: analysisData.semanticBlocks,
              layoutRelations: analysisData.layoutRelations,
              visionStructure: analysisData.visionStructure,
              width: analysisData.width,
              height: analysisData.height,
              summary: analysisData.summary
            }
          };
        }
        return {
          id: url,
          pageHint: task?.target_page || "Checks page",
          componentHint: task?.target_component || "Failed task",
          domain: task?.target_domain || "UI"
        };
      });
      
      await onConfirm({
        content: structuredPrompt,
        screenshots: screenshots,
        screenshotsPayload: screenshotsPayload,
        visionAnalysis: visionAnalysis,
        originalTask: task,
        userExplanation: userExplanation.trim()
      });
      toast.success('✓ Retry task created successfully');
      onClose();
    } catch (error) {
      console.error('[RetryModal] Error creating retry:', error);
      toast.error('Failed to create retry task', {
        description: error.message || 'Please try again',
        duration: 8000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = screenshots.length > 0 && userExplanation.trim().length > 0;
  const previewPrompt = generateRetryPrompt();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Retry this task
          </DialogTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Help the AI understand what went wrong by providing a screenshot and brief explanation.
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Original Task Context */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Original Task:</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
              {task?.task_name}
            </p>
          </div>

          {/* Step 1: Screenshot - REQUIRED */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-base font-semibold text-slate-900 dark:text-slate-100">
                1. Screenshot Evidence <span className="text-red-500">*</span>
              </Label>
              {screenshots.length > 0 && (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              )}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Upload a screenshot showing what is missing, incorrect, or not working.
            </p>
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-950/50">
              <ScreenshotUploader
                screenshotIds={screenshots}
                onChange={setScreenshots}
                projectId={projectId}
                maxCount={3}
              />
              {isAnalyzing && (
                <div className="mt-3 flex items-center gap-2 text-sm text-indigo-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing screenshot with OCR Vision...</span>
                </div>
              )}
              {visionAnalysis && !isAnalyzing && (
                <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {visionAnalysis[0]?.regions?.length || 0} UI elements detected
                    {visionAnalysis[0]?.cached && ' (cached)'}
                  </span>
                </div>
              )}
            </div>
            {screenshots.length === 0 && (
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Screenshot is required to continue</span>
              </div>
            )}
          </div>

          {/* Step 2: User Explanation - REQUIRED */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-base font-semibold text-slate-900 dark:text-slate-100">
                2. What is missing or wrong? <span className="text-red-500">*</span>
              </Label>
              {userExplanation.trim().length > 0 && (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              )}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Briefly describe the problem (1-3 sentences).
            </p>
            <Textarea
              value={userExplanation}
              onChange={(e) => setUserExplanation(e.target.value)}
              placeholder="Example: The submit button is not visible on the page. The form shows up but there's no way to submit it."
              className="min-h-[100px] dark:bg-slate-800 dark:border-slate-700"
              maxLength={500}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 text-right">
              {userExplanation.length}/500 characters
            </p>
          </div>

          {/* Step 3: Generated Preview */}
          <div className="space-y-2">
            <Label className="text-base font-semibold text-slate-900 dark:text-slate-100">
              3. Generated Retry Prompt Preview
            </Label>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              This structured prompt will be sent to Multi-Task for retry.
            </p>
            <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-4 border border-slate-700 max-h-[400px] overflow-y-auto">
              <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">
                {previewPrompt}
              </pre>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!canSubmit || isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSubmitting ? "Creating Retry..." : "Confirm Retry"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}