import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

export const createStripeCheckoutSession = async (req) => {
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

    // T-9: Rate limiting - max 1 checkout per 10 seconds
    const rateLimitKey = `checkout_${user.id}`;
    try {
      const recentLimits = await base44.asServiceRole.entities.RateLimit.filter({
        user_id: user.id,
        limit_key: 'checkout_creation'
      });
      
      if (recentLimits.length > 0) {
        const lastLimit = recentLimits[0];
        const tenSecondsAgo = new Date(Date.now() - 10000);
        const windowStart = new Date(lastLimit.window_start);
        
        if (windowStart > tenSecondsAgo) {
          return Response.json({ 
            error: 'Rate limit exceeded. Please wait 10 seconds before creating another checkout.' 
          }, { status: 429 });
        }
      }
      
      // Update rate limit
      await base44.asServiceRole.entities.RateLimit.create({
        user_id: user.id,
        limit_key: 'checkout_creation',
        window_start: new Date().toISOString(),
        count: 1
      });
    } catch (rateLimitError) {
      console.warn('Rate limiting check failed:', rateLimitError.message);
    }

    const { priceId, planId, mode = 'subscription', successUrl, cancelUrl } = await req.json();

    if (!priceId) {
      return Response.json({ error: 'Price ID is required' }, { status: 400 });
    }

    if (!planId) {
      return Response.json({ error: 'Plan ID is required for tracking' }, { status: 400 });
    }

    // T-10: Price validation - check if priceId exists in SubscriptionPlan entity
    try {
      const plans = await base44.asServiceRole.entities.SubscriptionPlan.filter({});
      const validPlan = plans.find(
        p => p.monthly_price_id === priceId || p.annual_price_id === priceId
      );
      
      if (!validPlan) {
        console.error(`Invalid priceId ${priceId} attempted by user ${user.email}`);
        
        // T-12: Fraud prevention - log suspicious activity
        try {
          await base44.asServiceRole.entities.ActivityLog.create({
            user_id: user.id,
            user_email: user.email,
            event_type: 'rate_limit_exceeded',
            payload: {
              attempted_price_id: priceId,
              attempted_plan_id: planId,
              reason: 'Invalid price ID not found in SubscriptionPlan'
            }
          });
        } catch (logError) {
          console.warn('ActivityLog failed:', logError.message);
        }
        
        return Response.json({ 
          error: 'Invalid price ID. Please select a valid subscription plan.' 
        }, { status: 400 });
      }

      // T-12: Additional fraud checks
      if (!user.email || !user.email.includes('@')) {
        return Response.json({ error: 'Valid email required' }, { status: 400 });
      }
    } catch (validationError) {
      console.error('Price validation failed:', validationError.message);
      // Continue anyway to not block legitimate users if validation service fails
    }

    // Get current app URL from request headers or use a default if needed, but base44 SDK usually handles it?
    // We need absolute URLs for success/cancel.
    // The prompt says: "backend createCheckout redirect urls should match app slug"
    // We can expect the frontend to pass absolute URLs or we construct them.
    // Let's assume frontend passes them or we construct based on Origin.
    const origin = req.headers.get('origin') || 'https://base44.app'; 
    // Fallback might be tricky if origin is missing in some envs, but usually present.

    const finalSuccessUrl = successUrl || `${origin}/subscription?success=true`;
    const finalCancelUrl = cancelUrl || `${origin}/subscription?canceled=true`;

    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: mode, // 'payment' or 'subscription'
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      customer_email: user.email,
      metadata: {
        userId: user.id,
        appId: Deno.env.get('BASE44_APP_ID'),
        planId: planId
      },
      // If subscription, we can add subscription_data if needed (e.g. trial)
    };

    // If the user already has a stripe customer ID stored in base44 user entity, use it?
    // For now, we pass email and let Stripe create/match or we could search.
    // Ideally we store stripe_customer_id on user.
    if (user.stripe_customer_id) {
        sessionConfig.customer = user.stripe_customer_id;
        delete sessionConfig.customer_email; // Cannot pass both
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return Response.json({ url: session.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
};

Deno.serve(createStripeCheckoutSession);