import { withAuth, ok } from '../utils/http/entry.ts';

const THRESHOLD_DAYS = 30;
const DELETE_BATCH_SIZE = 20;

/** Run `fn` over `items` in batches of `batchSize`, awaiting each batch with Promise.all. */
async function runInBatches(items, batchSize, fn) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(fn));
        results.push(...batchResults);
    }
    return results;
}

Deno.serve(withAuth({ name: 'hardDeleteOldTasks' }, async ({ base44, user }) => {
    // Security: User can only clean THEIR OWN deleted tasks
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - THRESHOLD_DAYS);

    // 1. Find old soft-deleted thoughts FOR THIS USER ONLY
    const oldDeletedThoughts = await base44.entities.Thought.filter({
        created_by: user.email,
        is_deleted: true,
        deleted_at: { "$lt": thresholdDate.toISOString() }
    }, null, 1000); // Limit to 1000 to prevent timeout

    const hardDeleteErrors = [];

    // 2. Hard delete the thoughts, in batches instead of one at a time
    const deleteResults = await runInBatches(oldDeletedThoughts, DELETE_BATCH_SIZE, async (thought) => {
        try {
            await base44.entities.Thought.delete(thought.id);
            return { id: thought.id, ok: true };
        } catch (e) {
            hardDeleteErrors.push({ id: thought.id, error: e.message });
            return { id: thought.id, ok: false };
        }
    });
    const deletedIds = new Set(deleteResults.filter(r => r.ok).map(r => r.id));
    const hardDeletedCount = deletedIds.size;

    // 3. Cascade: Remove deleted thought IDs from Item.used_thoughts.
    // Single filter for the user's own items instead of one Item.filter
    // per deleted thought (was an N+1 for up to 1000 thoughts).
    let updatedItemsCount = 0;
    if (deletedIds.size > 0) {
        const userItems = await base44.entities.Item.filter({ created_by: user.email });
        const itemsToUpdate = userItems.filter(item =>
            (item.used_thoughts || []).some(id => deletedIds.has(id))
        );

        await runInBatches(itemsToUpdate, DELETE_BATCH_SIZE, async (item) => {
            const newUsedThoughts = (item.used_thoughts || []).filter(id => !deletedIds.has(id));
            await base44.entities.Item.update(item.id, { used_thoughts: newUsedThoughts });
            updatedItemsCount++;
        });
    }

    return ok({
        success: true,
        message: `Hard deleted ${hardDeletedCount} thoughts older than ${THRESHOLD_DAYS} days. Updated ${updatedItemsCount} related items.`,
        errors: hardDeleteErrors.length > 0 ? hardDeleteErrors : undefined
    });
}));