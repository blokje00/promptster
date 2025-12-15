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

// Screenshots removed - demo data works without them

/**
 * Pre-built demo dataset - bulk insertable
 */
function buildDemoDataset(ownerEmail) {
  const now = new Date().toISOString();
  
  return {
    aiSettings: [{
      improve_prompt_instruction: "Improve the following prompt technically and linguistically. Make the text more professional, clearer, and better structured. Preserve the original intent and content, but improve grammar, spelling, and technical precision. Only return the improved text, no explanation.",
      model_preference: "default",
      enable_context_suggestions: true,
      created_by: ownerEmail,
      created_date: now
    }],
    
    projects: [
      {
        name: "SaaS Web App Refactor",
        color: "blue",
        description: "Refactoring and improving a medium-sized SaaS web application",
        technical_config_markdown: `# Project AI Configuration — SaaS Web App Refactor\n\n## Context\nThis project focuses on refactoring and improving a medium-sized SaaS web application.\n\n## Coding Standards\n- React + modern hooks\n- Clear separation of concerns\n- Emphasis on maintainability and readability\n\n## Goals\n- Improve UX consistency\n- Reduce technical debt\n- Increase confidence in production readiness`,
        created_by: ownerEmail,
        created_date: now
      },
      {
        name: "AI Prompt Engineering Playground",
        color: "purple",
        description: "Exploring prompt design, iteration, and evaluation for AI systems",
        technical_config_markdown: `# Project AI Configuration — Prompt Engineering Playground\n\n## Context\nThis project explores prompt design, iteration, and evaluation for AI systems.\n\n## Goals\n- Learn how prompt structure affects output\n- Compare different instruction styles\n- Improve reliability of AI responses`,
        created_by: ownerEmail,
        created_date: now
      }
    ]
  };
}

/**
 * Build templates for a project (needs project ID)
 */
function buildTemplates(projectId, projectName, ownerEmail, now) {
  if (projectName === "SaaS Web App Refactor") {
    return [
      {
        name: "UI Review Template",
        type: "start",
        content: "Review the following UI for usability, accessibility, and visual consistency.\nProvide concrete improvement suggestions.",
        project_id: projectId,
        created_by: ownerEmail,
        created_date: now
      },
      {
        name: "Code Refactor Template",
        type: "start",
        content: "Analyze the provided code and propose a refactor.\nFocus on clarity, reusability, and long-term maintainability.",
        project_id: projectId,
        created_by: ownerEmail,
        created_date: now
      },
      {
        name: "Bug Analysis Template",
        type: "eind",
        content: "Investigate the described issue.\nIdentify root causes and suggest fixes.",
        project_id: projectId,
        created_by: ownerEmail,
        created_date: now
      }
    ];
  } else {
    return [
      {
        name: "Prompt Critique Template",
        type: "start",
        content: "Critically evaluate the prompt.\nIdentify ambiguities and suggest improvements.",
        project_id: projectId,
        created_by: ownerEmail,
        created_date: now
      },
      {
        name: "Prompt Rewrite Template",
        type: "start",
        content: "Rewrite the prompt to be more precise, robust, and testable.",
        project_id: projectId,
        created_by: ownerEmail,
        created_date: now
      },
      {
        name: "Output Evaluation Template",
        type: "eind",
        content: "Evaluate the AI output against the original intent.\nScore clarity, correctness, and usefulness.",
        project_id: projectId,
        created_by: ownerEmail,
        created_date: now
      }
    ];
  }
}

/**
 * Build thoughts for a project (needs project ID)
 */
