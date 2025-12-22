import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();

    if (!me) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId } = await req.json();

    if (!priceId) {
      return Response.json({ error: 'priceId is required' }, { status: 400 });
    }

    // Retrieve subscription from Stripe
    const stripeSubId = me.stripe_subscription_id;
    if (!stripeSubId) {
      return Response.json({ error: 'No active subscription found' }, { status: 400 });
    }

    const subscription = await stripe.subscriptions.retrieve(stripeSubId);

    if (subscription.status !== 'trialing') {
      return Response.json({ error: 'Only trialing subscriptions can be scheduled' }, { status: 400 });
    }

    const trialEnd = subscription.trial_end;
    if (!trialEnd) {
      return Response.json({ error: 'Trial end date not found' }, { status: 400 });
    }

    // Check if already scheduled for the same price
    if (me.scheduled_plan_id === priceId) {
      return Response.json({
        ok: true,
        scheduled_plan_id: priceId,
        scheduled_change_at: new Date(trialEnd * 1000).toISOString(),
        message: 'Already scheduled'
      });
    }

    // Create or update subscription schedule
    let scheduleId = me.stripe_schedule_id;
    let schedule;

    if (scheduleId) {
      // Update existing schedule
      try {
        schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
        
        // Update phases: keep trial phase, then switch to new price
        schedule = await stripe.subscriptionSchedules.update(scheduleId, {
          phases: [
            {
              items: subscription.items.data.map(item => ({
                price: item.price.id,
                quantity: item.quantity,
              })),
              end_date: trialEnd,
              trial: true,
            },
            {
              items: [{ price: priceId, quantity: 1 }],
              start_date: trialEnd,
            },
          ],
        });
      } catch (err) {
        console.warn('[scheduleUpgrade] Failed to update existing schedule, creating new:', err.message);
        scheduleId = null;
      }
    }

    if (!scheduleId) {
      // Create new schedule from subscription
      schedule = await stripe.subscriptionSchedules.create({
        from_subscription: stripeSubId,
      });

      // Update the schedule with phases
      schedule = await stripe.subscriptionSchedules.update(schedule.id, {
        phases: [
          {
            items: subscription.items.data.map(item => ({
              price: item.price.id,
              quantity: item.quantity,
            })),
            end_date: trialEnd,
            trial: true,
          },
          {
            items: [{ price: priceId, quantity: 1 }],
            start_date: trialEnd,
          },
        ],
      });

      scheduleId = schedule.id;
    }

    // Persist scheduled state
    const scheduledAt = new Date(trialEnd * 1000).toISOString();
    const updateData = {
      scheduled_plan_id: priceId,
      scheduled_change_at: scheduledAt,
      stripe_schedule_id: scheduleId,
    };

    // Update both User entity and auth profile
    await base44.asServiceRole.entities.User.update(me.id, updateData);
    await base44.auth.updateMe(updateData);

    console.log(`[scheduleUpgrade] Scheduled upgrade for user ${me.email} to price ${priceId} at ${scheduledAt}`);

    return Response.json({
      ok: true,
      scheduled_plan_id: priceId,
      scheduled_change_at: scheduledAt,
      stripe_schedule_id: scheduleId,
    });

  } catch (error) {
    console.error('[scheduleUpgrade] Error:', error);
    return Response.json({ 
      error: error.message || 'Failed to schedule upgrade' 
    }, { status: 500 });
  }
});