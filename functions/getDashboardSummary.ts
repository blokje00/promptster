import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * DASHBOARD SUMMARY - Single endpoint for all dashboard data
 * Prevents burst of queries on dashboard load
 */
Deno.serve(async (req) => {
  const reqId = crypto.randomUUID();
  const startedAt = Date.now();

  const safeErr = (e) => ({
    name: e?.name,
    message: e?.message || String(e),
    stack: (e?.stack || "").split("\n").slice(0, 5).join("\n"),
  });

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ 
        status: 'error', 
        reqId, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    console.info('[DASHBOARD_SUMMARY][START]', { reqId, email: user.email });

    // Fetch all data in parallel
    const [projects, items, thoughts] = await Promise.all([
      base44.entities.Project.filter({ created_by: user.email }),
      base44.entities.Item.filter({ created_by: user.email }),
      base44.entities.Thought.filter({ created_by: user.email, is_deleted: false })
    ]);

    // Calculate counts
    const summary = {
      projects: {
        total: Array.isArray(projects) ? projects.length : 0,
        demo: Array.isArray(projects) ? projects.filter(p => p.is_demo).length : 0,
        items: projects || []
      },
      items: {
        total: Array.isArray(items) ? items.length : 0,
        byType: {
          prompt: Array.isArray(items) ? items.filter(i => i.type === 'prompt').length : 0,
          multiprompt: Array.isArray(items) ? items.filter(i => i.type === 'multiprompt').length : 0,
          code: Array.isArray(items) ? items.filter(i => i.type === 'code').length : 0,
          snippet: Array.isArray(items) ? items.filter(i => i.type === 'snippet').length : 0,
        },
        items: items || []
      },
      thoughts: {
        total: Array.isArray(thoughts) ? thoughts.length : 0,
        selected: Array.isArray(thoughts) ? thoughts.filter(t => t.is_selected).length : 0
      }
    };

    console.info('[DASHBOARD_SUMMARY][DONE]', {
      reqId,
      ms: Date.now() - startedAt,
      projectCount: summary.projects.total,
      itemCount: summary.items.total
    });

    return Response.json({
      status: 'success',
      reqId,
      data: summary
    });

  } catch (error) {
    const err = safeErr(error);
    console.error('[DASHBOARD_SUMMARY][ERROR]', { reqId, ms: Date.now() - startedAt, err });

    return Response.json({
      status: 'error',
      reqId,
      error: err.message,
      details: err.stack
    }, { status: 500 });
  }
});