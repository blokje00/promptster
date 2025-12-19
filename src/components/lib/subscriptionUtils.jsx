/**
 * HARDENED subscription access checker
 * 
 * CRITICAL RULES:
 * 1. Pure function - NO async calls
 * 2. ONLY reads auth.me() data (user object)
 * 3. NO entity dependencies
 * 4. NO side effects
 * 5. Deterministic - same input = same output
 * 
 * @param {Object} user - User object from base44.auth.me()
 * @returns {boolean} - true if user has valid access
 */
export function hasValidAccess(user) {
  // Defensive: null/undefined check
  if (!user) {
    console.log('[subscriptionUtils] DENIED: No user object');
    return false;
  }

  // Rule 1: ADMIN BYPASS - admins always have access
  if (user.role === 'admin') {
    console.log('[subscriptionUtils] GRANTED: Admin bypass');
    return true;
  }
  
  // Rule 2: Active subscription = access
  if (user.subscription_status === 'active') {
    console.log('[subscriptionUtils] GRANTED: Active subscription');
    return true;
  }
  
  // Rule 3: Valid trial = access
  if (user.subscription_status === 'trialing') {
    // Support both trial_ends_at and trial_end
    const trialEnd = user.trial_ends_at || user.trial_end;
    
    if (!trialEnd) {
      console.log('[subscriptionUtils] DENIED: Trialing but no end date');
      return false;
    }
    
    try {
      const endDate = new Date(trialEnd);
      const now = new Date();
      const isValid = endDate > now;
      
      console.log('[subscriptionUtils] Trial check:', {
        endDate: endDate.toISOString(),
        now: now.toISOString(),
        isValid,
        status: isValid ? 'GRANTED' : 'DENIED (expired)'
      });
      
      return isValid;
    } catch (error) {
      console.warn('[subscriptionUtils] Invalid trial date format:', trialEnd);
      return false;
    }
  }
  
  // Rule 4: No valid subscription = no access
  console.log('[subscriptionUtils] DENIED: No valid subscription', {
    status: user.subscription_status || 'none',
    email: user.email
  });
  return false;
}

/**
 * Get trial end date (supports both field names)
 * @param {Object} user - User object from base44.auth.me()
 * @returns {string|null} - ISO date string or null
 */
export function getTrialEndDate(user) {
  if (!user) return null;
  return user.trial_ends_at || user.trial_end || null;
}

/**
 * Get human-readable access denied reason
 * @param {Object} user - User object from base44.auth.me()
 * @returns {string} - Reason code
 */
export function getAccessDeniedReason(user) {
  if (!user) return 'not_logged_in';
  if (!user.subscription_status || user.subscription_status === 'none') return 'no_subscription';
  if (user.subscription_status === 'trialing') {
    const trialEnd = getTrialEndDate(user);
    if (!trialEnd || new Date(trialEnd) <= new Date()) return 'trial_expired';
  }
  if (user.subscription_status === 'canceled') return 'subscription_canceled';
  return 'unknown';
}