import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Admin function to reset a user's trial status
 * Useful for testing or when a user was deleted and re-registered
 */
Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can reset trials
    if (currentUser.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userEmail } = await req.json();

    if (!userEmail) {
      return Response.json({ error: 'userEmail required' }, { status: 400 });
    }

    // Find user by email
    const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
    
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];

    // Reset trial fields
    await base44.asServiceRole.entities.User.update(targetUser.id, {
      subscription_status: null,
      trial_start: null,
      trial_end: null,
      plan_id: null,
      stripe_customer_id: null,
      stripe_subscription_id: null
    });

    console.log(`[resetUserTrial] Reset trial for ${userEmail} (${targetUser.id})`);

    return Response.json({
      success: true,
      message: `Trial reset for ${userEmail}`,
      userId: targetUser.id,
      resetFields: ['subscription_status', 'trial_start', 'trial_end', 'plan_id', 'stripe_customer_id', 'stripe_subscription_id']
    });

  } catch (error) {
    console.error('[resetUserTrial] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});