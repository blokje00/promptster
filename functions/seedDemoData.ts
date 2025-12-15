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
  
  const base44 = createClientFromRequest(req);
  console.log('[seedDemoData] ✅ Base44 client created');
  
  try {
    // Parse request body
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const force = body.force === true;
    console.log('[seedDemoData] Force mode:', force);
    
    // Get current user
    console.log('[seedDemoData] ⏳ Fetching user...');
    const user = await base44.auth.me();
    console.log('[seedDemoData] User:', { id: user?.id, email: user?.email });

    if (!user) {
      console.log('[seedDemoData] ❌ No user found');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ============================================
    // KRITIEKE FIX #1: Check data EXISTS, niet marker
    // ============================================
    console.log('[seedDemoData] 🔍 Checking if demo data already exists...');
    const existingProjects = await base44.asServiceRole.entities.Project.filter({});
    const demoProjects = existingProjects.filter(p => p.name?.startsWith('DEMO:'));
    
    console.log('[seedDemoData] Found existing demo projects:', demoProjects.length);
    
    if (demoProjects.length > 0 && !force) {
      console.log('[seedDemoData] ℹ️ Demo data already exists, skipping');
      return Response.json({ 
        status: 'already_seeded',
        message: 'Demo data already exists',
        projects: demoProjects.length
      });
    }

    // FORCE MODE: Clean up
    if (force && demoProjects.length > 0) {
      console.log('[seedDemoData] 🧹 FORCE MODE: Cleaning up...');
      
      // Delete in correct order (respect foreign keys)
      const allThoughts = await base44.asServiceRole.entities.Thought.filter({});
      const demoThoughts = allThoughts.filter(t => 
        demoProjects.some(p => p.id === t.project_id) || t.content?.startsWith('DEMO:')
      );
      for (const thought of demoThoughts) {
        await base44.asServiceRole.entities.Thought.delete(thought.id);
      }
      console.log('[seedDemoData] Deleted', demoThoughts.length, 'thoughts');
      
      const allTemplates = await base44.asServiceRole.entities.PromptTemplate.filter({});
      const demoTemplates = allTemplates.filter(t => 
        demoProjects.some(p => p.id === t.project_id) || t.name?.startsWith('DEMO:')
      );
      for (const template of demoTemplates) {
        await base44.asServiceRole.entities.PromptTemplate.delete(template.id);
      }
      console.log('[seedDemoData] Deleted', demoTemplates.length, 'templates');
      
      const allItems = await base44.asServiceRole.entities.Item.filter({});
      const demoItems = allItems.filter(i => 
        demoProjects.some(p => p.id === i.project_id) || i.title?.startsWith('DEMO:')
      );
      for (const item of demoItems) {
        await base44.asServiceRole.entities.Item.delete(item.id);
      }
      console.log('[seedDemoData] Deleted', demoItems.length, 'items');
      
      for (const project of demoProjects) {
        await base44.asServiceRole.entities.Project.delete(project.id);
      }
      console.log('[seedDemoData] Deleted', demoProjects.length, 'projects');
      
      console.log('[seedDemoData] ✅ Cleanup complete');
    }

    console.log('[seedDemoData] ✨ Starting demo seed...');

    // ============================================
    // STAP 1: Personal AI Config
    // ============================================
    console.log('[seedDemoData] 📝 Step 1: Personal AI config...');
    
    await base44.auth.updateMe({
      personal_preferences_markdown: PERSONAL_PREFERENCES,
      demo_seeded_at: new Date().toISOString()
    });
    
    // Check if AISettings already exists
    const existingSettings = await base44.asServiceRole.entities.AISettings.filter({});
    const userSettings = existingSettings.find(s => s.created_by === user.email);
    
    let aiSettings;
    if (userSettings) {
      console.log('[seedDemoData] AI Settings already exist, updating...');
      aiSettings = await base44.asServiceRole.entities.AISettings.update(userSettings.id, {
        improve_prompt_instruction: "Improve the following prompt technically and linguistically. Make the text more professional, clearer, and better structured. Preserve the original intent and content, but improve grammar, spelling, and technical precision. Only return the improved text, no explanation.",
        model_preference: "default",
        enable_context_suggestions: true
      });
    } else {
      aiSettings = await base44.asServiceRole.entities.AISettings.create({
        improve_prompt_instruction: "Improve the following prompt technically and linguistically. Make the text more professional, clearer, and better structured. Preserve the original intent and content, but improve grammar, spelling, and technical precision. Only return the improved text, no explanation.",
        model_preference: "default",
        enable_context_suggestions: true,
        created_by: user.email
      });
    }
    console.log('[seedDemoData] ✅ AI Settings:', aiSettings?.id);

    // ============================================
    // KRITIEKE FIX #2: Wacht op elke create() response
    // ============================================
    
    // STAP 2: Project 1
    console.log('[seedDemoData] 📁 Step 2: Creating Project 1...');
    const project1 = await base44.asServiceRole.entities.Project.create({
      name: "DEMO: SaaS Web App Refactor",
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
    
    // KRITIEK: Check of create succesvol was
    if (!project1 || !project1.id) {
      throw new Error('Project 1 creation failed - no ID returned');
    }
    console.log('[seedDemoData] ✅ Project 1 created:', project1.id);
    
    // Korte delay voor database consistency
    await new Promise(resolve => setTimeout(resolve, 100));

    // Templates voor Project 1
    console.log('[seedDemoData] 📋 Creating templates for Project 1...');
    
    const t1 = await base44.asServiceRole.entities.PromptTemplate.create({
      name: "DEMO: UI Review Template",
      type: "start",
      content: "Review the following UI for usability, accessibility, and visual consistency.\nProvide concrete improvement suggestions.",
      project_id: project1.id,
      created_by: user.email
    });
    if (!t1?.id) throw new Error('Template 1 failed');
    console.log('[seedDemoData] ✅ Template 1:', t1.id);
    
    await new Promise(resolve => setTimeout(resolve, 50));

    const t2 = await base44.asServiceRole.entities.PromptTemplate.create({
      name: "DEMO: Code Refactor Template",
      type: "start",
      content: "Analyze the provided code and propose a refactor.\nFocus on clarity, reusability, and long-term maintainability.",
      project_id: project1.id,
      created_by: user.email
    });
    if (!t2?.id) throw new Error('Template 2 failed');
    console.log('[seedDemoData] ✅ Template 2:', t2.id);
    
    await new Promise(resolve => setTimeout(resolve, 50));

    const t3 = await base44.asServiceRole.entities.PromptTemplate.create({
      name: "DEMO: Bug Analysis Template",
      type: "eind",
      content: "Investigate the described issue.\nIdentify root causes and suggest fixes.",
      project_id: project1.id,
      created_by: user.email
    });
    if (!t3?.id) throw new Error('Template 3 failed');
    console.log('[seedDemoData] ✅ Template 3:', t3.id);
    
    await new Promise(resolve => setTimeout(resolve, 100));

    // Tasks voor Project 1
    console.log('[seedDemoData] ✏️ Creating tasks for Project 1...');
    
    const tasks1 = [
      { content: "DEMO: Review the homepage layout and visual hierarchy", focus_type: "design", target_page: "Dashboard", target_domain: "UI" },
      { content: "DEMO: Identify usability issues in the admin dashboard", focus_type: "both", target_page: "Dashboard", target_domain: "UI" },
      { content: "DEMO: Analyze a reported issue in the signup flow", focus_type: "logic", target_domain: "UploadFlow" },
      { content: "DEMO: Propose improvements to the settings page code structure", focus_type: "both", target_page: "Dashboard", target_domain: "UI" },
      { content: "DEMO: Review mobile layout issues and responsiveness", focus_type: "design", target_domain: "Styling" }
    ];
    
    for (const [idx, taskData] of tasks1.entries()) {
      const task = await base44.asServiceRole.entities.Thought.create({
        ...taskData,
        project_id: project1.id,
        is_selected: true,
        is_deleted: false,
        created_by: user.email
      });
      if (!task?.id) throw new Error(`Task ${idx + 1} failed`);
      console.log(`[seedDemoData] ✅ Task ${idx + 1}:`, task.id);
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log('[seedDemoData] ✅ Project 1 COMPLETE');

    // ============================================
    // STAP 3: Project 2
    // ============================================
    console.log('[seedDemoData] 📁 Step 3: Creating Project 2...');
    
    const project2 = await base44.asServiceRole.entities.Project.create({
      name: "DEMO: AI Prompt Engineering Playground",
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
    
    if (!project2 || !project2.id) {
      throw new Error('Project 2 creation failed');
    }
    console.log('[seedDemoData] ✅ Project 2 created:', project2.id);
    
    await new Promise(resolve => setTimeout(resolve, 100));

    // Templates voor Project 2
    console.log('[seedDemoData] 📋 Creating templates for Project 2...');
    
    const t4 = await base44.asServiceRole.entities.PromptTemplate.create({
      name: "DEMO: Prompt Critique Template",
      type: "start",
      content: "Critically evaluate the prompt.\nIdentify ambiguities and suggest improvements.",
      project_id: project2.id,
      created_by: user.email
    });
    if (!t4?.id) throw new Error('Template 4 failed');
    console.log('[seedDemoData] ✅ Template 4:', t4.id);
    
    await new Promise(resolve => setTimeout(resolve, 50));

    const t5 = await base44.asServiceRole.entities.PromptTemplate.create({
      name: "DEMO: Prompt Rewrite Template",
      type: "start",
      content: "Rewrite the prompt to be more precise, robust, and testable.",
      project_id: project2.id,
      created_by: user.email
    });
    if (!t5?.id) throw new Error('Template 5 failed');
    console.log('[seedDemoData] ✅ Template 5:', t5.id);
    
    await new Promise(resolve => setTimeout(resolve, 50));

    const t6 = await base44.asServiceRole.entities.PromptTemplate.create({
      name: "DEMO: Output Evaluation Template",
      type: "eind",
      content: "Evaluate the AI output against the original intent.\nScore clarity, correctness, and usefulness.",
      project_id: project2.id,
      created_by: user.email
    });
    if (!t6?.id) throw new Error('Template 6 failed');
    console.log('[seedDemoData] ✅ Template 6:', t6.id);
    
    await new Promise(resolve => setTimeout(resolve, 100));

    // Tasks voor Project 2
    console.log('[seedDemoData] ✏️ Creating tasks for Project 2...');
    
    const tasks2 = [
      { content: "DEMO: Rewrite a poorly defined AI prompt for clarity and precision", focus_type: "discuss", target_domain: "PromptEngine" },
      { content: "DEMO: Analyze differences between concise and verbose prompt styles", focus_type: "discuss", target_domain: "PromptEngine" },
      { content: "DEMO: Identify hidden assumptions in a prompt", focus_type: "logic", target_domain: "PromptEngine" },
      { content: "DEMO: Score an AI response against clear evaluation criteria", focus_type: "both", target_domain: "PromptEngine" },
      { content: "DEMO: Design a system prompt for consistent AI behavior across sessions", focus_type: "both", target_domain: "PromptEngine" }
    ];
    
    for (const [idx, taskData] of tasks2.entries()) {
      const task = await base44.asServiceRole.entities.Thought.create({
        ...taskData,
        project_id: project2.id,
        is_selected: true,
        is_deleted: false,
        created_by: user.email
      });
      if (!task?.id) throw new Error(`Task ${idx + 6} failed`);
      console.log(`[seedDemoData] ✅ Task ${idx + 6}:`, task.id);
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log('[seedDemoData] ✅ Project 2 COMPLETE');

    // ============================================
    // STAP 4: Vault Items
    // ============================================
    console.log('[seedDemoData] 📦 Step 4: Creating vault items...');
    
    const item1 = await base44.asServiceRole.entities.Item.create({
      title: "DEMO: System Prompt - Code Review Assistant",
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
    if (!item1?.id) throw new Error('Vault item 1 failed');
    console.log('[seedDemoData] ✅ Vault item 1:', item1.id);
    
    await new Promise(resolve => setTimeout(resolve, 100));

    const item2 = await base44.asServiceRole.entities.Item.create({
      title: "DEMO: Prompt Engineering Best Practices",
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
    if (!item2?.id) throw new Error('Vault item 2 failed');
    console.log('[seedDemoData] ✅ Vault item 2:', item2.id);

    console.log('[seedDemoData] ✨✨✨ Demo seed COMPLETED ✨✨✨');

    // ============================================
    // KRITIEKE FIX #3: Verify data was created
    // ============================================
    console.log('[seedDemoData] 🔍 Verifying created data...');
    const verifyProjects = await base44.asServiceRole.entities.Project.filter({});
    const verifyDemoProjects = verifyProjects.filter(p => p.name?.startsWith('DEMO:'));
    
    if (verifyDemoProjects.length !== 2) {
      throw new Error(`Verification failed: Expected 2 projects, found ${verifyDemoProjects.length}`);
    }

    const result = {
      status: 'success',
      message: 'Demo environment created successfully',
      projects: 2,
      tasks: 10,
      vault_prompts: 2,
      templates: 6,
      seeded_at: new Date().toISOString(),
      verified: true
    };
    
    console.log('[seedDemoData] 📤 Result:', result);
    return Response.json(result);

  } catch (error) {
    console.error('[seedDemoData] ❌❌❌ FATAL ERROR ❌❌❌');
    console.error('[seedDemoData] Error:', error.message);
    console.error('[seedDemoData] Stack:', error.stack);
    
    // Rollback marker on failure
    try {
      await base44.auth.updateMe({ demo_seeded_at: null });
      console.log('[seedDemoData] ✅ Marker rolled back');
    } catch (rollbackError) {
      console.error('[seedDemoData] ❌ Rollback failed:', rollbackError);
    }

    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});