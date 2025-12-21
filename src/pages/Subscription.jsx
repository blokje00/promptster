import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTierAdvisorSettings } from "@/components/hooks/useTierAdvisorSettings";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import TierAdvisor from "@/components/subscription/TierAdvisor";
import { createPageUrl } from "@/utils";
import { hasValidAccess, hasValidLatch } from "@/components/lib/subscriptionUtils";

export default function SubscriptionPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [trialActivated, setTrialActivated] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => base44.auth.me(),
  });

  const { data: tierAdvisorSettings = [] } = useTierAdvisorSettings();

  // HARDENED: Only show if record exists AND explicitly enabled (no admin bypass)
  const showTierAdvisor = tierAdvisorSettings.length > 0 && tierAdvisorSettings[0]?.show_on_subscription_page === true;

  // No UserProfile fetch needed - using auth.me() directly

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['subscriptionPlans'],
    queryFn: async () => {
      const result = await base44.entities.SubscriptionPlan.list("order", 100);
      return result || [];
    },
  });

  // Filter plans based on subscription status AND only show active plans
  const userHasAccess = hasValidAccess(user) || hasValidLatch();
  const displayPlans = userHasAccess 
    ? [] 
    : plans.filter(plan => plan.is_active === true);

  const handleSubscribe = async (plan) => {
    setIsProcessing(true);
    
    try {
      // Use dynamic checkout session with pre-filled email
      const result = await base44.functions.invoke("createStripeCheckoutSession", {
        planId: plan.id,
        priceId: plan.monthly_price_id,
        mode: 'subscription',
        successUrl: window.location.origin + "/Subscription?session_id={CHECKOUT_SESSION_ID}",
        cancelUrl: window.location.origin + "/Subscription?canceled=true"
      });

      if (result.data?.url) {
        window.location.href = result.data.url;
      } else {
        toast.error("Could not generate checkout URL.");
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error("Something went wrong starting the payment.");
      setIsProcessing(false);
    }
  };

  // Handler for no-CC trials (uses activateTrial backend, not Stripe)
  const handleStartFreeTrial = async (plan) => {
    console.log('[Subscription] 🎯 Start Free Trial clicked');
    toast.info('Trial activatie gestart...');
    setIsProcessing(true);

    try {
      console.log('[Subscription] ⏳ Invoking activateTrial function...');
      // Activate trial via backend (no Stripe needed)
      const response = await base44.functions.invoke('activateTrial', {
        planId: plan.id
      });

      console.log('[Subscription] 📥 activateTrial response:', response.data);

      if (response.data?.success) {
        console.log('[Subscription] ✅ Trial activation successful, setting access latch...');
        
        // Seed demo data for new users
        await base44.functions.invoke('seedDemoData', {});

        // CRITICAL: Set local access latch for immediate access
        const trialEndsAt = response.data.trial_ends_at;
        const accessLatch = {
          status: "trialing",
          trial_ends_at: trialEndsAt,
          set_at: Date.now(),
        };
        localStorage.setItem("promptster_access_latch", JSON.stringify(accessLatch));
        console.log('[Subscription] 🔐 Access latch set:', accessLatch);

        // Invalidate cache for future refreshes
        await queryClient.invalidateQueries({ queryKey: ['currentUser'] });

        toast.success('🎉 Trial succesvol geactiveerd! Doorsturen...', {
          description: `${plan.trial_days} dagen volledige toegang`
        });

        console.log('[Subscription] 🚀 Hard redirect to Multiprompt');
        
        // Optionally sync in background (non-blocking)
        base44.functions.invoke('syncSubscriptionStatus', {}).catch(err => 
          console.warn('[Subscription] Background sync failed:', err)
        );

        // Hard redirect to ensure full app state reset
        window.location.href = createPageUrl('Multiprompt');
      } else {
        console.error('[Subscription] ❌ activateTrial failed:', response.data?.error);
        toast.error(response.data?.error || 'Failed to activate trial');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('[Subscription] ❌ Trial activation error:', error);
      toast.error("Something went wrong starting the trial.");
      setIsProcessing(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user?.stripe_customer_id) {
      toast.error("We're still syncing your subscription. Please wait a moment.");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await base44.functions.invoke("createStripePortalSession", {
        returnUrl: window.location.href + "?from=stripe_portal"
      });
      
      if (result.data?.url) {
        window.open(result.data.url, '_blank');
      } else {
        toast.error("Could not open customer portal.");
      }
    } catch (error) {
      console.error("Portal error:", error);
      toast.error("Something went wrong opening the management portal.");
    } finally {
      setIsProcessing(false);
    }
  };

  // OPTIE 1: Automatische sync (geen UI knop meer)
  const autoSyncStatus = async () => {
    console.log('🔄 [Subscription] Starting automatic sync...');
    setIsSyncing(true);
    try {
      console.log('📡 [Subscription] Calling syncSubscriptionStatus function...');
      const result = await base44.functions.invoke("syncSubscriptionStatus", {});
      
      console.log('📥 [Subscription] Sync result:', result.data);
      
      if (result.data?.success) {
        console.log('✅ [Subscription] Automatic sync successful');
        
        // Invalidate cache
        await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        
        // Refresh auth.me() for latest subscription data
        const freshUser = await base44.auth.me();
        const hasAccess = hasValidAccess(freshUser);
        console.log('🔐 [Subscription] Access check result:', hasAccess);
        
        if (hasAccess) {
          console.log('✅ [Subscription] Access granted - redirecting to Multiprompt');
          // Full page navigation to refresh all components
          window.location.href = createPageUrl('Multiprompt');
        }
      } else {
        console.error('❌ [Subscription] Sync failed:', result.data?.error);
      }
    } catch (error) {
      console.error("❌ [Subscription] Auto-sync error:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // OPTIE 1: Automatische sync op page load met cooldown
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Handle canceled payment
    if (params.get("canceled")) {
      toast.info("Payment canceled.");
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
    
    // Check if we should auto-sync (e.g., after Stripe return or initial load)
    const userHasAccess = hasValidAccess(user) || hasValidLatch();
    const shouldSync = params.get("session_id") || params.get("from_stripe_portal") || !userHasAccess;
    
    if (shouldSync && user?.email) {
      // Cooldown check: don't sync more than once per minute
      const lastSyncKey = `last_sync_${user.id}`;
      const lastSync = localStorage.getItem(lastSyncKey);
      const now = Date.now();
      
      if (!lastSync || (now - parseInt(lastSync)) > 60000) {
        console.log('[Subscription] 🔄 Triggering automatic sync...');
        localStorage.setItem(lastSyncKey, now.toString());
        
        // Small delay to show UI first
        setTimeout(() => {
          autoSyncStatus();
        }, 500);
      } else {
        console.log('[Subscription] ⏸️ Sync cooldown active, skipping');
      }
    }
    
    // Clean URL after processing
    if (params.get("session_id") || params.get("from=stripe_portal")) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);



  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Subscriptions</h1>
      </div>

      {/* Tier Advisor - Admin or enabled for users */}
      {showTierAdvisor && (
        <div className="mb-8">
          <TierAdvisor />
        </div>
      )}

      {isSyncing && (
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
          <div>
            <h3 className="font-semibold text-blue-900">Updating subscription status...</h3>
            <p className="text-sm text-blue-700">This will only take a moment.</p>
          </div>
        </div>
      )}

      {userHasAccess && !isSyncing && (
        <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-indigo-900">Your subscription is active!</h3>
            <p className="text-sm text-indigo-700">You can manage your invoices and payment method in the customer portal.</p>
          </div>
          <Button onClick={handleManageSubscription} disabled={isProcessing} variant="outline" className="border-indigo-200 hover:bg-indigo-100 text-indigo-700">
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Manage Subscription"}
          </Button>
        </div>
      )}

      {!userHasAccess && !isSyncing && (!user?.subscription_status || user?.subscription_status === 'none') && (
        <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div>
            <h3 className="font-semibold text-yellow-900">No active subscription found</h3>
            <p className="text-sm text-yellow-700">Choose a plan below to get started, or wait a moment if you just completed payment.</p>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        {displayPlans.map((plan) => (
        <Card key={plan.id} className={`border-l-4 ${plan.is_active ? 'border-l-green-500' : 'border-l-slate-300'}`}>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                {!plan.is_active && <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">Inactive</span>}
                {plan.trial_days > 0 && !plan.is_credit_card_required_for_trial && (
                  <span className="text-xs bg-green-100 px-2 py-1 rounded text-green-700 font-medium">
                    {plan.trial_days} days free (no CC)
                  </span>
                )}
                {plan.trial_days > 0 && plan.is_credit_card_required_for_trial && (
                  <span className="text-xs bg-blue-100 px-2 py-1 rounded text-blue-700 font-medium">
                    {plan.trial_days} days trial
                  </span>
                )}
              </div>
              <p className="text-slate-600 mb-2">{plan.description}</p>
              <div className="flex gap-4 text-sm text-slate-500">
                <span>Month: €{plan.monthly_price_amount}</span>
                {plan.annual_price_amount && <span>Year: €{plan.annual_price_amount}</span>}
                <span className="font-medium text-indigo-600">Max Tasks: {plan.max_thoughts || 10}</span>
              </div>
              {plan.features && plan.features.length > 0 ? (
                <ul className="mt-3 space-y-1">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="text-sm text-slate-600">• {feature}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="flex gap-2">
              {user?.plan_id === plan.id && (user?.subscription_status === 'active' || user?.subscription_status === 'trialing') ? (
                <Button disabled className="bg-green-500 hover:bg-green-600 text-white">
                  Active
                </Button>
              ) : !plan.is_active ? (
                <Button disabled variant="outline" className="text-slate-400">
                  Not Available
                </Button>
              ) : plan.trial_days > 0 && !plan.is_credit_card_required_for_trial ? (
                <Button 
                  onClick={() => handleStartFreeTrial(plan)} 
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Start Free Trial
                </Button>
              ) : plan.payment_link ? (
                <Button 
                  onClick={() => handleSubscribe(plan)} 
                  disabled={isProcessing}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {plan.trial_days > 0 ? 'Start Trial' : 'Subscribe'}
                </Button>
              ) : (
                <Button disabled variant="outline">
                  Contact
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        ))}
        {displayPlans.length === 0 && !isLoading && user?.subscription_status !== 'active' && user?.subscription_status !== 'trialing' && (
          <p className="text-center text-slate-500 py-12">No subscription plans available at this time.</p>
        )}
      </div>
    </div>
  );
}