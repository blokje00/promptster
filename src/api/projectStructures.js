import { createEntityApi } from "@/api/createEntityApi";

/**
 * ProjectStructure entity API (the UPSE "auto-parsed project structure" data,
 * one row per project — see AIBackoffice.jsx / UPSEPanel).
 *
 * Cache keys: `['projectStructures']` (all), `['projectStructures', email]`
 * (list — identical to useUserEntities("ProjectStructure", { queryKey:
 * "projectStructures" })), `['projectStructure', id]` (one).
 */
const projectStructureApi = createEntityApi("ProjectStructure", {
  keyBase: "projectStructures",
  oneKeyBase: "projectStructure",
});

export const keys = projectStructureApi.keys;
export const listMine = projectStructureApi.listMine;
export const get = projectStructureApi.get;
export const create = projectStructureApi.create;
export const update = projectStructureApi.update;
export const remove = projectStructureApi.remove;

export const useList = projectStructureApi.useList;
export const useOne = projectStructureApi.useOne;
export const useCreate = projectStructureApi.useCreate;
export const useUpdate = projectStructureApi.useUpdate;
export const useRemove = projectStructureApi.useRemove;

/**
 * Find the current user's structure row for one project. Structures are
 * fetched as a full list (useList) and matched client-side because there is
 * one row per project_id, not a dedicated per-project query key today.
 */
export function findByProjectId(structures, projectId) {
  return (structures || []).find((s) => s.project_id === projectId);
}
