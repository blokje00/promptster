import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import StartTrialModal from "./StartTrialModal";
import { hasValidAccess } from "@/components/lib/subscriptionUtils";
import { getOrCreateUserProfile } from "@/components/lib/userProfileHelper";

/**
 * AccessGuard - Protects pages based on subscription status
 * - pageType="public" or "free": accessible to everyone (Features, Legal, Support)
 * - pageType="protected" or "premium": requires auth AND valid trial/subscription
 * 
 * Note: Subscription.jsx heeft GEEN AccessGuard nodig - die pagina moet altijd
 * toegankelijk zijn zodat gebruikers hun subscription kunnen beheren.
 */
export default function AccessGuard({ children, pageType = "protected" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showTrialModal, setShowTrialModal] = useState(false);

  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  // Fetch UserProfile (source of truth voor subscription)
  const { data: userProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['userProfile', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return null;
      return await getOrCreateUserProfile(currentUser);
    },
    enabled: !!currentUser,
  });

  const isLoading = isUserLoading || (currentUser && isProfileLoading);

  // Render StartTrialModal consistently at the bottom
  const renderWithModal = (content) => (
    <>
      {content}
      <StartTrialModal 
        isOpen={showTrialModal}
        onClose={() => setShowTrialModal(false)}
        redirectTo="Multiprompt"
      />
    </>
  );

  // Effect for handling redirects and trial activation
  useEffect(() => {
    console.log('🛡️ [AccessGuard] useEffect triggered:', {
      isLoading,
      pageType,
      pathname: location.pathname,
      user: currentUser?.email,
      profile: userProfile ? {
        id: userProfile.id,
        subscription_status: userProfile.subscription_status,
        trial_ends_at: userProfile.trial_ends_at,
        plan_id: userProfile.plan_id
      } : null
    });

    // Do nothing while loading
    if (isLoading) {
      console.log('⏳ [AccessGuard] Still loading...');
      return;
    }

    // Public/Free pages don't need checks
    if (pageType === "free" || pageType === "public") {
      console.log('🌐 [AccessGuard] Public page - access allowed');
      return;
    }

    // Check 1: Not logged in - use Base44 auth redirect
    if (!currentUser) {
      console.log('❌ [AccessGuard] No user - redirecting to login');
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    // Check 2: No profile yet (wordt aangemaakt via query)
    if (!userProfile) {
      console.log('⏳ [AccessGuard] Waiting for profile...');
      return;
    }

    // Check 3: Subscription status via UserProfile (met admin bypass)
    const hasActiveSubscription = hasValidAccess(userProfile, currentUser);
    console.log('🔐 [AccessGuard] Access check result:', { 
      hasActiveSubscription,
      isAdmin: currentUser?.role === 'admin' 
    });

    if (!hasActiveSubscription && location.pathname !== createPageUrl('Subscription').replace(window.location.origin, '')) {
      console.log('⚠️ [AccessGuard] No active subscription - redirecting to Subscription page');
      navigate(createPageUrl('Subscription'));
    } else if (hasActiveSubscription) {
      console.log('✅ [AccessGuard] User has valid access - rendering protected content');
    }
  }, [currentUser, userProfile, isLoading, pageType, navigate, location]);

  // --- Render Logic ---

  if (isLoading) {
    return renderWithModal(
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (pageType === "free" || pageType === "public") {
    return children;
  }

  // If we are here, we are in a protected route and not loading.
  // The useEffect will handle the redirect if access is denied.
  // While waiting for the redirect, we show the spinner to prevent flashing protected content.

  if (!currentUser) {
    return renderWithModal(
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Admin bypass - admins hoeven niet te wachten op profile
  if (currentUser.role === 'admin') {
    return children;
  }

  // Reguliere users moeten profile hebben
  if (!userProfile) {
    return renderWithModal(
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const hasActiveSubscription = hasValidAccess(userProfile, currentUser);

  if (!hasActiveSubscription) {
    return renderWithModal(
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // User has valid access
  return children;
}