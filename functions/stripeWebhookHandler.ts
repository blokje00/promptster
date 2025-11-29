import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@^14.0.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature || !endpointSecret) {
        console.error("Missing signature or webhook secret");
        return new Response('Webhook Error: Missing signature or secret', { status: 400 });
    }

    const body = await req.text();
    let event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    
    // Use service role because webhook is not a user request
    // Ensure backend functions are enabled to use service role if needed, 
    // or use a dedicated admin client if platform requires.
    // For Base44 v2/v3 usually we use base44.asServiceRole
    
    const client = base44.asServiceRole;

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata.userId;
        const planId = session.metadata.planId;
        const customerId = session.customer;

        if (userId) {
            await client.entities.User.update(userId, {
                stripe_customer_id: customerId,
                subscription_status: 'active',
                plan_id: planId,
            });
            console.log(`User ${userId} subscription activated for plan ${planId}.`);
        }
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        // Sync status (active, past_due, canceled)
        // Find user by stripe_customer_id
        const users = await client.entities.User.filter({ stripe_customer_id: subscription.customer });
        if (users.length > 0) {
            const user = users[0];
            await client.entities.User.update(user.id, {
                subscription_status: subscription.status
            });
            console.log(`User ${user.id} subscription updated to ${subscription.status}.`);
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const users = await client.entities.User.filter({ stripe_customer_id: subscription.customer });
        if (users.length > 0) {
            const user = users[0];
            await client.entities.User.update(user.id, {
                subscription_status: 'canceled'
            });
             console.log(`User ${user.id} subscription canceled.`);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Webhook Handler Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});