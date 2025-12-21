import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * SINGLETON HOOK for TierAdvisorSettings
 * Used by: AIBackoffice, Features, Subscription
 * Ensures all pages read the SAME data with the SAME cache
 */
export function useTierAdvisorSettings() {
  return useQuery({
    queryKey: ['tierAdvisorSettings'],
    queryFn: async () => {
      try {
        const settings = await base44.entities.TierAdvisorSettings.list();
        // Always return array, default to [{ show_on_features_page: false, show_on_subscription_page: false }]
        if (!settings || settings.length === 0) {
          return [{ show_on_features_page: false, show_on_subscription_page: false }];
        }
        return settings;
      } catch (error) {
        console.warn('[useTierAdvisorSettings] Fetch failed, using defaults:', error.message);
        return [{ show_on_features_page: false, show_on_subscription_page: false }];
      }
    },
    staleTime: 5 * 60 * 1000, // 5min cache
    retry: false,
  });
}