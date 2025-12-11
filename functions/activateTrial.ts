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

    // Check if user already has trial or subscription
    if (user.subscription_status === 'trial') {
      return Response.json({ 
        error: 'Trial already active',
        trial_end: user.trial_end 
      }, { status: 400 });
    }

    if (user.subscription_status === 'active') {
      return Response.json({ 
        error: 'Already subscribed',
        plan_id: user.plan_id 
      }, { status: 400 });
    }

    if (user.subscription_status === 'expired') {
      return Response.json({ 
        error: 'Trial already used',
        message: 'Please subscribe to continue using Promptster'
      }, { status: 400 });
    }

    // Activate trial
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days from now

    await base44.auth.updateMe({
      subscription_status: 'trial',
      trial_start: now.toISOString(),
      trial_end: trialEnd.toISOString()
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