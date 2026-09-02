import { describe, it, expect } from 'vitest';
import * as prompts from '@/lib/prompts';

/**
 * Fixed-input regression tests for every prompt builder in src/lib/prompts.js.
 * Each fixture was captured by evaluating the exact template literal that used
 * to live inline in the call site (usePromptGeneration.jsx, BrainstormPanel.jsx,
 * AIBackoffice.jsx, ClipboardConfigParser.jsx, LiveAppScanner.jsx,
 * ProjectEditDialog.jsx, RetryModal.jsx) with the same sample inputs, so a
 * wording change shows up as a failing assertion here.
 */

describe('screenshotContext', () => {
  it('matches the fixture byte-for-byte', () => {
    const expected = "[SCREENSHOT_CONTEXT]\n\nJe krijgt per taak optioneel een of meer screenshots:\n\n- \"pageHint\" en \"componentHint\" geven de vermoedelijke pagina / sectie / functie aan.\n- \"ocrVision\" bevat:\n  - ocr.text en ocr.regions → alle zichtbare tekst\n  - semanticBlocks → gegroepeerde UI-/content-blokken\n  - layoutRelations → relaties tussen blokken\n  - visionStructure → hogere-orde interpretatie van de UI\n\nGebruik deze context om beter te begrijpen:\n- op welke pagina we zijn;\n- welke knoppen, dropdowns, inputs zichtbaar zijn;\n- waar een wijziging precies moet plaatsvinden.\n\nAls er meerdere screenshots zijn, behandel ze als aparte \"views\" van dezelfde app.\n\n[/SCREENSHOT_CONTEXT]";
    expect(prompts.screenshotContext()).toBe(expected);
  });
});

describe('reasoningSteps', () => {
  it('matches the fixture byte-for-byte', () => {
    const expected = "You are analyzing how you would interpret and execute the following multi-task prompt. Explain your reasoning process in 3-5 concise steps:\n\n1. **Interpretation**: How do you understand the tasks and their context?\n2. **Planning**: What is your execution strategy?\n3. **Prioritization**: Which tasks are most critical and why?\n4. **Dependencies**: Are there any task dependencies or order requirements?\n5. **Context Usage**: How would you use templates, preferences, and project config?\n\nPROMPT TO ANALYZE:\nSAMPLE_PROMPT\n\nSELECTED TASKS: 3\n- Templates: Start \n- Personal Prefs: Yes\n- Project Config: No\n\nReturn your reasoning as clear, numbered steps (max 200 words).";
    expect(prompts.reasoningSteps({"prompt":"SAMPLE_PROMPT","taskCount":3,"hasStartTemplate":true,"hasEndTemplate":false,"includePersonalPrefs":true,"includeProjectConfig":false})).toBe(expected);
  });
});

describe('improvePrompt (verbalizedSampling: false)', () => {
  it('matches the fixture byte-for-byte', () => {
    const expected = "Improve and optimize this multi-task prompt for better clarity and execution:\n\nSAMPLE_ENRICHED_PROMPT\n\nIMPORTANT: Return ONLY the improved prompt content, keeping the JSON structure and all screenshot data intact.";
    expect(prompts.improvePrompt({"prompt":"SAMPLE_ENRICHED_PROMPT","verbalizedSampling":false})).toBe(expected);
  });
});

describe('improvePrompt (verbalizedSampling: true)', () => {
  it('matches the fixture byte-for-byte', () => {
    const expected = "You are using Verbalized Sampling to improve this prompt with maximum diversity.\n\nORIGINAL PROMPT:\nSAMPLE_ENRICHED_PROMPT\n\nTASK: Generate ONE improved version that takes an atypical, creative approach (avoid the most obvious solution). Consider:\n- Alternative execution strategies\n- Different levels of detail\n- Unconventional but effective structures\n- Novel perspectives on the tasks\n\nIMPORTANT: Return ONLY the improved prompt content, keeping the JSON structure and all screenshot data intact. Be creative but maintain functionality.";
    expect(prompts.improvePrompt({"prompt":"SAMPLE_ENRICHED_PROMPT","verbalizedSampling":true})).toBe(expected);
  });
});

