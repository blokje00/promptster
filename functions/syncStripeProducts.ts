import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

/**
 * T-13: Syncs Stripe products and prices to SubscriptionPlan entity
 * Admin-only function to keep product catalog in sync
 */
Deno.serve(async (req) => {
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

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all active products from Stripe
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price']
    });

    // Fetch all prices for these products
    const syncedPlans = [];
    const errors = [];

    for (const product of products.data) {
      try {
        const prices = await stripe.prices.list({
          product: product.id,
          active: true
        });

        const monthlyPrice = prices.data.find(p => p.recurring?.interval === 'month');
        const annualPrice = prices.data.find(p => p.recurring?.interval === 'year');

        if (!monthlyPrice) {
          console.warn(`Product ${product.name} has no monthly price, skipping`);
          continue;
        }

        // Check if plan already exists in Base44
        const existingPlans = await base44.asServiceRole.entities.SubscriptionPlan.filter({
          monthly_price_id: monthlyPrice.id
        });

        const planData = {
          name: product.name,
          description: product.description || '',
          monthly_price_id: monthlyPrice.id,
          monthly_price_amount: monthlyPrice.unit_amount / 100,
          is_active: true
        };

        if (annualPrice) {
          planData.annual_price_id = annualPrice.id;
          planData.annual_price_amount = annualPrice.unit_amount / 100;
        }

        // Parse features from product metadata or description
        if (product.metadata?.features) {
          try {
            planData.features = JSON.parse(product.metadata.features);
          } catch {
            planData.features = [product.metadata.features];
          }
        }

        if (product.metadata?.max_thoughts) {
          planData.max_thoughts = parseInt(product.metadata.max_thoughts);
        }

        if (existingPlans.length > 0) {
          // Update existing plan
          await base44.asServiceRole.entities.SubscriptionPlan.update(
            existingPlans[0].id,
            planData
          );
          syncedPlans.push({ action: 'updated', plan: product.name });
        } else {
          // Create new plan
          await base44.asServiceRole.entities.SubscriptionPlan.create(planData);
          syncedPlans.push({ action: 'created', plan: product.name });
        }
      } catch (error) {
        errors.push({ product: product.name, error: error.message });
      }
    }

    // Log activity
    try {
      await base44.asServiceRole.entities.ActivityLog.create({
        user_id: user.id,
        user_email: user.email,
        event_type: 'subscription_updated',
        payload: {
          synced_plans: syncedPlans.length,
          errors: errors.length
        }
      });
    } catch (logError) {
      console.warn('ActivityLog failed:', logError.message);
    }

    return Response.json({
      success: true,
      synced: syncedPlans,
      errors: errors,
      total: syncedPlans.length
    });
  } catch (error) {
    console.error('[syncStripeProducts] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});