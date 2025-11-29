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

    const { priceId, successUrl, cancelUrl } = await req.json();

    if (!priceId) {
      return Response.json({ error: 'Missing priceId' }, { status: 400 });
    }

    // Check if we have a stripe_customer_id for this user
    // Note: We fetch the full user entity to be sure we get the custom field
    // assuming the user entity was extended correctly.
    // If not found, we pass email so Stripe can help or create a new one.
    
    let customerId = user.stripe_customer_id;

    // Als er nog geen ID is, zoeken we in Stripe op email om dubbele klanten te voorkomen
    if (!customerId) {
        const existingCustomers = await stripe.customers.list({ email: user.email, limit: 1 });
        if (existingCustomers.data.length > 0) {
            customerId = existingCustomers.data[0].id;
            // Optioneel: update user hier met het gevonden ID
            await base44.auth.updateMe({ stripe_customer_id: customerId });
        }
    }

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
      },
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return Response.json({ url: session.url });

  } catch (error) {
    console.error("Stripe error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});