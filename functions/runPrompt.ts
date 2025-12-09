/**
 * Run Prompt Function
 * 
 * Executes a prompt with rate limiting protection.
 * Rate limit: 60 prompts per minute per user
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { checkRateLimit, RATE_LIMITS } from './utils/rateLimiter.js';
import { logEvent, extractRequestMetadata, EVENT_TYPES } from './utils/logger.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting check
    const rateLimitResult = await checkRateLimit(
      base44,
      user.id,
      RATE_LIMITS.RUN_PROMPT.key,
      RATE_LIMITS.RUN_PROMPT.limit
    );

    if (!rateLimitResult.allowed) {
      // Log rate limit exceeded
      const metadata = extractRequestMetadata(req);
      await logEvent(base44, EVENT_TYPES.RATE_LIMIT_EXCEEDED, {
        userId: user.id,
        userEmail: user.email,
        payload: { 
          action: 'run_prompt',
          resetAt: rateLimitResult.resetAt.toISOString()
        },
        ...metadata
      });

      return Response.json({
        error: 'Je voert nu wel erg veel prompts uit. Wacht een moment en probeer het opnieuw.',
        resetAt: rateLimitResult.resetAt.toISOString(),
        remaining: 0
      }, { status: 429 });
    }

    // Parse request body
    const { prompt, file_urls, add_context_from_internet, response_json_schema } = await req.json();

    if (!prompt) {
      return Response.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Execute the prompt via Core.InvokeLLM
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls,
        add_context_from_internet,
        response_json_schema
      });

      return Response.json({
        result,
        rateLimit: {
          remaining: rateLimitResult.remaining,
          resetAt: rateLimitResult.resetAt.toISOString()
        }
      });
    } catch (llmError) {
      // Log critical error (without full prompt content)
      const metadata = extractRequestMetadata(req);
      await logEvent(base44, EVENT_TYPES.CRITICAL_ERROR, {
        userId: user.id,
        userEmail: user.email,
        payload: {
          error: llmError.message,
          action: 'run_prompt',
          promptLength: prompt?.length || 0
        },
        ...metadata
      });

      return Response.json({
        error: 'Failed to execute prompt',
        details: llmError.message
      }, { status: 500 });
    }
  } catch (error) {
    return Response.json({
      error: error.message
    }, { status: 500 });
  }
});