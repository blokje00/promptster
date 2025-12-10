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
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // If user is on active paid plan, return immediately
    if (user.subscription_status === 'active') {
      return Response.json({ 
        subscription_status: 'active',
        hasAccess: true,
        isTrialActive: false
      });
    }

    // If user is on trial, check if expired
    if (user.subscription_status === 'trial' && user.trial_end) {
      const now = new Date();
      const trialEnd = new Date(user.trial_end);

      if (now > trialEnd) {
        // Trial has expired, update status
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
      return Response.json({ 
        subscription_status: 'trial_expired',
        hasAccess: false,
        isTrialActive: false
      });
    }

    // User has 'none' or undefined status - needs trial activation
    return Response.json({ 
      subscription_status: user.subscription_status || 'none',
      hasAccess: false,
      needsTrialActivation: true
    });

  } catch (error) {
    console.error("Check trial status error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});