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
    // TRUE = already seeded, skip. FALSE/null = needs seeding, proceed.
    if (user.demo_seeded_at) {
      // console.info(`${logPrefix} ✅ Already seeded at: ${user.demo_seeded_at}`);
      return;
    }

    // 5. SESSION LOCK CHECK
    // TRUE = already running, skip. FALSE = not running, proceed.
    if (hasTriggered.current) {
      // console.info(`${logPrefix} ⏸️ Blocked by local ref (already running)`);
      return;
    }

    const sessionKey = `seed_attempt_${user.id}`;
    const lastAttempt = sessionStorage.getItem(sessionKey);
    
    // Allow retry after 15 seconds if it failed previously
    if (lastAttempt && Date.now() - parseInt(lastAttempt) < 15000) {
      console.info(`${logPrefix} ⏳ Cooldown active (${Math.round((Date.now() - parseInt(lastAttempt))/1000)}s ago). Waiting...`);
      return;
    }

    // --- START SEEDING ---
    console.log(`${logPrefix} 🚀 STARTING SEED PROCESS for ${user.email} (${user.id})`);
    hasTriggered.current = true;
    sessionStorage.setItem(sessionKey, Date.now().toString());
    setSeedStatus('seeding');

    async function triggerSeed() {
      try {
        console.log(`${logPrefix} ⚡ Invoking server function 'seedDemoData'...`);
        
        let result;
        const startTime = Date.now();
        
        try {
          result = await base44.functions.invoke('seedDemoData', {
            userId: user.id,
            userEmail: user.email,
            force: true
          });
          const duration = Date.now() - startTime;
          console.log(`${logPrefix} 📬 Response received (took ${duration}ms)`);
        } catch (invokeError) {
          const duration = Date.now() - startTime;
          console.error(`${logPrefix} ❌ Invoke error (after ${duration}ms):`, {
            message: invokeError.message,
            status: invokeError.status,
            statusText: invokeError.statusText,
            is429: invokeError.status === 429,
            fullError: invokeError
          });
          
          if (invokeError.status === 429) {
            throw new Error('Rate limit exceeded (429). Server is being throttled. Please wait and try again.');
          }
          
          throw new Error(`Backend invoke failed: ${invokeError.message || 'Network error'}`);
        }
        
        console.log(`${logPrefix} 📦 Server response (raw):`, JSON.stringify(result, null, 2));
        
        // Check if result is valid
        if (!result) {
          console.error(`${logPrefix} ❌ Empty response from backend`);
          throw new Error('Backend returned empty response');
        }
        
        if (typeof result !== 'object') {
          console.error(`${logPrefix} ❌ Invalid response type:`, typeof result, result);
          throw new Error(`Backend returned invalid response type: ${typeof result}`);
        }
        
        // Log the exact result structure
        console.log(`${logPrefix} 🔍 Response analysis:`, {
          hasStatus: 'status' in result,
          status: result.status,
          hasError: 'error' in result,
          error: result.error,
          hasDetails: 'details' in result,
          details: result.details,
          allKeys: Object.keys(result)
        });

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
          // Backend returned something unexpected
          console.error(`${logPrefix} ❌ Unexpected backend response:`, {
            fullResult: result,
            stringified: JSON.stringify(result)
          });
          
          const errorMsg = result?.error || result?.details || result?.message || 'Unknown backend error';
          const errorType = result?.errorType || result?.name || 'UnknownError';
          const fullError = `${errorType}: ${errorMsg}`;
          
          console.error(`${logPrefix} 🚨 Throwing error:`, fullError);
          throw new Error(fullError);
        }
      } catch (error) {
        const is429 = error.message?.includes('429') || error.message?.includes('Rate limit');
        
        console.error(`${logPrefix} ❌ SEED FAILED:`, {
          message: error.message,
          is429Error: is429,
          stack: error.stack?.substring(0, 200),
          timestamp: new Date().toISOString()
        });
        
        if (is429) {
          console.warn(`${logPrefix} 🚫 RATE LIMIT HIT - Backend is throttled. Cooldown extended.`);
        }
        
        setSeedStatus('error');
        
        // RESET LOCKS TO ALLOW RETRY (longer cooldown for 429)
        const cooldown = is429 ? 30000 : 15000; // 30s for rate limit, 15s for other errors
        console.log(`${logPrefix} 🔄 Resetting locks with ${cooldown/1000}s cooldown...`);
        hasTriggered.current = false;
        sessionStorage.setItem(sessionKey, Date.now().toString()); // Keep session lock with new timestamp
      }
    }

    triggerSeed();
  }, [isReady, user, queryClient]);

  return seedStatus;
}