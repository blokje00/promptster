import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

/**
 * useUserEntities - Shared hook for the recurring "list current user's records
 * of entity X" query pattern. Centralizes cache keys, the enabled/email guard,
 * and the created_by filter that was previously copy-pasted across pages.
 *
 * @param {string} entityName - Base44 entity name, e.g. "Project", "Item"
 * @param {{queryKey?: string, sort?: string} & Record<string, any>} [config]
 *   queryKey: cache key prefix (defaults to entityName); sort: e.g. "-updated_date";
 *   any other properties are passed through as react-query options.
 *
 * Usage: const { data: projects = [] } = useUserEntities("Project", { queryKey: "projects" });
 */
export function useUserEntities(entityName, { queryKey, sort, ...options } = {}) {
  const { currentUser } = useAuth();
  const email = currentUser?.email;

  return useQuery({
    queryKey: [queryKey ?? entityName, email],
    queryFn: async () => {
      if (!email) return [];
      const result = sort
        ? await base44.entities[entityName].filter({ created_by: email }, sort)
        : await base44.entities[entityName].filter({ created_by: email });
      return result || [];
    },
    enabled: !!email,
    ...options,
  });
}
