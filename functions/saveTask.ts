/**
 * Save Task Function
 * 
 * Creates or updates a Thought/Task with rate limiting protection.
 * Rate limit: 120 save operations per minute per user
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
      RATE_LIMITS.SAVE_TASK.key,
      RATE_LIMITS.SAVE_TASK.limit
    );

    if (!rateLimitResult.allowed) {
      // Log rate limit exceeded
      const metadata = extractRequestMetadata(req);
      await logEvent(base44, EVENT_TYPES.RATE_LIMIT_EXCEEDED, {
        userId: user.id,
        userEmail: user.email,
        payload: {
          action: 'save_task',
          resetAt: rateLimitResult.resetAt.toISOString()
        },
        ...metadata
      });

      return Response.json({
        error: 'Je slaat nu wel erg veel taken op. Wacht een moment en probeer het opnieuw.',
        resetAt: rateLimitResult.resetAt.toISOString(),
        remaining: 0
      }, { status: 429 });
    }

    // Parse request body
    const { id, data } = await req.json();

    if (!data) {
      return Response.json({ error: 'Task data is required' }, { status: 400 });
    }

    let result;
    if (id) {
      // Update existing task
      result = await base44.entities.Thought.update(id, data);
    } else {
      // Create new task
      result = await base44.entities.Thought.create(data);
    }

    return Response.json({
      task: result,
      rateLimit: {
        remaining: rateLimitResult.remaining,
        resetAt: rateLimitResult.resetAt.toISOString()
      }
    });
  } catch (error) {
    // Log critical error
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    
    if (user) {
      const metadata = extractRequestMetadata(req);
      await logEvent(base44, EVENT_TYPES.CRITICAL_ERROR, {
        userId: user.id,
        userEmail: user.email,
        payload: {
          error: error.message,
          action: 'save_task'
        },
        ...metadata
      });
    }

    return Response.json({
      error: error.message
    }, { status: 500 });
  }
});