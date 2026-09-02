import { invokeLLM } from "@/components/lib/invokeLLM";

/**
 * This Base44 plan has NO backend functions (every call to /functions/*
 * returns 402 "Functions are blocked"), so this module is no longer a set
 * of base44.functions.invoke() wrappers — it's a thin facade over
 * client-side implementations that call Nous Research directly from the
 * browser (see src/lib/nousClient.js, loaded with the signed-in user's key
 * by src/components/ai/NousKeyLoader.jsx). Export names and call signatures
 * are unchanged so existing callers don't need to change.
 *
 * Functions that only made sense server-side (exportUserData,
 * getResearchPaperUrl, downloadResearchPaper, uploadScreenshot, serveImage,
 * saveTask) are removed — nothing in the frontend may call
 * base44.functions.invoke anymore.
 */

/** Run a prompt through the Nous LLM directly from the browser. */
export async function runPrompt({ prompt, file_urls } = {}) {
  const result = await invokeLLM({ prompt, file_urls });
  return { ok: true, result, credits_used: 0 };
}

export {
  analyzeScreenshotWithCache,
  analyzeScreenshotVision,
  analyzeScreenshotUrl,
} from "@/lib/ai/screenshotAnalysis";

export {
  decomposeTask,
  synthesizePreferences,
  analyzeRetrospectiveFeedback,
  applyFeedbackToPreferences,
} from "@/lib/ai/learning";

export { fixVaultTasks, hardDeleteOldTasks } from "@/lib/maintenance";

export { getAdminStats } from "@/lib/adminStats";
