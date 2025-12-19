import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import StartTrialModal from "./StartTrialModal";
import { hasValidAccess } from "@/components/lib/subscriptionUtils";

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

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me().catch(() => null),
  });

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
      user: currentUser ? {
        email: currentUser.email,
        subscription_status: currentUser.subscription_status,
        trial_end: currentUser.trial_end,
        plan_id: currentUser.plan_id
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

    // Check 2: Subscription status using centralized utility
    const hasActiveSubscription = hasValidAccess(currentUser);
    console.log('🔐 [AccessGuard] Access check result:', { hasActiveSubscription });

    // REMOVED: Auto-trial activation - Stripe Payment Links handle trials
    // Users must complete Stripe checkout to activate subscription/trial
    if (!hasActiveSubscription && location.pathname !== createPageUrl('Subscription').replace(window.location.origin, '')) {
      console.log('⚠️ [AccessGuard] No active subscription - redirecting to Subscription page');
      navigate(createPageUrl('Subscription'));
    } else if (hasActiveSubscription) {
      console.log('✅ [AccessGuard] User has valid access - rendering protected content');
    }
  }, [currentUser, isLoading, pageType, navigate, location]);

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

  const hasActiveSubscription = hasValidAccess(currentUser);

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