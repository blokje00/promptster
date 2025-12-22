import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUserSettings } from "@/components/hooks/useCurrentUserSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calculator, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function TierAdvisorToggles() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUserSettings();
  const [showOnFeatures, setShowOnFeatures] = useState(false);
  const [showOnSubscription, setShowOnSubscription] = useState(false);

  // New wrapper form state
  const [showWrapperForm, setShowWrapperForm] = useState(false);
  const [newWrapper, setNewWrapper] = useState({
    name: '',
    slug: '',
    has_credit_savings: false,
    credit_multiplier: 1,
    description: '',
    order: 0
  });

  const { data: wrappers = [] } = useQuery({
    queryKey: ['aiWrappers'],
    queryFn: async () => {
      try {
        return await base44.entities.AIWrapper.list("order") || [];
      } catch (error) {
        return [];
      }
    },
  });

  const createWrapperMutation = useMutation({
    mutationFn: (data) => base44.entities.AIWrapper.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiWrappers'] });
      setShowWrapperForm(false);
      setNewWrapper({ name: '', slug: '', has_credit_savings: false, credit_multiplier: 1, description: '', order: 0 });
      toast.success("AI Wrapper added");
    },
  });

  const deleteWrapperMutation = useMutation({
    mutationFn: (id) => base44.entities.AIWrapper.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiWrappers'] });
      toast.success("AI Wrapper deleted");
    },
  });

  useEffect(() => {
    if (currentUser) {
      setShowOnFeatures(currentUser.tier_advisor_features_enabled || false);
      setShowOnSubscription(currentUser.tier_advisor_subscription_enabled || false);
    }
  }, [currentUser]);

  // Admin only - MUST be after ALL hooks
  if (currentUser?.role !== 'admin') return null;

  const handleSave = async () => {
    if (!currentUser?.id) {
      toast.error("User not loaded");
      return;
    }

    try {
      console.log('[TierAdvisor] Saving to User entity:', currentUser.id);
      
      const payload = {
        tier_advisor_features_enabled: showOnFeatures,
        tier_advisor_subscription_enabled: showOnSubscription,
      };

      // Update User entity
      const result = await base44.entities.User.update(currentUser.id, payload);
      console.log('[TierAdvisor] Save successful:', result);

      // CRITICAL: Direct cache update for instant UI feedback
      queryClient.setQueryData(['currentUserSettings'], (old) => ({
        ...old,
        ...payload
      }));
      
      // Safety: invalidate to ensure all pages refetch
      await queryClient.invalidateQueries({ queryKey: ['currentUserSettings'] });
      
      toast.success("✅ Tier Advisor settings saved!");
    } catch (error) {
      console.error('[TierAdvisor] Save failed:', error);
      toast.error("Failed to save: " + error.message);
    }
  };

  const handleCreateWrapper = () => {
    if (!newWrapper.name || !newWrapper.slug) {
      toast.error("Name and slug are required");
      return;
    }
    createWrapperMutation.mutate(newWrapper);
  };

  return (
    <Card id="tier-advisor">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Tier Advisor Settings (Admin Only)
        </CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Control where the Tier Advisor is visible for regular users
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">Show on Features page</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Allow regular users to see Tier Advisor on Features page</p>
            </div>
            <Switch
              checked={!!showOnFeatures}
              onCheckedChange={(checked) => setShowOnFeatures(checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">Show on Subscription page</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Allow regular users to see Tier Advisor on Subscription page</p>
            </div>
            <Switch
              checked={!!showOnSubscription}
              onCheckedChange={(checked) => setShowOnSubscription(checked)}
            />
          </div>

          <Button
            onClick={handleSave}
            className="w-full"
          >
            Save Tier Advisor Settings
          </Button>
        </div>

        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">AI Wrappers</h4>
            <Button onClick={() => setShowWrapperForm(!showWrapperForm)} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Wrapper
            </Button>
          </div>

          {showWrapperForm && (
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg mb-4 space-y-3">
              <Input
                placeholder="Name (e.g. Base44)"
                value={newWrapper.name}
                onChange={(e) => setNewWrapper({ ...newWrapper, name: e.target.value })}
              />
              <Input
                placeholder="Slug (e.g. base44)"
                value={newWrapper.slug}
                onChange={(e) => setNewWrapper({ ...newWrapper, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
              />
              <Textarea
                placeholder="Description (e.g. Batching saves 10x credits)"
                value={newWrapper.description}
                onChange={(e) => setNewWrapper({ ...newWrapper, description: e.target.value })}
                className="min-h-[60px]"
              />
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <Switch
                    checked={!!newWrapper.has_credit_savings}
                    onCheckedChange={(checked) => setNewWrapper(prev => ({ ...prev, has_credit_savings: checked }))}
                  />
                  <span className="text-sm">Has credit savings</span>
                </label>
                <Input
                  type="number"
                  placeholder="Credit multiplier"
                  value={newWrapper.credit_multiplier}
                  onChange={(e) => setNewWrapper({ ...newWrapper, credit_multiplier: parseFloat(e.target.value) || 1 })}
                  className="w-32"
                />
                <Input
                  type="number"
                  placeholder="Order"
                  value={newWrapper.order}
                  onChange={(e) => setNewWrapper({ ...newWrapper, order: parseInt(e.target.value) || 0 })}
                  className="w-24"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateWrapper} disabled={createWrapperMutation.isPending}>
                  {createWrapperMutation.isPending ? "Adding..." : "Add Wrapper"}
                </Button>
                <Button variant="outline" onClick={() => setShowWrapperForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {wrappers.map(w => (
              <div key={w.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{w.name}</p>
                    {w.has_credit_savings && (
                      <Badge variant="outline" className="text-xs">
                        {w.credit_multiplier}x savings
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{w.description || 'No description'}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteWrapperMutation.mutate(w.id)}
                  disabled={deleteWrapperMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
            {wrappers.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                No wrappers added yet. Click "Add Wrapper" to create one.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}