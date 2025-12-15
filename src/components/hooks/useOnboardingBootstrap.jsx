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
        
        const startTime = Date.now();
        let res;
        
        try {
          res = await base44.functions.invoke('seedDemoData', {
            userId: user.id,
            userEmail: user.email,
            force: true
          });
          const duration = Date.now() - startTime;
          console.log(`${logPrefix} 📬 Raw response received (took ${duration}ms):`, res);
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
        
        // CRITICAL FIX: Base44 sometimes wraps in { data: ... }
        const payload = res?.data ?? res;
        console.log(`${logPrefix} 📦 Parsed payload:`, JSON.stringify(payload, null, 2));
        
        // Validate payload
        if (!payload || typeof payload !== 'object') {
          console.error(`${logPrefix} ❌ Invalid payload:`, { type: typeof payload, payload });
          throw new Error(`Backend returned invalid payload: ${typeof payload}`);
        }
        
        console.log(`${logPrefix} 🔍 Payload analysis:`, {
          hasStatus: 'status' in payload,
          status: payload.status,
          hasReqId: 'reqId' in payload,
          reqId: payload.reqId,
          hasError: 'error' in payload,
          error: payload.error,
          allKeys: Object.keys(payload)
        });

        if (payload.status === 'success') {
          console.log(`${logPrefix} ✅ SEED SUCCESS! reqId=${payload.reqId}. Invalidating queries...`);
          setSeedStatus('success');
          
          // Force wait to ensure DB consistency
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Aggressively invalidate everything
          await queryClient.invalidateQueries(); 
          console.log(`${logPrefix} ✅ Queries invalidated. UI should update.`);

        } else if (payload.status === 'already_seeded') {
          console.log(`${logPrefix} ℹ️ Backend says: Already seeded (reqId=${payload.reqId}).`);
          setSeedStatus('already_done');
        } else {
          // Backend returned error or unknown status
          console.error(`${logPrefix} ❌ Unexpected payload:`, payload);
          
          const errorMsg = payload?.error || payload?.message || 'Unknown backend error';
          const errorType = payload?.errorType || 'UnknownError';
          const reqId = payload?.reqId || 'no-req-id';
          
          const fullError = `${errorType}: ${errorMsg} (reqId=${reqId})`;
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