describe('promptVariants', () => {
  it('matches the fixture byte-for-byte', () => {
    const expected = "You are a prompt engineering expert. Generate exactly 3 diverse variants of the following multi-task prompt, each taking a different strategic approach. For each variant, estimate its \"typicality probability\" (0.0-1.0, where higher = more typical/conventional).\n\nORIGINAL PROMPT:\nSAMPLE_GENERATED_PROMPT\n\nOUTPUT FORMAT (strict JSON):\n{\n  \"variants\": [\n    {\n      \"content\": \"Full prompt variant 1...\",\n      \"probability\": 0.8,\n      \"approach\": \"Conservative - minimal changes\"\n    },\n    {\n      \"content\": \"Full prompt variant 2...\",\n      \"probability\": 0.5,\n      \"approach\": \"Balanced - moderate restructuring\"\n    },\n    {\n      \"content\": \"Full prompt variant 3...\",\n      \"probability\": 0.2,\n      \"approach\": \"Creative - novel approach\"\n    }\n  ]\n}\n\nRULES:\n- Each variant must be a complete, executable prompt (keep JSON structure intact)\n- Variants should differ in: tone, structure, level of detail, or execution strategy\n- Ensure at least one variant is \"atypical\" (probability < 0.4)";
    expect(prompts.promptVariants({"prompt":"SAMPLE_GENERATED_PROMPT"})).toBe(expected);
  });
});

describe('promptVariantsSchema', () => {
  it('matches the fixture shape', () => {
    expect(prompts.promptVariantsSchema).toEqual({"type":"object","properties":{"variants":{"type":"array","items":{"type":"object","properties":{"content":{"type":"string"},"probability":{"type":"number"},"approach":{"type":"string"}},"required":["content","probability","approach"]}}},"required":["variants"]});
  });
});

describe('brainstormIdeas', () => {
  it('matches the fixture byte-for-byte', () => {
    const expected = "You are a creative brainstorming assistant. Generate exactly 7 diverse, actionable ideas based on this concept. For each idea, provide a uniqueness score (0.0-1.0, where higher = more conventional).\n\nCONCEPT:\nHow can I improve onboarding?\n\nOUTPUT FORMAT (strict JSON):\n{\n  \"ideas\": [\n    {\n      \"title\": \"Concise idea title (max 10 words)\",\n      \"description\": \"Detailed explanation (2-3 sentences)\",\n      \"uniqueness\": 0.8,\n      \"difficulty\": \"easy|medium|hard\"\n    }\n  ]\n}\n\nRULES:\n- Generate 7 ideas ranging from conventional (0.9) to highly creative (0.2)\n- Each idea must be actionable and specific\n- Include mix of difficulties";
    expect(prompts.brainstormIdeas({"concept":"How can I improve onboarding?"})).toBe(expected);
  });
});

describe('brainstormIdeasSchema', () => {
  it('matches the fixture shape', () => {
    expect(prompts.brainstormIdeasSchema).toEqual({"type":"object","properties":{"ideas":{"type":"array","items":{"type":"object","properties":{"title":{"type":"string"},"description":{"type":"string"},"uniqueness":{"type":"number"},"difficulty":{"type":"string"}},"required":["title","description","uniqueness","difficulty"]}}},"required":["ideas"]});
  });
});

