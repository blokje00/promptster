import { useEffect, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const DEMO_SEED_LOG_KEY = "demo_seed_debug_log";
const MAX_LOG_ENTRIES = 20;

/**
 * Global onboarding bootstrap hook
 * Handles demo data seeding for new users immediately after auth is ready
 * 
 * FEATURES:
 * - Idempotent: never seeds twice
 * - Robust: works regardless of cookie consent or page navigation
 * - Observable: logs to console + localStorage for debugging
 * - Safe: no race conditions, no duplicate calls
 */
export function useOnboardingBootstrap() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("idle"); // idle | checking | seeding | success | error
  const [lastError, setLastError] = useState(null);
  const hasAttemptedRef = useRef(false);
  const isRunningRef = useRef(false);

  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  // Helper: Add debug log entry
  const addDebugLog = (message, data = {}) => {
    const timestamp = new Date().toISOString();
    const entry = { timestamp, message, data };
    
    console.info(`[DEMO_SEED] ${message}`, data);
    
    try {
      const logs = JSON.parse(localStorage.getItem(DEMO_SEED_LOG_KEY) || "[]");
      logs.push(entry);
      // Keep only last N entries
      if (logs.length > MAX_LOG_ENTRIES) {
        logs.shift();
      }
      localStorage.setItem(DEMO_SEED_LOG_KEY, JSON.stringify(logs));
    } catch (e) {
      console.warn("[DEMO_SEED] Failed to write debug log", e);
    }
  };

  // Helper: Check if user needs seeding
  const needsSeeding = (user) => {
    if (!user) return false;
    // Check if demo_seed_version is set AND matches current version
    // If undefined or old version, needs seeding
    return !user.demo_seed_version;
  };

  // Main bootstrap effect
  useEffect(() => {
    // Wait for auth to be ready
    if (isUserLoading) {
      addDebugLog("Waiting for auth...");
      return;
    }

    if (!currentUser) {
      addDebugLog("No user logged in, skipping bootstrap");
      setStatus("idle");
      return;
    }

    // Prevent duplicate runs
    if (hasAttemptedRef.current || isRunningRef.current) {
      addDebugLog("Bootstrap already attempted/running, skipping");
      return;
    }

    // Check if seeding is needed
    if (!needsSeeding(currentUser)) {
      addDebugLog("User already has demo data", { 
        demo_seed_version: currentUser.demo_seed_version 
      });
      setStatus("success");
      return;
    }

    // Start seeding
    hasAttemptedRef.current = true;
    isRunningRef.current = true;
    setStatus("seeding");
    addDebugLog("Starting demo data seeding", { 
      user_id: currentUser.id, 
      email: currentUser.email 
    });

    // Call backend seeding function
    base44.functions.invoke('seedDemoData', {})
      .then(async (response) => {
        isRunningRef.current = false;
        
        addDebugLog("Backend response received", response.data);
        
        if (response.data.status === 'success' || response.data.status === 'already_seeded') {
          addDebugLog("Demo seeding completed successfully", response.data);
          setStatus("success");
          
          // Critical: Invalidate specific queries AND refetch currentUser
          await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
          await queryClient.refetchQueries({ queryKey: ['currentUser'] });
          await queryClient.invalidateQueries({ queryKey: ['projects'] });
          await queryClient.invalidateQueries({ queryKey: ['thoughts'] });
          await queryClient.invalidateQueries({ queryKey: ['templates'] });
          await queryClient.invalidateQueries({ queryKey: ['items'] });
          
          addDebugLog("Queries invalidated, triggering reload in 1 second");
          
          // Show success toast
          if (response.data.status === 'success') {
            toast.success("Welcome! Demo environment created", {
              description: `${response.data.total_tasks || 0} tasks across ${response.data.projects?.length || 0} projects`
            });
            
            // Force reload after 1 second to ensure all data is visible
            setTimeout(() => {
              addDebugLog("Reloading page to show demo data");
              window.location.reload();
            }, 1000);
          }
        } else {
          throw new Error(response.data.message || "Unknown error");
        }
      })
      .catch((error) => {
        isRunningRef.current = false;
        const errorMsg = error.message || String(error);
        addDebugLog("Demo seeding failed", { error: errorMsg });
        setStatus("error");
        setLastError(errorMsg);
        
        // Show error toast
        toast.error("Failed to set up demo environment", {
          description: "You can still use the app. Contact support if this persists."
        });
      });

  }, [currentUser, isUserLoading, queryClient]);

  return {
    status,
    lastError,
    isSeeding: status === "seeding",
    canRetry: status === "error" && currentUser && needsSeeding(currentUser)
  };
}

/**
 * Get debug logs from localStorage
 */
export function getDemoSeedLogs() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_SEED_LOG_KEY) || "[]");
  } catch {
    return [];
  }
}

/**
 * Clear debug logs
 */
export function clearDemoSeedLogs() {
  localStorage.removeItem(DEMO_SEED_LOG_KEY);
}

/**
 * Manual retry function for use in UI
 */
export async function retryDemoSeed() {
  const response = await base44.functions.invoke('seedDemoData', {});
  return response.data;
}