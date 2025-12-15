import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Ultra-minimal seed trigger - fires once, backend does everything.
 * 
 * Pattern: Backend-driven seeding, not frontend-driven detection.
 */
export function useOnboardingBootstrap() {
  const hasTriggered = useRef(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  useEffect(() => {
    if (!currentUser || hasTriggered.current) return;
    if (currentUser.demo_seeded_at) return;

    hasTriggered.current = true;
    
    // Fire and forget - backend handles idempotency
    base44.functions.invoke('seedDemoData', {})
      .then(() => console.info('[SEED] Triggered'))
      .catch(() => console.warn('[SEED] Failed (will retry on refresh)'));
  }, [currentUser]);
}