// The 4 literal strings AIBackoffice.jsx used to define inline before this
// refactor (DEFAULT_RETRY_MESSAGE + 3x RETRY_MESSAGE_EXAMPLES) — all 4 were
// already byte-identical, which is what made collapsing them into one
// zero-arg builder safe. Each fixture below is that removed literal text.
const RETRY_TASK_FIXTURE_DEFAULT = "You are the Base44 code assistant for the Promptster webapp.\n\nGOAL\nTake the failed or rejected task, the user's short explanation, and the attached screenshot, and UPDATE the Promptster codebase so that the problem is structurally fixed for ALL users – not just as a one-off patch.\n\nCONTEXT\n\n* Tech stack: React + Tailwind CSS + shadcn/ui, Lucide icons.\n* Structure: `pages/` for pages, `components/` for reusable UI, `entities/` for data models, `functions/` for backend/logic.\n* Follow Patrick's preferences: camelCase, async/await, clear comments, minimalistic UI, dark-mode support, accessible components.\n\nWHEN PROCESSING A RETRY\n\n1. Carefully inspect the attached screenshot and the user's explanation of what is missing, incorrect, or not visible.\n2. Locate the correct files in the Promptster codebase where this behaviour is defined (pages, components, styles, or backend functions).\n3. Change the code so that the behaviour works correctly and consistently for ALL users and all relevant pages / states.\n4. Avoid one-off hacks or hard-coded values tied to a single user, project, or environment.\n5. Keep the implementation clean, testable, and aligned with existing patterns in the app.\n\nDELIVERABLE\n\n* Implement the necessary code changes.\n* Ensure light and dark mode both work correctly.\n* Make sure the fix is visible in the UI (no invisible changes).\n* At the end, briefly list:\n\n  * Which files were changed (with paths),\n  * A short summary per file,\n  * A 3-line manual test checklist the user can run to verify the fix.";
const RETRY_TASK_FIXTURE_EXAMPLE_1 = "You are the Base44 code assistant for the Promptster webapp.\n\nGOAL\nTake the failed or rejected task, the user's short explanation, and the attached screenshot, and UPDATE the Promptster codebase so that the problem is structurally fixed for ALL users – not just as a one-off patch.\n\nCONTEXT\n\n* Tech stack: React + Tailwind CSS + shadcn/ui, Lucide icons.\n* Structure: `pages/` for pages, `components/` for reusable UI, `entities/` for data models, `functions/` for backend/logic.\n* Follow Patrick's preferences: camelCase, async/await, clear comments, minimalistic UI, dark-mode support, accessible components.\n\nWHEN PROCESSING A RETRY\n\n1. Carefully inspect the attached screenshot and the user's explanation of what is missing, incorrect, or not visible.\n2. Locate the correct files in the Promptster codebase where this behaviour is defined (pages, components, styles, or backend functions).\n3. Change the code so that the behaviour works correctly and consistently for ALL users and all relevant pages / states.\n4. Avoid one-off hacks or hard-coded values tied to a single user, project, or environment.\n5. Keep the implementation clean, testable, and aligned with existing patterns in the app.\n\nDELIVERABLE\n\n* Implement the necessary code changes.\n* Ensure light and dark mode both work correctly.\n* Make sure the fix is visible in the UI (no invisible changes).\n* At the end, briefly list:\n\n  * Which files were changed (with paths),\n  * A short summary per file,\n  * A 3-line manual test checklist the user can run to verify the fix.";
const RETRY_TASK_FIXTURE_EXAMPLE_2 = "You are the Base44 code assistant for the Promptster webapp.\n\nGOAL\nTake the failed or rejected task, the user's short explanation, and the attached screenshot, and UPDATE the Promptster codebase so that the problem is structurally fixed for ALL users – not just as a one-off patch.\n\nCONTEXT\n\n* Tech stack: React + Tailwind CSS + shadcn/ui, Lucide icons.\n* Structure: `pages/` for pages, `components/` for reusable UI, `entities/` for data models, `functions/` for backend/logic.\n* Follow Patrick's preferences: camelCase, async/await, clear comments, minimalistic UI, dark-mode support, accessible components.\n\nWHEN PROCESSING A RETRY\n\n1. Carefully inspect the attached screenshot and the user's explanation of what is missing, incorrect, or not visible.\n2. Locate the correct files in the Promptster codebase where this behaviour is defined (pages, components, styles, or backend functions).\n3. Change the code so that the behaviour works correctly and consistently for ALL users and all relevant pages / states.\n4. Avoid one-off hacks or hard-coded values tied to a single user, project, or environment.\n5. Keep the implementation clean, testable, and aligned with existing patterns in the app.\n\nDELIVERABLE\n\n* Implement the necessary code changes.\n* Ensure light and dark mode both work correctly.\n* Make sure the fix is visible in the UI (no invisible changes).\n* At the end, briefly list:\n\n  * Which files were changed (with paths),\n  * A short summary per file,\n  * A 3-line manual test checklist the user can run to verify the fix.";
const RETRY_TASK_FIXTURE_EXAMPLE_3 = "You are the Base44 code assistant for the Promptster webapp.\n\nGOAL\nTake the failed or rejected task, the user's short explanation, and the attached screenshot, and UPDATE the Promptster codebase so that the problem is structurally fixed for ALL users – not just as a one-off patch.\n\nCONTEXT\n\n* Tech stack: React + Tailwind CSS + shadcn/ui, Lucide icons.\n* Structure: `pages/` for pages, `components/` for reusable UI, `entities/` for data models, `functions/` for backend/logic.\n* Follow Patrick's preferences: camelCase, async/await, clear comments, minimalistic UI, dark-mode support, accessible components.\n\nWHEN PROCESSING A RETRY\n\n1. Carefully inspect the attached screenshot and the user's explanation of what is missing, incorrect, or not visible.\n2. Locate the correct files in the Promptster codebase where this behaviour is defined (pages, components, styles, or backend functions).\n3. Change the code so that the behaviour works correctly and consistently for ALL users and all relevant pages / states.\n4. Avoid one-off hacks or hard-coded values tied to a single user, project, or environment.\n5. Keep the implementation clean, testable, and aligned with existing patterns in the app.\n\nDELIVERABLE\n\n* Implement the necessary code changes.\n* Ensure light and dark mode both work correctly.\n* Make sure the fix is visible in the UI (no invisible changes).\n* At the end, briefly list:\n\n  * Which files were changed (with paths),\n  * A short summary per file,\n  * A 3-line manual test checklist the user can run to verify the fix.";

