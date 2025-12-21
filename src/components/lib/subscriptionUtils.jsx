// Debug logging helper - only log in dev or when explicitly enabled
const debugLog = (...args) => {
  if (typeof window !== 'undefined' && (import.meta.env.DEV || localStorage.getItem('debugAccess') === '1')) {
    console.log(...args);
  }
};

/**
 * CENTRALE HELPER - Check if user has paid or trial subscription
 * Use this everywhere for consistent subscription checks
 * 
 * @param {string} status - Subscription status from user.subscription_status
 * @returns {boolean} - true if active or trialing
 */
export function isPaidOrTrial(status) {
  return ["active", "trialing"].includes(status);
}

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
    debugLog('[subscriptionUtils] DENIED: No user object');
    return false;
  }

  // Rule 1: ADMIN BYPASS - admins always have access
  if (user.role === 'admin') {
    debugLog('[subscriptionUtils] GRANTED: Admin bypass');
    return true;
  }
  
  // Rule 2: Active subscription = access
  if (user.subscription_status === 'active') {
    debugLog('[subscriptionUtils] GRANTED: Active subscription');
    return true;
  }
  
  // Rule 3: Valid trial = access
  if (user.subscription_status === 'trialing') {
    // Support both trial_ends_at and trial_end
    const trialEnd = user.trial_ends_at || user.trial_end;
    
    if (!trialEnd) {
      debugLog('[subscriptionUtils] DENIED: Trialing but no end date');
      return false;
    }
    
    try {
      const endDate = new Date(trialEnd);
      const now = new Date();
      const isValid = endDate > now;
      
      debugLog('[subscriptionUtils] Trial check:', {
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
  debugLog('[subscriptionUtils] DENIED: No valid subscription', {
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

/**
 * Check if user has a valid local access latch (10min TTL fallback)
 * Used as bridge when auth.me() doesn't have subscription fields yet
 * 
 * @returns {boolean} - true if valid latch exists
 */
export function hasValidLatch() {
  // Debug logging helper - only in dev or with flag
  const debugLog = (...args) => {
    if (typeof window !== 'undefined' && (import.meta.env.DEV || localStorage.getItem('debugAccess') === '1')) {
      console.log(...args);
    }
  };

  try {
    const latchString = localStorage.getItem("promptster_access_latch");
    if (!latchString) return false;

    const latch = JSON.parse(latchString);
    const now = Date.now();
    const setAt = new Date(latch.set_at).getTime();
    const trialEnd = new Date(latch.trial_ends_at).getTime();
    
    // Latch is valid for a short period (10 minutes) AND trial is not expired
    const latchTTL = 10 * 60 * 1000; // 10 minutes
    const isFresh = (now - setAt) < latchTTL;
    const isTrialActive = trialEnd > now;

    if (latch.status === "trialing" && isFresh && isTrialActive) {
      debugLog('[subscriptionUtils] GRANTED: Valid local access latch found');
      return true;
    }
    
    // Clean up expired latch
    if (!isFresh || !isTrialActive) {
      debugLog('[subscriptionUtils] Removing expired access latch');
      localStorage.removeItem("promptster_access_latch");
    }
  } catch (e) {
    console.error('[subscriptionUtils] Error parsing access latch:', e);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem("promptster_access_latch");
    }
  }
  return false;
}

/**
 * Get subscription state with fallback behavior
 * CRITICAL: Missing status = treat as Free (not denied)
 * 
 * @param {Object} user - User object from base44.auth.me()
 * @returns {Object} - { tier: "free"|"trial"|"active", isValidAccess: boolean, trialEnd?: Date|null }
 */
export function getSubscriptionState(user) {
  if (!user) {
    return { tier: 'free', isValidAccess: false, trialEnd: null };
  }

  // Admin always has access
  if (user.role === 'admin') {
    return { tier: 'active', isValidAccess: true, trialEnd: null };
  }

  // Active subscription
  if (user.subscription_status === 'active') {
    return { tier: 'active', isValidAccess: true, trialEnd: null };
  }

  // Valid trial
  if (user.subscription_status === 'trialing') {
    const trialEnd = getTrialEndDate(user);
    if (trialEnd) {
      const endDate = new Date(trialEnd);
      const isValid = endDate > new Date();
      return { 
        tier: 'trial', 
        isValidAccess: isValid, 
        trialEnd: endDate 
      };
    }
  }

  // Unknown/missing status = treat as Free (allows navigation, no premium features)
  // CRITICAL: This prevents Stripe sync timing issues from blocking the app
  return { tier: 'free', isValidAccess: false, trialEnd: null };
}