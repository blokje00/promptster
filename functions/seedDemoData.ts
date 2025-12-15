import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Helper: 429 retry wrapper
async function with429Retry(fn, label) {
  try { 
    return await fn(); 
  } catch (e) {
    const msg = e?.message || "";
    const is429 = e?.status === 429 || msg.includes("429");
    if (!is429) throw e;
    console.warn(`[DEMO_SEED][429_RETRY] ${label}`);
    await new Promise(r => setTimeout(r, 1200));
    return await fn(); // 1 retry
  }
}

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
        is_demo: true,
        created_by: ownerEmail,
        created_date: now
      },
      {
        name: "AI Prompt Engineering Playground",
        color: "purple",
        description: "Exploring prompt design, iteration, and evaluation for AI systems",
        technical_config_markdown: `# Project AI Configuration — Prompt Engineering Playground\n\n## Context\nThis project explores prompt design, iteration, and evaluation for AI systems.\n\n## Goals\n- Learn how prompt structure affects output\n- Compare different instruction styles\n- Improve reliability of AI responses`,
        is_demo: true,
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
        is_demo: true,
        project_id: projectId,
        created_by: ownerEmail,
        created_date: now
      },
      {
        name: "Code Refactor Template",
        type: "start",
        content: "Analyze the provided code and propose a refactor.\nFocus on clarity, reusability, and long-term maintainability.",
        is_demo: true,
        project_id: projectId,
        created_by: ownerEmail,
        created_date: now
      },
      {
        name: "Bug Analysis Template",
        type: "eind",
        content: "Investigate the described issue.\nIdentify root causes and suggest fixes.",
        is_demo: true,
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
        is_demo: true,
        project_id: projectId,
        created_by: ownerEmail,
        created_date: now
      },
      {
        name: "Prompt Rewrite Template",
        type: "start",
        content: "Rewrite the prompt to be more precise, robust, and testable.",
        is_demo: true,
        project_id: projectId,
        created_by: ownerEmail,
        created_date: now
      },
      {
        name: "Output Evaluation Template",
        type: "eind",
        content: "Evaluate the AI output against the original intent.\nScore clarity, correctness, and usefulness.",
        is_demo: true,
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
        is_demo: true,
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
        is_demo: true,
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
        is_demo: true,
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
        is_demo: true,
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
        is_demo: true,
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
        is_demo: true,
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
        is_demo: true,
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
        is_demo: true,
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
        is_demo: true,
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
        is_demo: true,
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
  const reqId = crypto.randomUUID();
  const startedAt = Date.now();

  const safeErr = (e) => ({
    name: e?.name,
    message: e?.message || String(e),
    stack: (e?.stack || "").split("\n").slice(0, 8).join("\n"),
    code: e?.code,
    status: e?.status,
  });

  try {
    const base44 = createClientFromRequest(req);
    console.info('[SEED-BACKEND][START]', { reqId });
    
    const user = await base44.auth.me();
    console.info('[SEED-BACKEND][USER]', { reqId, hasUser: !!user, email: user?.email, id: user?.id });
    
    if (!user?.email || !user?.id) {
      console.warn('[SEED-BACKEND][NO_USER_CTX]', { reqId, user });
      return Response.json({ 
        status: 'error',
        reqId,
        error: 'No user context in function',
        where: 'auth'
      }, { status: 401 });
    }

    console.info('[SEED-BACKEND][CHECK_FOR]', { reqId, email: user.email });

    // ✅ IDEMPOTENCY: Check status + reality check
    const CURRENT_VERSION = "v1";
    
    if (user.demo_seed_status === 'success' && user.demo_seed_version === CURRENT_VERSION && user.email !== 'patrickz@sunshower.nl') {
      // Reality check: verify actual data exists
      const demoProjects = await base44.asServiceRole.entities.Project.filter({ 
        created_by: user.email, 
        is_demo: true 
      });
      
      const hasDemoData = Array.isArray(demoProjects) && demoProjects.length > 0;
      
      if (hasDemoData) {
        console.info('[SEED-BACKEND][ALREADY_SEEDED]', { reqId, version: user.demo_seed_version, projectCount: demoProjects.length });
        return Response.json({ 
          status: 'already_seeded',
          reqId,
          seeded_at: user.demo_seeded_at,
          version: user.demo_seed_version
        });
      } else {
        console.warn('[SEED-BACKEND][GHOST_MARKER]', { reqId, msg: 'Marker says success but no data found. Reseeding.' });
        await base44.auth.updateMe({ demo_seed_status: 'failed' });
      }
    }
    
    // Check for stale lock (in_progress for >5 min)
    if (user.demo_seed_status === 'in_progress') {
      const lockTime = user.demo_seeded_at ? new Date(user.demo_seeded_at).getTime() : 0;
      const now = Date.now();
      const isStale = (now - lockTime) > 300000; // 5 minutes
      
      if (isStale) {
        console.warn('[SEED-BACKEND][STALE_LOCK]', { reqId, lockAge: now - lockTime });
        await base44.auth.updateMe({ demo_seed_status: 'failed' });
      } else {
        console.info('[SEED-BACKEND][IN_PROGRESS]', { reqId, msg: 'Another seed is running' });
        return Response.json({ 
          status: 'in_progress',
          reqId,
          message: 'Seeding already in progress'
        });
      }
    }

    // ✅ ACQUIRE LOCK: Mark as in_progress
    const seedTimestamp = new Date().toISOString();
    await base44.auth.updateMe({
      demo_seed_status: 'in_progress',
      demo_seeded_at: seedTimestamp,
      demo_seed_version: CURRENT_VERSION
    });
    console.info('[SEED-BACKEND][LOCK_ACQUIRED]', { reqId, seedTimestamp, version: CURRENT_VERSION });

    // TESTER RESET: Always wipe existing data for whitelisted users
    if (user.email === 'patrickz@sunshower.nl') {
      console.info('[SEED-BACKEND][TESTER_MODE]', { reqId, action: 'wiping' });
      
      // Delete ONLY demo data - NULL-SAFE
      const existingThoughts = await base44.asServiceRole.entities.Thought.filter({ 
        created_by: user.email, 
        is_demo: true 
      });
      console.info('[SEED-BACKEND][WIPE_THOUGHTS]', { reqId, count: Array.isArray(existingThoughts) ? existingThoughts.length : 0 });
      if (Array.isArray(existingThoughts) && existingThoughts.length > 0) {
        for (const t of existingThoughts) {
          await base44.asServiceRole.entities.Thought.delete(t.id);
        }
      }
      
      const existingTemplates = await base44.asServiceRole.entities.PromptTemplate.filter({ 
        created_by: user.email, 
        is_demo: true 
      });
      console.info('[SEED-BACKEND][WIPE_TEMPLATES]', { reqId, count: Array.isArray(existingTemplates) ? existingTemplates.length : 0 });
      if (Array.isArray(existingTemplates) && existingTemplates.length > 0) {
        for (const t of existingTemplates) {
          await base44.asServiceRole.entities.PromptTemplate.delete(t.id);
        }
      }
      
      const existingProjects = await base44.asServiceRole.entities.Project.filter({ 
        created_by: user.email, 
        is_demo: true 
      });
      console.info('[SEED-BACKEND][WIPE_PROJECTS]', { reqId, count: Array.isArray(existingProjects) ? existingProjects.length : 0 });
      if (Array.isArray(existingProjects) && existingProjects.length > 0) {
        for (const p of existingProjects) {
          await base44.asServiceRole.entities.Project.delete(p.id);
        }
      }
      
      const existingSettings = await base44.asServiceRole.entities.AISettings.filter({ 
        created_by: user.email 
      });
      console.info('[SEED-BACKEND][WIPE_SETTINGS]', { reqId, count: Array.isArray(existingSettings) ? existingSettings.length : 0 });
      if (Array.isArray(existingSettings) && existingSettings.length > 0) {
        for (const s of existingSettings) {
          await base44.asServiceRole.entities.AISettings.delete(s.id);
        }
      }
      
      // Reset markers
      await base44.auth.updateMe({ 
        demo_seeded_at: null,
        demo_seed_status: null,
        demo_seed_version: null
      });
      
      console.info('[SEED-BACKEND][TESTER_WIPE_DONE]', { reqId });
    }

    console.info('[SEED-BACKEND][BUILD_DATASET]', { reqId });

    // Build complete dataset
    const dataset = buildDemoDataset(user.email);
    const now = new Date().toISOString();

    // Helper: delay to avoid rate limits
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // BULK INSERT 1: AI Settings (with 429 retry)
    console.info('[SEED-BACKEND][STEP_1]', { reqId, entity: 'AISettings', count: dataset.aiSettings.length });
    await with429Retry(async () => {
      await base44.asServiceRole.entities.AISettings.bulkCreate(dataset.aiSettings);
      console.info('[SEED-BACKEND][STEP_1_OK]', { reqId });
    }, 'AISettings');
    await delay(1000);

    // BULK INSERT 2: Projects (with 429 retry)
    console.info('[SEED-BACKEND][STEP_2]', { reqId, entity: 'Project', count: dataset.projects.length });
    let createdProjects;
    await with429Retry(async () => {
      createdProjects = await base44.asServiceRole.entities.Project.bulkCreate(dataset.projects);
      console.info('[SEED-BACKEND][STEP_2_OK]', { reqId, ids: createdProjects?.map(p => p.id) || [] });
    }, 'Projects');
    await delay(1000);

    // BULK INSERT 3: Templates (per project, with 429 retry)
    console.info('[SEED-BACKEND][STEP_3]', { reqId, entity: 'PromptTemplate' });
    let templateCount = 0;
    const projectCount = Array.isArray(createdProjects) ? createdProjects.length : 0;
    for (let i = 0; i < projectCount; i++) {
      const project = createdProjects[i];
      const templates = buildTemplates(project.id, project.name, user.email, now);
      if (Array.isArray(templates) && templates.length > 0) {
        console.info('[SEED-BACKEND][STEP_3_PROJECT]', { reqId, projectIndex: i+1, total: projectCount, templateCount: templates.length });
        await with429Retry(async () => {
          await base44.asServiceRole.entities.PromptTemplate.bulkCreate(templates);
          templateCount += templates.length;
          console.info('[SEED-BACKEND][STEP_3_PROJECT_OK]', { reqId, templateCount });
        }, `Templates-${project.name}`);
        await delay(800);
      }
    }

    // BULK INSERT 4: Thoughts (per project, with 429 retry)
    console.info('[SEED-BACKEND][STEP_4]', { reqId, entity: 'Thought' });
    let thoughtCount = 0;
    for (let i = 0; i < projectCount; i++) {
      const project = createdProjects[i];
      const thoughts = buildThoughts(project.id, project.name, user.email, now);
      if (Array.isArray(thoughts) && thoughts.length > 0) {
        console.info('[SEED-BACKEND][STEP_4_PROJECT]', { reqId, projectIndex: i+1, total: projectCount, thoughtCount: thoughts.length });
        await with429Retry(async () => {
          await base44.asServiceRole.entities.Thought.bulkCreate(thoughts);
          thoughtCount += thoughts.length;
          console.info('[SEED-BACKEND][STEP_4_PROJECT_OK]', { reqId, thoughtCount });
        }, `Thoughts-${project.name}`);
        await delay(800);
      }
    }

    // UPDATE PERSONAL PREFERENCES
    console.info('[SEED-BACKEND][UPDATE_PREFS]', { reqId });
    await base44.auth.updateMe({
      personal_preferences_markdown: PERSONAL_PREFERENCES
    });

    // ✅ MARK SUCCESS
    await base44.auth.updateMe({
      demo_seed_status: 'success',
      demo_seed_version: CURRENT_VERSION
    });

    console.info('[SEED-BACKEND][DONE]', {
      reqId,
      ms: Date.now() - startedAt,
      email: user.email,
      projectCount,
      version: CURRENT_VERSION
    });

    return Response.json({
      status: 'success',
      reqId,
      seeded_at: seedTimestamp,
      version: CURRENT_VERSION,
      stats: {
        projects: projectCount,
        templates: templateCount,
        thoughts: thoughtCount
      }
    });

  } catch (error) {
    const err = safeErr(error);
    console.error('[SEED-BACKEND][FATAL]', { 
      reqId, 
      ms: Date.now() - startedAt, 
      err 
    });

    // MARK FAILED
    try {
      await base44.auth.updateMe({
        demo_seed_status: 'failed'
      });
    } catch (updateErr) {
      console.error('[SEED-BACKEND][FAILED_TO_MARK_FAILED]', safeErr(updateErr));
    }

    // ALWAYS return JSON, never throw
    return Response.json({
      status: 'error',
      reqId,
      error: err.message,
      errorType: err.name,
      details: err.stack,
      code: err.code,
      httpStatus: err.status
    }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});