import { createEntityApi } from "@/api/createEntityApi";

/**
 * PromptTemplate entity API.
 *
 * Cache keys: `['templates']` (all), `['templates', email]` (list — identical
 * to useUserEntities("PromptTemplate", { queryKey: "templates" })),
 * `['template', id]` (one).
 *
 * Fields of note (base44/entities/PromptTemplate.jsonc): name, type
 * ("start" | "eind"), content, project_id (null = global template, shown
 * for every project — see TemplatesManager.jsx).
 */
const templateApi = createEntityApi("PromptTemplate", { keyBase: "templates", oneKeyBase: "template" });

export const keys = templateApi.keys;
export const listMine = templateApi.listMine;
export const get = templateApi.get;
export const create = templateApi.create;
export const update = templateApi.update;
export const remove = templateApi.remove;

export const useList = templateApi.useList;
export const useOne = templateApi.useOne;
export const useCreate = templateApi.useCreate;
export const useUpdate = templateApi.useUpdate;
export const useRemove = templateApi.useRemove;
