import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SubscriptionPlanCard({ plan, billingCycle, onSubscribe, isProcessing, currentPlanId }) {
  const price = billingCycle === 'monthly' ? plan.monthly_price_amount : plan.annual_price_amount;
  const isCurrent = currentPlanId === plan.id;

  // Bereken besparing
  const monthlyCost = plan.monthly_price_amount * 12;
  const annualCost = plan.annual_price_amount;
  const savings = monthlyCost - annualCost;
  const savingsPercent = Math.round((savings / monthlyCost) * 100);

  return (
    <Card className={`flex flex-col relative ${isCurrent ? 'border-indigo-500 border-2 shadow-lg' : ''}`}>
      {plan.is_recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-indigo-600 hover:bg-indigo-700">Aanbevolen</Badge>
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="mb-6">
          <span className="text-3xl font-bold">€{price}</span>
          <span className="text-slate-500">/{billingCycle === 'monthly' ? 'maand' : 'jaar'}</span>
          {billingCycle === 'annual' && savings > 0 && (
            <p className="text-xs text-green-600 font-medium mt-1">
              Bespaar {savingsPercent}% met jaarlijkse betaling
            </p>
          )}
        </div>
        <div className="space-y-3">
          {plan.features && plan.features.map((feature, index) => (
            <div key={index} className="flex items-start gap-2 text-sm text-slate-700">
              <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className={`w-full ${isCurrent ? 'bg-slate-100 text-slate-900 hover:bg-slate-200' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          onClick={() => onSubscribe(plan)}
          disabled={isProcessing || isCurrent}
          variant={isCurrent ? "outline" : "default"}
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isCurrent ? (
            "Huidig Plan"
          ) : (
            billingCycle === 'monthly' ? "Abonneer Maandelijks" : "Abonneer Jaarlijks"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}