describe('retryTask', () => {
  it('reproduces the old DEFAULT_RETRY_MESSAGE literal', () => {
    expect(prompts.retryTask()).toBe(RETRY_TASK_FIXTURE_DEFAULT);
  });

  it('reproduces all 3 old RETRY_MESSAGE_EXAMPLES literals (call sites 2-4)', () => {
    expect(prompts.retryTask()).toBe(RETRY_TASK_FIXTURE_EXAMPLE_1);
    expect(prompts.retryTask()).toBe(RETRY_TASK_FIXTURE_EXAMPLE_2);
    expect(prompts.retryTask()).toBe(RETRY_TASK_FIXTURE_EXAMPLE_3);
  });

  it('contains the Base44 code assistant framing', () => {
    expect(prompts.retryTask()).toMatch(/You are the Base44 code assistant for the Promptster webapp\./);
    expect(prompts.retryTask()).toMatch(/A 3-line manual test checklist the user can run to verify the fix\.$/);
  });
});

describe('parseClipboardConfig', () => {
  it('matches the fixture byte-for-byte', () => {
    const expected = "Je bent een expert in no-code platform analyse. Analyseer de volgende config/export van platform \"base44\" en extraheer de projectstructuur.\n\nBELANGRIJK: Geef ALLEEN valide JSON terug, geen uitleg of markdown.\n\nInput config:\n```\nsample config export text\n```\n\nExtraheer waar mogelijk:\n1. Pages/schermen met routes en types\n2. Entities/data types met velden\n3. Workflows/automations\n4. Navigatie items\n\nVoor elk item, geef een korte beschrijving die bruikbaar is voor AI code-generatie context.";
    expect(prompts.parseClipboardConfig({"platform":"base44","configText":"sample config export text"})).toBe(expected);
  });
});

describe('parseClipboardConfig truncation', () => {
  it('truncates configText to 15000 chars, matching the old inline substring(0, 15000) call', () => {
    const longText = 'x'.repeat(20000);
    const result = prompts.parseClipboardConfig({ platform: 'bubble', configText: longText });
    expect(result).toContain('x'.repeat(15000));
    expect(result).not.toContain('x'.repeat(15001));
  });
});

