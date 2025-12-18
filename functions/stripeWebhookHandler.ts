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
            // Retrieve subscription to get actual status (trialing or active)
            let subscriptionStatus = 'active';
            let trialEnd = null;
            let currentPeriodEnd = null;

            if (session.subscription) {
                const subscription = await stripe.subscriptions.retrieve(session.subscription);
                subscriptionStatus = subscription.status;
                trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;
                currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null;
            }

            const updateData = {
                stripe_customer_id: customerId,
                subscription_status: subscriptionStatus,
                current_period_end: currentPeriodEnd
            };
            
            if (planId) {
                updateData.plan_id = planId;
            }
            
            if (session.subscription) {
                updateData.stripe_subscription_id = session.subscription;
            }

            if (trialEnd) {
                updateData.trial_end = trialEnd;
                updateData.trial_start = new Date().toISOString();
            }

            await client.entities.User.update(userId, updateData);
            console.log(`User ${userId} subscription ${subscriptionStatus} for plan ${planId}.`);

            // T-6: Log activity
            try {
              await client.entities.ActivityLog.create({
                user_id: userId,
                event_type: 'subscription_created',
                payload: {
                  customer_id: customerId,
                  plan_id: planId,
                  subscription_id: session.subscription
                }
              });
            } catch (logError) {
              console.warn('ActivityLog failed:', logError.message);
            }
        }
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const users = await client.entities.User.filter({ stripe_customer_id: subscription.customer });
        if (users.length > 0) {
            const user = users[0];
            await client.entities.User.update(user.id, {
                subscription_status: subscription.status,
                stripe_subscription_id: subscription.id
            });
            console.log(`User ${user.id} subscription updated to ${subscription.status}.`);

            // T-6: Log activity
            try {
              await client.entities.ActivityLog.create({
                user_id: user.id,
                user_email: user.email,
                event_type: 'subscription_updated',
                payload: {
                  subscription_id: subscription.id,
                  status: subscription.status,
                  previous_status: event.data.previous_attributes?.status
                }
              });
            } catch (logError) {
              console.warn('ActivityLog failed:', logError.message);
            }

            // T-7: Error notifications for failed payments
            if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
              try {
                await client.integrations.Core.SendEmail({
                  to: 'patrick.van.zandvoort@gmail.com',
                  subject: `⚠️ Payment Issue - User ${user.email}`,
                  body: `User ${user.email} (${user.id}) has subscription status: ${subscription.status}\n\nSubscription ID: ${subscription.id}\nCustomer ID: ${subscription.customer}\n\nAction required: Review in Stripe Dashboard.`
                });
              } catch (emailError) {
                console.error('Failed to send payment issue email:', emailError.message);
              }
            }
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const users = await client.entities.User.filter({ stripe_customer_id: subscription.customer });
        if (users.length > 0) {
            const user = users[0];
            await client.entities.User.update(user.id, {
                subscription_status: 'cancelled'
            });
            console.log(`User ${user.id} subscription canceled.`);

            // T-6: Log activity
            try {
              await client.entities.ActivityLog.create({
                user_id: user.id,
                user_email: user.email,
                event_type: 'subscription_cancelled',
                payload: {
                  subscription_id: subscription.id,
                  canceled_at: subscription.canceled_at
                }
              });
            } catch (logError) {
              console.warn('ActivityLog failed:', logError.message);
            }

            // T-7: Cancellation notification
            try {
              await client.integrations.Core.SendEmail({
                to: 'patrick.van.zandvoort@gmail.com',
                subject: `📭 Subscription Cancelled - User ${user.email}`,
                body: `User ${user.email} (${user.id}) has cancelled their subscription.\n\nSubscription ID: ${subscription.id}\nCanceled at: ${new Date(subscription.canceled_at * 1000).toISOString()}`
              });
            } catch (emailError) {
              console.error('Failed to send cancellation email:', emailError.message);
            }
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

    // T-11: Retry strategy - let Stripe retry automatically (return 500)
    // Log for manual review if critical
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.ActivityLog.create({
        event_type: 'critical_error',
        payload: {
          source: 'stripeWebhookHandler',
          error: error.message,
          stack: error.stack
        }
      });
    } catch (logError) {
      console.error('Failed to log webhook error:', logError.message);
    }

    return Response.json({ error: error.message }, { status: 500 });
  }
});