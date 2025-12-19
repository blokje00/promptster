/**
 * Centrale utility functies voor subscription/trial access checks
 * Gebruikt door AccessGuard, Header, RequireSubscription, etc.
 */

export function hasValidAccess(user) {
  if (!user) return false;
  
  // Check active subscription
  if (user.subscription_status === 'active') return true;
  
  // Check valid trial - support BEIDE veldnamen voor backwards compatibility
  const trialEnd = user.trial_end || user.trial_ends_at;
  if (user.subscription_status === 'trialing' && trialEnd) {
    return new Date(trialEnd) > new Date();
  }
  
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