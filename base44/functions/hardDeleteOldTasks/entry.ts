import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Security: User can only clean THEIR OWN deleted tasks
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const THRESHOLD_DAYS = 30; 
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - THRESHOLD_DAYS);

        // 1. Find old soft-deleted thoughts FOR THIS USER ONLY
        const oldDeletedThoughts = await base44.entities.Thought.filter({
            created_by: user.email,
            is_deleted: true,
            deleted_at: { "$lt": thresholdDate.toISOString() }
        }, null, 1000); // Limit to 1000 to prevent timeout

        let hardDeletedCount = 0;
        const hardDeleteErrors = [];
        let updatedItemsCount = 0;

        for (const thought of oldDeletedThoughts) {
            try {
                // 2. Hard delete the thought
                await base44.entities.Thought.delete(thought.id);
                hardDeletedCount++;

                // 3. Cascade: Remove thought ID from Item.used_thoughts
                // Find items that have this thought ID
                const itemsUsingThought = await base44.entities.Item.filter({
                    used_thoughts: { "$in": [thought.id] } 
                });

                for (const item of itemsUsingThought) {
                    // Remove the ID
                    const newUsedThoughts = (item.used_thoughts || []).filter(id => id !== thought.id);
                    
                    // Only update if changed
                    if (newUsedThoughts.length !== (item.used_thoughts || []).length) {
                        await base44.entities.Item.update(item.id, { used_thoughts: newUsedThoughts });
                        updatedItemsCount++;
                    }
                }

            } catch (e) {
                hardDeleteErrors.push({ id: thought.id, error: e.message });
            }
        }

        return Response.json({
            success: true,
            message: `Hard deleted ${hardDeletedCount} thoughts older than ${THRESHOLD_DAYS} days. Updated ${updatedItemsCount} related items.`,
            errors: hardDeleteErrors.length > 0 ? hardDeleteErrors : undefined
        });

    } catch (error) {
        console.error("Hard delete cleanup failed:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});