import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const startTime = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      console.error('[analyzeScreenshotVision] Unauthorized');
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let body = null;
    try {
      body = await req.json();
    } catch {
      // body kan leeg zijn of geen geldige JSON
    }

    console.log('[analyzeScreenshotVision] ECHO BODY:', JSON.stringify(body));

    return new Response(
      JSON.stringify({
        ok: true,
        mode: 'echo-test',
        received: body,
        tookMs: Date.now() - startTime,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('[analyzeScreenshotVision] FATAL ERROR:', err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
