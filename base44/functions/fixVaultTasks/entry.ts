import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all items (assuming less than limit, or default limit is high enough)
        // Base44 SDK list/filter usually has a limit (default 50 or 100).
        // We should try to fetch a reasonable amount, e.g. 100 most recent.
        const items = await base44.entities.Item.filter({}, "-created_date", 100);
        
        let updatedCount = 0;
        const errors = [];

        for (const item of items) {
            if (!item.task_checks || !Array.isArray(item.task_checks) || item.task_checks.length === 0) {
                // No checks, but maybe check status
                if (item.status === 'open') {
                     // If no checks, maybe it should be success? Or leave it.
                     // User said "openstaande te controleren taken", implying checklist items.
                     // But also "vault badge to 0".
                     // If item is open but has no tasks, does it count?
                     // The header counts "if (!check.status || check.status === 'open')".
                     // If no task_checks, count is 0.
                     continue;
                }
                continue;
            }

            let needsUpdate = false;
            const newTaskChecks = item.task_checks.map(check => {
                if (check.status !== 'success') {
                    needsUpdate = true;
                    return { ...check, status: 'success', is_checked: true };
                }
                return check;
            });

            // Also fix item status if it's open
            if (item.status !== 'success') {
                needsUpdate = true;
            }

            if (needsUpdate) {
                try {
                    await base44.entities.Item.update(item.id, {
                        task_checks: newTaskChecks,
                        status: 'success'
                    });
                    updatedCount++;
                } catch (e) {
                    errors.push({ id: item.id, error: e.message });
                }
            }
        }

        return Response.json({ 
            success: true, 
            message: `Updated ${updatedCount} items.`,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});