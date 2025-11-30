import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.14.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Retrieve the user's Stripe customer ID
    // Ideally this is stored on the user entity
    let customerId = user.stripe_customer_id;

    // If not present, we might search Stripe or return error
    // For this simple sync, we assume it's there or we can't sync
    if (!customerId) {
        // Try to find customer by email
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        if (customers.data.length > 0) {
            customerId = customers.data[0].id;
            // Update user while we are at it
            await base44.asServiceRole.entities.User.update(user.id, { stripe_customer_id: customerId });
        } else {
             return Response.json({ success: false, message: 'No Stripe customer found' });
        }
    }

    // List subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 1
    });

    let status = 'inactive';
    let planId = 'free';

    if (subscriptions.data.length > 0) {
      const sub = subscriptions.data[0];
      // Check if active or trialing
      if (['active', 'trialing'].includes(sub.status)) {
         status = 'active';
         // Try to map price/product to plan
         // This depends on your product setup. 
         // We can check metadata or price ID
         // For now, we just mark as Pro if active
         planId = 'prod_TVmxD3pUgsBYrn'; // Hardcoded ID from context for "PromptGuard"
      } else {
         status = sub.status; // 'canceled', 'unpaid', etc.
         planId = 'free';
      }
    }

    // Update user entity
    await base44.asServiceRole.entities.User.update(user.id, {
      subscription_status: status,
      plan_id: planId,
      updated_date: new Date().toISOString()
    });

    return Response.json({ success: true, status, planId });

  } catch (error) {
    console.error("Sync error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});