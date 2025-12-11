import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Checks and updates trial status if expired
 * Returns current access level for the user
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.warn('[checkTrialStatus] Unauthorized access attempt');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[checkTrialStatus] User ${user.id} (${user.email}): status=${user.subscription_status}, trial_end=${user.trial_end}`);

    // If user is on active paid plan, return immediately
    if (user.subscription_status === 'active') {
      console.log(`[checkTrialStatus] User ${user.id} has active subscription`);
      return Response.json({ 
        subscription_status: 'active',
        hasAccess: true,
        isTrialActive: false
      });
    }

    // If user is on trial, validate trial data
    if (user.subscription_status === 'trial') {
      // Check if trial data is corrupt/missing
      if (!user.trial_end || !user.trial_start) {
        console.warn(`[checkTrialStatus] User ${user.id} has 'trial' status but missing trial_start/end. Resetting to 'none'.`);
        await base44.asServiceRole.entities.User.update(user.id, {
          subscription_status: 'none',
          trial_start: null,
          trial_end: null
        });
        return Response.json({ 
          subscription_status: 'none',
          hasAccess: false,
          needsTrialActivation: true,
          message: 'Trial data was corrupt, please reactivate'
        });
      }
      const now = new Date();
      const trialEnd = new Date(user.trial_end);

      if (now > trialEnd) {
        console.log(`[checkTrialStatus] User ${user.id} trial expired at ${user.trial_end}. Updating to trial_expired.`);
        await base44.asServiceRole.entities.User.update(user.id, {
          subscription_status: 'trial_expired'
        });

        return Response.json({ 
          subscription_status: 'trial_expired',
          hasAccess: false,
          isTrialActive: false,
          trial_end: user.trial_end
        });
      }

      // Trial is still active
      const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
      console.log(`[checkTrialStatus] User ${user.id} has ${daysRemaining} days remaining in trial`);
      return Response.json({ 
        subscription_status: 'trial',
        hasAccess: true,
        isTrialActive: true,
        trial_end: user.trial_end,
        daysRemaining
      });
    }

    // User has trial_expired or no subscription
    if (user.subscription_status === 'trial_expired') {
      console.log(`[checkTrialStatus] User ${user.id} trial is expired`);
      return Response.json({ 
        subscription_status: 'trial_expired',
        hasAccess: false,
        isTrialActive: false
      });
    }

    // User has 'none' or undefined status - needs trial activation
    console.log(`[checkTrialStatus] User ${user.id} needs trial activation (status: ${user.subscription_status || 'none'})`);
    return Response.json({ 
      subscription_status: user.subscription_status || 'none',
      hasAccess: false,
      needsTrialActivation: true
    });

  } catch (error) {
    console.error(`[checkTrialStatus] Error for user ${user?.id}:`, error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});