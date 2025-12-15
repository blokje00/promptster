import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const PERSONAL_PREFERENCES = `# My Personal Development Preferences

## Code Style
- Naming: camelCase for variables, PascalCase for components
- Async: Always async/await, never promise chains
- Error handling: Try-catch around all async operations
- Comments: JSDoc for functions, inline for complex logic

## UI/UX Philosophy
- Design: Minimalist, focus on usability
- Icons: Lucide React (first choice)
- Responsiveness: Mobile-first approach
- Accessibility: WCAG 2.1 AA minimum`;

const DEMO_SCREENSHOTS = {
  saas_homepage: "d2181c8f8_Screenshot2025-12-15at153848.png",
  dashboard: "d66e5cb4a_Screenshot2025-12-15at153848.png",
  signup_form: "d2181c8f8_Screenshot2025-12-15at153848.png",
  settings_panel: "d66e5cb4a_Screenshot2025-12-15at153848.png",
  mobile_ui: "27e051bc8_Screenshot2025-12-15at153848.png",
  text_editor: "d66e5cb4a_Screenshot2025-12-15at153848.png",
  comparison: "d2181c8f8_Screenshot2025-12-15at153848.png",
  highlighted_text: "59f339046_Screenshot2025-12-15at153848.png",
  ai_response: "d66e5cb4a_Screenshot2025-12-15at153848.png",
  prompt_config: "59f339046_Screenshot2025-12-15at153848.png"
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.info('[SEED] Starting for user:', user.email);

    // ✅ IDEMPOTENCY CHECK: Database is single source of truth
    if (user.demo_seeded_at) {
      console.info('[SEED] ✅ Already seeded at:', user.demo_seeded_at);
      return Response.json({ 
        status: 'already_seeded',
        seeded_at: user.demo_seeded_at
      });
    }

    console.info('[SEED] 🚀 Creating demo data...');

    // STEP 1: Personal preferences
    await base44.auth.updateMe({
      personal_preferences_markdown: PERSONAL_PREFERENCES
    });

    // STEP 2: AI Settings
    const aiSettings = await base44.asServiceRole.entities.AISettings.create({
      improve_prompt_instruction: "Improve the following prompt technically and linguistically. Make the text more professional, clearer, and better structured. Preserve the original intent and content, but improve grammar, spelling, and technical precision. Only return the improved text, no explanation.",
      model_preference: "default",
      enable_context_suggestions: true,
      created_by: user.email
    });

    // STEP 3: Project 1 - SaaS Web App Refactor
    const project1 = await base44.asServiceRole.entities.Project.create({
      name: "SaaS Web App Refactor",
      color: "blue",
      description: "Refactoring and improving a medium-sized SaaS web application",
      technical_config_markdown: `# Project AI Configuration — SaaS Web App Refactor

## Context
This project focuses on refactoring and improving a medium-sized SaaS web application.

## Coding Standards
- React + modern hooks
- Clear separation of concerns
- Emphasis on maintainability and readability

## Goals
- Improve UX consistency
- Reduce technical debt
- Increase confidence in production readiness`,
      created_by: user.email
    });

    // Project 1 Templates
    await base44.asServiceRole.entities.PromptTemplate.create({
      name: "UI Review Template",
      type: "start",
      content: "Review the following UI for usability, accessibility, and visual consistency.\nProvide concrete improvement suggestions.",
      project_id: project1.id,
      created_by: user.email
    });

    await base44.asServiceRole.entities.PromptTemplate.create({
      name: "Code Refactor Template",
      type: "start",
      content: "Analyze the provided code and propose a refactor.\nFocus on clarity, reusability, and long-term maintainability.",
      project_id: project1.id,
      created_by: user.email
    });

    await base44.asServiceRole.entities.PromptTemplate.create({
      name: "Bug Analysis Template",
      type: "eind",
      content: "Investigate the described issue.\nIdentify root causes and suggest fixes.",
      project_id: project1.id,
      created_by: user.email
    });

    // Project 1 Tasks
    await base44.asServiceRole.entities.Thought.create({
      content: "Review the homepage layout and visual hierarchy",
      screenshot_ids: [DEMO_SCREENSHOTS.saas_homepage],
      project_id: project1.id,
      is_selected: true,
      is_deleted: false,
      focus_type: "design",
      target_page: "Dashboard",
      target_domain: "UI",
      created_by: user.email
    });

    await base44.asServiceRole.entities.Thought.create({
      content: "Identify usability issues in the admin dashboard",
      screenshot_ids: [DEMO_SCREENSHOTS.dashboard],
      project_id: project1.id,
      is_selected: true,
      is_deleted: false,
      focus_type: "both",
      target_page: "Dashboard",
      target_domain: "UI",
      created_by: user.email
    });

    await base44.asServiceRole.entities.Thought.create({
      content: "Analyze a reported issue in the signup flow",
      screenshot_ids: [DEMO_SCREENSHOTS.signup_form],
      project_id: project1.id,
      is_selected: true,
      is_deleted: false,
      focus_type: "logic",
      target_domain: "UploadFlow",
      created_by: user.email
    });

    await base44.asServiceRole.entities.Thought.create({
      content: "Propose improvements to the settings page code structure",
      screenshot_ids: [DEMO_SCREENSHOTS.settings_panel],
      project_id: project1.id,
      is_selected: true,
      is_deleted: false,
      focus_type: "both",
      target_page: "Dashboard",
      target_domain: "UI",
      created_by: user.email
    });

    await base44.asServiceRole.entities.Thought.create({
      content: "Review mobile layout issues and responsiveness",
      screenshot_ids: [DEMO_SCREENSHOTS.mobile_ui],
      project_id: project1.id,
      is_selected: true,
      is_deleted: false,
      focus_type: "design",
      target_domain: "Styling",
      created_by: user.email
    });

    // STEP 4: Project 2 - AI Prompt Engineering Playground
    const project2 = await base44.asServiceRole.entities.Project.create({
      name: "AI Prompt Engineering Playground",
      color: "purple",
      description: "Exploring prompt design, iteration, and evaluation for AI systems",
      technical_config_markdown: `# Project AI Configuration — Prompt Engineering Playground

## Context
This project explores prompt design, iteration, and evaluation for AI systems.

## Goals
- Learn how prompt structure affects output
- Compare different instruction styles
- Improve reliability of AI responses`,
      created_by: user.email
    });

    // Project 2 Templates
    await base44.asServiceRole.entities.PromptTemplate.create({
      name: "Prompt Critique Template",
      type: "start",
      content: "Critically evaluate the prompt.\nIdentify ambiguities and suggest improvements.",
      project_id: project2.id,
      created_by: user.email
    });

    await base44.asServiceRole.entities.PromptTemplate.create({
      name: "Prompt Rewrite Template",
      type: "start",
      content: "Rewrite the prompt to be more precise, robust, and testable.",
      project_id: project2.id,
      created_by: user.email
    });

    await base44.asServiceRole.entities.PromptTemplate.create({
      name: "Output Evaluation Template",
      type: "eind",
      content: "Evaluate the AI output against the original intent.\nScore clarity, correctness, and usefulness.",
      project_id: project2.id,
      created_by: user.email
    });

    // Project 2 Tasks
    await base44.asServiceRole.entities.Thought.create({
      content: "Rewrite a poorly defined AI prompt for clarity and precision",
      screenshot_ids: [DEMO_SCREENSHOTS.text_editor],
      project_id: project2.id,
      is_selected: true,
      is_deleted: false,
      focus_type: "discuss",
      target_domain: "PromptEngine",
      created_by: user.email
    });

    await base44.asServiceRole.entities.Thought.create({
      content: "Analyze differences between concise and verbose prompt styles",
      screenshot_ids: [DEMO_SCREENSHOTS.comparison],
      project_id: project2.id,
      is_selected: true,
      is_deleted: false,
      focus_type: "discuss",
      target_domain: "PromptEngine",
      created_by: user.email
    });

    await base44.asServiceRole.entities.Thought.create({
      content: "Identify hidden assumptions in a prompt",
      screenshot_ids: [DEMO_SCREENSHOTS.highlighted_text],
      project_id: project2.id,
      is_selected: true,
      is_deleted: false,
      focus_type: "logic",
      target_domain: "PromptEngine",
      created_by: user.email
    });

    await base44.asServiceRole.entities.Thought.create({
      content: "Score an AI response against clear evaluation criteria",
      screenshot_ids: [DEMO_SCREENSHOTS.ai_response],
      project_id: project2.id,
      is_selected: true,
      is_deleted: false,
      focus_type: "both",
      target_domain: "PromptEngine",
      created_by: user.email
    });

    await base44.asServiceRole.entities.Thought.create({
      content: "Design a system prompt for consistent AI behavior across sessions",
      screenshot_ids: [DEMO_SCREENSHOTS.prompt_config],
      project_id: project2.id,
      is_selected: true,
      is_deleted: false,
      focus_type: "both",
      target_domain: "PromptEngine",
      created_by: user.email
    });

    // ✅ FINAL STEP: Mark as seeded AFTER all data is created
    const seededAt = new Date().toISOString();
    await base44.auth.updateMe({
      demo_seeded_at: seededAt
    });

    console.info('[SEED] ✅✅✅ COMPLETE', {
      user: user.email,
      seeded_at: seededAt,
      projects: 2,
      tasks: 10,
      templates: 6
    });

    return Response.json({
      status: 'success',
      seeded_at: seededAt,
      projects: [project1.id, project2.id],
      total_tasks: 10,
      total_templates: 6
    });

  } catch (error) {
    console.error('[SEED] ❌ ERROR:', error.message);
    return Response.json({ 
      status: 'error',
      error: error.message 
    }, { status: 500 });
  }
});