import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import StartTrialModal from "./StartTrialModal";
import { hasValidAccess } from "@/components/lib/subscriptionUtils";

/**
 * AccessGuard - Protects pages based on subscription status
 * CRITICAL: Only uses base44.auth.me() - NO entity fetches
 * - pageType="public" or "free": accessible to everyone
 * - pageType="protected": requires auth AND valid subscription/trial
 */
export default function AccessGuard({ children, pageType = "protected" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showTrialModal, setShowTrialModal] = useState(false);

  // ONLY auth.me() - no entity dependencies
  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  const isLoading = isUserLoading;

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

  // Effect for handling redirects - ONLY uses auth.me() data
  useEffect(() => {
    console.log('🛡️ [AccessGuard] Check:', {
      isLoading,
      pageType,
      pathname: location.pathname,
      user: currentUser?.email,
      subscription_status: currentUser?.subscription_status,
      trial_ends_at: currentUser?.trial_ends_at,
      role: currentUser?.role
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

    // Check 2: Subscription status from auth.me() (met admin bypass)
    const hasActiveSubscription = hasValidAccess(currentUser, currentUser);
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

  // Admin bypass - admins hebben altijd toegang
  if (currentUser.role === 'admin') {
    return children;
  }

  // Check subscription using ONLY auth.me() data
  const hasActiveSubscription = hasValidAccess(currentUser, currentUser);

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