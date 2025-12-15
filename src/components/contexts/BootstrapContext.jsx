import React, { createContext, useContext, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/components/hooks/useUser";
import { base44 } from "@/api/base44Client";
import { getOrCreateTraceId, subscribeToQueryCache } from "@/components/debug/queryLogger";

const BootstrapContext = createContext({
  status: 'loading',
  error: null,
});

export function useBootstrap() {
  return useContext(BootstrapContext);
}

export function BootstrapProvider({ children }) {
  const queryClient = useQueryClient();
  const { user, isReady } = useUser();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  // Subscribe to query cache for debugging (only in dev)
  useEffect(() => {
    if (user?.email === 'patrickz@sunshower.nl') {
      const unsubscribe = subscribeToQueryCache(queryClient);
      return unsubscribe;
    }
  }, [queryClient, user?.email]);

  useEffect(() => {
    if (!isReady) {
      setStatus('loading');
      return;
    }

    if (!user) {
      // No user, public mode or not logged in
      setStatus('ready');
      return;
    }

    // User logged in: ensure demo data seeded
    let isMounted = true;
    
    async function bootstrap() {
      const traceId = getOrCreateTraceId();
      const logPrefix = `[BOOTSTRAP ${new Date().toISOString().split('T')[1].slice(0,8)}] [${traceId}]`;
      
      if (!isMounted) return;
      
      try {
        console.log(`${logPrefix} Starting for user ${user.email}`);
        setStatus('seeding');

        const startTime = Date.now();
        const res = await base44.functions.invoke('seedDemoData', {
          userId: user.id,
          userEmail: user.email
        });

        if (!isMounted) return;

        const duration = Date.now() - startTime;
        const payload = res?.data ?? res;
        
        console.log(`${logPrefix} Response (${duration}ms):`, payload);

        if (payload.status === 'success' || payload.status === 'already_seeded') {
          console.log(`${logPrefix} ✅ Seed complete. Verifying data availability...`);
          
          // Invalidate queries first
          await queryClient.invalidateQueries();
          
          // VERIFICATION LOOP: Wait until data is actually visible
          let dataVerified = false;
          let attempts = 0;
          const maxAttempts = 8;
          
          while (!dataVerified && attempts < maxAttempts && isMounted) {
            attempts++;
            // Wait with progressive backoff (2s, 2s, 3s, 3s, 4s, 4s, 5s, 5s)
            const delay = Math.min(2000 + Math.floor(attempts / 2) * 1000, 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            if (!isMounted) return;
            
            try {
              // Check projects AND items (Vault data) to ensure full data availability
              const [projects, items] = await Promise.all([
                base44.entities.Project.filter({ is_demo: true }),
                base44.entities.Item.filter({ is_demo: true })
              ]);
              
              const projectCount = projects?.length || 0;
              const itemCount = items?.length || 0;
              
              if (projectCount >= 2 && itemCount >= 3) {
                console.log(`${logPrefix} ✅ Verified demo data: ${projectCount} projects, ${itemCount} items (attempt ${attempts})`);
                dataVerified = true;
              } else {
                console.log(`${logPrefix} ⏳ Attempt ${attempts}/${maxAttempts}: Found ${projectCount} projects, ${itemCount} items (expecting 2 projects + 3+ items). Waiting ${delay}ms...`);
              }
            } catch (checkErr) {
              console.warn(`${logPrefix} ⚠️ Attempt ${attempts} verification error:`, checkErr?.message);
            }
          }
          
          if (!dataVerified) {
            console.error(`${logPrefix} ❌ CRITICAL: Seed reported success but data verification failed after ${maxAttempts} attempts`);
            setError('Demo data seeding timed out. Please refresh the page.');
            setStatus('error');
            return;
          }

          if (!isMounted) return;
          
          // Invalidate again for safety
          await queryClient.invalidateQueries();
          
          // 🔥 CRITICAL: Set status to ready
          setStatus('ready');
          console.log(`${logPrefix} ✅ Bootstrap READY - queries enabled`);
        } else if (payload.status === 'in_progress') {
          console.log(`${logPrefix} ⏳ Seed in progress, retrying...`);
          // Retry after delay
          setTimeout(() => {
            if (isMounted) bootstrap();
          }, 2000);
        } else {
          throw new Error(payload.error || 'Unknown error');
        }
      } catch (err) {
        console.error(`${logPrefix} ❌ Bootstrap failed:`, err);
        if (isMounted) {
          setError(err.message);
          setStatus('error');
        }
      }
    }

    bootstrap();
    
    return () => {
      isMounted = false;
    };
  }, [isReady, user, queryClient]);

  return (
    <BootstrapContext.Provider value={{ status, error }}>
      {children}
    </BootstrapContext.Provider>
  );
}