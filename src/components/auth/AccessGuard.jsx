import React, { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import StartTrialModal from "./StartTrialModal";
import { hasValidAccess, hasValidLatch } from "@/components/lib/subscriptionUtils";
import { useAppSettings } from "@/components/hooks/useAppSettings";

/**
 * AccessGuard - HARDENED subscription gate
 * 
 * CRITICAL RULES:
 * 1. ONLY depends on base44.auth.me() - ZERO entity dependencies
 * 2. Entity/query errors can NEVER block access
 * 3. Only subscription_status + trial_ends_at control access
 * 4. Admins ALWAYS bypass all checks
 * 5. Data unavailable ≠ access denied
 * 
 * ALLOWED MODES:
 * - pageType="public" or "free": accessible to everyone
 * - pageType="protected": requires auth AND valid subscription/trial
 */
export default function AccessGuard({ children, pageType = "protected" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showTrialModal, setShowTrialModal] = useState(false);

  // Fetch global app settings
  const { settings: appSettings, isLoading: settingsLoading } = useAppSettings();

  // ONLY auth.me() - NO entity queries allowed
  const { data: currentUser, isLoading: isUserLoading, error: authError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        console.warn('[AccessGuard] Auth failed:', error.message);
        return null;
      }
    },
    retry: false,
    staleTime: 30000, // 30s cache to prevent flicker
  });

  const isLoading = isUserLoading || settingsLoading;

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

  // Effect for handling redirects - HARDENED: only auth.me() data matters
  useEffect(() => {
    // Debug logging helper - only in dev or with flag
    const debugLog = (...args) => {
      if (import.meta.env.DEV || localStorage.getItem('debugAccess') === '1') {
        console.log(...args);
      }
    };
    
    // Structured debug logging (non-blocking)
    debugLog('[AccessGuard] ==== ACCESS CHECK START ====');
    debugLog('[AccessGuard] Loading:', isLoading);
    debugLog('[AccessGuard] PageType:', pageType);
    debugLog('[AccessGuard] Path:', location.pathname);
    debugLog('[AccessGuard] User:', currentUser?.email || 'none');
    debugLog('[AccessGuard] Role:', currentUser?.role || 'none');
    debugLog('[AccessGuard] Subscription:', currentUser?.subscription_status || 'none');
    debugLog('[AccessGuard] Trial ends:', currentUser?.trial_ends_at || 'none');

    // Rule 1: Do nothing while loading auth
    if (isLoading) {
      debugLog('[AccessGuard] Status: WAITING (auth loading)');
      debugLog('[AccessGuard] ==== ACCESS CHECK END ====\n');
      return;
    }

    // Rule 2: Public pages = always allow
    if (pageType === "free" || pageType === "public") {
      debugLog('[AccessGuard] Status: GRANTED (public page)');
      debugLog('[AccessGuard] ==== ACCESS CHECK END ====\n');
      return;
    }

    // Rule 3: SOFT GATE - Not logged in → redirect to Features with ?next=
    if (!currentUser) {
      const featuresPath = createPageUrl('Features').replace(window.location.origin, '');
      const subscriptionPath = createPageUrl('Subscription').replace(window.location.origin, '');
      
      // Allow Features and Subscription pages without auth
      if (location.pathname === featuresPath || location.pathname === subscriptionPath) {
        debugLog('[AccessGuard] Status: GRANTED (public page, no auth needed)');
        debugLog('[AccessGuard] ==== ACCESS CHECK END ====\n');
        return;
      }
      
      // Protected page without auth → soft redirect to Features
      debugLog('[AccessGuard] Status: DENIED (no auth)');
      debugLog('[AccessGuard] Action: Soft redirect to Features (save intended route)');
      debugLog('[AccessGuard] ==== ACCESS CHECK END ====\n');
      navigate(`${createPageUrl('Features')}?next=${encodeURIComponent(location.pathname)}`, { replace: true });
      return;
    }

    // Rule 4: Check subscription access (pure function, no async) OR local latch OR app-wide access
    const hasActiveSubscription = hasValidAccess(currentUser, appSettings) || hasValidLatch();
    debugLog('[AccessGuard] Subscription check:', {
      hasAccess: hasActiveSubscription,
      isAdmin: currentUser?.role === 'admin',
      status: currentUser?.subscription_status,
      trialValid: currentUser?.trial_ends_at ? new Date(currentUser.trial_ends_at) > new Date() : false,
      hasLatch: hasValidLatch(),
      appWideAccess: appSettings?.app_wide_access_enabled
    });

    // Rule 5: No subscription → redirect to Subscription page
    const subscriptionPath = createPageUrl('Subscription').replace(window.location.origin, '');
    if (!hasActiveSubscription && location.pathname !== subscriptionPath) {
      debugLog('[AccessGuard] Status: DENIED (invalid subscription)');
      debugLog('[AccessGuard] Action: Redirect to Subscription');
      debugLog('[AccessGuard] ==== ACCESS CHECK END ====\n');
      navigate(createPageUrl('Subscription'));
      return;
    }

    // Rule 6: Valid access → render children
    if (hasActiveSubscription) {
      debugLog('[AccessGuard] Status: GRANTED (valid subscription)');
      debugLog('[AccessGuard] ==== ACCESS CHECK END ====\n');
    }
  }, [currentUser, isLoading, pageType, navigate, location]);

  // --- Render Logic ---
  
  // Debug helper for render logs
  const debugLog = (...args) => {
    if (import.meta.env.DEV || (typeof localStorage !== 'undefined' && localStorage.getItem('debugAccess') === '1')) {
      console.log(...args);
    }
  };

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

  // HARDENED RENDER LOGIC - deterministic, no data dependencies
  
  if (!currentUser) {
    // Auth pending or failed - show spinner while redirect happens
    return renderWithModal(
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Admin bypass - admins ALWAYS have access regardless of subscription
  if (currentUser.role === 'admin') {
    debugLog('[AccessGuard] Rendering: ADMIN BYPASS');
    return children;
  }

  // Check subscription using ONLY auth.me() data (pure, sync) OR local latch OR app-wide access
  const hasActiveSubscription = hasValidAccess(currentUser, appSettings) || hasValidLatch();

  if (!hasActiveSubscription) {
    // No valid subscription - show spinner while redirect happens
    debugLog('[AccessGuard] Rendering: REDIRECT PENDING');
    return renderWithModal(
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Valid access granted - render protected content
  debugLog('[AccessGuard] Rendering: PROTECTED CONTENT');
  return children;
}