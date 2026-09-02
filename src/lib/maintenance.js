import { me } from "@/api/auth";
import * as items from "@/api/items";
import * as thoughts from "@/api/thoughts";

/**
 * Client-side port of base44/functions/fixVaultTasks/entry.ts and
 * base44/functions/hardDeleteOldTasks/entry.ts.
 *
 * Both backend functions ran under `withAuth` with a CALLER-SCOPED client
 * (no `asServiceRole`) — RLS (`created_by === current user`) already limited
 * every read/write to the signed-in user's own rows. Porting them to the
 * browser changes nothing about whose data they touch; there is no
 * service-role step to approximate here.
 *
 * Both keep the original's batched-Promise.all-in-groups-of-20 shape and
 * return the same `{ success, message, errors }` result object the backend
 * did, so MaintenanceTools.jsx (src/components/settings/MaintenanceTools.jsx)
 * needs no changes.
 */

const BATCH_SIZE = 20;
const THRESHOLD_DAYS = 30;

/** Run `fn` over `list` in batches of `batchSize`, awaiting each batch with Promise.all. */
async function runInBatches(list, batchSize, fn) {
  const results = [];
  for (let i = 0; i < list.length; i += batchSize) {
    const batch = list.slice(i, i + batchSize);
    results.push(...(await Promise.all(batch.map(fn))));
  }
  return results;
}

/**
 * Marks every task_check on the current user's 100 most recent Items as
 * "success" and flips the item's own status to "success" too — the same fix
 * fixVaultTasks/entry.ts applied (used once to clear a stuck Vault badge).
 */
export async function fixVaultTasks() {
  const user = await me();
  if (!user) return { success: false, error: "Not signed in" };

  const userItems = await items.listMineRecent(user.email, 100);

  let updatedCount = 0;
  const errors = [];

  await runInBatches(userItems, BATCH_SIZE, async (item) => {
    if (!item.task_checks || !Array.isArray(item.task_checks) || item.task_checks.length === 0) {
      return;
    }

    let needsUpdate = false;
    const newTaskChecks = item.task_checks.map((check) => {
      if (check.status !== "success") {
        needsUpdate = true;
        return { ...check, status: "success", is_checked: true };
      }
      return check;
    });

    if (item.status !== "success") {
      needsUpdate = true;
    }

    if (needsUpdate) {
      try {
        await items.update(item.id, { task_checks: newTaskChecks, status: "success" });
        updatedCount++;
      } catch (e) {
        errors.push({ id: item.id, error: e.message });
      }
    }
  });

  return {
    success: true,
    message: `Updated ${updatedCount} items.`,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Hard-deletes the current user's soft-deleted Thoughts older than 30 days,
 * then strips their ids out of every Item.used_thoughts that referenced them
 * — the same cascade hardDeleteOldTasks/entry.ts ran.
 */
export async function hardDeleteOldTasks() {
  const user = await me();
  if (!user) return { success: false, error: "Not signed in" };

  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - THRESHOLD_DAYS);

  const oldDeletedThoughts = await thoughts.listDeletedOlderThan(user.email, thresholdDate);

  const hardDeleteErrors = [];
  const deleteResults = await runInBatches(oldDeletedThoughts, BATCH_SIZE, async (thought) => {
    try {
      await thoughts.remove(thought.id);
      return { id: thought.id, ok: true };
    } catch (e) {
      hardDeleteErrors.push({ id: thought.id, error: e.message });
      return { id: thought.id, ok: false };
    }
  });
  const deletedIds = new Set(deleteResults.filter((r) => r.ok).map((r) => r.id));
  const hardDeletedCount = deletedIds.size;

  let updatedItemsCount = 0;
  if (deletedIds.size > 0) {
    const userItems = await items.listMine(user.email);
    const itemsToUpdate = userItems.filter((item) =>
      (item.used_thoughts || []).some((id) => deletedIds.has(id))
    );

    await runInBatches(itemsToUpdate, BATCH_SIZE, async (item) => {
      const newUsedThoughts = (item.used_thoughts || []).filter((id) => !deletedIds.has(id));
      await items.update(item.id, { used_thoughts: newUsedThoughts });
      updatedItemsCount++;
    });
  }

  return {
    success: true,
    message: `Hard deleted ${hardDeletedCount} thoughts older than ${THRESHOLD_DAYS} days. Updated ${updatedItemsCount} related items.`,
    errors: hardDeleteErrors.length > 0 ? hardDeleteErrors : undefined,
  };
}
