/**
 * Privacy-Friendly Activity Logger
 * 
 * PRIVACY PRINCIPLES:
 * - NO passwords or auth tokens are ever logged
 * - NO full prompt content is logged (only IDs or short labels)
 * - NO personal data beyond user ID/email for security tracking
 * - Logs are admin-only readable via RLS
 * 
 * Only log what's necessary for security monitoring and debugging critical issues.
 * 
 * @module logger
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Log an activity event with privacy safeguards
 * 
 * @param {object} base44 - Base44 client instance (with service role access)
 * @param {string} eventType - Type of event (login_success, subscription_updated, etc.)
 * @param {object} options - Event options
 * @param {string} [options.userId] - User ID (if applicable)
 * @param {string} [options.userEmail] - User email (if applicable)
 * @param {object} [options.payload] - Additional event data (NO SENSITIVE DATA)
 * @param {string} [options.ipAddress] - IP address of request
 * @param {string} [options.userAgent] - User agent string
 * @returns {Promise<void>}
 */
export async function logEvent(base44, eventType, options = {}) {
  try {
    // Sanitize payload - remove any potentially sensitive fields
    const sanitizedPayload = sanitizePayload(options.payload || {});

    await base44.asServiceRole.entities.ActivityLog.create({
      event_type: eventType,
      user_id: options.userId || null,
      user_email: options.userEmail || null,
      payload: sanitizedPayload,
      ip_address: options.ipAddress || null,
      user_agent: options.userAgent || null
    });
  } catch (error) {
    // Fail silently - don't let logging errors break the app
    console.error('Failed to log event:', error.message);
  }
}

/**
 * Sanitize payload to remove sensitive data
 * 
 * @param {object} payload - Raw payload object
 * @returns {object} Sanitized payload
 */
function sanitizePayload(payload) {
  const sanitized = { ...payload };
  
  // Remove sensitive fields
  const sensitiveFields = [
    'password',
    'token',
    'access_token',
    'refresh_token',
    'api_key',
    'secret',
    'prompt_content',
    'full_content',
    'personal_data'
  ];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      delete sanitized[field];
    }
  });

  // Truncate long strings (except IDs)
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'string' && !key.includes('id') && sanitized[key].length > 200) {
      sanitized[key] = sanitized[key].substring(0, 200) + '... [truncated]';
    }
  });

  return sanitized;
}

/**
 * Helper to extract IP and User Agent from request
 * 
 * @param {Request} req - HTTP request object
 * @returns {object} Object with ipAddress and userAgent
 */
export function extractRequestMetadata(req) {
  return {
    ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown'
  };
}

/**
 * Pre-defined event types for consistent logging
 */
export const EVENT_TYPES = {
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_UPDATED: 'subscription_updated',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  CRITICAL_ERROR: 'critical_error',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded'
};