import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * FIXED: Database-driven seeding with proper idempotency
 * 
 * Pattern:
 * 1. Check database (not cache) for existing data
 * 2. Backend uses bulk inserts (no N+1)
 * 3. Frontend invalidates ALL queries after seed
 */
export function useOnboardingBootstrap() {
  const queryClient = useQueryClient();
  const hasTriggered = useRef(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  useEffect(() => {
    // Only seed if: user exists, not already triggered, and no demo_seeded_at flag
    if (!currentUser || hasTriggered.current || currentUser.demo_seeded_at) {
      return;
    }

    hasTriggered.current = true;
    
    async function triggerSeed() {
      console.info('[SEED] Triggering backend seed...');
      
      try {
        const result = await base44.functions.invoke('seedDemoData', {});
        
        if (result.status === 'success') {
          console.info('[SEED] ✅ Success:', result.stats);
          
          // Invalidate ALL queries to force fresh data
          queryClient.invalidateQueries();
          
          // Small delay for database consistency
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.warn('[SEED] Failed:', result.error);
        }
      } catch (error) {
        console.error('[SEED] Error:', error);
      }
    }

    triggerSeed();
  }, [currentUser, queryClient]);
}