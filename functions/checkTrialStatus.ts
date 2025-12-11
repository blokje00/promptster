import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Checks and repairs trial status for a user
 * Ensures data consistency between subscription_status, trial_start, trial_end
 */
Deno.serve(async (req) => {
  try {
    // CORS handling
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // Authenticate user
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    let needsUpdate = false;
    const updates = {};

    // Case 1: subscription_status is "trial" but trial_start or trial_end missing
    if (user.subscription_status === 'trial' && (!user.trial_start || !user.trial_end)) {
      console.log(`[checkTrialStatus] User ${user.email}: trial status but missing dates, resetting to none`);
      updates.subscription_status = 'none';
      updates.trial_start = null;
      updates.trial_end = null;
      needsUpdate = true;
    }
    
    // Case 2: trial_start/trial_end exist but subscription_status is not "trial" or "expired"
    else if ((user.trial_start || user.trial_end) && !['trial', 'expired'].includes(user.subscription_status)) {
      console.log(`[checkTrialStatus] User ${user.email}: has trial dates but wrong status, resetting to none`);
      updates.subscription_status = 'none';
      updates.trial_start = null;
      updates.trial_end = null;
      needsUpdate = true;
    }
    
    // Case 3: trial has ended, update status to expired
    else if (user.subscription_status === 'trial' && user.trial_end && new Date(user.trial_end) < now) {
      console.log(`[checkTrialStatus] User ${user.email}: trial ended, marking as expired`);
      updates.subscription_status = 'expired';
      needsUpdate = true;
    }

    // Apply updates if needed
    if (needsUpdate) {
      await base44.auth.updateMe(updates);
      console.log(`[checkTrialStatus] User ${user.email}: status repaired`, updates);
      
      return Response.json({
        status: 'repaired',
        previous: {
          subscription_status: user.subscription_status,
          trial_start: user.trial_start,
          trial_end: user.trial_end
        },
        current: updates
      });
    }

    // No repair needed
    return Response.json({
      status: 'ok',
      subscription_status: user.subscription_status,
      trial_start: user.trial_start,
      trial_end: user.trial_end,
      is_trial_active: user.subscription_status === 'trial' && user.trial_end && new Date(user.trial_end) >= now
    });

  } catch (error) {
    console.error('[checkTrialStatus] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});