import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Run a prompt through InvokeLLM with rate limiting
 * CREDIT-USING FEATURE: Checks trial/subscription status
 */

Deno.serve(async (req) => {
  console.log('[runPrompt] ========== REQUEST START ==========');
  console.log('[runPrompt] Method:', req.method);
  console.log('[runPrompt] URL:', req.url);
  
  try {
    // CORS
    if (req.method === "OPTIONS") {
      console.log('[runPrompt] Handling OPTIONS (CORS preflight)');
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    console.log('[runPrompt] Creating SDK client from request...');
    const base44 = createClientFromRequest(req);
    console.log('[runPrompt] SDK client created');
    
    console.log('[runPrompt] Authenticating user...');
    const user = await base44.auth.me();
    console.log('[runPrompt] Auth response:', user ? 'SUCCESS' : 'NULL');

    if (!user) {
      console.log('[runPrompt] ❌ Unauthorized - no user');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[runPrompt] ✓ User authenticated:', user.email);
    console.log('[runPrompt] User role:', user.role);
    console.log('[runPrompt] User subscription status:', user.subscription_status);

    // ✅ PRO FEATURE CHECK
    // AI Prompt Improvement is PRO-only (or Starter during 14-day trial)
    const monthlyPrice = user.monthly_price_amount || 0;
    const subscriptionStatus = user.subscription_status;
    const trialEnd = user.trial_ends_at || user.trial_end;
    const now = new Date();
    
    let hasProAccess = false;
    
    // Admin bypass
    if (user.role === 'admin') {
      hasProAccess = true;
      console.log('[runPrompt] ✓ Admin bypass granted');
    }
    // PRO plan (€19.95): always access
    else if (monthlyPrice >= 1995) {
      hasProAccess = true;
      console.log('[runPrompt] ✓ PRO plan access granted');
    }
    // Starter plan (€9.95): only during trial
    else if ((monthlyPrice === 995 || monthlyPrice === 999) && subscriptionStatus === 'trialing') {
      if (trialEnd && new Date(trialEnd) > now) {
        hasProAccess = true;
        console.log('[runPrompt] ✓ Starter trial access granted');
      }
    }
    
    if (!hasProAccess) {
      console.log('[runPrompt] ❌ PRO feature access denied:', {
        monthlyPrice,
        subscriptionStatus,
        trialEnd,
        isAdmin: user.role === 'admin'
      });
      return Response.json({ 
        error: 'AI Prompt Improvement is only available in PRO plan or during Starter trial',
        requires_upgrade: true,
        subscription_status: subscriptionStatus
      }, { status: 403 });
    }

    // Execute prompt
    const body = await req.json();
    const { prompt, file_urls } = body;

    if (!prompt) {
      console.log('[runPrompt] ❌ Missing prompt');
      return Response.json({ error: 'Missing prompt' }, { status: 400 });
    }

    console.log('[runPrompt] 📡 Calling InvokeLLM with prompt length:', prompt.length);

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: file_urls || undefined
    });

    console.log('[runPrompt] ✅ InvokeLLM success, result length:', result?.length || 0);

    return Response.json({
      result,
      credits_used: 1
    });

  } catch (error) {
    console.error('[runPrompt] ❌ Error:', error.message);
    console.error('[runPrompt] Stack:', error.stack);
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
});