describe('parseClipboardConfigSchema', () => {
  it('matches the fixture shape', () => {
    expect(prompts.parseClipboardConfigSchema).toEqual({"type":"object","properties":{"platform_detected":{"type":"string"},"confidence":{"type":"string","enum":["high","medium","low"]},"pages":{"type":"array","items":{"type":"object","properties":{"name":{"type":"string"},"route":{"type":"string"},"page_type":{"type":"string"},"description":{"type":"string"},"components":{"type":"array","items":{"type":"string"}},"entities":{"type":"array","items":{"type":"string"}}}}},"entities":{"type":"array","items":{"type":"object","properties":{"name":{"type":"string"},"description":{"type":"string"},"fields":{"type":"array","items":{"type":"object","properties":{"name":{"type":"string"},"type":{"type":"string"},"is_required":{"type":"boolean"}}}}}}},"workflows":{"type":"array","items":{"type":"object","properties":{"name":{"type":"string"},"trigger_description":{"type":"string"},"actions_description":{"type":"string"},"related_entities":{"type":"array","items":{"type":"string"}}}}},"navigation":{"type":"array","items":{"type":"object","properties":{"label":{"type":"string"},"route":{"type":"string"},"position":{"type":"string"}}}}}});
  });
});

describe('pageDescription', () => {
  it('matches the fixture byte-for-byte', () => {
    const expected = "Genereer een korte, technische beschrijving (max 2 zinnen) voor een pagina met de volgende kenmerken:\n        \n- Pagina naam: Dashboard\n- Type: dashboard\n- URL/Route: /dashboard\n- Entiteiten: Order, Customer\n- Componenten: OrderList\n\nDe beschrijving moet bruikbaar zijn als context voor een AI die code moet genereren. Focus op functionaliteit en datastromen.";
    expect(prompts.pageDescription({"pageName":"Dashboard","pageType":"dashboard","route":"/dashboard","entities":"Order, Customer","components":"OrderList"})).toBe(expected);
  });
});

describe('pageDescription (fallback text)', () => {
  it('matches the fixture byte-for-byte', () => {
    const expected = "Genereer een korte, technische beschrijving (max 2 zinnen) voor een pagina met de volgende kenmerken:\n        \n- Pagina naam: Onbekend\n- Type: other\n- URL/Route: \n- Entiteiten: Geen opgegeven\n- Componenten: Geen opgegeven\n\nDe beschrijving moet bruikbaar zijn als context voor een AI die code moet genereren. Focus op functionaliteit en datastromen.";
    expect(prompts.pageDescription({"pageName":"","pageType":"other","route":"","entities":"","components":""})).toBe(expected);
  });
});

describe('pageDescriptionSchema', () => {
  it('matches the fixture shape', () => {
    expect(prompts.pageDescriptionSchema).toEqual({"type":"object","properties":{"description":{"type":"string"}}});
  });
});

describe('projectStructureAnalysisPrompt', () => {
  it('matches the fixture byte-for-byte', () => {
    const expected = "Analyze this codebase and provide a complete structural overview in JSON format:\n\n{\n  \"name\": \"Project Name\",\n  \"description\": \"Brief project description\",\n  \"technical_config_markdown\": \"# Tech Stack\\n- Framework: ...\\n- Libraries: ...\\n\\n# Architecture\\n...\",\n  \"pages\": [\n    {\"name\": \"PageName\", \"path\": \"/path\", \"components\": [\"Component1\"], \"purpose\": \"...\"}\n  ],\n  \"components\": [\n    {\"name\": \"ComponentName\", \"location\": \"components/...\", \"purpose\": \"...\", \"props\": [\"prop1\"]}\n  ],\n  \"entities\": [\n    {\"name\": \"EntityName\", \"fields\": [\"field1\", \"field2\"], \"purpose\": \"...\"}\n  ],\n  \"buttons_and_actions\": [\n    {\"label\": \"Button Text\", \"location\": \"PageName\", \"action\": \"what it does\"}\n  ],\n  \"routing\": \"How navigation works\",\n  \"state_management\": \"How data flows\",\n  \"styling\": \"Tailwind/CSS approach\"\n}\n\nBe thorough - include ALL pages, components, buttons, forms, and key functionality.";
    expect(prompts.projectStructureAnalysisPrompt()).toBe(expected);
  });
});

