import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import StartTrialModal from "./StartTrialModal";

/**
 * AccessGuard - Protects pages based on subscription status
 * - pageType="public": accessible to everyone (Features, Legal, Support)
 * - pageType="protected": requires auth AND valid trial/subscription
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
        onSuccess={() => window.location.reload()}
      />
    </>
  );

  // Effect for handling redirects and trial activation
  useEffect(() => {
    // Do nothing while loading
    if (isLoading) return;

    // Public/Free pages don't need checks
    if (pageType === "free" || pageType === "public") return;

    // Check 1: Not logged in
    if (!currentUser) {
      navigate(createPageUrl('Features'));
      return;
    }

    // Check 2: Subscription status - both 'trialing' and 'active' grant access
    const hasValidTrial = currentUser.trial_ends_at && new Date(currentUser.trial_ends_at) > new Date();
    const hasActiveSubscription = 
      (currentUser.subscription_status === 'active' || currentUser.subscription_status === 'trialing') 
      && currentUser.plan_id;

    // Auto-activate trial ONLY on protected pages (like Dashboard), not on Subscription page
    if (!hasValidTrial && !hasActiveSubscription) {
      // If user has never had a trial and is trying to access protected content (not subscription page)
      if (!currentUser.trial_ends_at && !currentUser.plan_id && !location.pathname.includes('subscription')) {
        // Auto-activate trial and continue
        base44.functions.invoke('activateTrial', {}).then(() => {
          window.location.reload();
        }).catch(err => {
          console.error('Auto-trial activation failed:', err);
          navigate(createPageUrl('Subscription'));
        });
        return;
      }
      
      // Otherwise redirect to subscription page
      navigate(createPageUrl('Subscription'));
    }
  }, [currentUser, isLoading, pageType, navigate]);

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

  const hasValidTrial = currentUser.trial_ends_at && new Date(currentUser.trial_ends_at) > new Date();
  const hasActiveSubscription = 
    (currentUser.subscription_status === 'active' || currentUser.subscription_status === 'trialing') 
    && currentUser.plan_id;

  if (!hasValidTrial && !hasActiveSubscription) {
    return renderWithModal(
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // User has valid access
  return children;
}