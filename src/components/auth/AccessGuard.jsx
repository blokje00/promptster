import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";

export default function AccessGuard({ children, pageType = "protected" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser, isLoadingAuth: isUserLoading } = useAuth();

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