import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Minimal seeding trigger - database driven, no frontend logic.
 * 
 * Flow:
 * 1. Check user.demo_seeded_at (database truth)
 * 2. If null -> POST to seedDemoData (backend handles everything)
 * 3. Backend uses bulk inserts + service role
 * 4. After success -> refetch all data
 */
export function useOnboardingBootstrap() {
  const queryClient = useQueryClient();
  const [attemptedSeed, setAttemptedSeed] = useState(false);

  // Fetch user
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  useEffect(() => {
    const trySeeding = async () => {
      if (isLoading || !currentUser) return;
      if (currentUser.demo_seeded_at) return;
      if (attemptedSeed) return;

      setAttemptedSeed(true);
      console.info('[ONBOARDING] Triggering seed for:', currentUser.email);

      try {
        const response = await base44.functions.invoke('seedDemoData', {});
        
        if (response.data.status === 'success' || response.data.status === 'already_seeded') {
          console.info('[ONBOARDING] Seed complete, refetching...');
          
          // Invalidate all collections
          await queryClient.invalidateQueries();
          
          // Small delay for cache propagation
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.error('[ONBOARDING] Seed error:', error.message);
        // Don't block UI - user can manually refresh
      }
    };

    trySeeding();
  }, [currentUser, isLoading, attemptedSeed, queryClient]);
}