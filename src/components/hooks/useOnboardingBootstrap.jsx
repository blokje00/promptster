import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/components/hooks/useUser";
import { base44 } from "@/api/base44Client";

/**
 * FIXED: Proper seeding with stable auth state
 * 
 * Key fixes:
 * 1. Uses central useUser hook (waits for isReady)
 * 2. Double-checks demo_seeded_at AFTER seed completes
 * 3. Uses session-based guard (not just ref) to prevent double-trigger
 */
export function useOnboardingBootstrap() {
  const queryClient = useQueryClient();
  const { user, isReady } = useUser();
  const hasTriggered = useRef(false);
  const [seedStatus, setSeedStatus] = useState('idle');

  useEffect(() => {
    // Guard conditions - only proceed if:
    // 1. Auth state is READY (not loading)
    // 2. User exists (is authenticated)
    // 3. Haven't triggered in this session
    // 4. User doesn't have demo_seeded_at flag
    if (!isReady) {
      console.info('[SEED] Waiting for auth state...');
      return;
    }

    if (!user) {
      console.info('[SEED] No user - skipping seed');
      return;
    }

    if (hasTriggered.current) {
      console.info('[SEED] Already triggered in this session');
      return;
    }

    if (user.demo_seeded_at) {
      console.info('[SEED] User already seeded at:', user.demo_seeded_at);
      return;
    }

    // Check sessionStorage to prevent cross-tab race conditions
    const sessionKey = `seed_triggered_${user.id || user.email}`;
    if (sessionStorage.getItem(sessionKey)) {
      console.info('[SEED] Already triggered in this browser session');
      hasTriggered.current = true;
      return;
    }

    // Mark as triggered BEFORE async operation
    hasTriggered.current = true;
    sessionStorage.setItem(sessionKey, Date.now().toString());
    
    async function triggerSeed() {
      console.info('[SEED] Starting seed for user:', user.email);
      setSeedStatus('seeding');
      
      try {
        const result = await base44.functions.invoke('seedDemoData', {
          // Pass user ID explicitly to backend for idempotent check
          userId: user.id,
          userEmail: user.email,
        });
        
        if (result.status === 'success') {
          console.info('[SEED] ✅ Success:', result.stats);
          setSeedStatus('success');
          
          // Wait for database consistency, then invalidate
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Invalidate queries to show new data
          queryClient.invalidateQueries({ queryKey: ['currentUser'] });
          queryClient.invalidateQueries({ queryKey: ['projects'] });
          queryClient.invalidateQueries({ queryKey: ['items'] });
          queryClient.invalidateQueries({ queryKey: ['thoughts'] });
          queryClient.invalidateQueries({ queryKey: ['aiSettings'] });
        } else if (result.status === 'already_seeded') {
          console.info('[SEED] Already seeded (backend confirmed)');
          setSeedStatus('already_done');
        } else {
          console.warn('[SEED] Failed:', result.error);
          setSeedStatus('failed');
          // Clear session flag so retry is possible on next page load
          sessionStorage.removeItem(sessionKey);
        }
      } catch (error) {
        console.error('[SEED] Error:', error);
        setSeedStatus('error');
        sessionStorage.removeItem(sessionKey);
      }
    }

    triggerSeed();
  }, [isReady, user, queryClient]);

  return { seedStatus };
}