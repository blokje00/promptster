import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SubscriptionPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [trialActivated, setTrialActivated] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => base44.auth.me(),
  });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['subscriptionPlans'],
    queryFn: async () => {
      const result = await base44.entities.SubscriptionPlan.list("order", 100);
      return result || [];
    },
  });

  // Filter plans based on subscription status AND only show active plans
  const displayPlans = (user?.subscription_status === 'active' || user?.subscription_status === 'trialing') 
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
        successUrl: window.location.origin + "/Multiprompt?session_id={CHECKOUT_SESSION_ID}",
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

  const handleManageSubscription = async () => {
    if (!user?.stripe_customer_id) {
      toast.error("We're still syncing your subscription. Please click 'Sync Status' first.");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await base44.functions.invoke("createStripePortalSession", {
        returnUrl: window.location.href
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

  const handleSyncStatus = async () => {
    setIsProcessing(true);
    try {
      const result = await base44.functions.invoke("syncSubscriptionStatus", {});
      
      if (result.data?.success) {
        toast.success("Subscription status synchronized!");
        await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      } else {
        toast.error(result.data?.error || "Could not sync subscription.");
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Failed to sync subscription status.");
    } finally {
      setIsProcessing(false);
    }
  };

  // REMOVED: Auto-activation moved to AccessGuard to prevent activating trial when user wants to subscribe first

  // Handle Multiprompt redirect with session verification
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Handle canceled payment
    if (params.get("canceled")) {
      toast.info("Payment canceled.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);



  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Subscriptions</h1>
      </div>

      {(user?.subscription_status === 'active' || user?.subscription_status === 'trialing') && (
        <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-indigo-900">Your subscription is active!</h3>
            <p className="text-sm text-indigo-700">You can manage your invoices and payment method in the customer portal.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSyncStatus} disabled={isProcessing} variant="outline" className="border-slate-200 hover:bg-slate-100 text-slate-700">
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sync Status"}
            </Button>
            <Button onClick={handleManageSubscription} disabled={isProcessing} variant="outline" className="border-indigo-200 hover:bg-indigo-100 text-indigo-700">
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Manage Subscription"}
            </Button>
          </div>
        </div>
      )}

      {!user?.subscription_status || user?.subscription_status === 'none' ? (
        <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-yellow-900">No active subscription found</h3>
            <p className="text-sm text-yellow-700">If you just completed payment via Stripe, click 'Sync Status' to update.</p>
          </div>
          <Button onClick={handleSyncStatus} disabled={isProcessing} className="bg-yellow-600 hover:bg-yellow-700">
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sync Status"}
          </Button>
        </div>
      ) : null}

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
              ) : plan.payment_link ? (
                <Button 
                  onClick={() => handleSubscribe(plan)} 
                  disabled={isProcessing}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Start Trial
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