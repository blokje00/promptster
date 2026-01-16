import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Settings, AlertTriangle, Users, Calendar } from "lucide-react";
import { useCurrentUserSettings } from "@/components/hooks/useCurrentUserSettings";
import AdminSettingsHelp from "@/components/admin/AdminSettingsHelp";

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

  // Mutation to create or update a setting (handles both boolean and string values)
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value, description }) => {
      const existing = settings.find(s => s.key === key);
      
      if (existing) {
        // For existing settings, just update the value
        return await base44.entities.AppSetting.update(existing.id, { 
          value: typeof value === 'string' ? value : value,
          description: description 
        });
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

  // Helper to get current value (supports both boolean and string)
  const getSetting = (key, defaultValue = false) => {
    const setting = settings.find(s => s.key === key);
    return setting ? setting.value : defaultValue;
  };

  const handleToggle = (key, currentValue, description) => {
    updateSettingMutation.mutate({ key, value: !currentValue, description });
  };

  const handleDateChange = (key, newValue, description) => {
    updateSettingMutation.mutate({ key, value: newValue, description });
  };

  const handleGrandfatherAllUsers = () => {
    const today = new Date().toISOString().split('T')[0];
    updateSettingMutation.mutate({ 
      key: 'grandfathered_before_date', 
      value: today,
      description: 'Users registered before this date get free lifetime access'
    });
    toast.success('All current users will now have free lifetime access!');
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
  const grandfatheredBeforeDate = getSetting('grandfathered_before_date', '');

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Settings className="w-8 h-8" />
            App Settings
          </h1>
          <p className="text-slate-600 mt-2">Global configuration for the application</p>
        </div>
        <AdminSettingsHelp />
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

          {/* Grandfathering System */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Grandfathering System
              </CardTitle>
              <CardDescription>
                Give free lifetime access to users who registered before a specific date. Perfect for transitioning from free to paid.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="grandfather-date" className="font-medium">
                  Cutoff Date (users before this date get free access)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="grandfather-date"
                    type="date"
                    value={grandfatheredBeforeDate || ''}
                    onChange={(e) => handleDateChange(
                      'grandfathered_before_date',
                      e.target.value,
                      'Users registered before this date get free lifetime access'
                    )}
                    className="max-w-xs"
                  />
                  <Button
                    onClick={handleGrandfatherAllUsers}
                    variant="outline"
                    className="border-green-600 text-green-600 hover:bg-green-50"
                    disabled={updateSettingMutation.isPending}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Set to Today
                  </Button>
                </div>
                {grandfatheredBeforeDate && (
                  <p className="text-sm text-green-700 bg-green-50 p-3 rounded">
                    ✅ All users registered before <strong>{new Date(grandfatheredBeforeDate).toLocaleDateString()}</strong> have free lifetime access.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-blue-900 mb-2">💡 How it works</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li><strong>Stripe OFF + Free Access ON:</strong> App is fully open, no payments.</li>
                <li><strong>Stripe ON + Free Access OFF:</strong> Normal subscription mode (requires Base44 functions).</li>
                <li><strong>Grandfathering:</strong> Set cutoff date before enabling Stripe to keep early users happy.</li>
                <li><strong>Recommended migration:</strong> 1) Set grandfathering date to today, 2) Turn off Free Access, 3) Enable Stripe.</li>
              </ul>
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}