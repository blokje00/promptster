import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow patrickz@sunshower.nl to reset their own flag
    if (user.email !== 'patrickz@sunshower.nl') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.info('[RESET] Resetting demo_seeded_at for:', user.email);

    // Reset the flag
    await base44.auth.updateMe({
      demo_seeded_at: null
    });

    console.info('[RESET] ✅ Reset complete');

    return Response.json({
      status: 'success',
      message: 'demo_seeded_at has been reset to null'
    });

  } catch (error) {
    console.error('[RESET] ❌ ERROR:', error.message, error.stack);
    return Response.json({ 
      status: 'error',
      error: error.message 
    }, { status: 500 });
  }
});