function buildThoughts(projectId, projectName, ownerEmail, now) {
  if (projectName === "SaaS Web App Refactor") {
    return [
      {
        content: "Review the homepage layout and visual hierarchy",
        screenshot_ids: [],
        project_id: projectId,
        is_selected: true,
        is_deleted: false,
        focus_type: "design",
        target_page: "Dashboard",
        target_domain: "UI",
        created_by: ownerEmail,
        created_date: now
      },
      {
        content: "Identify usability issues in the admin dashboard",
        screenshot_ids: [],
        project_id: projectId,
        is_selected: true,
        is_deleted: false,
        focus_type: "both",
        target_page: "Dashboard",
        target_domain: "UI",
        created_by: ownerEmail,
        created_date: now
      },
      {
        content: "Analyze a reported issue in the signup flow",
        screenshot_ids: [],
        project_id: projectId,
        is_selected: true,
        is_deleted: false,
        focus_type: "logic",
        target_domain: "UploadFlow",
        created_by: ownerEmail,
        created_date: now
      },
      {
        content: "Propose improvements to the settings page code structure",
        screenshot_ids: [],
        project_id: projectId,
        is_selected: true,
        is_deleted: false,
        focus_type: "both",
        target_page: "Dashboard",
        target_domain: "UI",
        created_by: ownerEmail,
        created_date: now
      },
      {
        content: "Review mobile layout issues and responsiveness",
        screenshot_ids: [],
        project_id: projectId,
        is_selected: true,
        is_deleted: false,
        focus_type: "design",
        target_domain: "Styling",
        created_by: ownerEmail,
        created_date: now
      }
    ];
  } else {
    return [
      {
        content: "Rewrite a poorly defined AI prompt for clarity and precision",
        screenshot_ids: [],
        project_id: projectId,
        is_selected: true,
        is_deleted: false,
        focus_type: "discuss",
        target_domain: "PromptEngine",
        created_by: ownerEmail,
        created_date: now
      },
      {
        content: "Analyze differences between concise and verbose prompt styles",
        screenshot_ids: [],
        project_id: projectId,
        is_selected: true,
        is_deleted: false,
        focus_type: "discuss",
        target_domain: "PromptEngine",
        created_by: ownerEmail,
        created_date: now
      },
      {
        content: "Identify hidden assumptions in a prompt",
        screenshot_ids: [],
        project_id: projectId,
        is_selected: true,
        is_deleted: false,
        focus_type: "logic",
        target_domain: "PromptEngine",
        created_by: ownerEmail,
        created_date: now
      },
      {
        content: "Score an AI response against clear evaluation criteria",
        screenshot_ids: [],
        project_id: projectId,
        is_selected: true,
        is_deleted: false,
        focus_type: "both",
        target_domain: "PromptEngine",
        created_by: ownerEmail,
        created_date: now
      },
      {
        content: "Design a system prompt for consistent AI behavior across sessions",
        screenshot_ids: [],
        project_id: projectId,
        is_selected: true,
        is_deleted: false,
        focus_type: "both",
        target_domain: "PromptEngine",
        created_by: ownerEmail,
        created_date: now
      }
    ];
  }
}

