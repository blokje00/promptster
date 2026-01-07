import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";

/**
 * Legend explaining subscription statuses in AdminStats
 */
export default function SubscriptionStatusLegend() {
  const statuses = [
    {
      value: "none",
      label: "None",
      description: "Geen actief abonnement of trial - moet upgraden",
      color: "bg-slate-100 text-slate-700"
    },
    {
      value: "trialing",
      label: "Trial",
      description: "Actieve gratis trial periode - volledige toegang",
      color: "bg-blue-100 text-blue-700"
    },
    {
      value: "active",
      label: "Active",
      description: "Betaald abonnement actief",
      color: "bg-green-100 text-green-700"
    },
    {
      value: "past_due",
      label: "Past Due",
      description: "Betaling mislukt - moet payment method updaten",
      color: "bg-orange-100 text-orange-700"
    },
    {
      value: "canceled",
      label: "Canceled",
      description: "Abonnement opgezegd",
      color: "bg-red-100 text-red-700"
    },
    {
      value: "incomplete",
      label: "Incomplete",
      description: "Betaling nog niet afgerond",
      color: "bg-yellow-100 text-yellow-700"
    },
    {
      value: "incomplete_expired",
      label: "Incomplete Expired",
      description: "Betaling verlopen - moet opnieuw proberen",
      color: "bg-slate-100 text-slate-700"
    },
    {
      value: "unpaid",
      label: "Unpaid",
      description: "Onbetaald - toegang geblokkeerd",
      color: "bg-red-100 text-red-700"
    }
  ];

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-blue-900">
          <Info className="w-5 h-5" />
          Subscription Status Legenda
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {statuses.map((status) => (
            <div key={status.value} className="flex items-start gap-3">
              <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${status.color}`}>
                {status.label}
              </span>
              <p className="text-xs text-slate-600">{status.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-blue-200">
          <p className="text-xs text-blue-800">
            <strong>Let op:</strong> "Free" in de Plan kolom betekent een legacy gratis plan. 
            "Trial" in Subscription Status betekent een actieve proefperiode voor een betaald plan.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}