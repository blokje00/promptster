import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Central hook for user state - ensures consistent behavior across app
 * Returns: { user, isLoading, isAuthenticated, isReady }
 */
export function useUser() {
  const query = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        // Auth failed - user not logged in
        return null;
      }
    },
    staleTime: 30000, // 30 seconds - prevent excessive refetches
    retry: 1, // One retry for network issues
  });

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isAuthenticated: !!query.data,
    isReady: !query.isLoading, // True when we KNOW the auth state
    refetch: query.refetch,
  };
}