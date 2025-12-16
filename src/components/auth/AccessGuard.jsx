import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Crown, Lock, Sparkles } from "lucide-react";
import StartTrialModal from "./StartTrialModal";

/**
 * AccessGuard - Protects pages based on subscription status
 * - pageType="public": accessible to everyone (Features, Legal, Support)
 * - pageType="protected": requires auth AND valid trial/subscription
 */
export default function AccessGuard({ children, pageType = "protected" }) {
  const navigate = useNavigate();
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

  // Early returns AFTER all hooks
  if (isLoading) {
    return renderWithModal(
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (pageType === "free") {
    return children;
  }

  // Public pages accessible without login
  if (pageType === "public") {
    return children;
  }

  // Protected pages - require auth AND valid trial/subscription
  if (!currentUser) {
    // Not logged in - redirect to Features page
    navigate('/Features');
    return renderWithModal(
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Check if user has valid trial or active subscription
  const hasValidTrial = currentUser.trial_end && new Date(currentUser.trial_end) > new Date();
  const hasActiveSubscription = currentUser.subscription_status === 'active' && currentUser.plan_id;

  if (!hasValidTrial && !hasActiveSubscription) {
    // Trial expired and no subscription - show paywall
    navigate('/Subscription');
    return renderWithModal(
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // User has valid access
  return children;
}