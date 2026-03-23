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
    // KRITIEKE FIX #1: Check data EXISTS voor DEZE USER
    // ============================================
    console.log('[seedDemoData] 🔍 Checking if demo data already exists for THIS user...');
    const existingProjects = await base44.entities.Project.filter({ created_by: user.email });
    const demoProjects = existingProjects.filter(p => p.name?.startsWith('DEMO:'));
    
    console.log('[seedDemoData] Found demo projects for', user.email, ':', demoProjects.length);
    console.log('[seedDemoData] Demo project IDs:', demoProjects.map(p => p.id));
    
    if (demoProjects.length > 0 && !force) {
      console.log('[seedDemoData] ℹ️ Demo data already exists for this user, skipping');
      return Response.json({ 
        status: 'already_seeded',
        message: 'Demo data already exists for this user',
        projects: demoProjects.length
      });
    }

    // FORCE MODE: Clean up THIS USER's data only
    if (force && demoProjects.length > 0) {
      console.log('[seedDemoData] 🧹 FORCE MODE: Cleaning up data for user:', user.email);
      
      // Delete in correct order (respect foreign keys)
      const allThoughts = await base44.entities.Thought.filter({ created_by: user.email });
      const demoThoughts = allThoughts.filter(t => 
        demoProjects.some(p => p.id === t.project_id) || t.content?.startsWith('DEMO:')
      );
      console.log('[seedDemoData] Found', demoThoughts.length, 'demo thoughts to delete');
      for (const thought of demoThoughts) {
        await base44.entities.Thought.delete(thought.id);
      }
      console.log('[seedDemoData] ✅ Deleted', demoThoughts.length, 'thoughts');
      
      const allTemplates = await base44.entities.PromptTemplate.filter({ created_by: user.email });
      const demoTemplates = allTemplates.filter(t => 
        demoProjects.some(p => p.id === t.project_id) || t.name?.startsWith('DEMO:')
      );
      console.log('[seedDemoData] Found', demoTemplates.length, 'demo templates to delete');
      for (const template of demoTemplates) {
        await base44.entities.PromptTemplate.delete(template.id);
      }
      console.log('[seedDemoData] ✅ Deleted', demoTemplates.length, 'templates');
      
      const allItems = await base44.entities.Item.filter({ created_by: user.email });
      const demoItems = allItems.filter(i => 
        demoProjects.some(p => p.id === i.project_id) || i.title?.startsWith('DEMO:')
      );
      console.log('[seedDemoData] Found', demoItems.length, 'demo items to delete');
      for (const item of demoItems) {
        await base44.entities.Item.delete(item.id);
      }
      console.log('[seedDemoData] ✅ Deleted', demoItems.length, 'items');
      
      console.log('[seedDemoData] Deleting', demoProjects.length, 'demo projects');
      for (const project of demoProjects) {
        await base44.entities.Project.delete(project.id);
      }
      console.log('[seedDemoData] ✅ Deleted', demoProjects.length, 'projects');
      
      console.log('[seedDemoData] ✅ Cleanup complete for user:', user.email);
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
    const existingSettings = await base44.entities.AISettings.filter({});
    const userSettings = existingSettings.find(s => s.created_by === user.email);
    
    let aiSettings;
    if (userSettings) {
      console.log('[seedDemoData] AI Settings already exist, updating...');
      aiSettings = await base44.entities.AISettings.update(userSettings.id, {
        improve_prompt_instruction: "Improve the following prompt technically and linguistically. Make the text more professional, clearer, and better structured. Preserve the original intent and content, but improve grammar, spelling, and technical precision. Only return the improved text, no explanation.",
        model_preference: "default",
        enable_context_suggestions: true
      });
    } else {
      aiSettings = await base44.entities.AISettings.create({
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
    const project1 = await base44.entities.Project.create({
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
    
    // KRITIEK: Gedetailleerde logging van response
    console.log('[seedDemoData] 🔍 Project 1 RAW RESPONSE:', JSON.stringify(project1, null, 2));
    console.log('[seedDemoData] 🔍 Project 1 ID:', project1?.id);
    console.log('[seedDemoData] 🔍 Project 1 created_by:', project1?.created_by);
    console.log('[seedDemoData] 🔍 Project 1 data:', project1?.data);
    
    // KRITIEK: Check of create succesvol was
    if (!project1 || !project1.id) {
      console.error('[seedDemoData] ❌ FAILED: Project 1 create did not return a valid ID');
      throw new Error('Project 1 creation failed - no ID returned');
    }
    console.log('[seedDemoData] ✅ Project 1 created:', project1.id);

    // Templates voor Project 1
    console.log('[seedDemoData] 📋 Creating templates for Project 1...');
    
    const t1 = await base44.entities.PromptTemplate.create({
      name: "DEMO: Start Template",
      type: "start",
      content: "You are an expert in Deno serverless with JavaScript and you first analyze which tasks belong together and whether they can be executed in parallel or sequentially. You only stop once all tasks have been completed, even if the task set is very large.",
      project_id: project1.id,
      created_by: user.email
    });
    console.log('[seedDemoData] 🔍 Template 1 RAW:', JSON.stringify(t1, null, 2));
    if (!t1?.id) {
      console.error('[seedDemoData] ❌ Template 1 FAILED - no ID');
      throw new Error('Template 1 failed');
    }
    console.log('[seedDemoData] ✅ Template 1:', t1.id);

    const t3 = await base44.entities.PromptTemplate.create({
      name: "DEMO: End Template",
      type: "eind",
      content: "Analyze these tasks thoroughly, understand what they're about, and locate the correct files. Execute these tasks step by step, and report back clearly: for each task, specify exactly which files (including the full file path) were edited, and which page(s) those files belong to and/or are used by.",
      project_id: project1.id,
      created_by: user.email
    });
    if (!t3?.id) throw new Error('Template 3 failed');
    console.log('[seedDemoData] ✅ Template 3:', t3.id);

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
      const task = await base44.entities.Thought.create({
        ...taskData,
        project_id: project1.id,
        is_selected: true, // Auto-select all demo tasks
        is_deleted: false,
        created_by: user.email
      });
      console.log(`[seedDemoData] 🔍 Task ${idx + 1} RAW:`, JSON.stringify(task, null, 2));
      if (!task?.id) {
        console.error(`[seedDemoData] ❌ Task ${idx + 1} FAILED - no ID`);
        throw new Error(`Task ${idx + 1} failed`);
      }
      console.log(`[seedDemoData] ✅ Task ${idx + 1}:`, task.id);
      }

    console.log('[seedDemoData] ✅ Project 1 COMPLETE');

    // ============================================
    // STAP 3: Project 2
    // ============================================
    console.log('[seedDemoData] 📁 Step 3: Creating Project 2...');
    
    const project2 = await base44.entities.Project.create({
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
    
    console.log('[seedDemoData] 🔍 Project 2 RAW RESPONSE:', JSON.stringify(project2, null, 2));
    console.log('[seedDemoData] 🔍 Project 2 ID:', project2?.id);
    
    if (!project2 || !project2.id) {
      console.error('[seedDemoData] ❌ FAILED: Project 2 create did not return a valid ID');
      throw new Error('Project 2 creation failed');
    }
    console.log('[seedDemoData] ✅ Project 2 created:', project2.id);

    // No additional templates for Project 2

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
      const task = await base44.entities.Thought.create({
        ...taskData,
        project_id: project2.id,
        is_selected: true, // Auto-select all demo tasks
        is_deleted: false,
        created_by: user.email
      });
      if (!task?.id) throw new Error(`Task ${idx + 6} failed`);
      console.log(`[seedDemoData] ✅ Task ${idx + 6}:`, task.id);
      }

    console.log('[seedDemoData] ✅ Project 2 COMPLETE');

    // ============================================
    // STAP 4: Vault Items
    // ============================================
    console.log('[seedDemoData] 📦 Step 4: Creating vault items...');
    
    const item1 = await base44.entities.Item.create({
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
      task_checks: [
        { task_name: "Review button component accessibility", full_description: "Check if all button components have proper ARIA labels and keyboard navigation", status: 'open', is_checked: false },
        { task_name: "Validate error boundary coverage", full_description: "Ensure ErrorBoundary wraps all critical UI sections", status: 'open', is_checked: false },
        { task_name: "Check loading state handling", full_description: "Verify all async operations show proper loading indicators", status: 'open', is_checked: false }
      ],
      created_by: user.email
    });
    console.log('[seedDemoData] 🔍 Vault Item 1 RAW:', JSON.stringify(item1, null, 2));
    if (!item1?.id) {
      console.error('[seedDemoData] ❌ Vault Item 1 FAILED - no ID');
      throw new Error('Vault item 1 failed');
    }
    console.log('[seedDemoData] ✅ Vault item 1:', item1.id);

    const item2 = await base44.entities.Item.create({
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
      task_checks: [
        { task_name: "Test prompt with edge cases", full_description: "Run the prompt with unusual inputs to verify robustness", status: 'open', is_checked: false },
        { task_name: "Validate output format consistency", full_description: "Ensure the AI consistently returns the expected format across multiple runs", status: 'open', is_checked: false }
      ],
      created_by: user.email
    });
    if (!item2?.id) throw new Error('Vault item 2 failed');
    console.log('[seedDemoData] ✅ Vault item 2:', item2.id);

    console.log('[seedDemoData] ✨✨✨ Demo seed COMPLETED ✨✨✨');

    // ============================================
    // NEW: Set default project and templates for user
    // ============================================
    console.log('[seedDemoData] 🎯 Setting default project and templates...');

    // Store preferences in user object for client to read
    await base44.auth.updateMe({
      demo_seeded_at: new Date().toISOString(),
      demo_default_project_id: project1.id,
      demo_start_template_id: t1.id,
      demo_end_template_id: t3.id
    });

    console.log('[seedDemoData] ✅ Default preferences saved');

    // ============================================
    // KRITIEKE FIX #3: Verify data was created FOR THIS USER
    // ============================================
    console.log('[seedDemoData] 🔍 Verifying created data for user:', user.email);
    const verifyProjects = await base44.entities.Project.filter({ created_by: user.email });
    const verifyDemoProjects = verifyProjects.filter(p => p.name?.startsWith('DEMO:'));
    
    console.log('[seedDemoData] Verification: found', verifyDemoProjects.length, 'DEMO projects');
    console.log('[seedDemoData] Verification project IDs:', verifyDemoProjects.map(p => ({ id: p.id, name: p.name })));
    
    if (verifyDemoProjects.length !== 2) {
      console.error('[seedDemoData] ❌ Verification FAILED: Expected 2 projects, found', verifyDemoProjects.length);
      throw new Error(`Verification failed: Expected 2 projects, found ${verifyDemoProjects.length}`);
    }

    const result = {
      status: 'success',
      message: 'Demo environment created successfully',
      projects: 2,
      tasks: 10,
      vault_prompts: 2,
      templates: 2,
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