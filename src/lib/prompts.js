/**
 * Every LLM prompt template used by the frontend, in one place, so wording
 * can be diffed and versioned without hunting through components.
 *
 * Each export is a pure function that returns a string (the prompt text),
 * plus — where the caller passes `response_json_schema` to invokeLLM — a
 * matching `<name>Schema` object export sitting right next to it.
 *
 * This module was extracted from (in order): usePromptGeneration.jsx,
 * BrainstormPanel.jsx, AIBackoffice.jsx, ClipboardConfigParser.jsx,
 * LiveAppScanner.jsx, ProjectEditDialog.jsx and RetryModal.jsx. The wording
 * is byte-identical to what those files used to build inline, except the
 * four AIBackoffice retry-message strings (DEFAULT_RETRY_MESSAGE + the 3
 * RETRY_MESSAGE_EXAMPLES entries), which were already byte-identical to each
 * other and are now the single `retryTask()` builder.
 *
 * @module prompts
 */

/**
 * "Improve this prompt" instruction sent to invokeLLM from usePromptGeneration.
 * Two variants depending on whether Verbalized Sampling is enabled.
 *
 * @param {{prompt: string, verbalizedSampling?: boolean}} params
 * @returns {string}
 */
export function improvePrompt({ prompt, verbalizedSampling = false }) {
  if (verbalizedSampling) {
    return `You are using Verbalized Sampling to improve this prompt with maximum diversity.

ORIGINAL PROMPT:
${prompt}

TASK: Generate ONE improved version that takes an atypical, creative approach (avoid the most obvious solution). Consider:
- Alternative execution strategies
- Different levels of detail
- Unconventional but effective structures
- Novel perspectives on the tasks

IMPORTANT: Return ONLY the improved prompt content, keeping the JSON structure and all screenshot data intact. Be creative but maintain functionality.`;
  }

  return `Improve and optimize this multi-task prompt for better clarity and execution:\n\n${prompt}\n\nIMPORTANT: Return ONLY the improved prompt content, keeping the JSON structure and all screenshot data intact.`;
}

/**
 * Verbalized-Sampling prompt that asks for 3 diverse variants of the
 * generated multi-task prompt. Used by usePromptGeneration's
 * handleGenerateVariants.
 *
 * @param {{prompt: string}} params
 * @returns {string}
 */
export function promptVariants({ prompt }) {
  return `You are a prompt engineering expert. Generate exactly 3 diverse variants of the following multi-task prompt, each taking a different strategic approach. For each variant, estimate its "typicality probability" (0.0-1.0, where higher = more typical/conventional).

ORIGINAL PROMPT:
${prompt}

OUTPUT FORMAT (strict JSON):
{
  "variants": [
    {
      "content": "Full prompt variant 1...",
      "probability": 0.8,
      "approach": "Conservative - minimal changes"
    },
    {
      "content": "Full prompt variant 2...",
      "probability": 0.5,
      "approach": "Balanced - moderate restructuring"
    },
    {
      "content": "Full prompt variant 3...",
      "probability": 0.2,
      "approach": "Creative - novel approach"
    }
  ]
}

RULES:
- Each variant must be a complete, executable prompt (keep JSON structure intact)
- Variants should differ in: tone, structure, level of detail, or execution strategy
- Ensure at least one variant is "atypical" (probability < 0.4)`;
}

export const promptVariantsSchema = {
  type: "object",
  properties: {
    variants: {
      type: "array",
      items: {
        type: "object",
        properties: {
          content: { type: "string" },
          probability: { type: "number" },
          approach: { type: "string" }
        },
        required: ["content", "probability", "approach"]
      }
    }
  },
  required: ["variants"]
};

/**
 * Asks the LLM to explain, in numbered steps, how it would interpret and
 * execute the generated prompt. Used by usePromptGeneration's
 * handleToggleReasoning ("AI Reasoning Transparency").
 *
 * @param {{prompt: string, taskCount: number, hasStartTemplate: boolean, hasEndTemplate: boolean, includePersonalPrefs: boolean, includeProjectConfig: boolean}} params
 * @returns {string}
 */
export function reasoningSteps({ prompt, taskCount, hasStartTemplate, hasEndTemplate, includePersonalPrefs, includeProjectConfig }) {
  return `You are analyzing how you would interpret and execute the following multi-task prompt. Explain your reasoning process in 3-5 concise steps:

1. **Interpretation**: How do you understand the tasks and their context?
2. **Planning**: What is your execution strategy?
3. **Prioritization**: Which tasks are most critical and why?
4. **Dependencies**: Are there any task dependencies or order requirements?
5. **Context Usage**: How would you use templates, preferences, and project config?

PROMPT TO ANALYZE:
${prompt}

SELECTED TASKS: ${taskCount}
- Templates: ${hasStartTemplate ? 'Start' : ''} ${hasEndTemplate ? 'End' : ''}
- Personal Prefs: ${includePersonalPrefs ? 'Yes' : 'No'}
- Project Config: ${includeProjectConfig ? 'Yes' : 'No'}

Return your reasoning as clear, numbered steps (max 200 words).`;
}

