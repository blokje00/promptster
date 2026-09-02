import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * PageView entity API (base44/entities/PageView.jsonc). Page views are
 * written by PageViewTracker.jsx via create() below. AdminAnalytics.jsx lists up to 1000 recent rows
 * across all users (RLS restricts non-admin reads to the caller's own rows;
 * the admin role bypasses that, same as today).
 *
 * Cache key: `['pageViews']` — identical to the literal key AdminAnalytics.jsx
 * already uses.
 */
export const keys = {
  all: ["pageViews"],
};

export async function listAll(sort = "-created_date", limit = 1000) {
  return base44.entities.PageView.list(sort, limit);
}

export function useList({ sort = "-created_date", limit = 1000, enabled, ...queryOptions } = {}) {
  return useQuery({
    queryKey: keys.all,
    queryFn: () => listAll(sort, limit),
    enabled: enabled ?? true,
    ...queryOptions,
  });
}

/** Record one page view (RLS: create is open to any caller). */
export async function create(data) {
  return base44.entities.PageView.create(data);
}
