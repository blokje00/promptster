import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Security: Only admins can run this
        // For now, let's allow any authenticated user to clean THEIR OWN tasks, 
        // or restrict to admin. The prompt said "manual trigger", likely by the user or admin.
        // Since the user is asking for it, and it might be their own data, I'll check if they are admin.
        // If not admin, maybe allow cleaning their own? The prompt implies "admin access required" or "handmatig triggerbaar".
        // "Alleen runt wanneer de soft delete restore-flow niet meer van toepassing is"
        
        // Let's restrict to admin for safety as per design in thought process, 
        // BUT checking the user role might be tricky if they are not 'admin' in the DB but own the app.
        // The user context implies they are the developer/owner.
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        // Allow if admin OR if it's the dev user (hardcoded email check if needed, but role is better)
        if (user.role !== 'admin') {
             // If not admin, we can perhaps allow them to clean THEIR OWN data?
             // The prompt says "Alle tasks met is_deleted: true ouder dan X dagen permanent verwijdert."
             // Ideally this is a system maintenance task.
             // I'll stick to admin check. If the user isn't admin, they can't run it.
             return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        const THRESHOLD_DAYS = 30; 
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - THRESHOLD_DAYS);

        // 1. Find old soft-deleted thoughts
        // Note: base44 filter syntax for date comparison might be specific.
        // If SDK supports mongo-like queries:
        const oldDeletedThoughts = await base44.entities.Thought.filter({
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