/**
 * Static `[SCREENSHOT_CONTEXT]` block appended to the generated prompt
 * whenever any selected task has a screenshot. No inputs — the text never
 * varied per call.
 *
 * @returns {string}
 */
export function screenshotContext() {
  return `[SCREENSHOT_CONTEXT]

Je krijgt per taak optioneel een of meer screenshots:

- "pageHint" en "componentHint" geven de vermoedelijke pagina / sectie / functie aan.
- "ocrVision" bevat:
  - ocr.text en ocr.regions → alle zichtbare tekst
  - semanticBlocks → gegroepeerde UI-/content-blokken
  - layoutRelations → relaties tussen blokken
  - visionStructure → hogere-orde interpretatie van de UI

Gebruik deze context om beter te begrijpen:
- op welke pagina we zijn;
- welke knoppen, dropdowns, inputs zichtbaar zijn;
- waar een wijziging precies moet plaatsvinden.

Als er meerdere screenshots zijn, behandel ze als aparte "views" van dezelfde app.

[/SCREENSHOT_CONTEXT]`;
}

/**
 * Creative-brainstorm prompt (Verbalized Sampling) used by BrainstormPanel.
 *
 * @param {{concept: string}} params
 * @returns {string}
 */
export function brainstormIdeas({ concept }) {
  return `You are a creative brainstorming assistant. Generate exactly 7 diverse, actionable ideas based on this concept. For each idea, provide a uniqueness score (0.0-1.0, where higher = more conventional).

CONCEPT:
${concept}

OUTPUT FORMAT (strict JSON):
{
  "ideas": [
    {
      "title": "Concise idea title (max 10 words)",
      "description": "Detailed explanation (2-3 sentences)",
      "uniqueness": 0.8,
      "difficulty": "easy|medium|hard"
    }
  ]
}

RULES:
- Generate 7 ideas ranging from conventional (0.9) to highly creative (0.2)
- Each idea must be actionable and specific
- Include mix of difficulties`;
}

export const brainstormIdeasSchema = {
  type: "object",
  properties: {
    ideas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          uniqueness: { type: "number" },
          difficulty: { type: "string" }
        },
        required: ["title", "description", "uniqueness", "difficulty"]
      }
    }
  },
  required: ["ideas"]
};

/**
 * AI Backoffice "Retry Task Message" default text. Used both as the
 * default value for the saved retry_task_message setting and, cycled
 * through, as the "Load example" content — AIBackoffice.jsx had four
 * copies of this exact text (DEFAULT_RETRY_MESSAGE + 3 entries in
 * RETRY_MESSAGE_EXAMPLES); they were already byte-identical, so this single
 * builder replaces all four call sites without changing any of their output.
 *
 * @returns {string}
 */
export function retryTask() {
  return `You are the Base44 code assistant for the Promptster webapp.

GOAL
Take the failed or rejected task, the user's short explanation, and the attached screenshot, and UPDATE the Promptster codebase so that the problem is structurally fixed for ALL users – not just as a one-off patch.

CONTEXT

* Tech stack: React + Tailwind CSS + shadcn/ui, Lucide icons.
* Structure: \`pages/\` for pages, \`components/\` for reusable UI, \`entities/\` for data models, \`functions/\` for backend/logic.
* Follow Patrick's preferences: camelCase, async/await, clear comments, minimalistic UI, dark-mode support, accessible components.

WHEN PROCESSING A RETRY

1. Carefully inspect the attached screenshot and the user's explanation of what is missing, incorrect, or not visible.
2. Locate the correct files in the Promptster codebase where this behaviour is defined (pages, components, styles, or backend functions).
3. Change the code so that the behaviour works correctly and consistently for ALL users and all relevant pages / states.
4. Avoid one-off hacks or hard-coded values tied to a single user, project, or environment.
5. Keep the implementation clean, testable, and aligned with existing patterns in the app.

DELIVERABLE

* Implement the necessary code changes.
* Ensure light and dark mode both work correctly.
* Make sure the fix is visible in the UI (no invisible changes).
* At the end, briefly list:

  * Which files were changed (with paths),
  * A short summary per file,
  * A 3-line manual test checklist the user can run to verify the fix.`;
}

/**
 * No-code platform config/export analysis prompt used by
 * ClipboardConfigParser. `configText` is truncated to 15000 chars, matching
 * the original inline call site.
 *
 * @param {{platform: string, configText: string}} params
 * @returns {string}
 */
