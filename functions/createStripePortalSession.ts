import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

/**
 * T-3: Creates a Stripe Customer Portal session for subscription management
 * @param {Request} req - Expects { userId? } in body (optional, defaults to authenticated user)
 * @returns {Response} - { url: string } portal URL
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await req.json().catch(() => ({}));
    const targetUserId = userId || currentUser.id;

    // Fetch user via service role (in case admin wants to check other user)
    const user = await base44.asServiceRole.entities.User.filter({ id: targetUserId });
    
    if (!user || user.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = user[0];

    if (!targetUser.stripe_customer_id) {
      return Response.json({ 
        error: 'No Stripe customer ID found for this user. Please subscribe first.' 
      }, { status: 400 });
    }

    const origin = req.headers.get('origin') || 'https://base44.app';
    const returnUrl = `${origin}/subscription`;

    const session = await stripe.billingPortal.sessions.create({
      customer: targetUser.stripe_customer_id,
      return_url: returnUrl,
    });

    // Log activity
    try {
      await base44.asServiceRole.entities.ActivityLog.create({
        user_id: targetUser.id,
        user_email: targetUser.email,
        event_type: 'subscription_portal_opened',
        payload: { session_id: session.id }
      });
    } catch (logError) {
      console.warn('[createStripePortalSession] ActivityLog failed:', logError.message);
    }

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('[createStripePortalSession] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});