/**
 * Client-side ports of four backend functions that no longer exist on this
 * Base44 plan (402 — no backend functions): decomposeTask, synthesizePreferences,
 * analyzeRetrospectiveFeedback, applyFeedbackToPreferences. Logic, parameter
 * shapes and return shapes are kept identical to the originals (still on disk
 * at base44/functions/<name>/entry.ts); only the transport changed — LLM
 * calls go through src/lib/nousClient.js (Nous Research) instead of the
 * Deno function's invokeLLM, and entity/auth reads go through src/api/*
 * instead of a `base44` client bound server-side to the request's user.
 *
 * One behavioral note carried over from src/api/aiSettings.js's `upsertMine`:
 * unlike the backend (where the base44 client is bound to the authenticated
 * request and stamps `created_by` automatically), entity creates issued from
 * the browser must set `created_by: <user email>` themselves to satisfy each
 * entity's RLS `create` rule (see base44/entities/LearnedPattern.jsonc). The
 * email comes from `me()`.
 *
 * @module learning
 */

import { invokeLLM } from "@/lib/nousClient";
import { me, updateMe } from "@/api/auth";
import * as projects from "@/api/projects";
import * as learnedPatterns from "@/api/learnedPatterns";
import * as promptFeedback from "@/api/promptFeedback";
import {
  decomposeTaskPrompt,
  decomposeTaskSchema,
  synthesizePreferencesPrompt,
  synthesizePreferencesSchema,
  retrospectiveFeedbackPrompt,
  retrospectiveFeedbackSchema,
  applyFeedbackPrompt,
} from "@/lib/prompts";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Generate 3 differently-angled rewrites of a vague task, optionally informed
 * by the project's active `task_decomposition` learned patterns.
 *
 * @param {{task_content: string, project_id?: string}} params
 * @returns {Promise<{success: true, original_task: string, variants: Array<{id: 'A'|'B'|'C'}>, recommendation: string}>}
 */
export async function decomposeTask({ task_content, project_id } = {}) {
  if (!task_content) {
    throw new Error("task_content is required");
  }

  let projectContext = "";
  if (project_id) {
    const project = await projects.get(project_id);
    projectContext = `Project: ${project.name}\nPlatform: ${project.technical_config_markdown?.substring(0, 200) || "Generic"}`;
  }

  let patterns = [];
  if (project_id) {
    patterns = await learnedPatterns.listActiveByProjectAndType(project_id, "task_decomposition");
  }
  patterns = Array.isArray(patterns) ? patterns : [];

  const patternsContext = patterns.length > 0
    ? `\n\nLearned patterns voor task writing:\n${patterns.map((p) => p.pattern_text).join("\n")}`
    : "";

  const decompositionPrompt = decomposeTaskPrompt({
    taskContent: task_content,
    projectContext,
    patternsContext,
  });

  const llmResponse = await invokeLLM({
    prompt: decompositionPrompt,
    response_json_schema: decomposeTaskSchema,
  });

  return {
    success: true,
    original_task: task_content,
    variants: [
      { id: "A", ...llmResponse.variant_a },
      { id: "B", ...llmResponse.variant_b },
      { id: "C", ...llmResponse.variant_c },
    ],
    recommendation: llmResponse.recommendation,
  };
}

/**
 * Distill 3-5 actionable success patterns from a project's recent (last 30
 * days) "excellent"-rated PromptFeedback rows, save them as LearnedPattern
 * rows and append an "AI Learned Patterns" section to the project's
 * technical_config_markdown.
 *
 * @param {{project_id: string}} params
 * @returns {Promise<{message: string, count: number} | {success: true, patterns_count: number, patterns: object[], overall_insight: string}>}
 */
