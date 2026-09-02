import { describe, it, expect } from 'vitest';
import * as prompts from '../../../base44/functions/utils/prompts/entry.ts';

/**
 * Fixed-input regression tests for base44/functions/utils/prompts/entry.ts.
 * This module needs no SDK import, so it is imported directly (same pattern
 * as src/tests/base44/nousLLM.test.js) — vitest.config.js already aliases
 * the npm: specifier for files elsewhere in base44/functions/utils that do
 * need the SDK; this module doesn't touch that alias.
 */

describe('decomposeTaskPrompt', () => {
  it('matches the fixture byte-for-byte', () => {
    const expected = "Je bent een expert in het schrijven van duidelijke, actionable development tasks.\n\nProject: Promptster\nPlatform: Generic\n\nLearned patterns voor task writing:\n- Keep titles short\n\nVAGE TASK: \"Add a settings page\"\n\nGenereer 3 VERSCHILLENDE varianten van deze task, elk met een andere aanpak:\n\nVARIANT A: Maximaal specifiek - expliciete file paths, component names, technical details\nVARIANT B: User-story oriented - wat moet bereikt worden en waarom\nVARIANT C: Step-by-step instructies - concrete actiestappen\n\nElke variant moet:\n- Duidelijk en actionable zijn\n- Voldoende context bevatten\n- Geen vage termen gebruiken\n\nOutput 3 complete task descriptions.";
    expect(prompts.decomposeTaskPrompt({"taskContent":"Add a settings page","projectContext":"Project: Promptster\nPlatform: Generic","patternsContext":"\n\nLearned patterns voor task writing:\n- Keep titles short"})).toBe(expected);
  });
});

describe('decomposeTaskPrompt (no project, no patterns)', () => {
  it('matches the fixture byte-for-byte', () => {
    const expected = "Je bent een expert in het schrijven van duidelijke, actionable development tasks.\n\n\n\nVAGE TASK: \"vague task\"\n\nGenereer 3 VERSCHILLENDE varianten van deze task, elk met een andere aanpak:\n\nVARIANT A: Maximaal specifiek - expliciete file paths, component names, technical details\nVARIANT B: User-story oriented - wat moet bereikt worden en waarom\nVARIANT C: Step-by-step instructies - concrete actiestappen\n\nElke variant moet:\n- Duidelijk en actionable zijn\n- Voldoende context bevatten\n- Geen vage termen gebruiken\n\nOutput 3 complete task descriptions.";
    expect(prompts.decomposeTaskPrompt({"taskContent":"vague task","projectContext":"","patternsContext":""})).toBe(expected);
  });
});

describe('decomposeTaskSchema', () => {
  it('matches the fixture shape', () => {
    expect(prompts.decomposeTaskSchema).toEqual({"type":"object","properties":{"variant_a":{"type":"object","properties":{"title":{"type":"string"},"description":{"type":"string"},"rationale":{"type":"string"}}},"variant_b":{"type":"object","properties":{"title":{"type":"string"},"description":{"type":"string"},"rationale":{"type":"string"}}},"variant_c":{"type":"object","properties":{"title":{"type":"string"},"description":{"type":"string"},"rationale":{"type":"string"}}},"recommendation":{"type":"string","enum":["A","B","C"]}}});
  });
});

describe('synthesizePreferencesPrompt', () => {
  it('matches the fixture byte-for-byte', () => {
    const expected = "Je bent een AI expert in prompt engineering pattern recognition.\n\nProject: Promptster\nPlatform: Configured\n\nAnalyseer deze 5 EXCELLENTE prompts en hun feedback:\n\n\n=== Excellent Prompt 1 ===\nPrompt snippet: Build a login form\nWhat worked: Clear file paths\nNotes: Loved the JSON block\n\n\n=== Excellent Prompt 2 ===\nPrompt snippet: Add a dashboard chart\nWhat worked: Specific component names\nNotes: N/A\n\n\nTAAK: Distilleer de gemeenschappelijke success patterns uit deze excellente prompts.\n\nFocus op:\n1. Welke prompt structures werkten goed?\n2. Welke context-inclusie strategieën waren succesvol?\n3. Welke task formuleringen leidden tot goede resultaten?\n4. Welke technische details waren cruciaal?\n\nGeef 3-5 ACTIONABLE patterns die toekomstige prompts kunnen verbeteren.\nWees specifiek en concreet - geen vage adviezen.";
    expect(prompts.synthesizePreferencesPrompt({"projectName":"Promptster","isConfigured":true,"feedbackCount":5,"feedbackSummary":[{"prompt_used":"Build a login form","what_worked":"Clear file paths","notes":"Loved the JSON block"},{"prompt_used":"Add a dashboard chart","what_worked":"Specific component names","notes":"N/A"}]})).toBe(expected);
  });
});

