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

    // Validate session is complete and mode is subscription
    if (session.status !== 'complete' || session.mode !== 'subscription') {
      return Response.json({ 
        success: false, 
        error: 'Session not complete or not a subscription' 
      }, { status: 400 });
    }

    // For free trials: payment_status can be 'no_payment_required' or 'paid'
    const isValidPayment = 
      session.payment_status === 'paid' || 
      session.payment_status === 'no_payment_required';

    if (!isValidPayment) {
      return Response.json({ 
        success: false, 
        error: 'Payment not completed' 
      }, { status: 400 });
    }

    // Retrieve full subscription details
    let subscriptionStatus = 'active';
    let trialEnd = null;
    let currentPeriodEnd = null;

    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      subscriptionStatus = subscription.status; // 'trialing', 'active', etc.
      trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;
      currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null;
    }

    // Persist subscription data immediately
    const updateData = {
      stripe_customer_id: session.customer,
      stripe_subscription_id: session.subscription,
      subscription_status: subscriptionStatus,
      current_period_end: currentPeriodEnd
    };

    if (trialEnd) {
      updateData.trial_end = trialEnd;
      updateData.trial_start = new Date().toISOString();
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
        event_type: 'subscription_created',
        payload: {
          session_id: sessionId,
          subscription_status: subscriptionStatus,
          plan_id: session.metadata?.planId,
          trial_end: trialEnd
        }
      });
    } catch (logError) {
      console.warn('[verifyStripeSession] ActivityLog failed:', logError.message);
    }

    return Response.json({
      success: true,
      status: subscriptionStatus,
      planId: session.metadata?.planId,
      trialEnd,
      currentPeriodEnd
    });
  } catch (error) {
    console.error('[verifyStripeSession] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});