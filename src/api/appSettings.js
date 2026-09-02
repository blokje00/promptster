import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * AppSetting entity API (base44/entities/AppSetting.jsonc: public read, admin
 * create/update/delete). Global key/value config rows — not created_by-scoped
 * to the caller, so there is no per-user list key, only the "all settings"
 * list AdminSettings.jsx reads and writes.
 *
 * Cache key: `['appSettings']` — identical to the literal key AdminSettings.jsx
 * already uses, both as the list key and the invalidation prefix.
 */
export const keys = {
  all: ["appSettings"],
};

/** All settings rows (there is no per-user filtering for this entity). */
export async function listAll() {
  return base44.entities.AppSetting.list();
}

export async function create(data) {
  return base44.entities.AppSetting.create(data);
}

export async function update(id, data) {
  return base44.entities.AppSetting.update(id, data);
}

export function useList(queryOptions = {}) {
  return useQuery({
    queryKey: keys.all,
    queryFn: listAll,
    ...queryOptions,
  });
}
