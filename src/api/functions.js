import { base44 } from "@/api/base44Client";

/**
 * Typed wrappers around base44.functions.invoke(name, payload) for every
 * Base44 backend function under base44/functions/ (excluding `invokeLLM`,
 * which already has a dedicated wrapper at src/components/lib/invokeLLM.jsx
 * — never call base44.integrations.Core.InvokeLLM or the raw invokeLLM
 * function from the frontend, it costs Base44 credits instead of the Nous key).
 *
 * Every backend function here is wrapped in `withAuth` (base44/functions/utils/http),
 * which returns `{ ok: true, ...payload }` on success or `{ ok: false, error }`
 * with a non-2xx status on failure. The base44 SDK's axios client throws on a
 * non-2xx response, so each wrapper below:
 *   - on success: returns `response.data` (the `{ ok: true, ... }` envelope).
 *   - on failure: rethrows `new Error(error.response?.data?.error || error.message)`
 *     so callers get a plain, readable Error either way (network failure or a
 *     `fail()` response from the backend).
 */
async function invoke(name, payload) {
  try {
    const response = await base44.functions.invoke(name, payload);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message);
  }
}

/** Run a prompt through the Nous LLM (open to every logged-in user). */
export function runPrompt({ prompt, file_urls } = {}) {
  return invoke("runPrompt", { prompt, file_urls });
}

/** Cached vision analysis of a screenshot; re-analyzes only on cache miss or forceRefresh. PRO-gated. */
export function analyzeScreenshotWithCache({ screenshotUrl, level = "full", forceRefresh = false } = {}) {
  return invoke("analyzeScreenshotWithCache", { screenshotUrl, level, forceRefresh });
}

/** Uncached vision analysis (OCR + layout) of a screenshot. PRO-gated. */
export function analyzeScreenshotVision({ url, screenshotId, screenshotUrl, projectId, level = "full" } = {}) {
  return invoke("analyzeScreenshotVision", { url, screenshotId, screenshotUrl, projectId, level });
}

/**
 * Fire-and-forget "prime the cache" vision analysis for one screenshot URL,
 * always at level "full". Several components (ThoughtCard, TaskInputArea,
 * ScreenshotUploader) trigger this immediately after a paste/drop/upload and
 * don't need the result — they just want the ScreenshotAsset.vision_analysis
 * cache warmed. Callers keep their own `.catch` so each site's log message
 * stays distinct.
 */
export function analyzeScreenshotUrl(screenshotUrl) {
  return analyzeScreenshotWithCache({ screenshotUrl, level: "full" });
}

/** Generate 3 task-description variants (specific / user-story / step-by-step) for a vague task. */
export function decomposeTask({ task_content, project_id } = {}) {
  return invoke("decomposeTask", { task_content, project_id });
}

/** Distill LearnedPatterns from 3+ recent "excellent" PromptFeedback rows for a project. */
export function synthesizePreferences({ project_id } = {}) {
  return invoke("synthesizePreferences", { project_id });
}

/** Retrospective analysis (successes vs failures) over 10+ PromptFeedback rows for a project. */
export function analyzeRetrospectiveFeedback({ project_id } = {}) {
  return invoke("analyzeRetrospectiveFeedback", { project_id });
}

/** Apply one PromptFeedback row's learnings to the user's personal preferences. */
export function applyFeedbackToPreferences({ feedbackId } = {}) {
  return invoke("applyFeedbackToPreferences", { feedbackId });
}

/**
 * Export the user's Vault (+ Checks) as CSV (zip) or JSON.
 * Note: the backend returns a raw file body (zip/json), not the `{ok, ...}`
 * envelope other functions use — a caller that needs the actual file bytes
 * (not just success/failure) should not rely on `response.data` being JSON.
 */
export function exportUserData({ format = "csv", scope = "vault", itemId, filters = {} } = {}) {
  return invoke("exportUserData", { format, scope, itemId, filters });
}

/** One-off maintenance: mark all pending Item tasks as success (resets the Vault badge). */
export function fixVaultTasks() {
  return invoke("fixVaultTasks");
}

/** Hard-delete the caller's own soft-deleted Thoughts older than 30 days. */
export function hardDeleteOldTasks() {
  return invoke("hardDeleteOldTasks");
}

/** Server-side aggregated stats for AdminStats.jsx. Admin only. */
export function getAdminStats({ from, to } = {}) {
  return invoke("getAdminStats", { from, to });
}

/** Signed URL for an already-downloaded research paper, or 404 with a fallback_url. */
export function getResearchPaperUrl({ arxivId } = {}) {
  return invoke("getResearchPaperUrl", { arxivId });
}

/** Download a paper's PDF from arXiv into private storage. Admin only. */
export function downloadResearchPaper({ arxivId } = {}) {
  return invoke("downloadResearchPaper", { arxivId });
}

/**
 * Upload a screenshot file and create its ScreenshotAsset record.
 * `formData` must be a FormData instance with a `file` entry (and optional
 * `projectId` / `taskId`) — the SDK detects FormData/File payloads and sends
 * multipart automatically (see @base44/sdk functions module).
 */
export function uploadScreenshot(formData) {
  return invoke("uploadScreenshot", formData);
}
