import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import SubscriptionPlanCard from "../components/subscription/SubscriptionPlanCard";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function SubscriptionPage() {
  const [billingCycle, setBillingCycle] = useState("monthly"); // 'monthly' or 'annual'
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => base44.auth.me(),
  });

  const { data: plans, isLoading } = useQuery({
    queryKey: ['subscriptionPlans'],
    queryFn: async () => {
      // In een echte app haal je dit uit de DB. Voor nu mocken we data als de DB leeg is of vullen we aan.
      const dbPlans = await base44.entities.SubscriptionPlan.list("order", 100);
      if (dbPlans && dbPlans.length > 0) return dbPlans;
      
      // Fallback dummy data voor preview als er nog geen records zijn
      return [
        {
          id: "basic",
          name: "Starter",
          description: "Perfect voor hobbyisten en kleine projecten.",
          monthly_price_amount: 9.99,
          annual_price_amount: 99.99,
          features: ["Onbeperkte projecten", "500 items in vault", "Basis AI suggesties", "Community support"],
          order: 1
        },
        {
          id: "pro",
          name: "Professional",
          description: "Voor serieuze ontwikkelaars en teams.",
          monthly_price_amount: 29.99,
          annual_price_amount: 299.99,
          features: ["Alles in Starter", "Onbeperkte items", "Geavanceerde AI modellen", "Prioriteit support", "Team samenwerking"],
          is_recommended: true,
          order: 2
        },
        {
          id: "team",
          name: "Enterprise",
          description: "Op maat gemaakte oplossingen voor grote organisaties.",
          monthly_price_amount: 99.99,
          annual_price_amount: 999.99,
          features: ["Alles in Professional", "SSO Integratie", "Custom AI fine-tuning", "Dedicated account manager", "SLA"],
          order: 3
        }
      ];
    }
  });

  const handleSubscribe = async (plan) => {
    setIsProcessing(true);
    try {
      const priceId = billingCycle === 'monthly' ? plan.monthly_price_id : plan.annual_price_id;
      
      const result = await base44.functions.invoke("createStripeCheckoutSession", {
        planId: plan.id,
        priceId: priceId,
        billingCycle: billingCycle,
        successUrl: window.location.origin + "/Subscription?success=true",
        cancelUrl: window.location.origin + "/Subscription?canceled=true"
      });

      if (result.data?.url) {
        window.open(result.data.url, '_blank');
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

  // Check URL params voor succes/cancel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success")) {
      toast.success("Abonnement succesvol geactiveerd! Bedankt.");
    }
    if (params.get("canceled")) {
      toast.info("Betaling geannuleerd.");
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Kies het plan dat bij je past</h1>
          <p className="text-xl text-slate-600">Start met Promptguard en verhoog je productiviteit.</p>
          
          <div className="flex items-center justify-center gap-4 mt-8">
            <Label htmlFor="billing-cycle" className={`cursor-pointer ${billingCycle === 'monthly' ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
              Maandelijks
            </Label>
            <Switch 
              id="billing-cycle" 
              checked={billingCycle === 'annual'}
              onCheckedChange={(checked) => setBillingCycle(checked ? 'annual' : 'monthly')}
            />
            <Label htmlFor="billing-cycle" className={`cursor-pointer flex items-center gap-2 ${billingCycle === 'annual' ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
              Jaarlijks
              <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                1 jaar korting
              </Badge>
            </Label>
          </div>
        </div>

        {user?.subscription_status === 'active' && (
          <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-indigo-900">Je abonnement is actief!</h3>
              <p className="text-sm text-indigo-700">Je kunt je facturen en betaalmethode beheren in het klantportaal.</p>
            </div>
            <Button onClick={handleManageSubscription} disabled={isProcessing} variant="outline" className="border-indigo-200 hover:bg-indigo-100 text-indigo-700">
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Beheer Abonnement"}
            </Button>
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