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
        redirectTo="Multiprompt"
      />
    </>
  );

  // Effect for handling redirects and trial activation
  useEffect(() => {
    // Do nothing while loading
    if (isLoading) return;

    // Public/Free pages don't need checks
    if (pageType === "free" || pageType === "public") return;

    // Check 1: Not logged in - use Base44 auth redirect
    if (!currentUser) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    // Check 2: Subscription status - 'trialing' and 'active' grant access
    // CRITICAL: Also check if trial has expired
    const isTrialActive = currentUser.subscription_status === 'trialing' && 
      currentUser.trial_end && 
      new Date(currentUser.trial_end) > new Date();
    
    const hasActiveSubscription = 
      (currentUser.subscription_status === 'active' || isTrialActive);

    // REMOVED: Auto-trial activation - Stripe Payment Links handle trials
    // Users must complete Stripe checkout to activate subscription/trial
    if (!hasActiveSubscription && location.pathname !== createPageUrl('Subscription').replace(window.location.origin, '')) {
      navigate(createPageUrl('Subscription'));
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

  const isTrialActive = currentUser.subscription_status === 'trialing' && 
    currentUser.trial_end && 
    new Date(currentUser.trial_end) > new Date();
  
  const hasActiveSubscription = 
    (currentUser.subscription_status === 'active' || isTrialActive);

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