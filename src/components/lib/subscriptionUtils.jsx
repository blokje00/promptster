/**
 * Centrale utility functies voor subscription/trial access checks
 * Gebruikt door AccessGuard, Header, RequireSubscription, etc.
 */

export function hasValidAccess(user) {
  console.log('🔍 [subscriptionUtils] hasValidAccess called with user:', {
    email: user?.email,
    subscription_status: user?.subscription_status,
    trial_end: user?.trial_end,
    trial_ends_at: user?.trial_ends_at,
    plan_id: user?.plan_id,
    stripe_subscription_id: user?.stripe_subscription_id,
    stripe_customer_id: user?.stripe_customer_id
  });

  if (!user) {
    console.log('❌ [subscriptionUtils] No user - DENIED');
    return false;
  }
  
  // Check active subscription
  if (user.subscription_status === 'active') {
    console.log('✅ [subscriptionUtils] Active subscription - GRANTED');
    return true;
  }
  
  // Check valid trial - support BEIDE veldnamen voor backwards compatibility
  const trialEnd = user.trial_end || user.trial_ends_at;
  if (user.subscription_status === 'trialing' && trialEnd) {
    const isValid = new Date(trialEnd) > new Date();
    console.log('🔍 [subscriptionUtils] Trial check:', {
      trialEnd,
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
  return user?.trial_end || user?.trial_ends_at || null;
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