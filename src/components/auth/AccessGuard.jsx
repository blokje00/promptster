import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import SoftPaywallModal from './SoftPaywallModal';
import { createPageUrl } from '@/utils';

/**
 * Central access guard for all protected pages
 * Handles: authentication, trial activation, trial expiration, and access control
 */

// Pages that are always accessible regardless of subscription status
const ALWAYS_ACCESSIBLE_PAGES = [
  '/features',
  '/subscription',
  '/legal',
  '/support',
  '/aibackoffice'
];

// Premium pages that require active subscription or trial
const PREMIUM_PAGES = [
  '/multiprompt',
  '/checks',
  '/additem',
  '/edititem',
  '/viewitem'
];

export function canAccessPage(pathname, subscriptionStatus) {
  const lowerPath = pathname.toLowerCase();
  
  // Always accessible pages
  if (ALWAYS_ACCESSIBLE_PAGES.some(page => lowerPath.includes(page))) {
    return { allowed: true, reason: 'always_accessible' };
  }

  // Dashboard is always accessible (soft paywall inside)
  if (lowerPath.includes('/dashboard') || lowerPath === '/') {
    return { allowed: true, reason: 'dashboard' };
  }

  // Active subscription or trial allows everything
  if (subscriptionStatus === 'active' || subscriptionStatus === 'trial') {
    return { allowed: true, reason: 'has_access' };
  }

  // Trial expired users can see dashboard but not premium features
  if (subscriptionStatus === 'trial_expired') {
    if (PREMIUM_PAGES.some(page => lowerPath.includes(page))) {
      return { allowed: false, reason: 'trial_expired' };
    }
    return { allowed: true, reason: 'limited_access' };
  }

  // No subscription ('none') - redirect to trial activation
  return { allowed: false, reason: 'needs_trial' };
}

export default function AccessGuard({ children, pageType = 'premium' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [showPaywall, setShowPaywall] = useState(false);
  const [trialActivationAttempted, setTrialActivationAttempted] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false,
  });

  // Check trial status
  const { data: trialStatus, isLoading: trialLoading } = useQuery({
    queryKey: ['trialStatus', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const response = await base44.functions.invoke('checkTrialStatus', {});
      return response.data;
    },
    enabled: !!user,
    refetchInterval: 60000, // Recheck every minute
  });

  // Activate trial mutation
  const activateTrialMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('activateTrial', {});
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['trialStatus'] });
    }
  });

  // Auto-activate trial for new users
  useEffect(() => {
    if (user && trialStatus && !trialActivationAttempted) {
      if (trialStatus.needsTrialActivation || trialStatus.subscription_status === 'none') {
        setTrialActivationAttempted(true);
        activateTrialMutation.mutate();
      }
    }
  }, [user, trialStatus, trialActivationAttempted]);

  // Access control logic
  useEffect(() => {
    if (!userLoading && !trialLoading) {
      // Not authenticated - redirect to login
      if (!user) {
        base44.auth.redirectToLogin(location.pathname);
        return;
      }

      // Still activating trial
      if (activateTrialMutation.isPending) {
        return;
      }

      // Check page access
      const subscriptionStatus = trialStatus?.subscription_status || user.subscription_status || 'none';
      const access = canAccessPage(location.pathname, subscriptionStatus);

      if (!access.allowed) {
        if (access.reason === 'trial_expired') {
          // Show soft paywall for expired trial users trying to access premium features
          setShowPaywall(true);
        } else if (access.reason === 'needs_trial') {
          // This shouldn't happen if auto-activation works, but just in case
          navigate(createPageUrl('Dashboard'));
        }
      } else {
        setShowPaywall(false);
      }
    }
  }, [user, trialStatus, userLoading, trialLoading, location.pathname, activateTrialMutation.isPending]);

  // Loading state
  if (userLoading || trialLoading || activateTrialMutation.isPending || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            {activateTrialMutation.isPending ? 'Starting your free trial...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  const subscriptionStatus = trialStatus?.subscription_status || user.subscription_status || 'none';
  const access = canAccessPage(location.pathname, subscriptionStatus);

  // Show soft paywall modal
  if (showPaywall && subscriptionStatus === 'trial_expired') {
    return (
      <>
        {children}
        <SoftPaywallModal 
          isOpen={showPaywall} 
          onClose={() => navigate(createPageUrl('Dashboard'))}
        />
      </>
    );
  }

  // Render children if access is allowed
  if (access.allowed) {
    return children;
  }

  // Fallback - redirect to dashboard
  return null;
}