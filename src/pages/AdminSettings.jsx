import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Settings, AlertTriangle } from "lucide-react";
import { useCurrentUserSettings } from "@/components/hooks/useCurrentUserSettings";

export default function AdminSettingsPage() {
  const { data: user } = useCurrentUserSettings();
  const queryClient = useQueryClient();

  // Fetch all settings
  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      return await base44.entities.AppSetting.list();
    },
  });

  // Mutation to create or update a setting
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value, description }) => {
      const existing = settings.find(s => s.key === key);
      
      if (existing) {
        return await base44.entities.AppSetting.update(existing.id, { value });
      } else {
        return await base44.entities.AppSetting.create({ key, value, description });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
      toast.success('Setting updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update setting: ' + error.message);
    },
  });

  // Helper to get current value
  const getSetting = (key, defaultValue = false) => {
    const setting = settings.find(s => s.key === key);
    return setting ? setting.value : defaultValue;
  };

  const handleToggle = (key, currentValue, description) => {
    updateSettingMutation.mutate({ key, value: !currentValue, description });
  };

  // Only admins can access this page
  if (user?.role !== 'admin') {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="border-red-200">
          <CardContent className="p-6">
            <p className="text-red-600">Access Denied. Admin only.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stripeEnabled = getSetting('stripe_enabled', true);
  const appWideAccessEnabled = getSetting('app_wide_access_enabled', false);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Settings className="w-8 h-8" />
          App Settings
        </h1>
        <p className="text-slate-600 mt-2">Global configuration for the application</p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          
          {/* Stripe Integration Toggle */}
          <Card>
            <CardHeader>
              <CardTitle>Stripe Integration</CardTitle>
              <CardDescription>
                Enable or disable Stripe payment processing. When disabled, all subscription features are bypassed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="stripe-toggle" className="flex flex-col gap-1">
                  <span className="font-medium">Stripe Enabled</span>
                  <span className="text-sm text-slate-500">
                    {stripeEnabled 
                      ? "✅ Stripe payments are active (requires Base44 functions)" 
                      : "❌ Stripe is disabled - subscription page hidden"}
                  </span>
                </Label>
                <Switch
                  id="stripe-toggle"
                  checked={stripeEnabled}
                  onCheckedChange={() => handleToggle(
                    'stripe_enabled', 
                    stripeEnabled,
                    'Enable or disable Stripe integration'
                  )}
                  disabled={updateSettingMutation.isPending}
                />
              </div>
            </CardContent>
          </Card>

          {/* App-Wide Access Toggle */}
          <Card className="border-yellow-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                App-Wide Access Override
              </CardTitle>
              <CardDescription>
                When enabled, all authenticated users can access all app features without subscription checks (except admin-only pages).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="access-toggle" className="flex flex-col gap-1">
                  <span className="font-medium">Free Access Mode</span>
                  <span className="text-sm text-slate-500">
                    {appWideAccessEnabled 
                      ? "🟢 Free access is ON - everyone has full access" 
                      : "🔴 Access checks are ON - subscription required"}
                  </span>
                </Label>
                <Switch
                  id="access-toggle"
                  checked={appWideAccessEnabled}
                  onCheckedChange={() => handleToggle(
                    'app_wide_access_enabled', 
                    appWideAccessEnabled,
                    'Override access checks for all users'
                  )}
                  disabled={updateSettingMutation.isPending}
                />
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-blue-900 mb-2">💡 How it works</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li><strong>Stripe Enabled = OFF + Free Access = ON:</strong> App is fully open, no payments, no subscription checks.</li>
                <li><strong>Stripe Enabled = ON + Free Access = OFF:</strong> Normal subscription mode (requires Base44 functions upgrade).</li>
                <li><strong>Both ON:</strong> Stripe works, but access checks are bypassed.</li>
                <li><strong>Both OFF:</strong> Subscription required but Stripe disabled (users blocked).</li>
              </ul>
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}