describe('synthesizePreferencesPrompt (generic platform, empty summary)', () => {
  it('matches the fixture byte-for-byte', () => {
    const expected = "Je bent een AI expert in prompt engineering pattern recognition.\n\nProject: BareProject\nPlatform: Generic\n\nAnalyseer deze 3 EXCELLENTE prompts en hun feedback:\n\n\n\nTAAK: Distilleer de gemeenschappelijke success patterns uit deze excellente prompts.\n\nFocus op:\n1. Welke prompt structures werkten goed?\n2. Welke context-inclusie strategieën waren succesvol?\n3. Welke task formuleringen leidden tot goede resultaten?\n4. Welke technische details waren cruciaal?\n\nGeef 3-5 ACTIONABLE patterns die toekomstige prompts kunnen verbeteren.\nWees specifiek en concreet - geen vage adviezen.";
    expect(prompts.synthesizePreferencesPrompt({"projectName":"BareProject","isConfigured":false,"feedbackCount":3,"feedbackSummary":[]})).toBe(expected);
  });
});

describe('synthesizePreferencesSchema', () => {
  it('matches the fixture shape', () => {
    expect(prompts.synthesizePreferencesSchema).toEqual({"type":"object","properties":{"patterns":{"type":"array","items":{"type":"object","properties":{"title":{"type":"string"},"description":{"type":"string"},"domain":{"type":"string","enum":["UI","Data","Logic","All"]},"confidence":{"type":"string","enum":["low","medium","high"]}}}},"overall_insight":{"type":"string"}}});
  });
});

