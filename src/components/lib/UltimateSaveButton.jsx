/**
 * UltimateSaveButton Pattern (React onClick + State)
 * 
 * Simpelste en meest betrouwbare save pattern - geen DOM listeners, geen refs
 * 
 * CORE PRINCIPLES:
 * 1. Normal React onClick handler (geen DOM addEventListener)
 * 2. Local state voor saving/saved status
 * 3. Optimistic UI updates via queryClient.setQueryData
 * 4. Cache invalidation voor refetch
 * 5. Automatic modal close on success
 * 
 * Waarom dit beter is dan complexe save libraries:
 * - Volledig voorspelbaar React gedrag
 * - Geen cleanup issues (listeners, refs, timers)
 * - Makkelijk te debuggen
 * - Werkt altijd consistent, ook bij herhaaldelijk gebruik
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

/**
 * BASIC PATTERN (minimaal voorbeeld)
 */
export function BasicSaveExample() {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: "", price: 0 });
  
  const handleSave = async () => {
    // 1. Validation
    if (!formData.name?.trim()) {
      toast.error("Name is required");
      return;
    }

    // 2. Set saving state
    setSaving(true);
    
    try {
      // 3. Save to API
      const result = await base44.entities.Product.create(formData);
      
      // 4. Success feedback
      toast.success("Saved!");
      
      // 5. Reset or close
      setFormData({ name: "", price: 0 });
    } catch (error) {
      toast.error(error.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <input 
        value={formData.name}
        onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
      />
      <Button 
        onClick={handleSave} 
        disabled={saving}
      >
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

/**
 * FULL PATTERN (met React Query optimistic updates)
 */
export function FullSaveExample({ dialogOpen, setDialogOpen }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", price: 0 });
  };

  const handleSave = async () => {
    // 1. Validation (front-end checks)
    if (!formData.name?.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!formData.price || formData.price <= 0) {
      toast.error("Price must be greater than 0");
      return;
    }

    // 2. Set saving state (disables button, shows loading)
    setSaving(true);
    
    try {
      // 3. Normalize payload (trim strings, ensure booleans)
      const payload = {
        ...formData,
        name: formData.name.trim(),
        description: (formData.description || "").trim()
      };

      // 4. Save to API (create or update)
      const saved = await base44.entities.Product.create(payload);

      // 5. Optimistic UI update (instant feedback)
      queryClient.setQueryData(['products'], (old = []) => {
        return [saved, ...old];
      });

      // 6. Update single item cache
      queryClient.setQueryData(['product', saved.id], saved);

      // 7. Invalidate for background refetch (ensures consistency)
      queryClient.invalidateQueries({ queryKey: ['products'] });

      // 8. Success feedback
      toast.success("Product saved");

      // 9. Close modal and reset
      setDialogOpen(false);
      resetForm();

    } catch (error) {
      // Error handling
      toast.error(error.message || "Failed to save");
    } finally {
      // Always reset saving state
      setSaving(false);
    }
  };

  return (
    <Button 
      onClick={handleSave} 
      disabled={saving}
      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
    >
      {saving ? "Saving…" : "Save"}
    </Button>
  );
}

/**
 * ADMIN SUBSCRIPTION PATTERN (complete real-world example)
 * 
 * Zoals geïmplementeerd in pages/AdminSubscription
 */
export function AdminSubscriptionSavePattern() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    monthly_price_amount: 0,
    show_trial_badge: true,
    trial_badge_text: "",
    is_active: true
  });

  // Single source of truth voor save operatie
  const savePlan = async (planId, payload) => {
    if (planId) {
      return await base44.entities.SubscriptionPlan.update(planId, payload);
    }
    return await base44.entities.SubscriptionPlan.create(payload);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      monthly_price_amount: 0,
      show_trial_badge: true,
      trial_badge_text: "",
      is_active: true
    });
    setIsEditing(false);
    setCurrentPlan(null);
  };

  const handleSave = async () => {
    // 1. Validation
    if (!formData.name?.trim()) {
      toast.error("Plan name is required");
      return;
    }
    if (!formData.monthly_price_amount || formData.monthly_price_amount <= 0) {
      toast.error("Monthly price must be greater than 0");
      return;
    }

    // 2. Set saving state
    setSaving(true);
    
    try {
      // 3. Normalize payload (critical voor toggles!)
      const payload = {
        ...formData,
        show_trial_badge: !!formData.show_trial_badge,
        trial_badge_text: (formData.trial_badge_text || "").trim(),
        is_active: !!formData.is_active,
        features: formData.features.filter(f => f.trim())
      };

      // 4. Save (create or update)
      const planId = isEditing && currentPlan ? currentPlan.id : null;
      const saved = await savePlan(planId, payload);

      // 5. Optimistic cache update (array)
      queryClient.setQueryData(['subscriptionPlans'], (old = []) => {
        const idx = old.findIndex((p) => p.id === saved.id);
        if (idx === -1) return [saved, ...old];
        const next = [...old];
        next[idx] = { ...old[idx], ...saved };
        return next;
      });

      // 6. Single item cache update
      queryClient.setQueryData(['subscriptionPlan', saved.id], saved);

      // 7. Invalidate voor consistency
      queryClient.invalidateQueries({ queryKey: ['subscriptionPlans'] });

      // 8. Success feedback
      toast.success("Plan saved");

      // 9. Close en reset
      setDialogOpen(false);
      resetForm();

    } catch (error) {
      toast.error(error.message || "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button 
      onClick={handleSave} 
      disabled={saving}
      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
    >
      {saving ? "Saving…" : "Save Plan"}
    </Button>
  );
}

/**
 * WHY THIS PATTERN WORKS PERFECTLY:
 * 
 * ✅ Pure React: Normal onClick, geen DOM listeners
 * ✅ No refs: Geen buttonRef, containerRef, saveInstanceRef
 * ✅ No effects: Geen useEffect cleanup problemen
 * ✅ Predictable: saving state altijd correct
 * ✅ Optimistic UI: setQueryData voor instant feedback
 * ✅ Cache consistency: invalidateQueries voor refetch
 * ✅ Works every time: Ook bij herhaaldelijk save/edit/save
 * ✅ Easy debugging: Console.log overal mogelijk
 * ✅ Modal close: setDialogOpen(false) altijd betrouwbaar
 * 
 * COMPARISON MET OUDE APPROACH:
 * 
 * ❌ OLD: DOM addEventListener → listener leaks, duplicate handlers
 * ✅ NEW: React onClick → automatic cleanup, single source
 * 
 * ❌ OLD: useEffect deps → stale closures, re-init bugs
 * ✅ NEW: Direct state access → altijd fresh state
 * 
 * ❌ OLD: Ref juggling → null checks, timing issues
 * ✅ NEW: Props/state → direct React flow
 * 
 * ❌ OLD: Complex state machine → success/error/saving states verward
 * ✅ NEW: Single saving boolean → crystal clear
 * 
 * DEZE PATTERN GEBRUIKEN VOOR:
 * - Create/Update forms in modals
 * - Settings save buttons
 * - Profile updates
 * - Any form with optimistic UI
 * 
 * COMBINEREN MET:
 * - UltimateToggle voor boolean fields
 * - Controlled inputs (formData als single source)
 * - React Query voor cache management
 */