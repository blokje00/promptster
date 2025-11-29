import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@^14.0.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    // Handle CORS if needed (usually handled by platform, but good to be safe for direct calls)
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId, successUrl, cancelUrl, planId } = await req.json();

    if (!priceId) {
      return Response.json({ error: 'Missing priceId' }, { status: 400 });
    }
    
    const customerId = user.stripe_customer_id;

    // We slaan de customer lookup over om permissie-fouten met restricted keys te voorkomen.
    // Als er geen customerId is, vullen we het e-mailadres in en laat Stripe een nieuwe klant aanmaken.
    // De webhook vangt dit later op en koppelt het ID aan de gebruiker.

    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerId ? undefined : user.email,
      customer: customerId,
      metadata: {
        userId: user.id,
        planId: planId,
      },
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return Response.json({ url: session.url });

  } catch (error) {
    console.error("Stripe error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});