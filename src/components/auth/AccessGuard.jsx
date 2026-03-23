import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";

/**
 * AccessGuard - Uses AuthContext (already resolved by AuthenticatedApp)
 * No extra auth query — zero flash, zero race condition.
 */
export default function AccessGuard({ children, pageType = "protected" }) {
  const location = useLocation();
  const { isAuthenticated, isLoadingAuth } = useAuth();

  // Handle redirects only after auth is resolved
  useEffect(() => {
    if (isLoadingAuth) return;
    if (pageType === "free" || pageType === "public") return;
    if (!isAuthenticated) {
      base44.auth.redirectToLogin(location.pathname);
    }
  }, [isAuthenticated, isLoadingAuth, pageType, location.pathname]);

  // AuthenticatedApp already waits for isLoadingAuth=false before rendering routes,
  // so this spinner should almost never be visible.
  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Public/free pages — always render
  if (pageType === "free" || pageType === "public") {
    return children;
  }

  // Protected but not authenticated — show spinner while redirect fires
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return children;
}