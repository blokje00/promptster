import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Hook to fetch global app settings (stripe_enabled, app_wide_access_enabled)
 * Returns an object with the settings as boolean values
 */
export function useAppSettings() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      try {
        const allSettings = await base44.entities.AppSetting.list();
        
        // Convert array to object for easy access
        const settingsMap = {
          stripe_enabled: true, // Default: Stripe enabled
          app_wide_access_enabled: false, // Default: Access checks enabled
        };
        
        allSettings.forEach(setting => {
          settingsMap[setting.key] = setting.value;
        });
        
        return settingsMap;
      } catch (error) {
        console.error('[useAppSettings] Error fetching settings:', error);
        // Return defaults on error
        return {
          stripe_enabled: true,
          app_wide_access_enabled: false,
        };
      }
    },
    staleTime: 30000, // Cache for 30 seconds
    retry: false,
  });

  return {
    settings: settings || { stripe_enabled: true, app_wide_access_enabled: false },
    isLoading,
  };
}