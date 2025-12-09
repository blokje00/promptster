import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SubscriptionPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

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

  const handleSubscribe = async (plan) => {
    setIsProcessing(true);
    try {
      if (!plan.monthly_price_id) {
        toast.info("Contact us for this plan.");
        return;
      }

      const result = await base44.functions.invoke("createStripeCheckoutSession", {
        planId: plan.id,
        priceId: plan.monthly_price_id,
        billingCycle: 'monthly',
        successUrl: window.location.origin + "/Subscription?success=true&session_id={CHECKOUT_SESSION_ID}",
        cancelUrl: window.location.origin + "/Subscription?canceled=true"
      });

      if (result.data?.url) {
        window.location.href = result.data.url;
      } else {
        toast.error("Could not generate checkout URL.");
      }
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error("Something went wrong starting the payment.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManageSubscription = async () => {
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

  // Check URL params voor succes/cancel en verify session
  useEffect(() => {
    const verifySubscription = async () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get("session_id");
      
      if (sessionId) {
        setIsProcessing(true);
        try {
          const result = await base44.functions.invoke("verifyStripeSession", { sessionId });
          if (result.data?.success) {
             toast.success("Payment verified! Your subscription is active.");
             // Refresh user data
             queryClient.invalidateQueries({ queryKey: ['currentUser'] });
             // Clean URL
             window.history.replaceState({}, document.title, window.location.pathname);
          } else {
             toast.error("Could not verify payment. Please contact support.");
          }
        } catch (error) {
          console.error("Verification error:", error);
          toast.error("Error verifying payment.");
        } finally {
          setIsProcessing(false);
        }
      } else if (params.get("success")) {
        // Fallback for old flow or if session_id is missing
        toast.success("Subscription successfully activated! Thank you.");
      }
      
      if (params.get("canceled")) {
        toast.info("Payment canceled.");
      }
    };

    verifySubscription();
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Subscriptions</h1>
      </div>

      {user?.subscription_status === 'active' && (
        <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-indigo-900">Your subscription is active!</h3>
            <p className="text-sm text-indigo-700">You can manage your invoices and payment method in the customer portal.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={async () => {
              setIsProcessing(true);
              try {
                await base44.functions.invoke("syncSubscriptionStatus");
                toast.success("Status synchronized");
                queryClient.invalidateQueries({ queryKey: ['currentUser'] });
              } catch(e) { toast.error("Sync failed"); }
              setIsProcessing(false);
            }} disabled={isProcessing} variant="outline" className="border-slate-200 hover:bg-slate-100 text-slate-700">
              Sync Status
            </Button>
            <Button onClick={handleManageSubscription} disabled={isProcessing} variant="outline" className="border-indigo-200 hover:bg-indigo-100 text-indigo-700">
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Manage Subscription"}
            </Button>
          </div>
        </div>
      )}

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
                <div className="flex gap-4 text-sm text-slate-500">
                  <span>Month: €{plan.monthly_price_amount}</span>
                  {plan.annual_price_amount && <span>Year: €{plan.annual_price_amount}</span>}
                  <span className="font-medium text-indigo-600">Max Tasks: {plan.max_thoughts || 10}</span>
                </div>
                {plan.features && plan.features.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="text-sm text-slate-600">• {feature}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex gap-2">
                {user?.plan_id === plan.id ? (
                  <Button disabled className="bg-slate-400">
                    Current Plan
                  </Button>
                ) : !plan.is_active ? (
                  <Button disabled variant="outline" className="text-slate-400">
                    Not Available
                  </Button>
                ) : plan.monthly_price_id ? (
                  <Button 
                    onClick={() => handleSubscribe(plan)} 
                    disabled={isProcessing}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Activate"}
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
        {plans.length === 0 && !isLoading && (
          <p className="text-center text-slate-500 py-12">No subscription plans configured yet.</p>
        )}
      </div>
    </div>
  );
}