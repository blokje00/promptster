/**
 * Every LLM prompt template used by the backend functions, in one place, so
 * wording can be diffed and versioned without hunting through five files.
 *
 * Each export is a pure function that returns a string (the prompt text),
 * plus — where the caller passes `response_json_schema` to invokeLLM — a
 * matching `<name>Schema` object export sitting right next to it.
 *
 * Extracted byte-identical from (in order): decomposeTask/entry.ts,
 * synthesizePreferences/entry.ts, analyzeRetrospectiveFeedback/entry.ts,
 * applyFeedbackToPreferences/entry.ts and analyzeScreenshotVision/entry.ts.
 * This module needs no SDK import at all, so it can be unit-tested directly.
 *
 * @module prompts
 */

/**
 * decomposeTask: asks for 3 differently-angled rewrites of a vague task.
 *
 * @param params.taskContent The raw, vague task text typed by the user.
 * @param params.projectContext `Project: ...\nPlatform: ...` block, or '' when there is no project_id.
 * @param params.patternsContext `\n\nLearned patterns...` block, or '' when there are no active LearnedPatterns.
 */
export function decomposeTaskPrompt({
  taskContent,
  projectContext,
  patternsContext,
}: {
  taskContent: string;
  projectContext: string;
  patternsContext: string;
}): string {
  return `Je bent een expert in het schrijven van duidelijke, actionable development tasks.

${projectContext}${patternsContext}

VAGE TASK: "${taskContent}"

Genereer 3 VERSCHILLENDE varianten van deze task, elk met een andere aanpak:

VARIANT A: Maximaal specifiek - expliciete file paths, component names, technical details
VARIANT B: User-story oriented - wat moet bereikt worden en waarom
VARIANT C: Step-by-step instructies - concrete actiestappen

Elke variant moet:
- Duidelijk en actionable zijn
- Voldoende context bevatten
- Geen vage termen gebruiken

Output 3 complete task descriptions.`;
}

export const decomposeTaskSchema = {
  type: "object",
  properties: {
    variant_a: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        rationale: { type: "string" }
      }
    },
    variant_b: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        rationale: { type: "string" }
      }
    },
    variant_c: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        rationale: { type: "string" }
      }
    },
    recommendation: {
      type: "string",
      enum: ["A", "B", "C"]
    }
  }
};

interface FeedbackSummaryItem {
  prompt_used: string;
  what_worked: string;
  notes: string;
}

/**
 * synthesizePreferences: distills success patterns from 3+ recent
 * "excellent"-rated PromptFeedback rows for a project.
 *
 * @param params.projectName `project.name`.
 * @param params.isConfigured Whether `project.technical_config_markdown` is set ("Configured" vs "Generic").
 * @param params.feedbackCount `recentFeedback.length` — used only in the header line.
 * @param params.feedbackSummary One `{prompt_used, what_worked, notes}` entry per recent excellent-rated feedback row.
 */
export function synthesizePreferencesPrompt({
  projectName,
  isConfigured,
  feedbackCount,
  feedbackSummary,
}: {
  projectName: string;
  isConfigured: boolean;
  feedbackCount: number;
  feedbackSummary: FeedbackSummaryItem[];
}): string {
  return `Je bent een AI expert in prompt engineering pattern recognition.

Project: ${projectName}
Platform: ${isConfigured ? 'Configured' : 'Generic'}

Analyseer deze ${feedbackCount} EXCELLENTE prompts en hun feedback:

${feedbackSummary.map((f, idx) => `
=== Excellent Prompt ${idx + 1} ===
Prompt snippet: ${f.prompt_used}
What worked: ${f.what_worked}
Notes: ${f.notes}
`).join('\n')}

TAAK: Distilleer de gemeenschappelijke success patterns uit deze excellente prompts.

Focus op:
1. Welke prompt structures werkten goed?
2. Welke context-inclusie strategieën waren succesvol?
3. Welke task formuleringen leidden tot goede resultaten?
4. Welke technische details waren cruciaal?

Geef 3-5 ACTIONABLE patterns die toekomstige prompts kunnen verbeteren.
Wees specifiek en concreet - geen vage adviezen.`;
}

export const synthesizePreferencesSchema = {
  type: "object",
  properties: {
    patterns: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          domain: { type: "string", enum: ["UI", "Data", "Logic", "All"] },
          confidence: { type: "string", enum: ["low", "medium", "high"] }
        }
      }
    },
    overall_insight: { type: "string" }
  }
};

interface RetrospectiveFeedbackItem {
  what_worked?: string;
  what_failed?: string;
  prompt_used?: string;
}

/**
 * analyzeRetrospectiveFeedback: Semantic Advantage analysis (Training-Free
 * GRPO principle) comparing excellent vs poor/okay-rated prompts.
 *
 * @param params.excellent Full list of "excellent"-rated PromptFeedback rows (only the first 10 are listed; `.length` is used in the header).
 * @param params.poor Full list of "poor"/"okay"-rated PromptFeedback rows (only the first 5 are listed; `.length` is used in the header).
 */
