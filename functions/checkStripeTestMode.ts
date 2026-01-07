import { createClientFromRequest } from 'npm:@base44/sdk@0.8.12';

/**
 * Checks if Stripe is running in test mode
 * Admin-only function
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
    const isTestMode = stripeSecretKey.startsWith('sk_test_');

    return Response.json({ 
      isTestMode,
      mode: isTestMode ? 'test' : 'live'
    });
  } catch (error) {
    console.error('[checkStripeTestMode] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});