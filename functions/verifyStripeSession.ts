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

    const { sessionId } = await req.json();

    if (!sessionId) {
      return Response.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify payment status
    if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') {
      
      // Determine plan based on metadata or line items if needed
      // For simplicity, we assume the user subscribed to the 'prod_TVmxD3pUgsBYrn' plan if it was a subscription
      // In a real app, you might store the plan ID in metadata during checkout creation
      
      let planId = 'free';
      let subscriptionStatus = 'active';
      
      // You might want to inspect session.metadata.planId if you set it during creation
      if (session.metadata && session.metadata.planId) {
        planId = session.metadata.planId;
      }

      // Update user
      // Note: We use base44.auth.updateMe if we want to update the current user context, 
      // but for security/system updates, we might need service role if we were modifying restricted fields.
      // However, updateMe is safe for user's own data if allowed. 
      // If `plan_id` is a protected field, we must use service role.
      // Let's try service role to be safe and sure.
      
      await base44.asServiceRole.entities.User.update(user.id, {
        stripe_customer_id: session.customer,
        subscription_status: subscriptionStatus,
        plan_id: planId,
        updated_date: new Date().toISOString()
      });

      return Response.json({ success: true, planId, subscriptionStatus });
    } else {
      return Response.json({ success: false, message: 'Payment not completed' });
    }

  } catch (error) {
    console.error("Verify session error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});