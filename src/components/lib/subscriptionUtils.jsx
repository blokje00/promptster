/**
 * Centrale utility functies voor subscription/trial access checks
 * CRITICAL: Uses ONLY auth.me() data - NO entity dependencies
 */

export function hasValidAccess(user, authUser = null) {
  console.log('🔍 [subscriptionUtils] hasValidAccess called:', {
    user_email: user?.email,
    subscription_status: user?.subscription_status,
    trial_ends_at: user?.trial_ends_at,
    plan_id: user?.plan_id,
    role: user?.role
  });

  // ADMIN BYPASS - admins hebben ALTIJD toegang
  if (user?.role === 'admin') {
    console.log('✅ [subscriptionUtils] ADMIN - GRANTED');
    return true;
  }

  if (!user) {
    console.log('❌ [subscriptionUtils] No user - DENIED');
    return false;
  }
  
  // Check active subscription
  if (user.subscription_status === 'active') {
    console.log('✅ [subscriptionUtils] Active subscription - GRANTED');
    return true;
  }
  
  // Check valid trial
  if (user.subscription_status === 'trialing' && user.trial_ends_at) {
    const isValid = new Date(user.trial_ends_at) > new Date();
    console.log('🔍 [subscriptionUtils] Trial check:', {
      trial_ends_at: user.trial_ends_at,
      now: new Date().toISOString(),
      isValid
    });
    if (isValid) {
      console.log('✅ [subscriptionUtils] Valid trial - GRANTED');
      return true;
    } else {
      console.log('❌ [subscriptionUtils] Expired trial - DENIED');
      return false;
    }
  }
  
  console.log('❌ [subscriptionUtils] No valid access - DENIED');
  return false;
}

export function getTrialEndDate(user) {
  return user?.trial_ends_at || null;
}

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