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

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow user to sync their own subscription OR admin to sync any
    const body = await req.json();
    const { userId, stripe_subscription_id } = body || {};

    let targetUser;

    // If admin is syncing another user
    if ((userId || stripe_subscription_id) && currentUser.role === 'admin') {
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
      }
    } else {
      // User syncing their own subscription
      targetUser = currentUser;
    }

    if (!targetUser.stripe_subscription_id && !targetUser.stripe_customer_id) {
      // Try to find customer by email in Stripe
      try {
        const customers = await stripe.customers.list({
          email: targetUser.email,
          limit: 1
        });

        if (customers.data.length > 0) {
          const customer = customers.data[0];
          
          // Get active subscriptions for this customer
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'all',
            limit: 1
          });

          if (subscriptions.data.length > 0) {
            const subscription = subscriptions.data[0];
            
            // Update user with found Stripe data
            await base44.asServiceRole.entities.User.update(targetUser.id, {
              stripe_customer_id: customer.id,
              stripe_subscription_id: subscription.id,
              subscription_status: subscription.status
            });

            return Response.json({
              success: true,
              user_id: targetUser.id,
              subscription_status: subscription.status,
              message: 'Subscription linked and synced'
            });
          }
        }
      } catch (stripeError) {
        console.error('[syncSubscriptionStatus] Stripe lookup failed:', stripeError);
      }

      return Response.json({ 
        error: 'No subscription found. Please complete payment via Stripe first.',
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