describe('retrospectiveFeedbackPrompt', () => {
  it('matches the fixture byte-for-byte', () => {
    const expected = "Je bent een AI expert in retrospectieve pattern analyse voor prompt engineering.\n\nJe krijgt twee groepen prompts:\n1. SUCCESVOLLE PROMPTS (12 samples met \"excellent\" rating)\n2. FALENDE PROMPTS (7 samples met \"poor/okay\" rating)\n\n=== SUCCESVOLLE PROMPTS ===\n\nPrompt 1:\n- What worked: worked 0\n- Prompt snippet: prompt text 0prompt text 0prompt text 0prompt text 0prompt text 0prompt text 0prompt text 0prompt text 0prompt text 0prompt text 0\n\n\nPrompt 2:\n- What worked: worked 1\n- Prompt snippet: prompt text 1prompt text 1prompt text 1prompt text 1prompt text 1prompt text 1prompt text 1prompt text 1prompt text 1prompt text 1\n\n\nPrompt 3:\n- What worked: worked 2\n- Prompt snippet: prompt text 2prompt text 2prompt text 2prompt text 2prompt text 2prompt text 2prompt text 2prompt text 2prompt text 2prompt text 2\n\n\nPrompt 4:\n- What worked: worked 3\n- Prompt snippet: prompt text 3prompt text 3prompt text 3prompt text 3prompt text 3prompt text 3prompt text 3prompt text 3prompt text 3prompt text 3\n\n\nPrompt 5:\n- What worked: worked 4\n- Prompt snippet: prompt text 4prompt text 4prompt text 4prompt text 4prompt text 4prompt text 4prompt text 4prompt text 4prompt text 4prompt text 4\n\n\nPrompt 6:\n- What worked: worked 5\n- Prompt snippet: prompt text 5prompt text 5prompt text 5prompt text 5prompt text 5prompt text 5prompt text 5prompt text 5prompt text 5prompt text 5\n\n\nPrompt 7:\n- What worked: worked 6\n- Prompt snippet: prompt text 6prompt text 6prompt text 6prompt text 6prompt text 6prompt text 6prompt text 6prompt text 6prompt text 6prompt text 6\n\n\nPrompt 8:\n- What worked: worked 7\n- Prompt snippet: prompt text 7prompt text 7prompt text 7prompt text 7prompt text 7prompt text 7prompt text 7prompt text 7prompt text 7prompt text 7\n\n\nPrompt 9:\n- What worked: worked 8\n- Prompt snippet: prompt text 8prompt text 8prompt text 8prompt text 8prompt text 8prompt text 8prompt text 8prompt text 8prompt text 8prompt text 8\n\n\nPrompt 10:\n- What worked: worked 9\n- Prompt snippet: prompt text 9prompt text 9prompt text 9prompt text 9prompt text 9prompt text 9prompt text 9prompt text 9prompt text 9prompt text 9\n\n\n=== FALENDE PROMPTS ===\n\nPrompt 1:\n- What failed: failed 0\n- Prompt snippet: prompt text 0prompt text 0prompt text 0prompt text 0prompt text 0prompt text 0prompt text 0prompt text 0prompt text 0prompt text 0\n\n\nPrompt 2:\n- What failed: failed 1\n- Prompt snippet: prompt text 1prompt text 1prompt text 1prompt text 1prompt text 1prompt text 1prompt text 1prompt text 1prompt text 1prompt text 1\n\n\nPrompt 3:\n- What failed: failed 2\n- Prompt snippet: prompt text 2prompt text 2prompt text 2prompt text 2prompt text 2prompt text 2prompt text 2prompt text 2prompt text 2prompt text 2\n\n\nPrompt 4:\n- What failed: failed 3\n- Prompt snippet: prompt text 3prompt text 3prompt text 3prompt text 3prompt text 3prompt text 3prompt text 3prompt text 3prompt text 3prompt text 3\n\n\nPrompt 5:\n- What failed: failed 4\n- Prompt snippet: prompt text 4prompt text 4prompt text 4prompt text 4prompt text 4prompt text 4prompt text 4prompt text 4prompt text 4prompt text 4\n\n\nTAAK: Voer een **SEMANTIC ADVANTAGE** analyse uit (Training-Free GRPO principe).\n\nBeantwoord:\n1. Welke strategieën hebben de succesvolle prompts gemeen die de falende prompts NIET hebben?\n2. Welke anti-patterns zie je in de falende prompts?\n3. Wat zijn de 3-5 belangrijkste lessen voor toekomstige prompts?\n\nFocus op ACTIONABLE verschillen - geen generieke adviezen.\nWees specifiek over wat WERKTE vs wat NIET werkte.";
    expect(prompts.retrospectiveFeedbackPrompt({"excellent":[{"what_worked":"worked 0","prompt_used":"prompt text 0prompt text 0prompt text 0prompt text 0prompt text 0prompt text 0prompt text 0prompt text 0prompt text 0prompt text 0"},{"what_worked":"worked 1","prompt_used":"prompt text 1prompt text 1prompt text 1prompt text 1prompt text 1prompt text 1prompt text 1prompt text 1prompt text 1prompt text 1"},{"what_worked":"worked 2","prompt_used":"prompt text 2prompt text 2prompt text 2prompt text 2prompt text 2prompt text 2prompt text 2prompt text 2prompt text 2prompt text 2"},{"what_worked":"worked 3","prompt_used":"prompt text 3prompt text 3prompt text 3prompt text 3prompt text 3prompt text 3prompt text 3prompt text 3prompt text 3prompt text 3"},{"what_worked":"worked 4","prompt_used":"prompt text 4prompt text 4prompt text 4prompt text 4prompt text 4prompt text 4prompt text 4prompt text 4prompt text 4prompt text 4"},{"what_worked":"worked 5","prompt_used":"prompt text 5prompt text 5prompt text 5prompt text 5prompt text 5prompt text 5prompt text 5prompt text 5prompt text 5prompt text 5"},{"what_worked":"worked 6","prompt_used":"prompt text 6prompt text 6prompt text 6prompt text 6prompt text 6prompt text 6prompt text 6prompt text 6prompt text 6prompt text 6"},{"what_worked":"worked 7","prompt_used":"prompt text 7prompt text 7prompt text 7prompt text 7prompt text 7prompt text 7prompt text 7prompt text 7prompt text 7prompt text 7"},{"what_worked":"worked 8","prompt_used":"prompt text 8prompt text 8prompt text 8prompt text 8prompt text 8prompt text 8prompt text 8prompt text 8prompt text 8prompt text 8"},{"what_worked":"worked 9","prompt_used":"prompt text 9prompt text 9prompt text 9prompt text 9prompt text 9prompt text 9prompt text 9prompt text 9prompt text 9prompt text 9"},{"what_worked":"worked 10","prompt_used":"prompt text 10prompt text 10prompt text 10prompt text 10prompt text 10prompt text 10prompt text 10prompt text 10prompt text 10prompt text 10"},{"what_worked":"worked 11","prompt_used":"prompt text 11prompt text 11prompt text 11prompt text 11prompt text 11prompt text 11prompt text 11prompt text 11prompt text 11prompt text 11"}],"poor":[{"what_failed":"failed 0","prompt_used":"prompt text 0prompt text 0prompt text 0prompt text 0prompt text 0prompt text 0prompt text 0prompt text 0prompt text 0prompt text 0"},{"what_failed":"failed 1","prompt_used":"prompt text 1prompt text 1prompt text 1prompt text 1prompt text 1prompt text 1prompt text 1prompt text 1prompt text 1prompt text 1"},{"what_failed":"failed 2","prompt_used":"prompt text 2prompt text 2prompt text 2prompt text 2prompt text 2prompt text 2prompt text 2prompt text 2prompt text 2prompt text 2"},{"what_failed":"failed 3","prompt_used":"prompt text 3prompt text 3prompt text 3prompt text 3prompt text 3prompt text 3prompt text 3prompt text 3prompt text 3prompt text 3"},{"what_failed":"failed 4","prompt_used":"prompt text 4prompt text 4prompt text 4prompt text 4prompt text 4prompt text 4prompt text 4prompt text 4prompt text 4prompt text 4"},{"what_failed":"failed 5","prompt_used":"prompt text 5prompt text 5prompt text 5prompt text 5prompt text 5prompt text 5prompt text 5prompt text 5prompt text 5prompt text 5"},{"what_failed":"failed 6","prompt_used":"prompt text 6prompt text 6prompt text 6prompt text 6prompt text 6prompt text 6prompt text 6prompt text 6prompt text 6prompt text 6"}]})).toBe(expected);
  });
});

