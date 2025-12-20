import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calculator, Zap, TrendingDown } from "lucide-react";

export default function TierAdvisor() {
  const [base44Credits, setBase44Credits] = useState('');
  const [usesImages, setUsesImages] = useState(false);
  
  const recommendation = useMemo(() => {
    const monthly = parseInt(base44Credits) || 0;
    
    // Text-only workflow
    if (!usesImages && monthly < 150) {
      return {
        plan: 'Starter',
        price: 19,
        multiprompts: 150,
        features: 'Text-only (no OCR needed)',
        savings: {
          base44: 'Base44 Starter ($16) or Free ($0)',
          total: '$19-35/month',
          vs: 'Base44 Builder alone ($40)',
          saved: '$5-21/month + structured workflows'
        }
      };
    }
    
    // Uses images but low volume
    if (usesImages && monthly < 300) {
      return {
        plan: 'Pro',
        price: 39,
        multiprompts: 400,
        features: 'Full OCR + Vision with smart caching',
        savings: {
          base44: 'Stay on Base44 Builder ($40)',
          base44_without: 'Would need Base44 Pro ($80) without caching',
          total: '$79/month',
          vs: 'Base44 Pro alone ($80+)',
          saved: '$40-50/month through OCR efficiency',
          highlight: 'OCR caching saves 75% of vision credits'
        }
      };
    }
    
    // Heavy image/OCR usage
    if (usesImages && monthly >= 300) {
      return {
        plan: 'Pro or Enterprise',
        price: '39+',
        multiprompts: '400+',
        features: 'Heavy OCR optimization needed',
        savings: {
          base44: 'Base44 Builder/Pro ($40-80)',
          total: '$79-120/month',
          vs: 'Base44 Pro/Elite alone ($80-160)',
          saved: '$40-80/month',
          highlight: 'Consider Enterprise for volume discounts'
        }
      };
    }
    
    // Fallback
    return {
      plan: 'Starter',
      price: 19,
      multiprompts: 150,
      features: 'Start simple, upgrade when needed',
      savings: {
        base44: 'Base44 Starter ($16)',
        total: '$35/month',
        vs: 'Base44 Builder ($40)',
        saved: '$5/month + better workflows'
      }
    };
  }, [base44Credits, usesImages]);
  
  return (
    <Card className="p-6 bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-slate-100">
        <Calculator className="text-indigo-600 dark:text-indigo-400" />
        Find Your Perfect Tier
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
            Current Base44 integration credits/month:
          </label>
          <input 
            type="number"
            value={base44Credits}
            onChange={(e) => setBase44Credits(e.target.value)}
            placeholder="e.g. 244"
            className="w-full border rounded p-2 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Find this in your Base44 dashboard
          </p>
        </div>
        
        <div>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox"
              checked={usesImages}
              onChange={(e) => setUsesImages(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              I work with screenshots/images (need OCR)
            </span>
          </label>
        </div>
        
        {base44Credits && (
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
                  ${recommendation.price}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Multiprompts Included</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {recommendation.multiprompts}
                </p>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <p className="font-semibold text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Your Savings Breakdown:
              </p>
              <ul className="space-y-1 text-sm text-green-900 dark:text-green-200">
                <li>• Base44: {recommendation.savings.base44}</li>
                {recommendation.savings.base44_without && (
                  <li className="text-xs text-slate-600 dark:text-slate-400">
                    (Without Promptster: {recommendation.savings.base44_without})
                  </li>
                )}
                <li>• Total stack: <strong>{recommendation.savings.total}</strong></li>
                <li>• vs {recommendation.savings.vs}</li>
                {recommendation.savings.highlight && (
                  <li className="text-indigo-600 dark:text-indigo-400 font-medium text-xs mt-2">
                    💡 {recommendation.savings.highlight}
                  </li>
                )}
                <li className="text-green-700 dark:text-green-300 font-bold text-base mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                  → You save {recommendation.savings.saved}
                </li>
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