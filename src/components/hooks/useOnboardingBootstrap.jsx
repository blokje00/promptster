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

  const invalidateAllDataQueries = useCallback(async (userEmail) => {
    // Invalidate with EXACT keys matching how pages query data
    const keysToInvalidate = [
      ['currentUser'],
      ['projects', userEmail],
      ['projects'],
      ['items', userEmail],
      ['items'],
      ['thoughts', userEmail],
      ['thoughts'],
      ['templates', userEmail],
      ['templates'],
      ['aiSettings', userEmail],
      ['aiSettings'],
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

      // Gate 3: Already attempted this browser session (SKIP FOR TESTER)
      if (hasAttemptedThisSession() && !isTesterUser(currentUser)) {
        addDebugLog("Already attempted this session, skipping", { 
          demo_seed_version: currentUser.demo_seed_version 
        });
        setStatus(currentUser.demo_seed_version ? "success" : "skipped");
        return;
      }

      // Gate 4: Check if seeding is needed
      if (!needsSeeding(currentUser)) {
        addDebugLog("User does not need seeding", { 
          demo_seed_version: currentUser.demo_seed_version,
          is_tester: isTesterUser(currentUser)
        });
        setStatus("success");
        return;
      }

      // Start seeding (backend will verify/wipe/reseed)
      markAttempted();
      setStatus("seeding");
      addDebugLog("Calling backend to seed demo data", { 
        user_id: currentUser.id, 
        email: currentUser.email,
        existing_version: currentUser.demo_seed_version
      });

      try {
        // Call backend
        const response = await base44.functions.invoke('seedDemoData', {});
        
        if (!mountedRef.current) return;

        addDebugLog("Backend response received", response.data);

        if (response.data.status === 'success') {
          addDebugLog("Demo seeding completed successfully", response.data);
          setStatus("success");

          // Step 1: Invalidate all cached data
          await invalidateAllDataQueries(currentUser.email);
          
          // Step 2: Force refetch user to get updated demo_seed_version
          await refetchUser();

          // Step 3: Show success message
          toast.success("Welcome! Demo environment created", {
            description: `${response.data.total_tasks || 0} tasks across ${response.data.projects?.length || 0} projects`
          });

          // Step 4: Reload page AFTER cache is cleared
          addDebugLog("Reloading page to show demo data");
          setTimeout(() => {
            window.location.reload();
          }, 500);

        } else if (response.data.status === 'already_seeded') {
          addDebugLog("User was already seeded (race condition handled)", response.data);
          setStatus("success");
          // Just invalidate queries, no reload needed
          await invalidateAllDataQueries(currentUser.email);

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
    canRetry: status === "error" && currentUser && needsSeeding(currentUser)
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