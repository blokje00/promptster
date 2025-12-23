import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Zap, TrendingDown, Layers, Lock } from "lucide-react";
import { hasProFeatureAccess } from "@/components/lib/subscriptionUtils";

export default function TierAdvisor() {
  const [wrapperCredits, setWrapperCredits] = useState('');
  const [selectedWrapper, setSelectedWrapper] = useState('base44');
  const [usesImages, setUsesImages] = useState(false);
  
  // Check PRO feature access
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });
  
  const hasProAccess = hasProFeatureAccess(currentUser);

  // Fetch subscription plans (real Stripe prices)
  const { data: subscriptionPlans = [] } = useQuery({
    queryKey: ['subscriptionPlans'],
    queryFn: async () => {
      try {
        return await base44.entities.SubscriptionPlan.list();
      } catch (error) {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch AI wrappers
  const { data: wrappers = [] } = useQuery({
    queryKey: ['aiWrappers'],
    queryFn: async () => {
      try {
        const allWrappers = await base44.entities.AIWrapper.filter({ is_active: true }, "order");
        return allWrappers || [];
      } catch (error) {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  const selectedWrapperData = useMemo(() => 
    wrappers.find(w => w.slug === selectedWrapper) || {
      name: 'Base44',
      slug: 'base44',
      has_credit_savings: true,
      credit_multiplier: 10,
      description: 'Batching saves 10x credits'
    },
    [wrappers, selectedWrapper]
  );

  const recommendation = useMemo(() => {
    const monthlyCredits = parseInt(wrapperCredits) || 0;
    const multiplier = selectedWrapperData.credit_multiplier || 1;
    const effectivePrompts = monthlyCredits * multiplier;

    // Find Starter and Pro plans from Stripe
    const starterPlan = subscriptionPlans.find(p => p.name?.includes('Starter') || p.monthly_price_amount === 995);
    const proPlan = subscriptionPlans.find(p => p.name?.includes('Pro') && p.monthly_price_amount === 1995);

    const starterPrice = starterPlan ? (starterPlan.monthly_price_amount / 100).toFixed(2) : '9.95';
    const proPrice = proPlan ? (proPlan.monthly_price_amount / 100).toFixed(2) : '19.95';
    const starterLimit = starterPlan?.max_thoughts || 150;
    const proLimit = proPlan?.max_thoughts || 400;

    // Text-only workflow
    if (!usesImages && effectivePrompts < starterLimit) {
      return {
        plan: 'Starter',
        price: starterPrice,
        multiprompts: starterLimit,
        features: selectedWrapperData.has_credit_savings 
          ? `Text-only. Your ${monthlyCredits} ${selectedWrapperData.name} credits = ${effectivePrompts} Promptster tasks (${multiplier}x batching)`
          : `Text-only. ${selectedWrapperData.name} efficiency benefits only`,
        savings: selectedWrapperData.has_credit_savings ? {
          wrapper: `${selectedWrapperData.name}: ${monthlyCredits} credits → ${effectivePrompts} tasks`,
          total: `€${starterPrice}/month + ${selectedWrapperData.name}`,
          highlight: `1 Promptster task = ${multiplier} ${selectedWrapperData.name} prompts (batching saves ${multiplier}x credits)`
        } : {
          wrapper: `${selectedWrapperData.name}: Workflow efficiency only`,
          total: `€${starterPrice}/month + ${selectedWrapperData.name}`,
          highlight: `${selectedWrapperData.description || 'Better workflow, same credit usage'}`
        }
      };
    }

    // Uses images but low volume
    if (usesImages && effectivePrompts < proLimit) {
      return {
        plan: 'Pro',
        price: proPrice,
        multiprompts: proLimit,
        features: selectedWrapperData.has_credit_savings
          ? `Full OCR + Vision. Your ${monthlyCredits} ${selectedWrapperData.name} credits = ${effectivePrompts} tasks (${multiplier}x)`
          : `Full OCR + Vision. ${selectedWrapperData.name} efficiency only`,
        savings: selectedWrapperData.has_credit_savings ? {
          wrapper: `${selectedWrapperData.name}: ${monthlyCredits} credits → ${effectivePrompts} tasks`,
          total: `€${proPrice}/month + ${selectedWrapperData.name}`,
          highlight: `OCR caching saves 75% vision credits + ${multiplier}x batching saves wrapper credits`
        } : {
          wrapper: `${selectedWrapperData.name}: Workflow efficiency only`,
          total: `€${proPrice}/month + ${selectedWrapperData.name}`,
          highlight: `${selectedWrapperData.description || 'Better workflow, no credit savings'}`
        }
      };
    }

    // Heavy usage
    if (effectivePrompts >= proLimit) {
      return {
        plan: 'Pro or Enterprise',
        price: `${proPrice}+`,
        multiprompts: `${proLimit}+`,
        features: selectedWrapperData.has_credit_savings
          ? `Heavy optimization. Your ${monthlyCredits} ${selectedWrapperData.name} credits = ${effectivePrompts} tasks`
          : `Heavy usage. ${selectedWrapperData.name} efficiency benefits`,
        savings: selectedWrapperData.has_credit_savings ? {
          wrapper: `${selectedWrapperData.name}: ${monthlyCredits} → ${effectivePrompts} tasks (${multiplier}x)`,
          total: `€${proPrice}+/month`,
          highlight: `Contact for Enterprise volume discounts`
        } : {
          wrapper: `${selectedWrapperData.name}: Workflow efficiency`,
          total: `€${proPrice}+/month`,
          highlight: `Contact for Enterprise pricing`
        }
      };
    }

    // Fallback
    return {
      plan: 'Starter',
      price: starterPrice,
      multiprompts: starterLimit,
      features: 'Start simple, upgrade when needed',
      savings: {
        wrapper: `${selectedWrapperData.name}`,
        total: `€${starterPrice}/month`,
        highlight: 'Perfect for getting started'
      }
    };
  }, [wrapperCredits, selectedWrapper, selectedWrapperData, usesImages, subscriptionPlans]);

  return (
    <Card className="p-6 bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 relative">
      {!hasProAccess && (
        <div className="absolute top-4 right-4">
          <Badge className="bg-amber-500 text-white flex items-center gap-1">
            <Lock className="w-3 h-3" />
            PRO Feature
          </Badge>
        </div>
      )}
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-slate-100">
        <Calculator className="text-indigo-600 dark:text-indigo-400" />
        Find Your Perfect Tier
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
            Select your AI wrapper:
          </label>
          <Select value={selectedWrapper} onValueChange={setSelectedWrapper}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {wrappers.length > 0 ? wrappers.map(w => (
                <SelectItem key={w.id} value={w.slug}>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    {w.name}
                    {w.has_credit_savings && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {w.credit_multiplier}x savings
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              )) : (
                <SelectItem value="base44">Base44 (10x batching)</SelectItem>
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {selectedWrapperData.has_credit_savings 
              ? `${selectedWrapperData.name} saves credits through batching` 
              : `${selectedWrapperData.name} provides workflow efficiency only`}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
            Current {selectedWrapperData.name} integration credits/month:
          </label>
          <input
            type="number"
            value={wrapperCredits}
            onChange={(e) => setWrapperCredits(e.target.value)}
            placeholder="e.g. 244"
            disabled={!hasProAccess}
            className="w-full border rounded p-2 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {hasProAccess 
              ? `Find this in your ${selectedWrapperData.name} dashboard`
              : 'Upgrade to PRO to use Tier Advisor calculator'}
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={usesImages}
              onChange={(e) => setUsesImages(e.target.checked)}
              disabled={!hasProAccess}
              className="rounded disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              I work with screenshots/images (need OCR)
            </span>
          </label>
        </div>

        {wrapperCredits && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border-2 border-indigo-200 dark:border-indigo-700 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
                  <h4 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                    Recommended: {recommendation.plan}
                  </h4>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {recommendation.features}
                </p>
              </div>
              <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-200">
                Best Value
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Monthly Price</p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  €{recommendation.price}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tasks Included</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {recommendation.multiprompts}
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <p className="font-semibold text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Your Cost Breakdown:
              </p>
              <ul className="space-y-1 text-sm text-green-900 dark:text-green-200">
                <li>• {recommendation.savings.wrapper}</li>
                <li>• Total: <strong>{recommendation.savings.total}</strong></li>
                {recommendation.savings.highlight && (
                  <li className="text-indigo-600 dark:text-indigo-400 font-medium text-xs mt-2">
                    💡 {recommendation.savings.highlight}
                  </li>
                )}
              </ul>
            </div>

            <Button className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700">
              Start with {recommendation.plan}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}