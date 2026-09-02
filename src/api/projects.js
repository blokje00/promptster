import { createEntityApi } from "@/api/createEntityApi";

/**
 * Project entity API.
 *
 * Cache keys: `['projects']` (all), `['projects', email]` (list — identical
 * to useUserEntities("Project", { queryKey: "projects" })), `['project', id]` (one).
 *
 * Fields of note (see base44/entities/Project.jsonc): name, color, description,
 * technical_config_markdown, llm_response_parser_instruction, component_mapping,
 * domains, local_code_path, ai_tool, target_model, push_log, github_repo.
 *
 * This module only wraps plain CRUD. Deleting a project also needs to cascade
 * to its Thoughts/PromptTemplates/ProjectStructures — that cascade already
 * lives in src/components/hooks/useDeleteProject.jsx and is out of scope for
 * this create-new-files pass; callers doing a full project delete should keep
 * using that hook (or a future helper built on top of projects/thoughts/templates/projectStructures).
 */
const projectApi = createEntityApi("Project", { keyBase: "projects", oneKeyBase: "project" });

export const keys = projectApi.keys;
export const listMine = projectApi.listMine;
export const get = projectApi.get;
export const create = projectApi.create;
export const update = projectApi.update;
export const remove = projectApi.remove;

export const useList = projectApi.useList;
export const useOne = projectApi.useOne;
export const useCreate = projectApi.useCreate;
export const useUpdate = projectApi.useUpdate;
export const useRemove = projectApi.useRemove;
