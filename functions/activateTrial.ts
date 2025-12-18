import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Activates a 14-day free trial for the user
 * Only works if user has no active trial or subscription
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

    console.log('[activateTrial] User status check:', {
      email: user.email,
      subscription_status: user.subscription_status,
      trial_end: user.trial_end,
      trial_start: user.trial_start
    });

    // Check if user already has trial or subscription
    if (user.subscription_status === 'trialing') {
      const trialEnd = user.trial_end ? new Date(user.trial_end) : null;
      const now = new Date();
      
      // If trial_end is in the future, it's still active
      if (trialEnd && trialEnd > now) {
        return Response.json({ 
          error: 'Trial already active',
          trial_end: user.trial_end 
        }, { status: 400 });
      }
      
      // If trial_end is in the past, allow re-activation for testing
      console.log('[activateTrial] WARNING: Re-activating expired trial for testing');
    }

    if (user.subscription_status === 'active') {
      return Response.json({ 
        error: 'Already subscribed',
        plan_id: user.plan_id 
      }, { status: 400 });
    }

    // Note: Removed 'expired' check to allow re-testing
    // In production, you may want to keep this check

    // Parse request body to get planId
    const body = await req.json().catch(() => ({}));
    const planId = body.planId;

    if (!planId) {
      return Response.json({ error: 'planId is required' }, { status: 400 });
    }

    // Verify plan exists
    const plan = await base44.asServiceRole.entities.SubscriptionPlan.list();
    const selectedPlan = plan.find(p => p.id === planId);
    
    if (!selectedPlan) {
      return Response.json({ error: 'Invalid plan ID' }, { status: 400 });
    }

    // Activate trial with plan_id
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days from now

    await base44.auth.updateMe({
      subscription_status: 'trialing',
      trial_start: now.toISOString(),
      trial_end: trialEnd.toISOString(),
      plan_id: planId
    });

    console.log(`[activateTrial] Trial activated for ${user.email} until ${trialEnd.toISOString()}`);

    return Response.json({
      success: true,
      trial_start: now.toISOString(),
      trial_end: trialEnd.toISOString(),
      days_remaining: 14
    });

  } catch (error) {
    console.error('[activateTrial] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});