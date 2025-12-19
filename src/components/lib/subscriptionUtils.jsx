/**
 * Centrale utility functies voor subscription/trial access checks
 * BELANGRIJK: Gebruikt nu UserProfile als source of truth (niet auth user)
 */

export function hasValidAccess(userProfile, authUser = null) {
  console.log('🔍 [subscriptionUtils] hasValidAccess called:', {
    profile_id: userProfile?.id,
    profile_email: userProfile?.email,
    subscription_status: userProfile?.subscription_status,
    trial_ends_at: userProfile?.trial_ends_at,
    auth_user_role: authUser?.role
  });

  // ADMIN BYPASS - admins hebben ALTIJD toegang
  if (authUser?.role === 'admin') {
    console.log('✅ [subscriptionUtils] ADMIN - GRANTED');
    return true;
  }

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