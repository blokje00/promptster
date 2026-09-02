import React, { useCallback } from "react";
import { Link } from "react-router-dom";

/**
 * Link that prefetches a lazy page chunk on hover/focus, so navigation
 * feels instant. The import() calls hit the same chunks Vite generated
 * for pages.config.js, so nothing is downloaded twice.
 */

const prefetchers = {
  AIBackoffice: () => import("@/pages/AIBackoffice"),
  AddItem: () => import("@/pages/AddItem"),
  AdminAnalytics: () => import("@/pages/AdminAnalytics"),
  AdminSettings: () => import("@/pages/AdminSettings"),
  AdminStats: () => import("@/pages/AdminStats"),
  AdminSupportTickets: () => import("@/pages/AdminSupportTickets"),
  Checks: () => import("@/pages/Checks"),
  Dashboard: () => import("@/pages/Dashboard"),
  EditItem: () => import("@/pages/EditItem"),
  Features: () => import("@/pages/Features"),
  Legal: () => import("@/pages/Legal"),
  Multiprompt: () => import("@/pages/Multiprompt"),
  RecycleBin: () => import("@/pages/RecycleBin"),
  Support: () => import("@/pages/Support"),
  ViewItem: () => import("@/pages/ViewItem"),
};

const alreadyPrefetched = new Set();

export function prefetchPage(pageName) {
  if (alreadyPrefetched.has(pageName)) return;
  const load = prefetchers[pageName];
  if (!load) return;
  alreadyPrefetched.add(pageName);
  load().catch(() => alreadyPrefetched.delete(pageName));
}

export const PrefetchLink = React.forwardRef(function PrefetchLink(
  { page, onMouseEnter, onFocus, ...props },
  ref
) {
  const handlePrefetch = useCallback(() => prefetchPage(page), [page]);

  return (
    <Link
      ref={ref}
      {...props}
      onMouseEnter={(e) => {
        handlePrefetch();
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        handlePrefetch();
        onFocus?.(e);
      }}
    />
  );
});
