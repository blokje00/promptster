/**
 * routes.config.js - Single source of truth for route access control.
 *
 * Components come from the auto-generated pages.config.js registry;
 * this table only adds metadata per page key.
 *
 * access levels:
 *   - "public":    always accessible, no login required
 *   - "protected": requires an authenticated user (redirects to login)
 *   - "admin":     requires an authenticated user with role === 'admin'
 *
 * Pages not listed here default to "protected" (safe default).
 */

export const ROUTES = {
    AIBackoffice: { access: "protected" },
    AddItem: { access: "protected" },
    AdminAnalytics: { access: "admin" },
    AdminSettings: { access: "admin" },
    AdminStats: { access: "admin" },
    AdminSupportTickets: { access: "admin" },
    Checks: { access: "protected" },
    Dashboard: { access: "protected" },
    EditItem: { access: "protected" },
    Features: { access: "public" },
    Legal: { access: "public" },
    Multiprompt: { access: "protected" },
    RecycleBin: { access: "protected" },
    Support: { access: "public" },
    ViewItem: { access: "protected" },
};

// Hidden from routing entirely (legacy/experimental page name patterns)
const EXCLUDED_PATTERNS = ["subscription", "nocode"];

export const getRouteAccess = (pageKey) => ROUTES[pageKey]?.access ?? "protected";

export const isRoutablePage = (pageKey) =>
    !EXCLUDED_PATTERNS.some((p) => pageKey.toLowerCase().includes(p));
