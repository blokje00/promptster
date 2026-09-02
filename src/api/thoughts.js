import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { createEntityApi } from "@/api/createEntityApi";

/**
 * Thought entity API (soft-delete only — there is no hard delete here on
 * purpose, see RecycleBin.jsx / useDeleteProject.jsx which are the reference
 * implementations this module mirrors).
 *
 * Cache keys — kept identical to what the app already uses so this API and
 * the not-yet-migrated pages/hooks share cache entries:
 *   - `['activeThoughts', email]`  — non-deleted thoughts for the current user
 *     (see useMultipromptState.jsx, Header.jsx).
 *   - `['deletedThoughts', email]` — soft-deleted thoughts (see RecycleBin.jsx).
 *   - `['allThoughtsCount']` and `['thoughts']` — legacy keys other code still
 *     invalidates alongside activeThoughts/deletedThoughts; softDelete/restore
 *     invalidate them too so old and new call sites stay in sync.
 *   - `['thought', id]` — single record.
 *
 * Fields of note (base44/entities/Thought.jsonc): content, project_id,
 * is_deleted, deleted_at, is_selected, focus_type, screenshot_ids,
 * vision_analysis, retry_from_item_id.
 */
const thoughtApi = createEntityApi("Thought", { keyBase: "activeThoughts", oneKeyBase: "thought" });

export const keys = {
  ...thoughtApi.keys,
  deleted: (email) => ["deletedThoughts", email],
};

export const get = thoughtApi.get;
export const create = thoughtApi.create;
export const update = thoughtApi.update;
/** All of the current user's thoughts regardless of is_deleted (used by exportUserData-style client-side exports). */
export const listMine = thoughtApi.listMine;

/** Active (non-deleted) thoughts for `email`, sorted newest first. */
export async function listActive(email) {
  if (!email) return [];
  const result = await base44.entities.Thought.filter(
    { created_by: email, is_deleted: false },
    "-created_date"
  );
  return Array.isArray(result) ? result : (result?.data ?? []);
}

/** Soft-deleted thoughts (recycle bin), sorted most-recently-deleted first. */
export async function listDeleted() {
  const result = await base44.entities.Thought.filter({ is_deleted: true }, "-deleted_at");
  return Array.isArray(result) ? result : (result?.data ?? []);
}

/** Soft-delete: sets is_deleted/deleted_at exactly as RecycleBin.jsx / useDeleteProject.jsx do. */
export async function softDelete(id) {
  return base44.entities.Thought.update(id, {
    is_deleted: true,
    deleted_at: new Date().toISOString(),
  });
}

/** Restore from the recycle bin: clears is_deleted/deleted_at as RecycleBin.jsx does. */
export async function restore(id) {
  return base44.entities.Thought.update(id, {
    is_deleted: false,
    deleted_at: null,
  });
}

/** Permanent delete — only used from the recycle bin (RecycleBin.jsx). */
export async function remove(id) {
  return base44.entities.Thought.delete(id);
}

/** Exported so callers with hand-rolled mutations (outside this module's hooks) can invalidate the same cache set. */
export function invalidateThoughtCaches(queryClient) {
  queryClient.invalidateQueries({ queryKey: ["activeThoughts"] });
  queryClient.invalidateQueries({ queryKey: ["deletedThoughts"] });
  queryClient.invalidateQueries({ queryKey: ["allThoughtsCount"] });
  queryClient.invalidateQueries({ queryKey: ["thoughts"] });
}

export function useActiveThoughts(queryOptions = {}) {
  const { currentUser } = useAuth();
  const email = currentUser?.email;
  return useQuery({
    queryKey: thoughtApi.keys.list(email),
    queryFn: () => listActive(email),
    enabled: !!email,
    ...queryOptions,
  });
}

export function useDeletedThoughts(queryOptions = {}) {
  const { currentUser } = useAuth();
  const email = currentUser?.email;
  return useQuery({
    queryKey: keys.deleted(email),
    queryFn: listDeleted,
    enabled: !!email,
    ...queryOptions,
  });
}

export function useCreate(options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options;
  return useMutation({
    mutationFn: (data) => create(data),
    onSuccess: (result, variables, context) => {
      invalidateThoughtCaches(queryClient);
      onSuccess?.(result, variables, context);
    },
    ...rest,
  });
}

export function useUpdate(options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options;
  return useMutation({
    mutationFn: ({ id, data }) => update(id, data),
    onSuccess: (result, variables, context) => {
      invalidateThoughtCaches(queryClient);
      onSuccess?.(result, variables, context);
    },
    ...rest,
  });
}

export function useSoftDelete(options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options;
  return useMutation({
    mutationFn: (id) => softDelete(id),
    onSuccess: (result, id, context) => {
      invalidateThoughtCaches(queryClient);
      onSuccess?.(result, id, context);
    },
    ...rest,
  });
}

export function useRestore(options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options;
  return useMutation({
    mutationFn: (id) => restore(id),
    onSuccess: (result, id, context) => {
      invalidateThoughtCaches(queryClient);
      onSuccess?.(result, id, context);
    },
    ...rest,
  });
}

export function useRemove(options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options;
  return useMutation({
    mutationFn: (id) => remove(id),
    onSuccess: (result, id, context) => {
      invalidateThoughtCaches(queryClient);
      onSuccess?.(result, id, context);
    },
    ...rest,
  });
}
