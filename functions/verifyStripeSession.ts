import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

/**
 * T-4: Verifies a Stripe checkout session and updates user subscription status
 * @param {Request} req - Expects { sessionId: string } in body
 * @returns {Response} - { status: string, subscription: object }
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
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await req.json();

    if (!sessionId) {
      return Response.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer']
    });

    const result = {
      status: session.payment_status, // 'paid', 'unpaid', 'no_payment_required'
      session_status: session.status, // 'complete', 'expired', 'open'
      customer_id: session.customer,
      subscription_id: session.subscription,
      metadata: session.metadata
    };

    // Update user if payment is successful
    if (session.payment_status === 'paid' && session.status === 'complete') {
      const updateData = {
        stripe_customer_id: session.customer,
        subscription_status: 'active'
      };

      if (session.subscription) {
        updateData.stripe_subscription_id = session.subscription;
      }

      if (session.metadata?.planId) {
        updateData.plan_id = session.metadata.planId;
      }

      await base44.asServiceRole.entities.User.update(user.id, updateData);

      // Log activity
      try {
        await base44.asServiceRole.entities.ActivityLog.create({
          user_id: user.id,
          user_email: user.email,
          event_type: 'subscription_verified',
          payload: {
            session_id: sessionId,
            payment_status: session.payment_status,
            plan_id: session.metadata?.planId
          }
        });
      } catch (logError) {
        console.warn('[verifyStripeSession] ActivityLog failed:', logError.message);
      }
    }

    return Response.json(result);
  } catch (error) {
    console.error('[verifyStripeSession] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});