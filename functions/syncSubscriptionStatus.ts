import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

// Helper: Get or create UserProfile
async function getOrCreateProfile(base44Client, authUser) {
  if (!authUser?.id) throw new Error('User required');
  
  const existing = await base44Client.asServiceRole.entities.UserProfile.filter({ user_id: authUser.id });
  if (existing && existing.length > 0) return existing[0];
  
  return await base44Client.asServiceRole.entities.UserProfile.create({
    user_id: authUser.id,
    email: authUser.email,
    subscription_status: 'none',
    created_by: authUser.email
  });
}

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

    // Get UserProfile (source of truth)
    let userProfile = await getOrCreateProfile(base44, currentUser);
    console.log('[syncSubscriptionStatus] UserProfile found/created:', userProfile.id);

    if (!userProfile.stripe_subscription_id && !userProfile.stripe_customer_id) {
      // Try to find customer by email in Stripe
      try {
        console.log('[syncSubscriptionStatus] Searching Stripe for email:', currentUser.email);
        const customers = await stripe.customers.list({
          email: currentUser.email,
          limit: 1
        });

        if (customers.data.length > 0) {
          const customer = customers.data[0];
          console.log('[syncSubscriptionStatus] Found Stripe customer:', customer.id);
          
          // Get subscriptions for this customer
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'all',
            limit: 1
          });

          if (subscriptions.data.length > 0) {
            const subscription = subscriptions.data[0];
            console.log('[syncSubscriptionStatus] Found subscription:', subscription.id, subscription.status);
            
            // Update UserProfile with found Stripe data
            await base44.asServiceRole.entities.UserProfile.update(userProfile.id, {
              stripe_customer_id: customer.id,
              stripe_subscription_id: subscription.id,
              subscription_status: subscription.status
            });

            return Response.json({
              success: true,
              profile_id: userProfile.id,
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
        profile_id: userProfile.id 
      }, { status: 400 });
    }

    // Fetch subscription from Stripe
    console.log('[syncSubscriptionStatus] Fetching Stripe subscription:', userProfile.stripe_subscription_id);
    const subscription = await stripe.subscriptions.retrieve(userProfile.stripe_subscription_id);
    
    console.log('[syncSubscriptionStatus] Stripe subscription data:', {
      id: subscription.id,
      status: subscription.status,
      customer: subscription.customer,
      current_period_end: subscription.current_period_end,
      trial_end: subscription.trial_end,
      items: subscription.items?.data?.map(i => ({ price_id: i.price.id }))
    });

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

    console.log('[syncSubscriptionStatus] Updating UserProfile with data:', updateData);
    await base44.asServiceRole.entities.UserProfile.update(userProfile.id, updateData);
    
    console.log('[syncSubscriptionStatus] UserProfile updated successfully');

    // Log activity
    try {
      await base44.asServiceRole.entities.ActivityLog.create({
        user_id: currentUser.id,
        user_email: currentUser.email,
        event_type: 'subscription_synced',
        payload: {
          profile_id: userProfile.id,
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
      profile_id: userProfile.id,
      subscription_status: subscription.status,
      plan_id: updateData.plan_id
    });
  } catch (error) {
    console.error('[syncSubscriptionStatus] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});