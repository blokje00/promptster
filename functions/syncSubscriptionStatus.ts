import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

/**
 * T-5: Syncs subscription status from Stripe to Base44 User entity
 * @param {Request} req - Expects { userId?, stripe_subscription_id? } in body
 * @returns {Response} - Updated user subscription data
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

    if (!currentUser || currentUser.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId, stripe_subscription_id } = await req.json();

    let targetUser;

    if (userId) {
      const users = await base44.asServiceRole.entities.User.filter({ id: userId });
      if (!users || users.length === 0) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }
      targetUser = users[0];
    } else if (stripe_subscription_id) {
      const users = await base44.asServiceRole.entities.User.filter({ stripe_subscription_id });
      if (!users || users.length === 0) {
        return Response.json({ error: 'User not found for subscription' }, { status: 404 });
      }
      targetUser = users[0];
    } else {
      return Response.json({ error: 'userId or stripe_subscription_id required' }, { status: 400 });
    }

    if (!targetUser.stripe_subscription_id) {
      return Response.json({ 
        error: 'User has no subscription ID to sync',
        user_id: targetUser.id 
      }, { status: 400 });
    }

    // Fetch subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(targetUser.stripe_subscription_id);

    const updateData = {
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status // active, past_due, canceled, etc.
    };

    // Try to map Stripe price to plan_id
    if (subscription.items?.data?.length > 0) {
      const priceId = subscription.items.data[0].price.id;
      
      // Find matching SubscriptionPlan
      const plans = await base44.asServiceRole.entities.SubscriptionPlan.filter({});
      const matchingPlan = plans.find(
        p => p.monthly_price_id === priceId || p.annual_price_id === priceId
      );
      
      if (matchingPlan) {
        updateData.plan_id = matchingPlan.id;
      }
    }

    await base44.asServiceRole.entities.User.update(targetUser.id, updateData);

    // Log activity
    try {
      await base44.asServiceRole.entities.ActivityLog.create({
        user_id: targetUser.id,
        user_email: targetUser.email,
        event_type: 'subscription_synced',
        payload: {
          subscription_id: subscription.id,
          status: subscription.status,
          plan_id: updateData.plan_id
        }
      });
    } catch (logError) {
      console.warn('[syncSubscriptionStatus] ActivityLog failed:', logError.message);
    }

    return Response.json({
      success: true,
      user_id: targetUser.id,
      subscription_status: subscription.status,
      plan_id: updateData.plan_id
    });
  } catch (error) {
    console.error('[syncSubscriptionStatus] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});