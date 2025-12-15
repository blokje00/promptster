import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Run a prompt through InvokeLLM with rate limiting
 * CREDIT-USING FEATURE: Checks trial/subscription status
 */

Deno.serve(async (req) => {
  try {
    // CORS
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ TRIAL/SUBSCRIPTION CHECK
    const subscriptionStatus = user.subscription_status;
    const trialEnd = user.trial_end ? new Date(user.trial_end) : null;
    const now = new Date();

    const hasActiveSubscription = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
    const hasActiveTrial = subscriptionStatus === 'trial' && trialEnd && trialEnd > now;

    if (!hasActiveSubscription && !hasActiveTrial) {
      console.log('[runPrompt] ❌ Access denied - no active trial/subscription');
      return Response.json({ 
        error: 'This feature requires an active trial or subscription',
        subscription_status: subscriptionStatus,
        trial_expired: trialEnd ? trialEnd < now : false
      }, { status: 403 });
    }

    console.log('[runPrompt] ✓ Access granted - trial/subscription active');

    // Rate limiting check (optional - can be removed if not needed)
    const limitKey = 'run_prompt';
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 10;

    const limits = await base44.entities.RateLimit.filter({
      user_id: user.id,
      limit_key: limitKey
    });

    if (limits && limits.length > 0) {
      const limit = limits[0];
      const windowStart = new Date(limit.window_start);
      const elapsed = now - windowStart;

      if (elapsed < windowMs) {
        if (limit.count >= maxRequests) {
          return Response.json({ 
            error: `Rate limit exceeded. Max ${maxRequests} requests per minute.`,
            retry_after: Math.ceil((windowMs - elapsed) / 1000)
          }, { status: 429 });
        }
        
        await base44.entities.RateLimit.update(limit.id, {
          count: limit.count + 1
        });
      } else {
        await base44.entities.RateLimit.update(limit.id, {
          window_start: now.toISOString(),
          count: 1
        });
      }
    } else {
      await base44.entities.RateLimit.create({
        user_id: user.id,
        limit_key: limitKey,
        window_start: now.toISOString(),
        count: 1
      });
    }

    // Execute prompt
    const body = await req.json();
    const { prompt, file_urls } = body;

    if (!prompt) {
      return Response.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: file_urls || undefined
    });

    return Response.json({
      result,
      credits_used: 1 // Placeholder - adjust based on actual token usage
    });

  } catch (error) {
    console.error('[runPrompt] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});