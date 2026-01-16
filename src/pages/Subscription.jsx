import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUserSettings } from "@/components/hooks/useCurrentUserSettings";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { hasValidAccess, hasValidLatch } from "@/components/lib/subscriptionUtils";

export default function SubscriptionPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [trialActivated, setTrialActivated] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: user } = useCurrentUserSettings();

  // No UserProfile fetch needed - using auth.me() directly

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['subscriptionPlans'],
    queryFn: async () => {
      const result = await base44.entities.SubscriptionPlan.list("order", 100);
      return result || [];
    },
  });

  // Filter plans based on subscription status AND visibility
  const userHasAccess = hasValidAccess(user) || hasValidLatch();
  const isTrialing = user?.subscription_status === 'trialing';
  const isActive = user?.subscription_status === 'active';

  // Show ALL plans (visible ones), but control button availability
  const displayPlans = isActive 
    ? [] 
    : plans.filter(plan => {
        const status = plan.visibility_status || (plan.is_active ? 'visible_purchasable' : 'hidden');
        return status !== 'hidden';
      });
  
  // Helper: Check if plan is available for purchase based on date
  const isPlanAvailable = (plan) => {
    if (!plan.available_from) return true;
    
    const availableDate = new Date(plan.available_from);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return availableDate <= today;
  };

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

  // NEW: Schedule upgrade after trial (keep trial running)
  const handleScheduleUpgrade = async (plan) => {
    setIsProcessing(true);
    
    try {
      const result = await base44.functions.invoke("scheduleUpgradeAfterTrial", {
        priceId: plan.monthly_price_id
      });

      if (result.data?.ok) {
        toast.success(`✅ Upgrade scheduled! ${plan.name} will start after your trial ends.`);
        
        // Refresh user data to show scheduled badge
        await queryClient.invalidateQueries({ queryKey: ['currentUserSettings'] });
      } else {
        toast.error(result.data?.error || "Failed to schedule upgrade.");
      }
    } catch (error) {
      console.error("Schedule upgrade error:", error);
      toast.error("Something went wrong scheduling the upgrade.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler for no-CC trials (uses activateTrial backend, not Stripe)
  const handleStartFreeTrial = async (plan) => {
    console.log('[Subscription] 🎯 Start Free Trial clicked for plan:', plan);
    console.log('[Subscription] 🎯 Plan ID:', plan.id);
    console.log('[Subscription] 🎯 isProcessing:', isProcessing);
    
    if (isProcessing) {
      console.log('[Subscription] ⚠️ Already processing, skipping...');
      return;
    }
    
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
        await queryClient.invalidateQueries({ queryKey: ['currentUserSettings'] });

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
    console.log('[Subscription] Manage button clicked');
    console.log('[Subscription] User data:', user);
    console.log('[Subscription] Stripe customer ID:', user?.stripe_customer_id);
    
    if (!user?.stripe_customer_id) {
      console.warn('[Subscription] No stripe_customer_id found');
      toast.error("We're still syncing your subscription. Please wait a moment.");
      return;
    }

    setIsProcessing(true);
    console.log('[Subscription] Calling createStripePortalSession...');
    
    try {
      const result = await base44.functions.invoke("createStripePortalSession", {
        returnUrl: window.location.href + "?from=stripe_portal"
      });
      
      console.log('[Subscription] Portal session result:', result);
      
      if (result.data?.url) {
        console.log('[Subscription] Opening portal URL:', result.data.url);
        window.open(result.data.url, '_blank');
        toast.success("Opening Stripe portal...");
      } else {
        console.error('[Subscription] No URL in response:', result);
        toast.error("Could not open customer portal.");
      }
    } catch (error) {
      console.error("[Subscription] Portal error:", error);
      toast.error("Something went wrong: " + error.message);
    } finally {
      setIsProcessing(false);
      console.log('[Subscription] Manage flow finished');
    }
  };

  // Automatic sync with proper refetch flow
  const autoSyncStatus = async () => {
    console.log('🔄 [Subscription] Starting automatic sync...');
    setIsSyncing(true);
    try {
      console.log('📡 [Subscription] Calling syncSubscriptionStatus function...');
      const result = await base44.functions.invoke("syncSubscriptionStatus", {});
      
      console.log('📥 [Subscription] Sync result:', result.data);
      
      if (result.data?.success) {
        console.log('✅ [Subscription] Automatic sync successful');
        
        // CRITICAL: Always refetch after sync
        await queryClient.invalidateQueries({ queryKey: ['currentUserSettings'] });
        await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        
        // Refetch profile with fresh data
        const freshUser = await base44.auth.me();
        console.log('📥 [Subscription] Fresh user data:', freshUser);
        
        // Check access using central helper
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

      {isSyncing && (
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
          <div>
            <h3 className="font-semibold text-blue-900">Updating subscription status...</h3>
            <p className="text-sm text-blue-700">This will only take a moment.</p>
          </div>
        </div>
      )}

      {/* Show active banner for BOTH active AND trialing users */}
      {user?.subscription_status === 'active' && !isSyncing && (
        <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-indigo-900">Your subscription is active!</h3>
            <p className="text-sm text-indigo-700">You can manage your invoices and payment method in the customer portal.</p>
          </div>
          <Button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('[Button] Click event triggered');
              handleManageSubscription();
            }} 
            disabled={isProcessing} 
            variant="outline" 
            className="border-indigo-200 hover:bg-indigo-100 text-indigo-700"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Manage Subscription
          </Button>
        </div>
      )}

      {/* Show trial banner for trialing users (no CC required) */}
      {user?.subscription_status === 'trialing' && !isSyncing && (
        <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-green-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Trial active (no CC required)
            </h3>
            <p className="text-sm text-green-700">
              Your free trial is active until {user.trial_ends_at ? new Date(user.trial_ends_at).toLocaleDateString() : 'unknown'}. 
              {user?.scheduled_plan_id ? (
                <span className="font-semibold"> ✅ Upgrade scheduled for after trial.</span>
              ) : (
                <span> Want to continue after the trial? Choose a plan below to upgrade.</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Only show "no subscription" if status is truly invalid/missing */}
      {!userHasAccess && !isSyncing && (!user?.subscription_status || ['none', 'canceled', 'incomplete_expired', 'unpaid'].includes(user?.subscription_status)) && (
        <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div>
            <h3 className="font-semibold text-yellow-900">No active subscription found</h3>
            <p className="text-sm text-yellow-700">Choose a plan below to get started, or wait a moment if you just completed payment.</p>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        {displayPlans.map((plan) => {
        const isPurchasable = (plan.visibility_status || 'visible_purchasable') === 'visible_purchasable';
        const isAvailable = isPlanAvailable(plan);
        const canPurchase = isPurchasable && isAvailable;

        return (
        <Card key={plan.id} className={`border-l-4 ${canPurchase ? 'border-l-green-500' : 'border-l-yellow-500'}`}>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                {!isPurchasable && (
                  <span className="text-xs bg-yellow-100 px-2 py-1 rounded text-yellow-700">Coming Soon</span>
                )}
                {!isAvailable && (
                  <span className="text-xs bg-blue-100 px-2 py-1 rounded text-blue-700">
                    Available from {new Date(plan.available_from).toLocaleDateString('nl-NL')}
                  </span>
                )}
                {plan.show_trial_badge && plan.trial_days > 0 && (
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    plan.is_credit_card_required_for_trial 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {plan.trial_badge_text || `${plan.trial_days} days ${plan.is_credit_card_required_for_trial ? 'trial' : 'free (no CC)'}`}
                  </span>
                )}
              </div>
              <p className="text-slate-600 mb-2">{plan.description}</p>
              <div className="flex gap-4 text-sm text-slate-500">
                <span>Month: €{plan.monthly_price_amount}</span>
                {plan.annual_price_amount && <span>Year: €{plan.annual_price_amount}</span>}
                {plan.show_max_tasks_badge && (
                  <span className="font-medium text-indigo-600">
                    {plan.max_tasks_badge_text || `Max Tasks: ${plan.max_thoughts || 10}`}
                  </span>
                )}
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
              {/* Active users: only show Active badge for their plan */}
              {user?.subscription_status === 'active' ? (
                user?.plan_id === plan.id ? (
                  <Button disabled className="bg-green-500 hover:bg-green-600 text-white">
                    Active
                  </Button>
                ) : null
              ) : user?.subscription_status === 'trialing' ? (
                /* Trialing users: show current plan badge + TWO upgrade buttons for other plans */
                user?.plan_id === plan.id ? (
                  <Button disabled className="bg-green-500 hover:bg-green-600 text-white">
                    Current Trial Plan
                  </Button>
                ) : user?.scheduled_plan_id === plan.monthly_price_id ? (
                  <Button disabled className="bg-blue-500 hover:bg-blue-600 text-white">
                    Scheduled ✓
                  </Button>
                ) : plan.payment_link && isAvailable ? (
                  <>
                    <Button 
                      onClick={() => handleSubscribe(plan)} 
                      disabled={isProcessing}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Upgrade Now
                    </Button>
                    <Button 
                      onClick={() => handleScheduleUpgrade(plan)} 
                      disabled={isProcessing}
                      variant="outline"
                      className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      After Trial
                    </Button>
                  </>
                ) : !isAvailable ? (
                  <Button disabled variant="outline" className="text-blue-600 border-blue-600">
                    Available Soon
                  </Button>
                ) : (
                  <Button disabled variant="outline">
                    Contact
                  </Button>
                )
              ) : !isPurchasable ? (
                <Button disabled variant="outline" className="text-yellow-600 border-yellow-600">
                  Coming Soon
                </Button>
              ) : !isAvailable ? (
                <Button disabled variant="outline" className="text-blue-600 border-blue-600">
                  Available Soon
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
          );
          })}
          {displayPlans.length === 0 && !isLoading && user?.subscription_status !== 'active' && user?.subscription_status !== 'trialing' && (
          <p className="text-center text-slate-500 py-12">No subscription plans available at this time.</p>
        )}
      </div>
    </div>
  );
}