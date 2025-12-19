/**
 * Centrale utility functies voor subscription/trial access checks
 * BELANGRIJK: Gebruikt nu UserProfile als source of truth (niet auth user)
 */

export function hasValidAccess(userProfile) {
  console.log('🔍 [subscriptionUtils] hasValidAccess called with profile:', {
    id: userProfile?.id,
    user_id: userProfile?.user_id,
    email: userProfile?.email,
    subscription_status: userProfile?.subscription_status,
    trial_ends_at: userProfile?.trial_ends_at,
    plan_id: userProfile?.plan_id,
    stripe_subscription_id: userProfile?.stripe_subscription_id
  });

  if (!userProfile) {
    console.log('❌ [subscriptionUtils] No profile - DENIED');
    return false;
  }
  
  // Check active subscription
  if (userProfile.subscription_status === 'active') {
    console.log('✅ [subscriptionUtils] Active subscription - GRANTED');
    return true;
  }
  
  // Check valid trial
  if (userProfile.subscription_status === 'trialing' && userProfile.trial_ends_at) {
    const isValid = new Date(userProfile.trial_ends_at) > new Date();
    console.log('🔍 [subscriptionUtils] Trial check:', {
      trial_ends_at: userProfile.trial_ends_at,
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

export function getTrialEndDate(userProfile) {
  return userProfile?.trial_ends_at || null;
}

export function getAccessDeniedReason(userProfile) {
  if (!userProfile) return 'not_logged_in';
  if (!userProfile.subscription_status || userProfile.subscription_status === 'none') return 'no_subscription';
  if (userProfile.subscription_status === 'trialing') {
    const trialEnd = getTrialEndDate(userProfile);
    if (!trialEnd || new Date(trialEnd) <= new Date()) return 'trial_expired';
  }
  if (userProfile.subscription_status === 'canceled') return 'subscription_canceled';
  return 'unknown';
}