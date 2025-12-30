import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * SINGLETON HOOK for current user + settings
 * Used by: AIBackoffice, Features, Subscription, TierAdvisorToggles
 * Ensures all components read the SAME user data with the SAME cache
 */
export function useCurrentUserSettings() {
  return useQuery({
    queryKey: ['currentUserSettings'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        return user;
      } catch (error) {
        console.warn('[useCurrentUserSettings] Auth failed:', error.message);
        return null;
      }
    },
    staleTime: 30_000, // 30s cache
    retry: false,
  });
}