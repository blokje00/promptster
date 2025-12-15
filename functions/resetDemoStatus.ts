import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * ADMIN ONLY: Reset demo status for all users
 * This allows all users to receive fresh demo data on next login
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin check
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    console.log('[resetDemoStatus] Admin user:', user.email, 'resetting all demo statuses');

    // Get all users
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    let resetCount = 0;
    const errors = [];

    // Reset demo_seeded_at for all users
    for (const u of allUsers) {
      try {
        // Only update if demo_seeded_at is set
        if (u.demo_seeded_at || u.demo_seed_version) {
          await base44.asServiceRole.entities.User.update(u.id, {
            demo_seeded_at: null,
            demo_seed_version: null
          });
          resetCount++;
          console.log(`[resetDemoStatus] Reset demo status for user: ${u.email}`);
        }
      } catch (error) {
        errors.push({ user: u.email, error: error.message });
        console.error(`[resetDemoStatus] Failed to reset user ${u.email}:`, error);
      }
    }

    return Response.json({
      status: 'success',
      message: 'Demo status reset completed',
      total_users: allUsers.length,
      reset_count: resetCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('[resetDemoStatus] Error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});