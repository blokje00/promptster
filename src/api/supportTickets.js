import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createEntityApi } from "@/api/createEntityApi";

/**
 * SupportTicket entity API. RLS lets a user read their own tickets, and lets
 * an admin read/update/delete ALL tickets (see base44/entities/SupportTicket.jsonc).
 * AdminSupportTickets.jsx therefore does not filter by created_by — it lists
 * every ticket — so this module exposes `useAll` alongside the standard
 * user-scoped `useList` for completeness.
 *
 * Cache keys: `['supportTickets']` — used both as the "all tickets" key
 * (identical to AdminSupportTickets.jsx's `['supportTickets']`) and as the
 * invalidation prefix; `['supportTickets', email]` (user-scoped list, if ever
 * needed); `['supportTicket', id]` (one).
 *
 * Fields of note (base44/entities/SupportTicket.jsonc): category
 * ("bug" | "payment" | "feature" | "other"), subject, message, user_email,
 * user_name, status ("open" | "in_progress" | "resolved" | "closed").
 */
const supportTicketApi = createEntityApi("SupportTicket", {
  keyBase: "supportTickets",
  oneKeyBase: "supportTicket",
});

export const keys = supportTicketApi.keys;
export const listMine = supportTicketApi.listMine;
export const get = supportTicketApi.get;
export const create = supportTicketApi.create;
export const update = supportTicketApi.update;
export const remove = supportTicketApi.remove;

export const useOne = supportTicketApi.useOne;
export const useList = supportTicketApi.useList;
export const useCreate = supportTicketApi.useCreate;
export const useUpdate = supportTicketApi.useUpdate;
export const useRemove = supportTicketApi.useRemove;

/** All tickets (admin only, enforced server-side by RLS) — AdminSupportTickets.jsx. */
export async function listAll(sort = "-created_date") {
  return base44.entities.SupportTicket.list(sort);
}

export function useAll(sort = "-created_date", queryOptions = {}) {
  const { enabled, ...rest } = queryOptions;
  return useQuery({
    queryKey: ["supportTickets"],
    queryFn: () => listAll(sort),
    enabled: enabled ?? true,
    ...rest,
  });
}
