import { me } from "@/api/auth";
import * as items from "@/api/items";
import * as projects from "@/api/projects";
import * as thoughts from "@/api/thoughts";
import * as screenshotAssets from "@/api/screenshotAssets";
import * as pageViews from "@/api/pageViews";

/**
 * Client-side port of base44/functions/getAdminStats/entry.ts.
 *
 * The backend used `base44.asServiceRole.entities` to list ALL users' Item,
 * Project, Thought, UserProfile, ScreenshotAsset and PageView rows and
 * aggregate one summary row per user. The browser has no service role, and
 * checking every entity's RLS (base44/entities/*.jsonc) shows there is no
 * admin bypass for reads on Item, Project, Thought, UserProfile,
 * ScreenshotAsset or PageView — `read` is `created_by: {{user.email}}` on
 * all of them, admin or not (SupportTicket is the one entity with a real
 * `$or: [..., role: admin]` read bypass, and it isn't used by this page).
 * There is also no client-callable way to list other Base44 accounts
 * (User.list() needs a service role too).
 *
 * So this only ever sees the signed-in user's own data — which matches this
 * app's actual deployment (single user, not commercial: the admin IS the
 * only account). `totalUsers` and the `users` array are therefore always 1
 * row; AdminStats.jsx marks this in the UI rather than pretending otherwise.
 */
export async function getAdminStats({ from, to } = {}) {
  const user = await me();
  if (!user) return { ok: false, stats: null, users: [] };

  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;

  const [userItems, userProjects, userThoughts, userScreenshots, allPageViews] = await Promise.all([
    items.listMine(user.email),
    projects.listMine(user.email),
    thoughts.listMine(user.email),
    screenshotAssets.listMine(user.email),
    pageViews.listAll("-created_date", 5000),
  ]);

  // RLS already scopes PageView reads to created_by === current user (no
  // admin bypass — see the module comment above), so this is always "my own
  // page views", same as the original's per-user pageViewsCount would have
  // been for this account.
  let scopedPageViews = allPageViews || [];
  if (fromDate && toDate) {
    scopedPageViews = scopedPageViews.filter((pv) => {
      const d = new Date(pv.created_date);
      return d >= fromDate && d <= toDate;
    });
  }

  const totalViews = scopedPageViews.length;
  const uniqueSessions = new Set(scopedPageViews.map((pv) => pv.session_id)).size;
  const uniqueUsers = new Set(scopedPageViews.filter((pv) => pv.user_id).map((pv) => pv.user_id)).size;
  const totalTime = scopedPageViews.reduce((sum, pv) => sum + (pv.time_on_page || 0), 0);
  const avgTimePerPage = totalViews > 0 ? Math.round(totalTime / totalViews) : 0;

  const countByType = (type) => userItems.filter((i) => i.type === type).length;

  const checks = { total: 0, success: 0, failed: 0, retried: 0 };
  userItems.forEach((item) => {
    (item.task_checks || []).forEach((check) => {
      checks.total++;
      if (check.status === "success") checks.success++;
      if (check.status === "failed") checks.failed++;
      if (check.status === "retried") checks.retried++;
    });
  });

  const allDates = [
    ...userItems.map((i) => new Date(i.created_date)),
    ...userThoughts.map((t) => new Date(t.created_date)),
    ...scopedPageViews.map((pv) => new Date(pv.created_date)),
  ].filter((d) => !isNaN(d.getTime()));
  const lastActivity =
    allDates.length > 0 ? new Date(Math.max(...allDates.map((d) => d.getTime()))).toISOString() : null;

  const usersData = [
    {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      created_date: user.created_date,
      itemsCount: userItems.length,
      projectsCount: userProjects.length,
      thoughtsCount: userThoughts.length,
      screenshotsCount: userScreenshots.length,
      pageViewsCount: scopedPageViews.length,
      lastActivity,
      checks,
    },
  ];

  return {
    ok: true,
    stats: {
      // Always 1 — see the module comment: the browser cannot enumerate
      // other Base44 accounts without a service role.
      totalUsers: 1,
      totalItems: userItems.length,
      itemsBreakdown: {
        prompts: countByType("prompt"),
        multiprompts: countByType("multiprompt"),
        code: countByType("code"),
        snippets: countByType("snippet"),
      },
      totalThoughts: userThoughts.length,
      thoughtsBreakdown: {
        active: userThoughts.filter((t) => !t.is_deleted).length,
        deleted: userThoughts.filter((t) => t.is_deleted).length,
      },
      analytics: { totalViews, uniqueSessions, uniqueUsers, avgTimePerPage },
    },
    users: usersData,
  };
}
