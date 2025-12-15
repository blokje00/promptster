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

  // Database check: Does demo data exist?
  const { data: hasProjects } = useQuery({
    queryKey: ['has-demo-data'],
    queryFn: async () => {
      const projects = await base44.entities.Project.list();
      return projects && projects.length > 0;
    },
    enabled: !!currentUser,
    staleTime: 30000, // 30 seconds
    retry: 1
  });

  useEffect(() => {
    // Only seed if: user exists, not already triggered, and NO projects in DB
    if (!currentUser || hasTriggered.current || hasProjects !== false) {
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
  }, [currentUser, hasProjects, queryClient]);
}