Deno.serve(async (req) => {
  console.info('[SEED-BACKEND] Function invoked');
  
  try {
    const base44 = createClientFromRequest(req);
    console.info('[SEED-BACKEND] Client created, fetching user...');
    
    const user = await base44.auth.me();
    console.info('[SEED-BACKEND] User fetched:', user?.email || 'NO USER');
    
    if (!user) {
      console.error('[SEED-BACKEND] No user found!');
      return Response.json({ 
        status: 'error',
        error: 'Unauthorized - no user found' 
      }, { status: 401 });
    }

    console.info('[SEED-BACKEND] Check for:', user.email);

    // ✅ IDEMPOTENCY: Check flag first (prevents race conditions)
    if (user.demo_seeded_at && user.email !== 'patrickz@sunshower.nl') {
      console.info('[SEED] Already seeded at:', user.demo_seeded_at);
      return Response.json({ 
        status: 'already_seeded',
        seeded_at: user.demo_seeded_at
      });
    }

    // ✅ MARK AS SEEDING FIRST (prevents concurrent seeds)
    const seedTimestamp = new Date().toISOString();
    await base44.auth.updateMe({
      demo_seeded_at: seedTimestamp
    });
    console.info('[SEED] Marked user as seeding:', seedTimestamp);

    // TESTER RESET: Always wipe existing data for whitelisted users
    if (user.email === 'patrickz@sunshower.nl') {
      console.info('[SEED] TESTER MODE: Wiping existing data...');
      
      // Delete in correct order (respect foreign keys)
      const existingThoughts = await base44.asServiceRole.entities.Thought.filter({ created_by: user.email });
      for (const t of existingThoughts) {
        await base44.asServiceRole.entities.Thought.delete(t.id);
      }
      
      const existingTemplates = await base44.asServiceRole.entities.PromptTemplate.filter({ created_by: user.email });
      for (const t of existingTemplates) {
        await base44.asServiceRole.entities.PromptTemplate.delete(t.id);
      }
      
      const existingProjects = await base44.asServiceRole.entities.Project.filter({ created_by: user.email });
      for (const p of existingProjects) {
        await base44.asServiceRole.entities.Project.delete(p.id);
      }
      
      const existingSettings = await base44.asServiceRole.entities.AISettings.filter({ created_by: user.email });
      for (const s of existingSettings) {
        await base44.asServiceRole.entities.AISettings.delete(s.id);
      }
      
      // Reset marker
      await base44.auth.updateMe({ demo_seeded_at: null });
      
      console.info('[SEED] TESTER MODE: Wipe complete');
    }

    console.info('[SEED] 🚀 Building demo dataset...');
    
    // Build complete dataset
    const dataset = buildDemoDataset(user.email);
    const now = new Date().toISOString();

    // Helper: delay to avoid rate limits
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // BULK INSERT 1: AI Settings
    console.info('[SEED] 📝 Step 1/4: Inserting AI settings...', { count: dataset.aiSettings.length });
    try {
      await base44.asServiceRole.entities.AISettings.bulkCreate(dataset.aiSettings);
      console.info('[SEED] ✅ AI Settings created successfully');
    } catch (err) {
      console.error('[SEED] ❌ AI Settings FAILED:', { status: err.status, message: err.message, is429: err.status === 429 });
      throw err;
    }
    await delay(1000); // Increased delay

    // BULK INSERT 2: Projects
    console.info('[SEED] 📁 Step 2/4: Inserting projects...', { count: dataset.projects.length });
    let createdProjects;
    try {
      createdProjects = await base44.asServiceRole.entities.Project.bulkCreate(dataset.projects);
      console.info('[SEED] ✅ Projects created successfully', { ids: createdProjects.map(p => p.id) });
    } catch (err) {
      console.error('[SEED] ❌ Projects FAILED:', { status: err.status, message: err.message, is429: err.status === 429 });
      throw err;
    }
    await delay(1000);

    // BULK INSERT 3: Templates (per project, split to avoid rate limits)
    console.info('[SEED] 📋 Step 3/4: Inserting templates...');
    let templateCount = 0;
    for (let i = 0; i < createdProjects.length; i++) {
      const project = createdProjects[i];
      const templates = buildTemplates(project.id, project.name, user.email, now);
      if (templates.length > 0) {
        console.info(`[SEED] Creating ${templates.length} templates for project ${i+1}/${createdProjects.length}: ${project.name}`);
        try {
          await base44.asServiceRole.entities.PromptTemplate.bulkCreate(templates);
          templateCount += templates.length;
          console.info(`[SEED] ✅ Templates created (${templateCount} total)`);
        } catch (err) {
          console.error('[SEED] ❌ Templates FAILED:', { projectId: project.id, status: err.status, message: err.message, is429: err.status === 429 });
          throw err;
        }
        await delay(800); // Increased delay
      }
    }

    // BULK INSERT 4: Thoughts (per project, split to avoid rate limits)
    console.info('[SEED] 💭 Step 4/4: Inserting thoughts...');
    let thoughtCount = 0;
    for (let i = 0; i < createdProjects.length; i++) {
      const project = createdProjects[i];
      const thoughts = buildThoughts(project.id, project.name, user.email, now);
      if (thoughts.length > 0) {
        console.info(`[SEED] Creating ${thoughts.length} thoughts for project ${i+1}/${createdProjects.length}: ${project.name}`);
        try {
          await base44.asServiceRole.entities.Thought.bulkCreate(thoughts);
          thoughtCount += thoughts.length;
          console.info(`[SEED] ✅ Thoughts created (${thoughtCount} total)`);
        } catch (err) {
          console.error('[SEED] ❌ Thoughts FAILED:', { projectId: project.id, status: err.status, message: err.message, is429: err.status === 429 });
          throw err;
        }
        await delay(800); // Increased delay
      }
    }

    // UPDATE PERSONAL PREFERENCES
    console.info('[SEED] Updating user preferences...');
    await base44.auth.updateMe({
      personal_preferences_markdown: PERSONAL_PREFERENCES
    });

    console.info('[SEED] ✅ COMPLETE', {
      user: user.email,
      seeded_at: seedTimestamp,
      projects: createdProjects.length
    });

    return Response.json({
      status: 'success',
      seeded_at: seedTimestamp,
      stats: {
        projects: createdProjects.length
      }
    });

  } catch (error) {
    console.error('[SEED-BACKEND] ❌ CRITICAL ERROR:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      cause: error.cause
    });
    
    return Response.json({ 
      status: 'error',
      error: error.message || 'Unknown error',
      errorType: error.name || 'Error',
      details: error.cause?.message || null
    }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});