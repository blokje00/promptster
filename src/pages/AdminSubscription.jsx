import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UltimateSaveButton } from "@/components/lib/UltimateSaveButton";
import { qk } from "@/components/lib/queryKeys";

export default function AdminSubscription() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: qk.subscriptionPlans,
    queryFn: async () => {
      const result = await base44.entities.SubscriptionPlan.list("order", 100);
      return result || [];
    },
  });

  // Single source of truth for save
  const savePlan = async (planId, payload) => {
    if (planId) {
      return await base44.entities.SubscriptionPlan.update(planId, payload);
    }
    return await base44.entities.SubscriptionPlan.create(payload);
  };

  const deletePlanMutation = useMutation({
    mutationFn: (id) => base44.entities.SubscriptionPlan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.subscriptionPlans });
      toast.success("Plan deleted");
    },
  });

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    monthly_price_amount: 0,
    monthly_price_id: "",
    annual_price_amount: 0,
    annual_price_id: "",
    payment_link: "",
    max_thoughts: 10,
    features: [],
    is_active: true,
    order: 0,
    trial_days: 0,
    is_credit_card_required_for_trial: true,
    show_trial_badge: true,
    trial_badge_text: "",
    show_max_tasks_badge: true,
    max_tasks_badge_text: ""
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      monthly_price_amount: 0,
      monthly_price_id: "",
      annual_price_amount: 0,
      annual_price_id: "",
      payment_link: "",
      max_thoughts: 10,
      features: [],
      is_active: true,
      order: 0,
      trial_days: 0,
      is_credit_card_required_for_trial: true,
      show_trial_badge: true,
      trial_badge_text: "",
      show_max_tasks_badge: true,
      max_tasks_badge_text: ""
    });
    setIsEditing(false);
    setCurrentPlan(null);
  };

  const handleEdit = (plan) => {
    setFormData({
      name: plan.name,
      description: plan.description,
      monthly_price_amount: plan.monthly_price_amount,
      monthly_price_id: plan.monthly_price_id,
      annual_price_amount: plan.annual_price_amount,
      annual_price_id: plan.annual_price_id,
      payment_link: plan.payment_link || "",
      max_thoughts: plan.max_thoughts || 10,
      features: plan.features || [],
      is_active: plan.is_active,
      order: plan.order,
      trial_days: plan.trial_days || 0,
      is_credit_card_required_for_trial: plan.is_credit_card_required_for_trial !== undefined ? plan.is_credit_card_required_for_trial : true,
      show_trial_badge: plan.show_trial_badge !== undefined ? plan.show_trial_badge : true,
      trial_badge_text: plan.trial_badge_text || "",
      show_max_tasks_badge: plan.show_max_tasks_badge !== undefined ? plan.show_max_tasks_badge : true,
      max_tasks_badge_text: plan.max_tasks_badge_text || ""
    });
    setCurrentPlan(plan);
    setIsEditing(true);
    setDialogOpen(true);
  };

  // UltimateSaveButton refs
  const saveButtonRef = useRef(null);
  const modalContainerRef = useRef(null);
  
  // Initialize UltimateSaveButton when dialog opens
  useEffect(() => {
    if (!dialogOpen || !saveButtonRef.current) return;

    const getPayload = () => ({
      ...formData,
      features: formData.features.filter(f => f.trim())
    });

    const validate = () => {
      if (!formData.name?.trim()) {
        return { valid: false, message: "Plan name is required" };
      }
      if (!formData.monthly_price_amount || formData.monthly_price_amount <= 0) {
        return { valid: false, message: "Monthly price must be greater than 0" };
      }
      return { valid: true };
    };

    const saveBtn = new UltimateSaveButton({
      buttonElement: saveButtonRef.current,
      containerToClose: modalContainerRef.current,
      validate,
      
      onBeforeSave: async () => {
        const payload = getPayload();
        const planId = isEditing && currentPlan ? currentPlan.id : null;

        // DB call
        const saved = await savePlan(planId, payload);

        // ✅ Optimistic update: plans array direct patchen
        queryClient.setQueryData(qk.subscriptionPlans, (old = []) => {
          const idx = old.findIndex((p) => p.id === saved.id);
          if (idx === -1) return [saved, ...old];     // nieuw plan vooraan
          const next = [...old];
          next[idx] = { ...old[idx], ...saved };      // bestaand plan updaten
          return next;
        });

        // Set individual plan cache
        queryClient.setQueryData(qk.subscriptionPlan(saved.id), saved);

        // ✅ Safety refetch: blijft alles consistent
        queryClient.invalidateQueries({ queryKey: qk.subscriptionPlans });

        return true;
      },

      onClose: () => {
        setDialogOpen(false);
        resetForm();
      },

      labels: {
        idle: "Save Plan",
        saving: "Saving…",
        success: "Saved ✓",
        error: "Save failed"
      }
    });

    return () => saveBtn.destroy();
  }, [dialogOpen, isEditing, currentPlan?.id, formData, queryClient]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Subscription Management</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              New Plan
            </Button>
          </DialogTrigger>
          <DialogContent ref={modalContainerRef} className="max-w-lg max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Edit Plan" : "New Plan"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Name</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Monthly Price (€)</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={formData.monthly_price_amount} 
                    onChange={(e) => setFormData({...formData, monthly_price_amount: parseFloat(e.target.value)})} 
                  />
                </div>
                <div>
                  <Label>Monthly Price ID</Label>
                  <Input 
                    value={formData.monthly_price_id} 
                    onChange={(e) => setFormData({...formData, monthly_price_id: e.target.value})} 
                    placeholder="price_..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Annual Price (€)</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={formData.annual_price_amount} 
                    onChange={(e) => setFormData({...formData, annual_price_amount: parseFloat(e.target.value)})} 
                  />
                </div>
                <div>
                  <Label>Annual Price ID</Label>
                  <Input 
                    value={formData.annual_price_id} 
                    onChange={(e) => setFormData({...formData, annual_price_id: e.target.value})} 
                    placeholder="price_..."
                  />
                </div>
              </div>
              <div>
                <Label>Stripe Payment Link</Label>
                <Input 
                  value={formData.payment_link} 
                  onChange={(e) => setFormData({...formData, payment_link: e.target.value})} 
                  placeholder="https://buy.stripe.com/..."
                />
              </div>
              <div>
                <Label>Max Tasks Limit</Label>
                <Input 
                  type="number" 
                  value={formData.max_thoughts} 
                  onChange={(e) => setFormData({...formData, max_thoughts: parseInt(e.target.value)})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Trial Days</Label>
                  <Input 
                    type="number" 
                    value={formData.trial_days} 
                    onChange={(e) => setFormData({...formData, trial_days: parseInt(e.target.value)})} 
                    placeholder="0 = geen trial"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch 
                    checked={formData.is_credit_card_required_for_trial} 
                    onCheckedChange={(checked) => setFormData({...formData, is_credit_card_required_for_trial: checked})} 
                  />
                  <Label>Creditcard Required</Label>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 text-sm">Badge Display Settings</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={formData.show_trial_badge} 
                      onCheckedChange={(checked) => setFormData({...formData, show_trial_badge: checked})} 
                    />
                    <Label>Show Trial Badge</Label>
                  </div>
                  {formData.show_trial_badge && (
                    <div>
                      <Label className="text-xs text-slate-500">Custom Trial Badge Text (optional)</Label>
                      <Input 
                        value={formData.trial_badge_text} 
                        onChange={(e) => setFormData({...formData, trial_badge_text: e.target.value})} 
                        placeholder="e.g. 14 days free (no CC)"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3 mt-4">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={formData.show_max_tasks_badge} 
                      onCheckedChange={(checked) => setFormData({...formData, show_max_tasks_badge: checked})} 
                    />
                    <Label>Show Max Tasks Badge</Label>
                  </div>
                  {formData.show_max_tasks_badge && (
                    <div>
                      <Label className="text-xs text-slate-500">Custom Max Tasks Badge Text (optional)</Label>
                      <Input 
                        value={formData.max_tasks_badge_text} 
                        onChange={(e) => setFormData({...formData, max_tasks_badge_text: e.target.value})} 
                        placeholder="e.g. Max Tasks: 20"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label>Features (one per line)</Label>
                <Textarea 
                  value={formData.features.join('\n')} 
                  onChange={(e) => setFormData({...formData, features: e.target.value.split('\n')})} 
                  placeholder="Feature 1&#10;Feature 2"
                  className="min-h-[100px]"
                  rows={6}
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={formData.is_active} 
                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})} 
                  />
                  <Label>Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Order</Label>
                  <Input 
                    type="number" 
                    className="w-20"
                    value={formData.order} 
                    onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})} 
                  />
                </div>
              </div>
              <button ref={saveButtonRef} type="button" className="w-full">
                Save Plan
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className={`border-l-4 ${plan.is_active ? 'border-l-green-500' : 'border-l-slate-300'}`}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  {!plan.is_active && <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">Inactive</span>}
                </div>
                <p className="text-slate-600 mb-2">{plan.description}</p>
                <div className="flex gap-4 text-sm text-slate-500 flex-wrap">
                  <span>Month: €{plan.monthly_price_amount}</span>
                  {plan.monthly_price_id && <span className="text-xs text-slate-400">({plan.monthly_price_id})</span>}
                  <span>Year: €{plan.annual_price_amount}</span>
                  {plan.annual_price_id && <span className="text-xs text-slate-400">({plan.annual_price_id})</span>}
                  {plan.show_max_tasks_badge && (
                    <span className="font-medium text-indigo-600">
                      {plan.max_tasks_badge_text || `Max Tasks: ${plan.max_thoughts || 10}`}
                    </span>
                  )}
                  {plan.show_trial_badge && plan.trial_days > 0 && (
                    <span className="font-medium text-green-600">
                      {plan.trial_badge_text || `Trial: ${plan.trial_days} dagen ${plan.is_credit_card_required_for_trial ? '(CC vereist)' : '(CC-free)'}`}
                    </span>
                  )}
                </div>
                {plan.payment_link && (
                  <div className="mt-2 flex items-center gap-2">
                    <a href={plan.payment_link} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline">
                      Stripe Payment Link →
                    </a>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => handleEdit(plan)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deletePlanMutation.mutate(plan.id)} className="text-red-500 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {plans.length === 0 && (
          <p className="text-center text-slate-500 py-12">No subscription plans configured yet.</p>
        )}
      </div>
    </div>
  );
}