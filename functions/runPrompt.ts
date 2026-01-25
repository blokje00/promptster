import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
    console.log('[runPrompt] Parsing request body...');
    let body;
    try {
      body = await req.json();
      console.log('[runPrompt] ✓ Body parsed, keys:', Object.keys(body));
    } catch (parseError) {
      console.error('[runPrompt] ❌ Failed to parse request body:', parseError.message);
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    
    const { prompt, file_urls } = body;
    console.log('[runPrompt] Prompt length:', prompt?.length || 0);
    console.log('[runPrompt] File URLs:', file_urls ? `${file_urls.length} files` : 'none');

    if (!prompt) {
      console.log('[runPrompt] ❌ Missing prompt in body');
      return Response.json({ error: 'Missing prompt' }, { status: 400 });
    }

    console.log('[runPrompt] 📡 Calling InvokeLLM via service role...');
    console.log('[runPrompt] Base44 object type:', typeof base44);
    console.log('[runPrompt] Has asServiceRole?:', !!base44.asServiceRole);
    console.log('[runPrompt] Has integrations?:', !!base44.asServiceRole?.integrations);
    console.log('[runPrompt] Has Core?:', !!base44.asServiceRole?.integrations?.Core);
    
    let result;
    try {
      result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        file_urls: file_urls || undefined
      });
      console.log('[runPrompt] ✅ InvokeLLM returned successfully');
      console.log('[runPrompt] Result type:', typeof result);
      console.log('[runPrompt] Result length:', result?.length || 0);
    } catch (llmError) {
      console.error('[runPrompt] ❌ InvokeLLM failed:', llmError.message);
      console.error('[runPrompt] LLM Error stack:', llmError.stack);
      throw llmError;
    }

    console.log('[runPrompt] Returning success response...');
    return Response.json({
      result,
      credits_used: 1
    });

  } catch (error) {
    console.error('[runPrompt] ========== ERROR CAUGHT ==========');
    console.error('[runPrompt] Error name:', error.name);
    console.error('[runPrompt] Error message:', error.message);
    console.error('[runPrompt] Error stack:', error.stack);
    console.error('[runPrompt] Error constructor:', error.constructor.name);
    console.error('[runPrompt] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    return Response.json({ 
      error: error.message || 'Internal server error',
      error_type: error.name || 'UnknownError'
    }, { status: 500 });
  } finally {
    console.log('[runPrompt] ========== REQUEST END ==========');
  }
});