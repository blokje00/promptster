/**
 * Rate Limiting Utility
 * 
 * Implements per-user rate limiting for various actions.
 * Uses a sliding window approach with 1-minute windows.
 * 
 * @module rateLimiter
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Check if a user has exceeded their rate limit for a specific action
 * 
 * @param {object} base44 - Base44 client instance
 * @param {string} userId - User ID to check
 * @param {string} limitKey - Type of action (e.g., 'run_prompt', 'save_task')
 * @param {number} limitPerMinute - Maximum allowed actions per minute
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: Date}>}
 */
export async function checkRateLimit(base44, userId, limitKey, limitPerMinute) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 60000); // 1 minute ago

  // Find existing rate limit record for this user and action
  const existingLimits = await base44.asServiceRole.entities.RateLimit.filter({
    user_id: userId,
    limit_key: limitKey
  });

  let currentLimit = existingLimits && existingLimits.length > 0 ? existingLimits[0] : null;

  // Clean up old records (older than 2 minutes)
  if (currentLimit) {
    const recordAge = now.getTime() - new Date(currentLimit.window_start).getTime();
    if (recordAge > 120000) {
      // Record is too old, reset it
      await base44.asServiceRole.entities.RateLimit.update(currentLimit.id, {
        window_start: now.toISOString(),
        count: 1
      });
      return {
        allowed: true,
        remaining: limitPerMinute - 1,
        resetAt: new Date(now.getTime() + 60000)
      };
    }

    // Check if we're still in the same window
    const windowAge = now.getTime() - new Date(currentLimit.window_start).getTime();
    
    if (windowAge < 60000) {
      // Still in same window
      if (currentLimit.count >= limitPerMinute) {
        // Rate limit exceeded
        const resetAt = new Date(new Date(currentLimit.window_start).getTime() + 60000);
        return {
          allowed: false,
          remaining: 0,
          resetAt
        };
      }

      // Increment count
      await base44.asServiceRole.entities.RateLimit.update(currentLimit.id, {
        count: currentLimit.count + 1
      });

      return {
        allowed: true,
        remaining: limitPerMinute - (currentLimit.count + 1),
        resetAt: new Date(new Date(currentLimit.window_start).getTime() + 60000)
      };
    } else {
      // New window, reset
      await base44.asServiceRole.entities.RateLimit.update(currentLimit.id, {
        window_start: now.toISOString(),
        count: 1
      });
      return {
        allowed: true,
        remaining: limitPerMinute - 1,
        resetAt: new Date(now.getTime() + 60000)
      };
    }
  } else {
    // No record exists, create one
    await base44.asServiceRole.entities.RateLimit.create({
      user_id: userId,
      limit_key: limitKey,
      window_start: now.toISOString(),
      count: 1
    });

    return {
      allowed: true,
      remaining: limitPerMinute - 1,
      resetAt: new Date(now.getTime() + 60000)
    };
  }
}

/**
 * Rate limit configurations for different actions
 */
export const RATE_LIMITS = {
  RUN_PROMPT: { key: 'run_prompt', limit: 60 },
  SAVE_TASK: { key: 'save_task', limit: 120 },
  CREATE_ITEM: { key: 'create_item', limit: 100 }
};