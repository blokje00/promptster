import { base44 } from "@/api/base44Client";

/**
 * Helper om UserProfile te fetchen OF aan te maken
 * @param {Object} authUser - Base44 auth user object
 * @returns {Promise<Object>} UserProfile record
 */
export async function getOrCreateUserProfile(authUser) {
  if (!authUser?.id) {
    console.error('❌ [userProfileHelper] No authUser provided');
    throw new Error('User required');
  }

  console.log('🔍 [userProfileHelper] Looking for profile for user:', authUser.id);

  // Probeer bestaand profiel te vinden
  const existing = await base44.entities.UserProfile.filter({ user_id: authUser.id });
  
  if (existing && existing.length > 0) {
    console.log('✅ [userProfileHelper] Found existing profile:', existing[0].id);
    return existing[0];
  }

  // Maak nieuw profiel aan
  console.log('🆕 [userProfileHelper] Creating new profile for:', authUser.email);
  const newProfile = await base44.entities.UserProfile.create({
    user_id: authUser.id,
    email: authUser.email,
    subscription_status: 'none'
  });

  console.log('✅ [userProfileHelper] Created profile:', newProfile.id);
  return newProfile;
}

/**
 * Backend versie (met service role voor admin/webhook access)
 */
export async function getOrCreateUserProfileServiceRole(base44Client, authUser) {
  if (!authUser?.id) {
    throw new Error('User required');
  }

  console.log('[userProfileHelper-SR] Looking for profile for user:', authUser.id);

  const existing = await base44Client.asServiceRole.entities.UserProfile.filter({ user_id: authUser.id });
  
  if (existing && existing.length > 0) {
    console.log('[userProfileHelper-SR] Found existing profile:', existing[0].id);
    return existing[0];
  }

  console.log('[userProfileHelper-SR] Creating new profile for:', authUser.email);
  const newProfile = await base44Client.asServiceRole.entities.UserProfile.create({
    user_id: authUser.id,
    email: authUser.email,
    subscription_status: 'none',
    created_by: authUser.email
  });

  console.log('[userProfileHelper-SR] Created profile:', newProfile.id);
  return newProfile;
}