export async function synthesizePreferences({ project_id } = {}) {
  if (!project_id) {
    throw new Error("project_id is required");
  }

  const allFeedback = await promptFeedback.listByProjectAndRating(project_id, "excellent");

  const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);
  const recentFeedback = allFeedback.filter((f) => new Date(f.created_date) > thirtyDaysAgo);

  if (recentFeedback.length < 3) {
    return {
      message: "Not enough excellent feedback yet (need 3+)",
      count: recentFeedback.length,
    };
  }

  const project = await projects.get(project_id);

  const feedbackSummary = recentFeedback.map((f) => ({
    prompt_used: f.prompt_used?.substring(0, 500) || "N/A",
    what_worked: f.what_worked || "N/A",
    notes: f.notes || "N/A",
  }));

  const analysisPrompt = synthesizePreferencesPrompt({
    projectName: project.name,
    isConfigured: !!project.technical_config_markdown,
    feedbackCount: recentFeedback.length,
    feedbackSummary,
  });

  const llmResponse = await invokeLLM({
    prompt: analysisPrompt,
    response_json_schema: synthesizePreferencesSchema,
  });

  const patterns = Array.isArray(llmResponse.patterns) ? llmResponse.patterns : [];

  const currentUser = await me();
  const email = currentUser?.email;

  const savedPatterns = await Promise.all(patterns.map((pattern) => learnedPatterns.create({
    project_id,
    created_by: email,
    pattern_type: "preference_synthesis",
    domain: pattern.domain,
    pattern_text: `**${pattern.title}**\n${pattern.description}`,
    success_rate: 85, // Geschat obv excellent ratings
    sample_size: recentFeedback.length,
    confidence: pattern.confidence,
    learned_from_feedback_ids: recentFeedback.map((f) => f.id),
  })));

  const currentPrefs = project.technical_config_markdown || "";
  const newPrefs = `${currentPrefs}\n\n## 🧠 AI Learned Patterns (${new Date().toLocaleDateString()})\n${llmResponse.overall_insight}\n\n${patterns.map((p) => `- **${p.title}**: ${p.description}`).join("\n")}`;

  await projects.update(project_id, {
    technical_config_markdown: newPrefs,
  });

  return {
    success: true,
    patterns_count: savedPatterns.length,
    patterns: savedPatterns,
    overall_insight: llmResponse.overall_insight,
  };
}

/**
 * Semantic Advantage analysis (Training-Free GRPO principle) comparing
 * "excellent" vs "poor"/"okay" PromptFeedback rows from the last 90 days,
 * saving success strategies and anti-patterns as LearnedPattern rows.
 *
 * @param {{project_id?: string}} params project_id is optional — omit it to
 *   analyze across every project the signed-in user can see.
 */
export async function analyzeRetrospectiveFeedback({ project_id } = {}) {
  const allFeedback = await promptFeedback.listByProjectOrAll(project_id);

  const ninetyDaysAgo = new Date(Date.now() - NINETY_DAYS_MS);
  const recentFeedback = allFeedback.filter((f) => new Date(f.created_date) > ninetyDaysAgo);

  if (recentFeedback.length < 10) {
    return {
      message: "Not enough feedback data yet (need 10+ samples)",
      count: recentFeedback.length,
    };
  }

  const excellent = recentFeedback.filter((f) => f.rating === "excellent");
  const good = recentFeedback.filter((f) => f.rating === "good");
  const poor = recentFeedback.filter((f) => f.rating === "poor" || f.rating === "okay");

  if (excellent.length < 5 || poor.length < 2) {
    return {
      message: "Need more diverse feedback (5+ excellent, 2+ poor)",
      counts: { excellent: excellent.length, good: good.length, poor: poor.length },
    };
  }

  const analysisPrompt = retrospectiveFeedbackPrompt({ excellent, poor });

  const llmResponse = await invokeLLM({
    prompt: analysisPrompt,
    response_json_schema: retrospectiveFeedbackSchema,
  });

  const successStrategies = Array.isArray(llmResponse.success_strategies) ? llmResponse.success_strategies : [];
  const antiPatterns = Array.isArray(llmResponse.anti_patterns) ? llmResponse.anti_patterns : [];
  const keyLessons = Array.isArray(llmResponse.key_lessons) ? llmResponse.key_lessons : [];

  const currentUser = await me();
  const email = currentUser?.email;

  // Beide groepen parallel, maar success strategies blijven vóór
  // anti-patterns staan in het resultaat.
  const [successPatterns, antiPatternRecords] = await Promise.all([
    Promise.all(successStrategies.map((strategy) => learnedPatterns.create({
      project_id: project_id || null,
      created_by: email,
      pattern_type: "retrospective",
      domain: strategy.domain,
      pattern_text: `✅ **SUCCESS STRATEGY**: ${strategy.strategy}\n\n${strategy.evidence}`,
      success_rate: Math.round((excellent.length / recentFeedback.length) * 100),
      sample_size: recentFeedback.length,
      confidence: excellent.length >= 10 ? "high" : "medium",
      learned_from_feedback_ids: excellent.map((f) => f.id),
    }))),
    Promise.all(antiPatterns.map((antiPattern) => learnedPatterns.create({
      project_id: project_id || null,
      created_by: email,
      pattern_type: "retrospective",
      domain: "All",
      pattern_text: `❌ **ANTI-PATTERN**: ${antiPattern.pattern}\n\nWhy it fails: ${antiPattern.why_it_fails}`,
      success_rate: Math.round((poor.length / recentFeedback.length) * 100),
      sample_size: poor.length,
      confidence: poor.length >= 5 ? "high" : "medium",
      learned_from_feedback_ids: poor.map((f) => f.id),
      is_active: false, // Anti-patterns niet actief toepassen, alleen tonen
    }))),
  ]);

  const savedPatterns = [...successPatterns, ...antiPatternRecords];

  return {
    success: true,
    analysis: {
      total_feedback: recentFeedback.length,
      excellent: excellent.length,
      poor: poor.length,
      success_strategies: successStrategies.length,
      anti_patterns: antiPatterns.length,
    },
    patterns: savedPatterns,
    key_lessons: keyLessons,
  };
}

