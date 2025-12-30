import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia',
});

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

    // Get UserProfile (source of truth)
    let userProfile = await getOrCreateProfile(base44, user);
    console.log('[activateTrial] UserProfile found/created:', userProfile.id);

    console.log('[activateTrial] Status check:', {
      email: user.email,
      profile_id: userProfile.id,
      subscription_status: userProfile.subscription_status,
      trial_ends_at: userProfile.trial_ends_at
    });

    // Check if user already has trial or subscription
    if (userProfile.subscription_status === 'trialing') {
      const trialEnd = userProfile.trial_ends_at ? new Date(userProfile.trial_ends_at) : null;
      const now = new Date();
      
      // If trial_ends_at is in the future, it's still active
      if (trialEnd && trialEnd > now) {
        return Response.json({ 
          error: 'Trial already active',
          trial_ends_at: userProfile.trial_ends_at 
        }, { status: 400 });
      }
      
      // If trial_ends_at is in the past, allow re-activation for testing
      console.log('[activateTrial] WARNING: Re-activating expired trial for testing');
    }

    if (userProfile.subscription_status === 'active') {
      return Response.json({ 
        error: 'Already subscribed',
        plan_id: userProfile.plan_id 
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

    if (!selectedPlan.monthly_price_id) {
      return Response.json({ error: 'Plan has no Stripe price ID configured' }, { status: 400 });
    }

    // Step 1: Create or retrieve Stripe Customer
    let stripeCustomerId = userProfile.stripe_customer_id;
    
    if (!stripeCustomerId) {
      console.log('[activateTrial] Creating Stripe Customer...');
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name || user.email,
        metadata: {
          user_id: user.id,
          plan_id: planId
        }
      });
      stripeCustomerId = customer.id;
      console.log('[activateTrial] Stripe Customer created:', stripeCustomerId);
    } else {
      console.log('[activateTrial] Using existing Stripe Customer:', stripeCustomerId);
    }

    // Step 2: Calculate trial end (14 days from now)
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const trialEndUnix = Math.floor(trialEnd.getTime() / 1000);

    // Step 3: Create Stripe Subscription in trialing status
    console.log('[activateTrial] Creating Stripe Subscription...');
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: selectedPlan.monthly_price_id }],
      trial_end: trialEndUnix,
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription'
      },
      metadata: {
        user_id: user.id,
        plan_id: planId,
        trial_type: 'no_cc_required'
      }
    });

    console.log('[activateTrial] Stripe Subscription created:', subscription.id, 'Status:', subscription.status);

    // Step 4: Update BOTH UserProfile AND User entity with Stripe data
    const updatePayload = {
      subscription_status: 'trialing',
      trial_ends_at: trialEnd.toISOString(),
      plan_id: planId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscription.id
    };

    // Update UserProfile for backwards compatibility
    await base44.asServiceRole.entities.UserProfile.update(userProfile.id, updatePayload);
    
    // CRITICAL: Also update User entity so auth.me() returns correct data
    await base44.asServiceRole.entities.User.update(user.id, updatePayload);

    console.log(`[activateTrial] Trial activated for ${user.email} until ${trialEnd.toISOString()}`);

    return Response.json({
      success: true,
      profile_id: userProfile.id,
      trial_ends_at: trialEnd.toISOString(),
      days_remaining: 14,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscription.id
    });

  } catch (error) {
    console.error('[activateTrial] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});