import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { createEntityApi } from "@/api/createEntityApi";

/**
 * Item entity API (the Vault / Checks records).
 *
 * Cache keys: `['items']` (all — prefix), `['items', email]` (list, identical
 * to useUserEntities("Item", { queryKey: "items" })), `['item', id]` (one —
 * matches the literal key used by EditItem.jsx / ViewItem.jsx / TaskChecklist.jsx).
 *
 * Fields of note (base44/entities/Item.jsonc): title, type, content, status
 * ("open" | "success"), task_checks (array of { task_name, full_description,
 * status, is_checked, screenshot_ids, created_date, updated_date }),
 * is_favorite, is_publish_version, is_pending_check, screenshot_ids, zip_files,
 * project_id.
 */
const itemApi = createEntityApi("Item", { keyBase: "items", oneKeyBase: "item", defaultSort: "-updated_date" });

export const keys = itemApi.keys;
export const listMine = itemApi.listMine;
export const get = itemApi.get;
export const create = itemApi.create;
export const update = itemApi.update;
export const remove = itemApi.remove;

export const useList = itemApi.useList;
export const useOne = itemApi.useOne;
export const useCreate = itemApi.useCreate;
export const useUpdate = itemApi.useUpdate;
export const useRemove = itemApi.useRemove;

/**
 * The `limit` most recent items for `email`, sorted by created_date
 * descending. Query helper for src/lib/maintenance.js (client-side port of
 * fixVaultTasks/entry.ts, which fetched `Item.filter({}, "-created_date", 100)`).
 */
export async function listMineRecent(email, limit = 100) {
  if (!email) return [];
  const result = await base44.entities.Item.filter({ created_by: email }, "-created_date", limit);
  return Array.isArray(result) ? result : (result?.data ?? []);
}

/**
 * Count of open task_checks across all of the current user's items — the
 * number shown as the Header "Checks" badge (see Header.jsx openTasksCount).
 * A check counts as open when it has no status or status === "open".
 */
export function useOpenChecksCount(queryOptions = {}) {
  const { currentUser } = useAuth();
  const email = currentUser?.email;

  return useQuery({
    queryKey: ["openTasksCount", email],
    queryFn: async () => {
      if (!email) return [];
      return base44.entities.Item.filter({ created_by: email });
    },
    select: (items) => {
      let count = 0;
      (items || []).forEach((item) => {
        if (Array.isArray(item.task_checks)) {
          item.task_checks.forEach((check) => {
            if (!check.status || check.status === "open") count++;
          });
        }
      });
      return count;
    },
    enabled: !!email,
    ...queryOptions,
  });
}
