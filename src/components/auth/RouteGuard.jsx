import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";

const Spinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
  </div>
);

/**
 * RouteGuard - Centralized, route-level access control.
 * Rendered once per route by App.jsx based on the access level declared
 * in routes.config.js. Pages no longer wrap themselves in guards.
 *
 * access: "public" | "protected" | "admin"
 */
export default function RouteGuard({ children, access = "protected" }) {
  const location = useLocation();
  const { isAuthenticated, isLoadingAuth, currentUser } = useAuth();

  // Redirect unauthenticated users to login (after auth is resolved)
  useEffect(() => {
    if (isLoadingAuth || access === "public") return;
    if (!isAuthenticated) {
      base44.auth.redirectToLogin(location.pathname + location.search);
    }
  }, [isAuthenticated, isLoadingAuth, access, location.pathname, location.search]);

  // Public pages — always render
  if (access === "public") {
    return children;
  }

  if (isLoadingAuth) {
    return <Spinner />;
  }

  // Protected but not authenticated — spinner while the login redirect fires
  if (!isAuthenticated) {
    return <Spinner />;
  }

  // Admin-only pages
  if (access === "admin" && currentUser?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Access denied</h2>
        <p className="text-slate-500 dark:text-slate-400">This page requires administrator privileges.</p>
      </div>
    );
  }

  return children;
}
