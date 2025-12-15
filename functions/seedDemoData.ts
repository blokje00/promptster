import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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

Deno.serve(async (req) => {
  console.log('[seedDemoData] 🚀 Function invoked');
  console.log('[seedDemoData] Request method:', req.method);
  console.log('[seedDemoData] Request URL:', req.url);
  
  const base44 = createClientFromRequest(req);
  console.log('[seedDemoData] ✅ Base44 client created');
  
  try {
    console.log('[seedDemoData] ⏳ Fetching user...');
    const user = await base44.auth.me();
    console.log('[seedDemoData] User fetched:', { id: user?.id, email: user?.email, demo_seeded_at: user?.demo_seeded_at });

    if (!user) {
      console.log('[seedDemoData] ❌ No user found - unauthorized');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if demo already seeded (database-first approach)
    if (user.demo_seeded_at) {
      console.log('[seedDemoData] ℹ️ User already has demo data, skipping');
      return Response.json({ 
        status: 'already_seeded',
        message: 'Demo data already exists for this user',
        seeded_at: user.demo_seeded_at
      });
    }

    console.log('[seedDemoData] ✨ Starting demo seed for user:', user.email);

    // Set marker immediately to prevent duplicate runs
    console.log('[seedDemoData] ⏳ Setting demo_seeded_at marker...');
    await base44.auth.updateMe({
      demo_seeded_at: new Date().toISOString()
    });
    console.log('[seedDemoData] ✅ Marker set');

    // STEP 1: Create Personal AI Configuration
    console.log('[seedDemoData] ⏳ Step 1: Creating personal AI config...');
    await base44.auth.updateMe({
      personal_preferences_markdown: PERSONAL_PREFERENCES
    });
    console.log('[seedDemoData] ✅ Personal preferences set');

    const aiSettings = await base44.asServiceRole.entities.AISettings.create({
      improve_prompt_instruction: "Improve the following prompt technically and linguistically. Make the text more professional, clearer, and better structured. Preserve the original intent and content, but improve grammar, spelling, and technical precision. Only return the improved text, no explanation.",
      model_preference: "default",
      enable_context_suggestions: true,
      created_by: user.email
    });
    console.log('[seedDemoData] ✅ AI Settings created:', aiSettings?.id);

    console.log('[seedDemoData] ✓ Personal config created');

    // STEP 2: Create Demo Project 1 - SaaS Web App Refactor
    console.log('[seedDemoData] ⏳ Step 2: Creating Project 1...');
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
    console.log('[seedDemoData] ✅ Project 1 created:', project1?.id);

    // Project 1 Templates
    console.log('[seedDemoData] ⏳ Creating templates for Project 1...');
    const t1 = await base44.asServiceRole.entities.PromptTemplate.create({
      name: "UI Review Template",
      type: "start",
      content: "Review the following UI for usability, accessibility, and visual consistency.\nProvide concrete improvement suggestions.",
      project_id: project1.id,
      created_by: user.email
    });
    console.log('[seedDemoData] ✅ Template 1 created:', t1?.id);

    const t2 = await base44.asServiceRole.entities.PromptTemplate.create({
      name: "Code Refactor Template",
      type: "start",
      content: "Analyze the provided code and propose a refactor.\nFocus on clarity, reusability, and long-term maintainability.",
      project_id: project1.id,
      created_by: user.email
    });
    console.log('[seedDemoData] ✅ Template 2 created:', t2?.id);

    const t3 = await base44.asServiceRole.entities.PromptTemplate.create({
      name: "Bug Analysis Template",
      type: "eind",
      content: "Investigate the described issue.\nIdentify root causes and suggest fixes.",
      project_id: project1.id,
      created_by: user.email
    });
    console.log('[seedDemoData] ✅ Template 3 created:', t3?.id);

    // Project 1 Tasks (NO SCREENSHOTS)
    console.log('[seedDemoData] ⏳ Creating tasks for Project 1...');
    const task1 = await base44.asServiceRole.entities.Thought.create({
      content: "Review the homepage layout and visual hierarchy",
      project_id: project1.id,
      is_selected: true,
      is_deleted: false,
      focus_type: "design",
      target_page: "Dashboard",
      target_domain: "UI",
      created_by: user.email
    });
    console.log('[seedDemoData] ✅ Task 1 created:', task1?.id);

    const task2 = await base44.asServiceRole.entities.Thought.create({
      content: "Identify usability issues in the admin dashboard",
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
      project_id: project1.id,
      is_selected: true,
      is_deleted: false,
      focus_type: "logic",
      target_domain: "UploadFlow",
      created_by: user.email
    });

    await base44.asServiceRole.entities.Thought.create({
      content: "Propose improvements to the settings page code structure",
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
      project_id: project1.id,
      is_selected: true,
      is_deleted: false,
      focus_type: "design",
      target_domain: "Styling",
      created_by: user.email
    });

    console.log('[seedDemoData] ✅ All Project 1 tasks created');
    console.log('[seedDemoData] ✓ Project 1 COMPLETE: 3 templates and 5 tasks');

    // STEP 3: Create Demo Project 2 - AI Prompt Engineering Playground
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

    // Project 2 Tasks (NO SCREENSHOTS)
    await base44.asServiceRole.entities.Thought.create({
      content: "Rewrite a poorly defined AI prompt for clarity and precision",
      project_id: project2.id,
      is_selected: true,
      is_deleted: false,
      focus_type: "discuss",
      target_domain: "PromptEngine",
      created_by: user.email
    });

    await base44.asServiceRole.entities.Thought.create({
      content: "Analyze differences between concise and verbose prompt styles",
      project_id: project2.id,
      is_selected: true,
      is_deleted: false,
      focus_type: "discuss",
      target_domain: "PromptEngine",
      created_by: user.email
    });

    await base44.asServiceRole.entities.Thought.create({
      content: "Identify hidden assumptions in a prompt",
      project_id: project2.id,
      is_selected: true,
      is_deleted: false,
      focus_type: "logic",
      target_domain: "PromptEngine",
      created_by: user.email
    });

    await base44.asServiceRole.entities.Thought.create({
      content: "Score an AI response against clear evaluation criteria",
      project_id: project2.id,
      is_selected: true,
      is_deleted: false,
      focus_type: "both",
      target_domain: "PromptEngine",
      created_by: user.email
    });

    await base44.asServiceRole.entities.Thought.create({
      content: "Design a system prompt for consistent AI behavior across sessions",
      project_id: project2.id,
      is_selected: true,
      is_deleted: false,
      focus_type: "both",
      target_domain: "PromptEngine",
      created_by: user.email
    });

    console.log('[seedDemoData] ✓ Project 2 created with 3 templates and 5 tasks');

    // STEP 4: Create 2 Vault Prompts (NO IMAGES)
    await base44.asServiceRole.entities.Item.create({
      title: "System Prompt - Code Review Assistant",
      type: "prompt",
      project_id: project1.id,
      content: `You are an expert code reviewer focused on React and modern JavaScript/TypeScript.

When reviewing code, always:
1. Identify potential bugs or edge cases
2. Suggest performance improvements
3. Check for accessibility issues
4. Verify error handling is robust
5. Ensure code follows best practices

Provide constructive feedback with specific examples and alternative implementations.`,
      description: "A comprehensive system prompt for AI-assisted code reviews",
      tags: ["code-review", "react", "best-practices"],
      is_favorite: true,
      created_by: user.email
    });

    await base44.asServiceRole.entities.Item.create({
      title: "Prompt Engineering Best Practices",
      type: "prompt",
      project_id: project2.id,
      content: `# Prompt Engineering Principles

## Structure
- Start with role definition
- Provide clear context
- Specify output format explicitly
- Include constraints and boundaries

## Optimization
- Use examples when possible
- Break complex tasks into steps
- Request reasoning before conclusions
- Test edge cases systematically

## Evaluation
- Verify consistency across runs
- Check for hallucinations
- Measure output against success criteria`,
      description: "Core principles for writing effective AI prompts",
      tags: ["prompt-engineering", "best-practices", "ai"],
      is_favorite: false,
      created_by: user.email
    });

    console.log('[seedDemoData] ✓ 2 Vault prompts created');
    console.log('[seedDemoData] ✨✨✨ Demo seed completed successfully ✨✨✨');

    const result = {
      status: 'success',
      message: 'Demo environment created',
      projects: 2,
      tasks: 10,
      vault_prompts: 2,
      templates: 6,
      seeded_at: new Date().toISOString()
    };
    
    console.log('[seedDemoData] 📤 Returning result:', result);
    return Response.json(result);

  } catch (error) {
    console.error('[seedDemoData] ❌❌❌ FATAL ERROR ❌❌❌');
    console.error('[seedDemoData] Error name:', error.name);
    console.error('[seedDemoData] Error message:', error.message);
    console.error('[seedDemoData] Error stack:', error.stack);
    console.error('[seedDemoData] Full error:', JSON.stringify(error, null, 2));
    
    // Rollback marker on failure
    try {
      console.log('[seedDemoData] ⏳ Rolling back demo_seeded_at marker...');
      await base44.auth.updateMe({ demo_seeded_at: null });
      console.log('[seedDemoData] ✅ Rollback successful');
    } catch (rollbackError) {
      console.error('[seedDemoData] ❌ Rollback failed:', rollbackError);
    }

    return Response.json({ 
      error: error.message,
      stack: error.stack,
      name: error.name
    }, { status: 500 });
  }
});