describe('retrospectiveFeedbackSchema', () => {
  it('matches the fixture shape', () => {
    expect(prompts.retrospectiveFeedbackSchema).toEqual({"type":"object","properties":{"success_strategies":{"type":"array","items":{"type":"object","properties":{"strategy":{"type":"string"},"evidence":{"type":"string"},"domain":{"type":"string","enum":["UI","Data","Logic","All"]}}}},"anti_patterns":{"type":"array","items":{"type":"object","properties":{"pattern":{"type":"string"},"why_it_fails":{"type":"string"}}}},"key_lessons":{"type":"array","items":{"type":"string"}}}});
  });
});

describe('applyFeedbackPrompt', () => {
  it('matches the fixture byte-for-byte', () => {
    const expected = "Based on this user feedback about a prompt result, extract key learnings to add to their personal preferences:\nPROJECT: Promptster\n\nFEEDBACK:\nRating: excellent\nWhat Worked: Clear structure\nWhat Failed: Not specified\nNotes: Great result\n\nCURRENT PREFERENCES:\n# My prefs\n- camelCase\n\nTASK: Extract 2-3 SHORT bullet points of actionable learnings that should be added to their preferences.\nFocus on specific patterns, preferences, or approaches that worked or should be avoided.\nInclude the project name in the bullet point to make it project-specific.\nReturn ONLY the bullet points, no introduction.\n\nExample output:\n- [ProjectName] Prefer detailed task breakdowns over high-level descriptions\n- Avoid technical jargon when describing UI changes\n- Always include specific file paths in instructions";
    expect(prompts.applyFeedbackPrompt({"projectContext":"\nPROJECT: Promptster","rating":"excellent","whatWorked":"Clear structure","whatFailed":"Not specified","notes":"Great result","currentPrefs":"# My prefs\n- camelCase","hasProject":true})).toBe(expected);
  });
});

