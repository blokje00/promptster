import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * AccessGuard - Simplified authentication guard
 * 
 * RULES:
 * 1. pageType="public" or "free": accessible to everyone
 * 2. pageType="protected": requires authentication only
 * 3. No subscription checks - app is fully free
 */
export default function AccessGuard({ children, pageType = "protected" }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Check authentication only
  const { data: currentUser, isLoading: isUserLoading } = useQuery({
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
    staleTime: 30000,
  });

  // Handle redirects
  useEffect(() => {
    if (isUserLoading) return;

    // Public pages = always allow
    if (pageType === "free" || pageType === "public") return;

    // Protected page without auth → redirect to login
    if (!currentUser) {
      console.log('[AccessGuard] Not authenticated, redirecting to login');
      base44.auth.redirectToLogin(location.pathname);
      return;
    }
  }, [currentUser, isUserLoading, pageType, navigate, location]);

  // Loading state
  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Public pages
  if (pageType === "free" || pageType === "public") {
    return children;
  }

  // Protected pages - show spinner while redirect happens if not authenticated
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Authenticated - render content
  return children;
}