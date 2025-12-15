import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const DEMO_SEED_LOG_KEY = "demo_seed_debug_log";
const DEMO_SEED_SESSION_KEY = "demo_seed_attempted_session";
const MAX_LOG_ENTRIES = 20;
const CURRENT_DEMO_VERSION = "v1_promptster_full_demo";

/**
 * Global onboarding bootstrap hook - FIXED VERSION
 * 
 * Key fixes:
 * 1. Uses sessionStorage to track attempts per browser session (not refs that reset)
 * 2. Forces fresh user fetch before seeding decision
 * 3. Proper async/await with error handling
 * 4. Invalidates queries with exact keys matching Dashboard/Multiprompt
 * 5. Waits for backend confirmation before reload
 */
export function useOnboardingBootstrap() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("idle");
  const [lastError, setLastError] = useState(null);
  const mountedRef = useRef(true);

  // Track if seeding was already attempted THIS SESSION
  const hasAttemptedThisSession = useCallback(() => {
    return sessionStorage.getItem(DEMO_SEED_SESSION_KEY) === 'true';
  }, []);

  const markAttempted = useCallback(() => {
    sessionStorage.setItem(DEMO_SEED_SESSION_KEY, 'true');
  }, []);

  // Fetch user with NO CACHE to ensure fresh data
  const { data: currentUser, isLoading: isUserLoading, refetch: refetchUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me().catch(() => null),
    staleTime: 0,
    cacheTime: 0,
    refetchOnMount: 'always',
  });

  const addDebugLog = useCallback((message, data = {}) => {
    const timestamp = new Date().toISOString();
    const entry = { timestamp, message, data };
    console.info(`[DEMO_SEED] ${message}`, data);
    
    try {
      const logs = JSON.parse(localStorage.getItem(DEMO_SEED_LOG_KEY) || "[]");
      logs.push(entry);
      if (logs.length > MAX_LOG_ENTRIES) logs.shift();
      localStorage.setItem(DEMO_SEED_LOG_KEY, JSON.stringify(logs));
    } catch (e) {
      console.warn("[DEMO_SEED] Failed to write debug log", e);
    }
  }, []);

  const isTesterUser = useCallback((user) => {
    return user?.email === "patrickz@sunshower.nl";
  }, []);

  const needsSeeding = useCallback((user) => {
    if (!user) return false;
    // Tester ALWAYS needs seeding (fresh data every login)
    if (isTesterUser(user)) return true;
    // User needs seeding if demo_seed_version is missing OR outdated
    return !user.demo_seed_version || user.demo_seed_version !== CURRENT_DEMO_VERSION;
  }, [isTesterUser]);

  const invalidateAllDataQueries = useCallback(async () => {
    // Invalidate all data queries (no email in keys - using RLS)
    const keysToInvalidate = [
      ['currentUser'],
      ['projects'],
      ['items'],
      ['thoughts'],
      ['templates'],
      ['aiSettings'],
      ['allThoughtsCount'],
      ['openTasksCount'],
    ];

    await Promise.all(
      keysToInvalidate.map(key => 
        queryClient.invalidateQueries({ queryKey: key, exact: false })
      )
    );
  }, [queryClient]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const runSeeding = async () => {
      // Gate 1: Wait for auth
      if (isUserLoading) {
        addDebugLog("Waiting for auth...");
        return;
      }

      // Gate 2: No user
      if (!currentUser) {
        addDebugLog("No user logged in, skipping bootstrap");
        setStatus("idle");
        return;
      }

      // FIX 2: Tester always gets fresh session
      if (isTesterUser(currentUser)) {
        sessionStorage.removeItem(DEMO_SEED_SESSION_KEY);
        addDebugLog("Tester detected - session cleared for fresh seeding");
      }

      // Gate 3: Already attempted this browser session (NEVER SKIP FOR TESTER)
      if (hasAttemptedThisSession() && !isTesterUser(currentUser)) {
        addDebugLog("Already attempted this session, skipping", { 
          demo_seed_version: currentUser.demo_seed_version 
        });
        setStatus(currentUser.demo_seed_version ? "success" : "skipped");
        return;
      }

      // FIX 1: Force fresh user data BEFORE seeding decision
      addDebugLog("Force fetching fresh user data before seeding decision");
      const freshUserResult = await refetchUser();
      const freshUser = freshUserResult.data;
      
      if (!freshUser) {
        addDebugLog("Failed to fetch fresh user data");
        setStatus("error");
        return;
      }

      addDebugLog("Fresh user data fetched", {
        email: freshUser.email,
        demo_seed_version: freshUser.demo_seed_version,
        is_tester: isTesterUser(freshUser)
      });

      // Gate 4: Check if seeding is needed (with FRESH user data)
      if (!needsSeeding(freshUser)) {
        addDebugLog("User does not need seeding (fresh data check)", { 
          demo_seed_version: freshUser.demo_seed_version,
          is_tester: isTesterUser(freshUser)
        });
        setStatus("success");
        return;
      }

      // Start seeding (backend will verify/wipe/reseed)
      markAttempted();
      setStatus("seeding");
      addDebugLog("Calling backend to seed demo data", { 
        user_id: freshUser.id, 
        email: freshUser.email,
        existing_version: freshUser.demo_seed_version
      });

      try {
        // Call backend
        const response = await base44.functions.invoke('seedDemoData', {});
        
        if (!mountedRef.current) return;

        addDebugLog("Backend response received", response.data);

        if (response.data.status === 'success') {
          addDebugLog("Demo seeding completed successfully", response.data);
          setStatus("success");

          // Simple and reliable: just reload
          addDebugLog("Reloading page to show demo data");
          toast.success("Welcome! Setting up your demo environment...");

          setTimeout(() => {
            window.location.reload();
          }, 800);

        } else if (response.data.status === 'already_seeded') {
          addDebugLog("User was already seeded (race condition handled)", response.data);
          setStatus("success");
          // Invalidate queries + refetch user to ensure cache is fresh
          await invalidateAllDataQueries();
          await refetchUser();

        } else {
          throw new Error(response.data.message || "Unknown seeding error");
        }

      } catch (error) {
        if (!mountedRef.current) return;
        
        const errorMsg = error.message || String(error);
        addDebugLog("Demo seeding failed", { error: errorMsg });
        setStatus("error");
        setLastError(errorMsg);

        toast.error("Failed to set up demo environment", {
          description: "You can still use the app. Try refreshing the page."
        });
      }
    };

    runSeeding();
  }, [currentUser, isUserLoading, queryClient, addDebugLog, needsSeeding, 
      hasAttemptedThisSession, markAttempted, invalidateAllDataQueries, refetchUser]);

  return {
    status,
    lastError,
    isSeeding: status === "seeding",
    canRetry: status === "error"
  };
}

// Export helper functions
export function getDemoSeedLogs() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_SEED_LOG_KEY) || "[]");
  } catch {
    return [];
  }
}

export function clearDemoSeedLogs() {
  localStorage.removeItem(DEMO_SEED_LOG_KEY);
}

export async function retryDemoSeed() {
  // Clear session flag to allow retry
  sessionStorage.removeItem(DEMO_SEED_SESSION_KEY);
  const response = await base44.functions.invoke('seedDemoData', {});
  return response.data;
}