/**
 * Self-Evolving Feedback Loop: extract 2-3 actionable learnings from one
 * PromptFeedback row and append them to the signed-in user's
 * personal_preferences_markdown, then mark the feedback as applied.
 *
 * A feedback row that was already applied returns early with an "already
 * applied" flag set to true instead of calling the LLM again.
 *
 * @param {{feedbackId: string}} params
 */
export async function applyFeedbackToPreferences({ feedbackId } = {}) {
  if (!feedbackId) {
    throw new Error("Missing feedbackId");
  }

  const feedback = await promptFeedback.listById(feedbackId);
  if (!feedback || feedback.length === 0) {
    throw new Error("Feedback not found");
  }

  const feedbackItem = feedback[0];
  const alreadyApplied = feedbackItem.applied_to_preferences;

  if (alreadyApplied) {
    return {
      success: true,
      message: "Feedback already applied",
      skipped: true,
    };
  }

  // Get project info if project_id exists
  let projectContext = "";
  if (feedbackItem.project_id) {
    try {
      const project = await projects.get(feedbackItem.project_id);
      if (project) {
        projectContext = `\nPROJECT: ${project.name}`;
      }
    } catch (error) {
      console.warn("[applyFeedbackToPreferences] Could not fetch project:", error?.message);
    }
  }

  const currentUser = await me();
  if (!currentUser) {
    throw new Error("Not authenticated");
  }

  const currentPrefs = currentUser.personal_preferences_markdown || "";

  const learningPrompt = applyFeedbackPrompt({
    projectContext,
    rating: feedbackItem.rating,
    whatWorked: feedbackItem.what_worked || "Not specified",
    whatFailed: feedbackItem.what_failed || "Not specified",
    notes: feedbackItem.notes || "None",
    currentPrefs,
    hasProject: !!feedbackItem.project_id,
  });

  const learnings = await invokeLLM({
    prompt: learningPrompt,
  });

  let updatedPrefs = currentPrefs.trim();
  if (feedbackItem.project_id) {
    updatedPrefs += `\n\n## Project-Specific Learnings\n${learnings.trim()}`;
  } else {
    updatedPrefs += `\n\n## General Learnings\n${learnings.trim()}`;
  }

  await updateMe({
    personal_preferences_markdown: updatedPrefs,
  });

  await promptFeedback.update(feedbackId, {
    applied_to_preferences: true,
  });

  return {
    success: true,
    learnings,
    message: "Preferences updated with feedback learnings",
  };
}
