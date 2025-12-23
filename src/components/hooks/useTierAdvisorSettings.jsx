import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * SINGLETON HOOK for TierAdvisorSettings
 * Used by: AIBackoffice (TierAdvisorToggles), Features, Subscription
 * Returns GLOBAL settings (not per-user) from TierAdvisorSettings entity
 */
export function useTierAdvisorSettings() {
  return useQuery({
    queryKey: ['tierAdvisorSettings'],
    queryFn: async () => {
      try {
        const settings = await base44.entities.TierAdvisorSettings.list();
        // Always return array with at least one object for safe access
        if (!settings || settings.length === 0) {
          // Return default (both false) if no record exists yet
          return [{ show_on_features_page: false, show_on_subscription_page: false }];
        }
        return settings;
      } catch (error) {
        console.warn('[useTierAdvisorSettings] Fetch failed, using defaults:', error.message);
        return [{ show_on_features_page: false, show_on_subscription_page: false }];
      }
    },
    staleTime: 30_000, // 30s cache (same as currentUserSettings)
    retry: false,
  });
}