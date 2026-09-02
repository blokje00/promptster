import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * FeatureContentBlock entity API (base44/entities/FeatureContentBlock.jsonc:
 * public read, admin write). Admin-editable copy blocks for public marketing
 * pages — currently only page "features" (Features.jsx / InlineEditableText.jsx).
 *
 * Cache key: `['featureContentBlocks']` — identical to the literal key
 * Features.jsx / InlineEditableText.jsx already use, both as the query key
 * and the invalidation prefix. Not created_by-scoped: `updated_by` records
 * who last edited a block, it is not a read filter.
 */
export const keys = {
  all: ["featureContentBlocks"],
};

export async function listByPage(page) {
  return base44.entities.FeatureContentBlock.filter({ page });
}

async function findByKey(key, page) {
  const rows = await base44.entities.FeatureContentBlock.filter({ key, page });
  return Array.isArray(rows) ? rows[0] : undefined;
}

export async function create(data) {
  return base44.entities.FeatureContentBlock.create(data);
}

export async function update(id, data) {
  return base44.entities.FeatureContentBlock.update(id, data);
}

export function useByPage(page, queryOptions = {}) {
  const { enabled, ...rest } = queryOptions;
  return useQuery({
    queryKey: keys.all,
    queryFn: () => listByPage(page),
    enabled: enabled ?? !!page,
    ...rest,
  });
}

/**
 * Create-or-update one block by key+page — the exact upsert
 * InlineEditableText.jsx's saveMutation performs (look up the existing row,
 * update it, or create a new one if none exists yet).
 */
export function useSaveBlock(options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options;
  return useMutation({
    mutationFn: async ({ key, page, value, updated_by }) => {
      const existing = await findByKey(key, page);
      if (existing) {
        return update(existing.id, { value, updated_by });
      }
      return create({ key, page, value, updated_by });
    },
    onSuccess: (result, variables, context) => {
      queryClient.invalidateQueries({ queryKey: keys.all });
      onSuccess?.(result, variables, context);
    },
    ...rest,
  });
}
