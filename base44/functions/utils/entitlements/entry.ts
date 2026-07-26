/**
 * Shared subscription entitlement checks for backend functions.
 *
 * Single source of truth for the PRO/Vision gate so the check can never
 * drift between analyzeScreenshotWithCache and analyzeScreenshotVision.
 *
 * @module entitlements
 */

/**
 * Whether the user may use PRO features (Vision OCR etc.).
 *
 * Rules:
 * - Admins: always
 * - PRO plan (>= €19.95/month): always
 * - Starter plan (€9.95/€9.99): only while subscription is trialing and trial not expired
 *
 * @param {object} user - Base44 user record from base44.auth.me()
 * @returns {boolean}
 */
export function hasProAccess(user: any): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;

  const monthlyPrice = user.monthly_price_amount || 0;
  if (monthlyPrice >= 1995) return true;

  if ((monthlyPrice === 995 || monthlyPrice === 999) && user.subscription_status === 'trialing') {
    const trialEnd = user.trial_ends_at || user.trial_end;
    if (trialEnd && new Date(trialEnd) > new Date()) return true;
  }

  return false;
}

/**
 * Standard 403 response body for a denied PRO feature.
 *
 * @param {object} user - Base44 user record
 * @returns {Response}
 */
export function proAccessDeniedResponse(user: any): Response {
  return Response.json({
    ok: false,
    error: 'Vision OCR is only available in PRO plan or during Starter trial',
    requires_upgrade: true,
    subscription_status: user?.subscription_status
  }, { status: 403 });
}
