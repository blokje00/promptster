import React from "react";
import { AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Shows a banner when Stripe is in test mode
 * Only visible to admins
 */
export default function StripeTestModeIndicator() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: testMode } = useQuery({
    queryKey: ['stripeTestMode'],
    queryFn: async () => {
      try {
        const result = await base44.functions.invoke('checkStripeTestMode', {});
        return result.data?.isTestMode || false;
      } catch {
        return false;
      }
    },
    enabled: user?.role === 'admin',
    staleTime: 60000, // Cache for 1 minute
  });

  // Only show to admins in test mode
  if (user?.role !== 'admin' || !testMode) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg shadow-lg p-3 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-yellow-900 text-sm">
            🧪 Stripe Test Mode
          </p>
          <p className="text-xs text-yellow-800 mt-1">
            Test betalingen actief. Gebruik test card: 4242 4242 4242 4242
          </p>
        </div>
      </div>
    </div>
  );
}