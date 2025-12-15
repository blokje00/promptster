import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/components/hooks/useUser";
import { base44 } from "@/api/base44Client";

/**
 * ROBUST ONBOARDING BOOTSTRAP
 * - Includes detailed logging
 * - Handles auth flickers
 * - Retries on failure
 */
export function useOnboardingBootstrap() {
  const queryClient = useQueryClient();
  const { user, isReady } = useUser();
  const hasTriggered = useRef(false);
  const [seedStatus, setSeedStatus] = useState('idle');

  useEffect(() => {
    const logPrefix = `[SEED ${new Date().toISOString().split('T')[1].slice(0,8)}]`;

    // 1. AUTH CHECK
    if (!isReady) {
      // console.debug(`${logPrefix} Waiting for auth...`);
      return;
    }

    // 2. USER CHECK
    if (!user) {
      console.info(`${logPrefix} No user found. Skipping.`);
      return;
    }

    // 3. ID CHECK (Crucial for preventing race conditions with incomplete user objects)
    if (!user.id) {
      console.warn(`${logPrefix} User object missing ID! Waiting for complete user.`, user);
      return;
    }

    // 4. ALREADY SEEDED CHECK (Database flag)
    if (user.demo_seeded_at) {
      // console.info(`${logPrefix} User already seeded at: ${user.demo_seeded_at}`);
      return;
    }

    // 5. SESSION LOCK CHECK
    if (hasTriggered.current) {
      // console.info(`${logPrefix} Blocked by local ref (already running)`);
      return;
    }

    const sessionKey = `seed_attempt_${user.id}`;
    const lastAttempt = sessionStorage.getItem(sessionKey);
    
    // Allow retry after 10 seconds if it failed previously
    if (lastAttempt && Date.now() - parseInt(lastAttempt) < 10000) {
      console.info(`${logPrefix} Recently attempted (${Math.round((Date.now() - parseInt(lastAttempt))/1000)}s ago). Waiting.`);
      return;
    }

    // --- START SEEDING ---
    console.log(`${logPrefix} 🚀 STARTING SEED PROCESS for ${user.email} (${user.id})`);
    hasTriggered.current = true;
    sessionStorage.setItem(sessionKey, Date.now().toString());
    setSeedStatus('seeding');

    async function triggerSeed() {
      try {
        console.log(`${logPrefix} Invoking server function 'seedDemoData'...`);
        
        let result;
        try {
          result = await base44.functions.invoke('seedDemoData', {
            userId: user.id,
            userEmail: user.email,
            force: true
          });
        } catch (invokeError) {
          console.error(`${logPrefix} Invoke error:`, invokeError);
          throw new Error(`Backend invoke failed: ${invokeError.message || 'Network error'}`);
        }
        
        console.log(`${logPrefix} Server response:`, result);
        
        // Check if result is valid
        if (!result) {
          throw new Error('Backend returned empty response');
        }
        
        if (typeof result !== 'object') {
          throw new Error(`Backend returned invalid response type: ${typeof result}`);
        }

        if (result && result.status === 'success') {
          console.log(`${logPrefix} ✅ SEED SUCCESS! Invalidating queries...`);
          setSeedStatus('success');
          
          // Force wait to ensure DB consistency
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Aggressively invalidate everything
          await queryClient.invalidateQueries(); 
          console.log(`${logPrefix} Queries invalidated. UI should update.`);

        } else if (result && result.status === 'already_seeded') {
          console.log(`${logPrefix} Backend says: Already seeded.`);
          setSeedStatus('already_done');
        } else {
          const errorMsg = result?.error || result?.details || 'Unknown backend error';
          const errorType = result?.errorType || 'UnknownError';
          throw new Error(`${errorType}: ${errorMsg}`);
        }
      } catch (error) {
        console.error(`${logPrefix} ❌ SEED FAILED:`, {
          message: error.message,
          stack: error.stack,
          fullError: error
        });
        setSeedStatus('error');
        
        // RESET LOCKS TO ALLOW RETRY
        console.log(`${logPrefix} Resetting locks for retry...`);
        hasTriggered.current = false;
        sessionStorage.removeItem(sessionKey);
      }
    }

    triggerSeed();
  }, [isReady, user, queryClient]);

  return seedStatus;
}