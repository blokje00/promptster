import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const DEMO_VERSION = "v1_promptster_full_demo";
const TESTER_EMAIL = "patrickz@sunshower.nl"; // Always reseed for this user

const PERSONAL_PREFERENCES = `# Personal AI Preferences

## Tone & Style
- Clear, concise, and professional
- Prefer structured output with headings and bullet points
- Avoid unnecessary verbosity

## Reasoning Preferences
- Explain reasoning step-by-step when analyzing complex tasks
- Highlight assumptions explicitly
- Call out risks and edge cases

## Output Preferences
- Use Markdown for all structured responses
- Include summaries at the end of longer outputs
- Prefer actionable recommendations over abstract theory
`;

const DEMO_SCREENSHOTS = {
  saas_homepage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
  dashboard: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800",
  signup_form: "https://images.unsplash.com/photo-1555421689-d68471e189f2?w=800",
  settings_panel: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800",
  mobile_ui: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800",
  text_editor: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800",
  comparison: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800",
  highlighted_text: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800",
  ai_response: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800",
  prompt_config: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800"
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1️⃣ OWNER BEPALING - exact één keer
    const OWNER_EMAIL = user.email;
    const isTester = OWNER_EMAIL === TESTER_EMAIL;

    console.info('[DEMO_SEED] Starting seed check', {
      user_id: user.id,
      owner_email: OWNER_EMAIL,
      is_tester: isTester,
      current_marker: user.demo_seed_version
    });

    // Reality check: verify actual data existence
    const [existingProjects, existingThoughts, existingTemplates, existingItems] = await Promise.all([
      base44.asServiceRole.entities.Project.filter({ created_by: OWNER_EMAIL }),
      base44.asServiceRole.entities.Thought.filter({ created_by: OWNER_EMAIL }),
      base44.asServiceRole.entities.PromptTemplate.filter({ created_by: OWNER_EMAIL }),
      base44.asServiceRole.entities.Item.filter({ created_by: OWNER_EMAIL })
    ]);
    const hasRealData = existingProjects.length > 0;

    console.info('[DEMO_SEED] Reality check complete', {
      owner_email: OWNER_EMAIL,
      marker: user.demo_seed_version,
      projects: existingProjects.length,
      thoughts: existingThoughts.length,
      templates: existingTemplates.length,
      items: existingItems.length,
      has_real_data: hasRealData
    });

    // 3️⃣ TESTER MODE - altijd verse data
    if (isTester) {
      console.info('[DEMO_SEED] 🧪 TESTER MODE - wiping ALL data for:', OWNER_EMAIL);
      
      // Step 1: Clear marker
      await base44.auth.updateMe({ demo_seed_version: null });
      console.info('[DEMO_SEED] Marker cleared');
      
      // Step 2: Delete ALL entities for this owner
      const totalToDelete = existingProjects.length + existingThoughts.length + existingTemplates.length + existingItems.length;
      if (totalToDelete > 0) {
        console.info('[DEMO_SEED] Deleting entities', {
          projects: existingProjects.length,
          thoughts: existingThoughts.length,
          templates: existingTemplates.length,
          items: existingItems.length,
          owner: OWNER_EMAIL
        });
        
        await Promise.all([
          ...existingProjects.map(p => base44.asServiceRole.entities.Project.delete(p.id)),
          ...existingThoughts.map(t => base44.asServiceRole.entities.Thought.delete(t.id)),
          ...existingTemplates.map(t => base44.asServiceRole.entities.PromptTemplate.delete(t.id)),
          ...existingItems.map(i => base44.asServiceRole.entities.Item.delete(i.id))
        ]);
        console.info('[DEMO_SEED] ✅ Tester data wiped completely');
      }
    } else {
      // Normal user: idempotency check
      if (user.demo_seed_version === DEMO_VERSION && hasRealData) {
        console.info('[DEMO_SEED] ✅ Already seeded - skipping', {
          owner: OWNER_EMAIL,
          version: user.demo_seed_version,
          projects: existingProjects.length
        });
        return Response.json({ 
          status: 'already_seeded',
          message: 'Demo data already exists',
          version: user.demo_seed_version,
          projects: existingProjects.length
        });
      }

      // Ghost marker fix: marker exists but no data
      if (user.demo_seed_version === DEMO_VERSION && !hasRealData) {
        console.warn('[DEMO_SEED] ⚠️ GHOST MARKER DETECTED', {
          owner: OWNER_EMAIL,
          marker: user.demo_seed_version,
          projects: existingProjects.length
        });
        await base44.auth.updateMe({ demo_seed_version: null });
        console.info('[DEMO_SEED] Marker cleared, will reseed');
      }
    }

    console.info('[DEMO_SEED] 🚀 Starting fresh seed', {
      owner: OWNER_EMAIL,
      is_tester: isTester
    });

    // STEP 1: Create Personal AI Configuration
    console.info('[DEMO_SEED] Creating personal config', { owner: OWNER_EMAIL });
    
    await base44.auth.updateMe({
      personal_preferences_markdown: PERSONAL_PREFERENCES
    });

    const aiSettings = await base44.asServiceRole.entities.AISettings.create({
      improve_prompt_instruction: "Improve the following prompt technically and linguistically. Make the text more professional, clearer, and better structured. Preserve the original intent and content, but improve grammar, spelling, and technical precision. Only return the improved text, no explanation.",
      model_preference: "default",
      enable_context_suggestions: true,
      created_by: OWNER_EMAIL
    });

    console.info('[DEMO_SEED] ✅ Personal config created', {
      ai_settings_id: aiSettings.id,
      owner: OWNER_EMAIL
    });

    // STEP 2: Create Demo Project 1 - SaaS Web App Refactor
    console.info('[DEMO_SEED] Creating Project 1', {
      name: "SaaS Web App Refactor",
      owner: OWNER_EMAIL
    });
    
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
      created_by: OWNER_EMAIL
    });
    
    console.info('[DEMO_SEED] ✅ Project 1 created', {
      project_id: project1.id,
      owner: OWNER_EMAIL
    });

    // Project 1 Templates
    console.info('[DEMO_SEED] Creating templates for Project 1', { owner: OWNER_EMAIL });
    
    const p1_template1 = await base44.asServiceRole.entities.PromptTemplate.create({
      name: "UI Review Template",
      type: "start",
      content: "Review the following UI for usability, accessibility, and visual consistency.\nProvide concrete improvement suggestions.",
      project_id: project1.id,
      created_by: OWNER_EMAIL
    });

    const p1_template2 = await base44.asServiceRole.entities.PromptTemplate.create({
      name: "Code Refactor Template",
      type: "start",
      content: "Analyze the provided code and propose a refactor.\nFocus on clarity, reusability, and long-term maintainability.",
      project_id: project1.id,
      created_by: OWNER_EMAIL
    });

    const p1_template3 = await base44.asServiceRole.entities.PromptTemplate.create({
      name: "Bug Analysis Template",
      type: "eind",
      content: "Investigate the described issue.\nIdentify root causes and suggest fixes.",
      project_id: project1.id,
      created_by: OWNER_EMAIL
    });

    // Project 1 Tasks
    console.info('[DEMO_SEED] Creating 5 tasks for Project 1', { owner: OWNER_EMAIL });
    
    await base44.asServiceRole.entities.Thought.create({
      content: "Review the homepage layout and visual hierarchy",
      screenshot_ids: [DEMO_SCREENSHOTS.saas_homepage],
      project_id: project1.id,
      is_selected: true,
      is_deleted: false,
      focus_type: "design",
      target_page: "Dashboard",
      target_domain: "UI",
      created_by: OWNER_EMAIL
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
      created_by: OWNER_EMAIL
    });

    await base44.asServiceRole.entities.Thought.create({
      content: "Analyze a reported issue in the signup flow",
      screenshot_ids: [DEMO_SCREENSHOTS.signup_form],
      project_id: project1.id,
      is_selected: true,
      is_deleted: false,
      focus_type: "logic",
      target_domain: "UploadFlow",
      created_by: OWNER_EMAIL
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
      created_by: OWNER_EMAIL
    });

    await base44.asServiceRole.entities.Thought.create({
      content: "Review mobile layout issues and responsiveness",
      screenshot_ids: [DEMO_SCREENSHOTS.mobile_ui],
      project_id: project1.id,
      is_selected: true,
      is_deleted: false,
      focus_type: "design",
      target_domain: "Styling",
      created_by: OWNER_EMAIL
    });

    console.info('[DEMO_SEED] ✅ Project 1 complete: 3 templates + 5 tasks');

    // STEP 3: Create Demo Project 2 - AI Prompt Engineering Playground
    console.info('[DEMO_SEED] Creating Project 2', {
      name: "AI Prompt Engineering Playground",
      owner: OWNER_EMAIL
    });
    
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
      created_by: OWNER_EMAIL
    });
    
    console.info('[DEMO_SEED] ✅ Project 2 created', {
      project_id: project2.id,
      owner: OWNER_EMAIL
    });

    // Project 2 Templates
    console.info('[DEMO_SEED] Creating templates for Project 2', { owner: OWNER_EMAIL });
    
    const p2_template1 = await base44.asServiceRole.entities.PromptTemplate.create({
      name: "Prompt Critique Template",
      type: "start",
      content: "Critically evaluate the prompt.\nIdentify ambiguities and suggest improvements.",
      project_id: project2.id,
      created_by: OWNER_EMAIL
    });

    const p2_template2 = await base44.asServiceRole.entities.PromptTemplate.create({
      name: "Prompt Rewrite Template",
      type: "start",
      content: "Rewrite the prompt to be more precise, robust, and testable.",
      project_id: project2.id,
      created_by: OWNER_EMAIL
    });

    const p2_template3 = await base44.asServiceRole.entities.PromptTemplate.create({
      name: "Output Evaluation Template",
      type: "eind",
      content: "Evaluate the AI output against the original intent.\nScore clarity, correctness, and usefulness.",
      project_id: project2.id,
      created_by: OWNER_EMAIL
    });

    // Project 2 Tasks
    console.info('[DEMO_SEED] Creating 5 tasks for Project 2', { owner: OWNER_EMAIL });
    
    await base44.asServiceRole.entities.Thought.create({
      content: "Rewrite a poorly defined AI prompt for clarity and precision",
      screenshot_ids: [DEMO_SCREENSHOTS.text_editor],
      project_id: project2.id,
      is_selected: true,
      is_deleted: false,
      focus_type: "discuss",
      target_domain: "PromptEngine",
      created_by: OWNER_EMAIL
    });

    await base44.asServiceRole.entities.Thought.create({
      content: "Analyze differences between concise and verbose prompt styles",
      screenshot_ids: [DEMO_SCREENSHOTS.comparison],
      project_id: project2.id,
      is_selected: true,
      is_deleted: false,
      focus_type: "discuss",
      target_domain: "PromptEngine",
      created_by: OWNER_EMAIL
    });

    await base44.asServiceRole.entities.Thought.create({
      content: "Identify hidden assumptions in a prompt",
      screenshot_ids: [DEMO_SCREENSHOTS.highlighted_text],
      project_id: project2.id,
      is_selected: true,
      is_deleted: false,
      focus_type: "logic",
      target_domain: "PromptEngine",
      created_by: OWNER_EMAIL
    });

    await base44.asServiceRole.entities.Thought.create({
      content: "Score an AI response against clear evaluation criteria",
      screenshot_ids: [DEMO_SCREENSHOTS.ai_response],
      project_id: project2.id,
      is_selected: true,
      is_deleted: false,
      focus_type: "both",
      target_domain: "PromptEngine",
      created_by: OWNER_EMAIL
    });

    await base44.asServiceRole.entities.Thought.create({
      content: "Design a system prompt for consistent AI behavior across sessions",
      screenshot_ids: [DEMO_SCREENSHOTS.prompt_config],
      project_id: project2.id,
      is_selected: true,
      is_deleted: false,
      focus_type: "both",
      target_domain: "PromptEngine",
      created_by: OWNER_EMAIL
    });

    console.info('[DEMO_SEED] ✅ Project 2 complete: 3 templates + 5 tasks');
    
    // FINAL: Set marker AFTER successful seed
    await base44.auth.updateMe({
      demo_seed_version: DEMO_VERSION
    });
    
    console.info('[DEMO_SEED] ✅✅✅ SEED COMPLETE ✅✅✅', {
      owner: OWNER_EMAIL,
      is_tester: isTester,
      marker_set: DEMO_VERSION,
      projects_created: 2,
      tasks_created: 10,
      templates_created: 6,
      project_ids: [project1.id, project2.id]
    });

    return Response.json({
      status: 'success',
      message: 'Demo environment created',
      owner: OWNER_EMAIL,
      projects: [project1.id, project2.id],
      total_tasks: 10,
      total_templates: 6,
      seed_version: DEMO_VERSION
    });

  } catch (error) {
    console.error('[DEMO_SEED] ❌ FATAL ERROR', {
      error: error.message,
      stack: error.stack
    });
    
    // Try to clear the marker if seeding failed mid-way
    try {
      const base44Recovery = createClientFromRequest(req);
      await base44Recovery.auth.updateMe({
        demo_seed_version: null
      });
      console.info('[DEMO_SEED] Marker cleared after error');
    } catch (clearError) {
      console.error('[DEMO_SEED] Failed to clear marker:', clearError.message);
    }
    
    return Response.json({ 
      status: 'error',
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});