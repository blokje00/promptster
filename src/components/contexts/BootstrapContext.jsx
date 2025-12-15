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

  // Subscribe to query cache for debugging
  useEffect(() => {
    const unsubscribe = subscribeToQueryCache(queryClient);
    return unsubscribe;
  }, [queryClient]);

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
          console.log(`${logPrefix} ✅ Seed complete. Invalidating queries...`);
          
          // Wait for DB consistency
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if (!isMounted) return;
          
          // Invalidate all data queries
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