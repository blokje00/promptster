import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Activates a 14-day free trial for a new user
 * Called automatically on first login if subscription_status is 'none'
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.warn('[activateTrial] Unauthorized access attempt');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[activateTrial] Attempting to activate trial for user ${user.id} (${user.email}), current status: ${user.subscription_status}`);

    // Only activate trial if user has no subscription status or status is 'none'
    if (user.subscription_status && user.subscription_status !== 'none') {
      console.log(`[activateTrial] User ${user.id} already has status: ${user.subscription_status}`);
      return Response.json({ 
        success: false, 
        message: 'User already has a subscription status',
        currentStatus: user.subscription_status 
      });
    }

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days from now

    console.log(`[activateTrial] Setting trial for user ${user.id}: start=${now.toISOString()}, end=${trialEnd.toISOString()}`);

    // Update user with trial information
    await base44.asServiceRole.entities.User.update(user.id, {
      subscription_status: 'trial',
      trial_start: now.toISOString(),
      trial_end: trialEnd.toISOString()
    });

    console.log(`[activateTrial] ✓ Trial activated successfully for user ${user.id}`);

    return Response.json({ 
      success: true, 
      subscription_status: 'trial',
      trial_start: now.toISOString(),
      trial_end: trialEnd.toISOString(),
      message: '14-day free trial activated'
    });

  } catch (error) {
    console.error(`[activateTrial] ERROR for user ${user?.id}:`, error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});