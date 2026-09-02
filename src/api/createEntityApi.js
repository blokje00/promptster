import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

/**
 * createEntityApi - factory for the recurring "user-scoped Base44 entity"
 * pattern: plain async functions (usable outside React, e.g. in another
 * mutation's mutationFn) plus TanStack Query hooks that share the exact
 * same cache keys the app already uses (see src/components/hooks/useUserEntities.jsx).
 *
 * Cache keys
 * ----------
 * - `keys.all`      = [keyBase]                 — prefix used to invalidate every
 *                                                  query for this entity at once.
 * - `keys.list(email, filters)` = [keyBase, email] when `filters` is empty,
 *   or [keyBase, email, filters] otherwise. The no-filters shape is IDENTICAL
 *   to useUserEntities's key (`[queryKey ?? entityName, email]`), so a page
 *   still on useUserEntities and a page migrated to this API read/write the
 *   SAME cache entry — no double-fetching during the migration.
 * - `keys.one(id)`  = [oneKeyBase, id]           — oneKeyBase defaults to
 *   keyBase but can be overridden (e.g. Item uses keyBase "items" and
 *   oneKeyBase "item" to match the existing ['item', id] key used by
 *   EditItem.jsx / ViewItem.jsx / TaskChecklist.jsx).
 *
 * Plain functions vs hooks
 * -------------------------
 * Use the plain functions (`listMine`, `get`, `create`, `update`, `remove`)
 * from non-component code: other mutations, backend-adjacent helpers, tests.
 * Use the hooks (`useList`, `useOne`, `useCreate`, `useUpdate`, `useRemove`)
 * from components — they wire up cache keys and invalidation automatically.
 *
 * @param {string} entityName - Base44 entity name, e.g. "Project", "Item".
 * @param {{keyBase?: string, oneKeyBase?: string, defaultSort?: string}} [config]
 */
export function createEntityApi(entityName, config = {}) {
  const { keyBase, oneKeyBase, defaultSort } = config;
  const listBase = keyBase || entityName;
  const singleBase = oneKeyBase || listBase;

  const keys = {
    all: [listBase],
    list: (email, filters) =>
      filters && Object.keys(filters).length > 0
        ? [listBase, email, filters]
        : [listBase, email],
    one: (id) => [singleBase, id],
  };

  /**
   * Fetch the current user's records. Adds `created_by: email` to the
   * filters, tolerates both an array response and Base44's `{ data }`
   * envelope. Unlike useUserEntities, a sort error is NOT silently retried
   * without sort — it surfaces to the caller.
   */
  async function listMine(email, { filters = {}, sort } = {}) {
    if (!email) return [];
    const query = { ...filters, created_by: email };
    const result = sort
      ? await base44.entities[entityName].filter(query, sort)
      : await base44.entities[entityName].filter(query);
    return Array.isArray(result) ? result : (result?.data ?? []);
  }

  async function get(id) {
    return base44.entities[entityName].get(id);
  }

  async function create(data) {
    return base44.entities[entityName].create(data);
  }

  async function update(id, data) {
    return base44.entities[entityName].update(id, data);
  }

  async function remove(id) {
    return base44.entities[entityName].delete(id);
  }

  function useList({ filters = {}, sort = defaultSort, enabled, ...queryOptions } = {}) {
    const { currentUser } = useAuth();
    const email = currentUser?.email;

    return useQuery({
      queryKey: keys.list(email, filters),
      queryFn: () => listMine(email, { filters, sort }),
      enabled: enabled ?? !!email,
      ...queryOptions,
    });
  }

  function useOne(id, queryOptions = {}) {
    const { enabled, ...rest } = queryOptions;
    return useQuery({
      queryKey: keys.one(id),
      queryFn: () => get(id),
      enabled: (enabled ?? true) && !!id,
      ...rest,
    });
  }

  function useCreate(options = {}) {
    const queryClient = useQueryClient();
    const { onSuccess, ...rest } = options;
    return useMutation({
      mutationFn: (data) => create(data),
      onSuccess: (result, variables, context) => {
        queryClient.invalidateQueries({ queryKey: keys.all });
        onSuccess?.(result, variables, context);
      },
      ...rest,
    });
  }

  function useUpdate(options = {}) {
    const queryClient = useQueryClient();
    const { onSuccess, ...rest } = options;
    return useMutation({
      mutationFn: ({ id, data }) => update(id, data),
      onSuccess: (result, variables, context) => {
        queryClient.invalidateQueries({ queryKey: keys.all });
        if (variables?.id) {
          queryClient.invalidateQueries({ queryKey: keys.one(variables.id) });
        }
        onSuccess?.(result, variables, context);
      },
      ...rest,
    });
  }

  function useRemove(options = {}) {
    const queryClient = useQueryClient();
    const { onSuccess, ...rest } = options;
    return useMutation({
      mutationFn: (id) => remove(id),
      onSuccess: (result, id, context) => {
        queryClient.invalidateQueries({ queryKey: keys.all });
        queryClient.invalidateQueries({ queryKey: keys.one(id) });
        onSuccess?.(result, id, context);
      },
      ...rest,
    });
  }

  return {
    entityName,
    keys,
    listMine,
    get,
    create,
    update,
    remove,
    useList,
    useOne,
    useCreate,
    useUpdate,
    useRemove,
  };
}
