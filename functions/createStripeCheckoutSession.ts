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

    const { priceId, mode = 'subscription', successUrl, cancelUrl } = await req.json();

    if (!priceId) {
      return Response.json({ error: 'Price ID is required' }, { status: 400 });
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
        appId: Deno.env.get('BASE44_APP_ID')
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