describe('retryModalPrompt', () => {
  it('matches the fixture byte-for-byte', () => {
    const expected = "**Retry — Task Correction Request**\n\n**1. User screenshot evidence**\nAttached screenshot shows the area where the issue occurs.\n\n**OCR Vision Analysis:**\n- Detected UI elements: 4 regions\n- Text content: \"Submit\"\n- Layout level: full\n\nUser observation: The submit button does not appear on screen.\n\n**2. Original task description**\nFix the submit button\nSecond line of description\n```\nFix the submit button\nSecond line of description\n```\n\n**3. What was expected**\n• The task should have produced the following elements, functions, or UI changes:\n  Fix the submit button\n\n**4. What was wrong or missing**\n• Based on the screenshot and user feedback:\n  The submit button does not appear on screen.\n• Specific issues:\n  - Elements not visible or not rendered\n  - Functions not working correctly\n  - Incorrect styling or layout\n  - Missing functionality\n\n**5. Required corrections**\n• Review the screenshot carefully\n• Identify exactly which specific part failed\n• Make the following corrections:\n  - Add missing elements\n  - Fix incorrect implementations\n  - Ensure all UI elements are visible and properly styled\n  - Verify functionality works as intended\n  - Check dark mode compatibility if applicable\n• Validate the changes work correctly before marking as complete\n\n**Context:**\n- Original task: Add submit button\n- Project: proj-123\n\n**Screenshots JSON:**\n```json\n{\n  \"screenshots\": [\n    {\n      \"id\": \"https://x/1.png\",\n      \"pageHint\": \"Checks page\",\n      \"componentHint\": \"Failed task\",\n      \"domain\": \"UI\",\n      \"ocrVision\": {\n        \"status\": \"failed\"\n      }\n    }\n  ]\n}\n```\n";
    expect(prompts.retryModalPrompt({"originalTask":"Fix the submit button\nSecond line of description","hasScreenshot":true,"visionSection":"\n**OCR Vision Analysis:**\n- Detected UI elements: 4 regions\n- Text content: \"Submit\"\n- Layout level: full\n","hasExplanation":true,"userExplanation":"  The submit button does not appear on screen.  ","itemTitle":"Add submit button","projectId":"proj-123","screenshotsPayload":[{"id":"https://x/1.png","pageHint":"Checks page","componentHint":"Failed task","domain":"UI","ocrVision":{"status":"failed"}}]})).toBe(expected);
  });
});

describe('retryModalPrompt (no screenshot, no explanation, no project)', () => {
  it('matches the fixture byte-for-byte', () => {
    const expected = "**Retry — Task Correction Request**\n\n**1. User screenshot evidence**\n⚠️ Screenshot required\n\n\n\n**2. Original task description**\nSolo task, no screenshot\n```\nSolo task, no screenshot\n```\n\n**3. What was expected**\n• The task should have produced the following elements, functions, or UI changes:\n  Solo task, no screenshot\n\n**4. What was wrong or missing**\n• Based on the screenshot and user feedback:\n  ⚠️ Please describe what is missing or incorrect\n• Specific issues:\n  - Elements not visible or not rendered\n  - Functions not working correctly\n  - Incorrect styling or layout\n  - Missing functionality\n\n**5. Required corrections**\n• Review the screenshot carefully\n• Identify exactly which specific part failed\n• Make the following corrections:\n  - Add missing elements\n  - Fix incorrect implementations\n  - Ensure all UI elements are visible and properly styled\n  - Verify functionality works as intended\n  - Check dark mode compatibility if applicable\n• Validate the changes work correctly before marking as complete\n\n**Context:**\n- Original task: Some task\n- Project: No project\n\n**Screenshots JSON:**\n```json\n{\n  \"screenshots\": []\n}\n```\n";
    expect(prompts.retryModalPrompt({"originalTask":"Solo task, no screenshot","hasScreenshot":false,"visionSection":"","hasExplanation":false,"userExplanation":"","itemTitle":"Some task","projectId":"","screenshotsPayload":[]})).toBe(expected);
  });
});

