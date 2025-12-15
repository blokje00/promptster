import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Simple, reliable demo data seeding hook.
 * 
 * Flow:
 * 1. Wait for auth
 * 2. Check user.demo_seeded_at (database truth)
 * 3. If null -> call seedDemoData
 * 4. After success -> refetch all data
 * 5. Done
 * 
 * NO sessionStorage, NO client-side guards, NO race conditions.
 */
export function useOnboardingBootstrap() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("idle"); // idle | seeding | success | error

  // Fetch user (no cache, always fresh)
  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me().catch(() => null),
    staleTime: 0,
    cacheTime: 0,
    refetchOnMount: 'always',
  });

  useEffect(() => {
    const runSeeding = async () => {
      // Gate 1: Wait for auth
      if (isUserLoading) {
        console.info('[ONBOARDING] Waiting for auth...');
        return;
      }

      // Gate 2: No user
      if (!currentUser) {
        console.info('[ONBOARDING] No user, skipping seeding');
        setStatus("idle");
        return;
      }

      // Gate 3: Already seeded (database truth)
      if (currentUser.demo_seeded_at) {
        console.info('[ONBOARDING] ✅ Demo already seeded at:', currentUser.demo_seeded_at);
        setStatus("success");
        return;
      }

      // Gate 4: Already attempting seeding
      if (status === "seeding") {
        console.info('[ONBOARDING] Already seeding, waiting...');
        return;
      }

      // START SEEDING
      console.info('[ONBOARDING] 🚀 Starting demo seeding for:', currentUser.email);
      setStatus("seeding");

      try {
        const response = await base44.functions.invoke('seedDemoData', {});
        
        if (response.data.status === 'success' || response.data.status === 'already_seeded') {
          console.info('[ONBOARDING] ✅ Seeding complete:', response.data);
          
          // Invalidate all data queries to force refetch
          await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
          await queryClient.invalidateQueries({ queryKey: ['projects'] });
          await queryClient.invalidateQueries({ queryKey: ['items'] });
          await queryClient.invalidateQueries({ queryKey: ['thoughts'] });
          await queryClient.invalidateQueries({ queryKey: ['templates'] });
          await queryClient.invalidateQueries({ queryKey: ['aiSettings'] });
          
          // Wait for refetch to complete
          await new Promise(resolve => setTimeout(resolve, 500));
          
          setStatus("success");
          
          toast.success("Welcome! Your demo environment is ready", {
            description: "Explore the Multi-Task builder with sample projects"
          });
        } else {
          throw new Error(response.data.message || "Seeding failed");
        }
      } catch (error) {
        console.error('[ONBOARDING] ❌ Seeding error:', error.message);
        setStatus("error");
        toast.error("Could not set up demo data", {
          description: "Please refresh the page or contact support"
        });
      }
    };

    runSeeding();
  }, [currentUser, isUserLoading, status, queryClient]);

  return {
    status,
    isSeeding: status === "seeding",
    hasError: status === "error"
  };
}