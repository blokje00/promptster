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
 * - pageType="free": accessible to everyone
 * - pageType="premium": requires active trial or subscription
 */
export default function AccessGuard({ children, pageType = "free" }) {
  const navigate = useNavigate();
  const [showTrialModal, setShowTrialModal] = useState(false);

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Allow free pages for everyone
  if (pageType === "free") {
    return children;
  }

  // Premium pages - require login first
  if (pageType === "premium") {
    if (!currentUser) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Login Required
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Please log in to access this page
            </p>
            <Button 
              onClick={() => base44.auth.redirectToLogin()}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Get Started
            </Button>
          </div>
        </div>
      );
    }

    // Check subscription status
    const now = new Date();
    const trialEnd = currentUser.trial_end ? new Date(currentUser.trial_end) : null;
    const hasActiveTrial = currentUser.subscription_status === 'trial' && trialEnd && trialEnd > now;
    const hasActiveSubscription = currentUser.subscription_status === 'active';
    const hasNoTrial = currentUser.subscription_status === 'none';

    // User has no trial yet - show trial activation prompt
    if (hasNoTrial) {
      return (
        <>
          <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Start Your Free Trial
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Get 14 days of full access to all premium features. No credit card required.
              </p>
              <div className="space-y-3 mb-6">
                <Button 
                  onClick={() => setShowTrialModal(true)}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Free Trial
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate(createPageUrl("Dashboard"))}
                  className="w-full"
                >
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </div>
          <StartTrialModal 
            isOpen={showTrialModal}
            onClose={() => setShowTrialModal(false)}
            onSuccess={() => window.location.reload()}
          />
        </>
      );
    }

    // Trial expired or no active subscription
    if (!hasActiveTrial && !hasActiveSubscription) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Subscription Required
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Your trial has ended. Subscribe to continue using Promptster
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => navigate(createPageUrl("Subscription"))}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <Crown className="w-4 h-4 mr-2" />
                View Plans
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate(createPageUrl("Dashboard"))}
                className="w-full"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Has access - render children
    return children;
  }

  return children;
}