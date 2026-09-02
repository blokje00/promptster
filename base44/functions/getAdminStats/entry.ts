import { withAuth, ok } from '../utils/http/entry.ts';

/**
 * Server-side aggregation for the AdminStats page.
 *
 * Replaces 7 full-table downloads in the browser with one compact payload:
 * global stats + one pre-aggregated row per user.
 *
 * Body: { from?: ISO date, to?: ISO date } — date range applied to page views.
 */

const ADMIN_EMAIL = 'patrick.van.zandvoort@gmail.com';

Deno.serve(withAuth({ name: 'getAdminStats', admin: true }, async ({ base44, body }) => {
    const fromDate = body?.from ? new Date(body.from) : null;
    const toDate = body?.to ? new Date(body.to) : null;

    const sr = base44.asServiceRole.entities;
    const [users, items, projects, thoughts, profiles, screenshots, pageViewsRaw] = await Promise.all([
      sr.User.list(),
      sr.Item.list(),
      sr.Project.list(),
      sr.Thought.list(),
      sr.UserProfile.list(),
      sr.ScreenshotAsset.list(),
      sr.PageView.list('-created_date', 5000),
    ]);

    // Filter out admin data everywhere
    const notAdmin = (field: string) => (r: any) => r[field] !== ADMIN_EMAIL;
    const filteredUsers = (users || []).filter(notAdmin('email'));
    const filteredItems = (items || []).filter(notAdmin('created_by'));
    const filteredProjects = (projects || []).filter(notAdmin('created_by'));
    const filteredThoughts = (thoughts || []).filter(notAdmin('created_by'));
    const filteredScreenshots = (screenshots || []).filter(notAdmin('created_by'));
    let pageViews = (pageViewsRaw || []).filter(notAdmin('user_email'));

    if (fromDate && toDate) {
      pageViews = pageViews.filter((pv: any) => {
        const d = new Date(pv.created_date);
        return d >= fromDate && d <= toDate;
      });
    }

    // Global analytics
    const totalViews = pageViews.length;
    const uniqueSessions = new Set(pageViews.map((pv: any) => pv.session_id)).size;
    const uniqueUsers = new Set(pageViews.filter((pv: any) => pv.user_id).map((pv: any) => pv.user_id)).size;
    const totalTime = pageViews.reduce((sum: number, pv: any) => sum + (pv.time_on_page || 0), 0);
    const avgTimePerPage = totalViews > 0 ? Math.round(totalTime / totalViews) : 0;

    const countByType = (type: string) => filteredItems.filter((i: any) => i.type === type).length;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const calcGrowth = (current: number, prev: number) => {
      if (prev === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - prev) / prev) * 100);
    };

    // Per-user aggregation
    const usersData = filteredUsers.map((u: any) => {
      const userItems = filteredItems.filter((i: any) => i.created_by === u.email);
      const userThoughts = filteredThoughts.filter((t: any) => t.created_by === u.email);
      const userPageViews = pageViews.filter((pv: any) => pv.user_email === u.email);
      const profile = (profiles || []).find((p: any) => p.email === u.email) || null;

      const allDates = [
        ...userItems.map((i: any) => new Date(i.created_date)),
        ...userThoughts.map((t: any) => new Date(t.created_date)),
        ...userPageViews.map((pv: any) => new Date(pv.created_date)),
      ].filter((d) => !isNaN(d.getTime()));
      const lastActivity = allDates.length > 0
        ? new Date(Math.max(...allDates.map((d) => d.getTime()))).toISOString()
        : null;

      const itemsLast30 = userItems.filter((i: any) => new Date(i.created_date) > thirtyDaysAgo);
      const itemsPrev30 = userItems.filter((i: any) => {
        const d = new Date(i.created_date);
        return d > sixtyDaysAgo && d <= thirtyDaysAgo;
      });

      // task_checks status counts
      const checks = { total: 0, success: 0, failed: 0, retried: 0 };
      userItems.forEach((item: any) => {
        (item.task_checks || []).forEach((check: any) => {
          checks.total++;
          if (check.status === 'success') checks.success++;
          if (check.status === 'failed') checks.failed++;
          if (check.status === 'retried') checks.retried++;
        });
      });

      return {
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        created_date: u.created_date,
        itemsCount: userItems.length,
        projectsCount: filteredProjects.filter((p: any) => p.created_by === u.email).length,
        thoughtsCount: userThoughts.length,
        screenshotsCount: filteredScreenshots.filter((s: any) => s.created_by === u.email).length,
        pageViewsCount: userPageViews.length,
        lastActivity,
        checks,
        growth: {
          prompt: calcGrowth(
            itemsLast30.filter((i: any) => i.type === 'prompt').length,
            itemsPrev30.filter((i: any) => i.type === 'prompt').length,
          ),
          multiprompt: calcGrowth(
            itemsLast30.filter((i: any) => i.type === 'multiprompt').length,
            itemsPrev30.filter((i: any) => i.type === 'multiprompt').length,
          ),
        },
        profile: profile ? {
          plan_id: profile.plan_id,
          subscription_status: profile.subscription_status,
          trial_ends_at: profile.trial_ends_at,
        } : null,
      };
    });

    return ok({
      stats: {
        totalUsers: filteredUsers.length,
        totalItems: filteredItems.length,
        itemsBreakdown: {
          prompts: countByType('prompt'),
          multiprompts: countByType('multiprompt'),
          code: countByType('code'),
          snippets: countByType('snippet'),
        },
        totalThoughts: filteredThoughts.length,
        thoughtsBreakdown: {
          active: filteredThoughts.filter((t: any) => !t.is_deleted).length,
          deleted: filteredThoughts.filter((t: any) => t.is_deleted).length,
        },
        analytics: { totalViews, uniqueSessions, uniqueUsers, avgTimePerPage },
      },
      users: usersData,
    });
}));