describe('applyFeedbackPrompt (no project, empty prefs)', () => {
  it('matches the fixture byte-for-byte', () => {
    const expected = "Based on this user feedback about a prompt result, extract key learnings to add to their personal preferences:\n\nFEEDBACK:\nRating: poor\nWhat Worked: Not specified\nWhat Failed: Too vague\nNotes: None\n\nCURRENT PREFERENCES:\n\n\nTASK: Extract 2-3 SHORT bullet points of actionable learnings that should be added to their preferences.\nFocus on specific patterns, preferences, or approaches that worked or should be avoided.\n\nReturn ONLY the bullet points, no introduction.\n\nExample output:\n- Prefer detailed task breakdowns over high-level descriptions\n- Avoid technical jargon when describing UI changes\n- Always include specific file paths in instructions";
    expect(prompts.applyFeedbackPrompt({"projectContext":"","rating":"poor","whatWorked":"Not specified","whatFailed":"Too vague","notes":"None","currentPrefs":"","hasProject":false})).toBe(expected);
  });
});

describe('screenshotVisionPrompt (level: full)', () => {
  it('matches the fixture byte-for-byte', () => {
    const expected = "Analyze this UI screenshot comprehensively:\n\n1. Extract ALL visible text (OCR)\n2. Identify UI components (buttons, inputs, headings, cards, images, links, labels)\n3. Describe layout structure and spatial relationships\n4. Group related elements into semantic blocks\n\nReturn JSON:\n{\n  \"summary\": \"brief description\",\n  \"regions\": [\n    {\"id\": \"r1\", \"type\": \"button|input|heading|card|text\", \"text\": \"...\", \"role\": \"...\", \"bbox\": {\"x\": 0, \"y\": 0, \"width\": 0, \"height\": 0}, \"confidence\": 0.9}\n  ],\n  \"semanticBlocks\": [\n    {\"id\": \"b1\", \"type\": \"header|form|content\", \"text\": \"...\", \"components\": [\"r1\"], \"hierarchy\": {\"level\": 0}}\n  ],\n  \"layoutPattern\": \"grid|flex|list\",\n  \"detectedComponents\": [\"Button\", \"Input\"]\n}";
    expect(prompts.screenshotVisionPrompt({"level":"full"})).toBe(expected);
  });
});

describe('screenshotVisionPrompt (level: basic)', () => {
  it('matches the fixture byte-for-byte', () => {
    const expected = "Extract main text and identify key UI elements.\n\nReturn JSON:\n{\n  \"summary\": \"brief description\",\n  \"regions\": [{\"id\": \"r1\", \"type\": \"text\", \"text\": \"...\", \"bbox\": {\"x\": 0, \"y\": 0, \"width\": 0, \"height\": 0}, \"confidence\": 0.9}],\n  \"semanticBlocks\": [],\n  \"layoutPattern\": \"simple\",\n  \"detectedComponents\": []\n}";
    expect(prompts.screenshotVisionPrompt({"level":"basic"})).toBe(expected);
  });
});

describe('screenshotVisionSchema', () => {
  it('matches the fixture shape', () => {
    expect(prompts.screenshotVisionSchema).toEqual({"type":"object","properties":{"summary":{"type":"string"},"regions":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"type":{"type":"string"},"text":{"type":"string"},"role":{"type":"string"},"bbox":{"type":"object","properties":{"x":{"type":"number"},"y":{"type":"number"},"width":{"type":"number"},"height":{"type":"number"}}},"confidence":{"type":"number"}}}},"semanticBlocks":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"type":{"type":"string"},"text":{"type":"string"},"components":{"type":"array","items":{"type":"string"}},"hierarchy":{"type":"object","properties":{"level":{"type":"number"}}}}}},"layoutPattern":{"type":"string"},"detectedComponents":{"type":"array","items":{"type":"string"}}}});
  });
});