export function retrospectiveFeedbackPrompt({
  excellent,
  poor,
}: {
  excellent: RetrospectiveFeedbackItem[];
  poor: RetrospectiveFeedbackItem[];
}): string {
  return `Je bent een AI expert in retrospectieve pattern analyse voor prompt engineering.

Je krijgt twee groepen prompts:
1. SUCCESVOLLE PROMPTS (${excellent.length} samples met "excellent" rating)
2. FALENDE PROMPTS (${poor.length} samples met "poor/okay" rating)

=== SUCCESVOLLE PROMPTS ===
${excellent.slice(0, 10).map((f, idx) => `
Prompt ${idx + 1}:
- What worked: ${f.what_worked || 'N/A'}
- Prompt snippet: ${f.prompt_used?.substring(0, 300) || 'N/A'}
`).join('\n')}

=== FALENDE PROMPTS ===
${poor.slice(0, 5).map((f, idx) => `
Prompt ${idx + 1}:
- What failed: ${f.what_failed || 'N/A'}
- Prompt snippet: ${f.prompt_used?.substring(0, 300) || 'N/A'}
`).join('\n')}

TAAK: Voer een **SEMANTIC ADVANTAGE** analyse uit (Training-Free GRPO principe).

Beantwoord:
1. Welke strategieën hebben de succesvolle prompts gemeen die de falende prompts NIET hebben?
2. Welke anti-patterns zie je in de falende prompts?
3. Wat zijn de 3-5 belangrijkste lessen voor toekomstige prompts?

Focus op ACTIONABLE verschillen - geen generieke adviezen.
Wees specifiek over wat WERKTE vs wat NIET werkte.`;
}

export const retrospectiveFeedbackSchema = {
  type: "object",
  properties: {
    success_strategies: {
      type: "array",
      items: {
        type: "object",
        properties: {
          strategy: { type: "string" },
          evidence: { type: "string" },
          domain: { type: "string", enum: ["UI", "Data", "Logic", "All"] }
        }
      }
    },
    anti_patterns: {
      type: "array",
      items: {
        type: "object",
        properties: {
          pattern: { type: "string" },
          why_it_fails: { type: "string" }
        }
      }
    },
    key_lessons: {
      type: "array",
      items: { type: "string" }
    }
  }
};

/**
 * applyFeedbackToPreferences: extracts 2-3 actionable bullet-point learnings
 * from one piece of user feedback, to append to their personal preferences.
 * No response_json_schema — the LLM's plain-text answer is used as-is.
 *
 * @param params.projectContext `\nPROJECT: ...` block, or '' when the feedback has no project_id.
 * @param params.hasProject Whether the feedback has a `project_id` (controls the two conditional lines).
 */
export function applyFeedbackPrompt({
  projectContext,
  rating,
  whatWorked,
  whatFailed,
  notes,
  currentPrefs,
  hasProject,
}: {
  projectContext: string;
  rating: string;
  whatWorked: string;
  whatFailed: string;
  notes: string;
  currentPrefs: string;
  hasProject: boolean;
}): string {
  return `Based on this user feedback about a prompt result, extract key learnings to add to their personal preferences:${projectContext}

FEEDBACK:
Rating: ${rating}
What Worked: ${whatWorked}
What Failed: ${whatFailed}
Notes: ${notes}

CURRENT PREFERENCES:
${currentPrefs}

TASK: Extract 2-3 SHORT bullet points of actionable learnings that should be added to their preferences.
Focus on specific patterns, preferences, or approaches that worked or should be avoided.
${hasProject ? 'Include the project name in the bullet point to make it project-specific.' : ''}
Return ONLY the bullet points, no introduction.

Example output:
${hasProject ? '- [ProjectName] Prefer detailed task breakdowns over high-level descriptions' : '- Prefer detailed task breakdowns over high-level descriptions'}
- Avoid technical jargon when describing UI changes
- Always include specific file paths in instructions`;
}

/**
 * analyzeScreenshotVision: OCR + layout vision prompt. `level: 'full'` asks
 * for text, components, layout and semantic grouping; any other level asks
 * for a lighter-weight text + key-elements pass.
 */
export function screenshotVisionPrompt({ level }: { level: string }): string {
  return level === 'full'
    ? `Analyze this UI screenshot comprehensively:

1. Extract ALL visible text (OCR)
2. Identify UI components (buttons, inputs, headings, cards, images, links, labels)
3. Describe layout structure and spatial relationships
4. Group related elements into semantic blocks

Return JSON:
{
  "summary": "brief description",
  "regions": [
    {"id": "r1", "type": "button|input|heading|card|text", "text": "...", "role": "...", "bbox": {"x": 0, "y": 0, "width": 0, "height": 0}, "confidence": 0.9}
  ],
  "semanticBlocks": [
    {"id": "b1", "type": "header|form|content", "text": "...", "components": ["r1"], "hierarchy": {"level": 0}}
  ],
  "layoutPattern": "grid|flex|list",
  "detectedComponents": ["Button", "Input"]
}`
    : `Extract main text and identify key UI elements.

Return JSON:
{
  "summary": "brief description",
  "regions": [{"id": "r1", "type": "text", "text": "...", "bbox": {"x": 0, "y": 0, "width": 0, "height": 0}, "confidence": 0.9}],
  "semanticBlocks": [],
  "layoutPattern": "simple",
  "detectedComponents": []
}`;
}

export const screenshotVisionSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    regions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string" },
          text: { type: "string" },
          role: { type: "string" },
          bbox: {
            type: "object",
            properties: {
              x: { type: "number" },
              y: { type: "number" },
              width: { type: "number" },
              height: { type: "number" }
            }
          },
          confidence: { type: "number" }
        }
      }
    },
    semanticBlocks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string" },
          text: { type: "string" },
          components: { type: "array", items: { type: "string" } },
          hierarchy: {
            type: "object",
            properties: {
              level: { type: "number" }
            }
          }
        }
      }
    },
    layoutPattern: { type: "string" },
    detectedComponents: { type: "array", items: { type: "string" } }
  }
};