export function parseClipboardConfig({ platform, configText }) {
  return `Je bent een expert in no-code platform analyse. Analyseer de volgende config/export van platform "${platform}" en extraheer de projectstructuur.

BELANGRIJK: Geef ALLEEN valide JSON terug, geen uitleg of markdown.

Input config:
\`\`\`
${configText.substring(0, 15000)}
\`\`\`

Extraheer waar mogelijk:
1. Pages/schermen met routes en types
2. Entities/data types met velden
3. Workflows/automations
4. Navigatie items

Voor elk item, geef een korte beschrijving die bruikbaar is voor AI code-generatie context.`;
}

export const parseClipboardConfigSchema = {
  type: "object",
  properties: {
    platform_detected: { type: "string" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    pages: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          route: { type: "string" },
          page_type: { type: "string" },
          description: { type: "string" },
          components: { type: "array", items: { type: "string" } },
          entities: { type: "array", items: { type: "string" } }
        }
      }
    },
    entities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          fields: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: { type: "string" },
                is_required: { type: "boolean" }
              }
            }
          }
        }
      }
    },
    workflows: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          trigger_description: { type: "string" },
          actions_description: { type: "string" },
          related_entities: { type: "array", items: { type: "string" } }
        }
      }
    },
    navigation: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          route: { type: "string" },
          position: { type: "string" }
        }
      }
    }
  }
};

/**
 * "Generate description with AI" prompt used by LiveAppScanner for a
 * captured page. Note the source literally had a whitespace-only line
 * (8 spaces) between the opening line and the bullet list — preserved here
 * so the output stays byte-identical.
 *
 * @param {{pageName: string, pageType: string, route: string, entities: string, components: string}} params
 * @returns {string}
 */
export function pageDescription({ pageName, pageType, route, entities, components }) {
  return `Genereer een korte, technische beschrijving (max 2 zinnen) voor een pagina met de volgende kenmerken:
        
- Pagina naam: ${pageName || "Onbekend"}
- Type: ${pageType}
- URL/Route: ${route}
- Entiteiten: ${entities || "Geen opgegeven"}
- Componenten: ${components || "Geen opgegeven"}

De beschrijving moet bruikbaar zijn als context voor een AI die code moet genereren. Focus op functionaliteit en datastromen.`;
}

export const pageDescriptionSchema = {
  type: "object",
  properties: {
    description: { type: "string" }
  }
};

/**
 * ProjectEditDialog's "Copy Analysis Prompt" button content — a prompt the
 * user copies to paste into an external LLM, asking it to return a JSON
 * structural overview of a codebase. Static text, no inputs.
 *
 * @returns {string}
 */
export function projectStructureAnalysisPrompt() {
  return `Analyze this codebase and provide a complete structural overview in JSON format:

{
  "name": "Project Name",
  "description": "Brief project description",
  "technical_config_markdown": "# Tech Stack\\n- Framework: ...\\n- Libraries: ...\\n\\n# Architecture\\n...",
  "pages": [
    {"name": "PageName", "path": "/path", "components": ["Component1"], "purpose": "..."}
  ],
  "components": [
    {"name": "ComponentName", "location": "components/...", "purpose": "...", "props": ["prop1"]}
  ],
  "entities": [
    {"name": "EntityName", "fields": ["field1", "field2"], "purpose": "..."}
  ],
  "buttons_and_actions": [
    {"label": "Button Text", "location": "PageName", "action": "what it does"}
  ],
  "routing": "How navigation works",
  "state_management": "How data flows",
  "styling": "Tailwind/CSS approach"
}

Be thorough - include ALL pages, components, buttons, forms, and key functionality.`;
}

/**
 * RetryModal's structured "retry" prompt, built from the screenshot(s),
 * the user's explanation, and the original task. Callers compute
 * `hasScreenshot`/`hasExplanation`/`visionSection`/`screenshotsPayload`
 * themselves (unchanged component logic) and pass the results in.
 *
 * @param {{originalTask: string, hasScreenshot: boolean, visionSection: string, hasExplanation: boolean, userExplanation: string, itemTitle: string, projectId: string, screenshotsPayload: object[]}} params
 * @returns {string}
 */
export function retryModalPrompt({ originalTask, hasScreenshot, visionSection, hasExplanation, userExplanation, itemTitle, projectId, screenshotsPayload }) {
  return `**Retry — Task Correction Request**

**1. User screenshot evidence**
${hasScreenshot ? `Attached screenshot shows the area where the issue occurs.` : "⚠️ Screenshot required"}
${visionSection}
${hasExplanation ? `User observation: ${userExplanation.trim()}` : ""}

**2. Original task description**
${originalTask}
\`\`\`
${originalTask}
\`\`\`

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
- Original task: ${itemTitle}
- Project: ${projectId || "No project"}

**Screenshots JSON:**
\`\`\`json
${JSON.stringify({ screenshots: screenshotsPayload }, null, 2)}
\`\`\`
`;
}
