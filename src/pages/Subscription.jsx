import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import SubscriptionPlanCard from "../components/subscription/SubscriptionPlanCard";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function SubscriptionPage() {
  const [billingCycle, setBillingCycle] = useState("monthly"); // 'monthly' only for now
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => base44.auth.me(),
  });

  const { data: plans, isLoading } = useQuery({
    queryKey: ['subscriptionPlans'],
    queryFn: async () => {
      // Using configured Stripe plans
      return [
        {
          id: "starter",
          name: "Starter",
          description: "Probeer PromptGuard gratis uit.",
          monthly_price_amount: 0,
          annual_price_amount: 0,
          features: ["Tot 10 items", "Basis features", "Community support"],
          order: 1
        },
        {
          id: "prod_TVmxD3pUgsBYrn", 
          name: "PromptGuard",
          description: "Ongelimiteerde toegang tot alle features.",
          monthly_price_amount: 9.99,
          monthly_price_id: "price_1SYlNxKroSuhgudTiw1kLaQa",
          annual_price_amount: null,
          features: ["Onbeperkte items", "Multi-Step Builder", "Geavanceerde AI modellen", "Prioriteit support", "Stripe Integratie"],
          is_recommended: true,
          order: 2
        },
        {
          id: "enterprise",
          name: "Enterprise",
          description: "Voor grote organisaties.",
          monthly_price_amount: "Contact",
          annual_price_amount: "Contact",
          features: ["SSO Integratie", "Custom AI fine-tuning", "Dedicated account manager", "SLA"],
          order: 3
        }
      ];
    }
  });

  const handleSubscribe = async (plan) => {
    setIsProcessing(true);
    try {
      if (plan.id === 'starter') {
         // Handle Starter plan activation
         const res = await base44.functions.invoke('setStarterPlan');
         if (res.data?.success) {
             toast.success("Starter plan geactiveerd!");
             queryClient.invalidateQueries({ queryKey: ['currentUser'] });
             // Redirect to Dashboard
             window.location.href = "/Dashboard";
         } else {
             toast.error("Kon Starter plan niet activeren.");
         }
         return;
      }

      if (plan.monthly_price_amount === 0 || typeof plan.monthly_price_amount === 'string') {
        // Handle other free/contact plans without Stripe
        toast.info("Neem contact op voor dit plan.");
        return;
      }

      const priceId = billingCycle === 'monthly' ? plan.monthly_price_id : plan.annual_price_id;
      
      if (!priceId) {
         toast.error("Prijs niet beschikbaar voor deze periode.");
         return;
      }

      const result = await base44.functions.invoke("createStripeCheckoutSession", {
        planId: plan.id,
        priceId: priceId,
        billingCycle: billingCycle,
        successUrl: window.location.origin + "/Subscription?success=true&session_id={CHECKOUT_SESSION_ID}",
        cancelUrl: window.location.origin + "/Subscription?canceled=true"
      });

      if (result.data?.url) {
        window.location.href = result.data.url; // Redirect in same tab usually better for checkout
      } else {
        toast.error("Kon geen checkout URL genereren.");
      }
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error("Er ging iets mis bij het starten van de betaling.");
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
        toast.error("Kon klantportaal niet openen.");
      }
    } catch (error) {
      console.error("Portal error:", error);
      toast.error("Er ging iets mis bij het openen van het beheerportaal.");
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
             toast.success("Betaling geverifieerd! Je abonnement is actief.");
             // Refresh user data
             queryClient.invalidateQueries({ queryKey: ['currentUser'] });
             // Clean URL
             window.history.replaceState({}, document.title, window.location.pathname);
          } else {
             toast.error("Kon betaling niet verifiëren. Neem contact op met support.");
          }
        } catch (error) {
          console.error("Verification error:", error);
          toast.error("Fout bij verifiëren van betaling.");
        } finally {
          setIsProcessing(false);
        }
      } else if (params.get("success")) {
        // Fallback voor oude flow of als session_id mist
        toast.success("Abonnement succesvol geactiveerd! Bedankt.");
      }
      
      if (params.get("canceled")) {
        toast.info("Betaling geannuleerd.");
      }
    };

    verifySubscription();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Start met Promptguard en verhoog je productiviteit.</h1>
          <p className="text-xl text-slate-600">En bespaar bij veel platforms hiermee credits</p>
          
          {/* Billing cycle toggle hidden as only monthly is available */}
          <div className="hidden flex items-center justify-center gap-4 mt-8">
            <Label htmlFor="billing-cycle" className={`cursor-pointer ${billingCycle === 'monthly' ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
              Maandelijks
            </Label>
            <Switch 
              id="billing-cycle" 
              checked={billingCycle === 'annual'}
              onCheckedChange={(checked) => setBillingCycle(checked ? 'annual' : 'monthly')}
              disabled={true}
            />
            <Label htmlFor="billing-cycle" className={`cursor-pointer flex items-center gap-2 ${billingCycle === 'annual' ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
              Jaarlijks
            </Label>
          </div>
        </div>

        {user?.subscription_status === 'active' && (
          <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-indigo-900">Je abonnement is actief!</h3>
              <p className="text-sm text-indigo-700">Je kunt je facturen en betaalmethode beheren in het klantportaal.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={async () => {
                setIsProcessing(true);
                try {
                  await base44.functions.invoke("syncSubscriptionStatus");
                  toast.success("Status gesynchroniseerd");
                  base44.auth.me(); // Refresh local user
                } catch(e) { toast.error("Sync mislukt"); }
                setIsProcessing(false);
              }} disabled={isProcessing} variant="outline" className="border-slate-200 hover:bg-slate-100 text-slate-700">
                Sync Status
              </Button>
              <Button onClick={handleManageSubscription} disabled={isProcessing} variant="outline" className="border-indigo-200 hover:bg-indigo-100 text-indigo-700">
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Beheer Abonnement"}
              </Button>
            </div>
            </div>
            )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map(plan => (
              <SubscriptionPlanCard 
                key={plan.id} 
                plan={plan} 
                billingCycle={billingCycle}
                onSubscribe={handleSubscribe}
                isProcessing={isProcessing}
                currentPlanId={user?.plan_id}
              />
            ))}
          </div>
        )}
        
        <div className="mt-12 text-center text-sm text-slate-500">
          <p>Alle prijzen zijn in EUR en exclusief BTW indien van toepassing. Je kunt op elk moment opzeggen.</p>
        </div>
      </div>
    </div>
  );
}