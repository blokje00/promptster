import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import ScreenshotUploader from "@/components/media/ScreenshotUploader";

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

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setScreenshots([]);
      setUserExplanation("");
    }
  }, [isOpen]);

  // Generate structured retry prompt
  const generateRetryPrompt = () => {
    if (!task) return "";

    const originalTask = task.full_description || task.task_name;
    const hasScreenshot = screenshots.length > 0;
    const hasExplanation = userExplanation.trim().length > 0;

    if (!hasScreenshot && !hasExplanation) {
      return "⚠️ Please add screenshot and explanation to generate preview";
    }

    const prompt = `**Retry — Task Correction Request**

**1. User screenshot evidence**
${hasScreenshot ? `Attached screenshot shows the area where the issue occurs.` : "⚠️ Screenshot required"}
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
`;

    return prompt;
  };

  const handleConfirm = async () => {
    if (screenshots.length === 0) {
      return; // Button should be disabled, but extra safety
    }

    setIsSubmitting(true);
    try {
      const structuredPrompt = generateRetryPrompt();
      await onConfirm({
        content: structuredPrompt,
        screenshots: screenshots,
        originalTask: task,
        userExplanation: userExplanation.trim()
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = screenshots.length > 0 && userExplanation.trim().length > 0;
  const previewPrompt = generateRetryPrompt();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900">
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