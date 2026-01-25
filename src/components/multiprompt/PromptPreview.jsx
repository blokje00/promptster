import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Copy, CheckCircle, Cog, RefreshCw, Layers, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function PromptPreview({
  generatedPrompt,
  improvedPrompt,
  setImprovedPrompt,
  isImproving,
  onImprove,
  saveSuccess,
  onQuickSave,
  onRefresh,
  selectedThoughts = [],
  promptVariants = [],
  isGeneratingVariants = false,
  onGenerateVariants,
  reasoningSteps = null,
  showReasoning = false,
  onToggleReasoning
}) {
  const displayPrompt = improvedPrompt || generatedPrompt;
  const [activeVariantIndex, setActiveVariantIndex] = React.useState(0);

  // Check if AI features are available (trial or subscription)
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const subscriptionStatus = currentUser?.subscription_status;
  const trialEnd = currentUser?.trial_end ? new Date(currentUser.trial_end) : null;
  const now = new Date();

  const hasActiveSubscription = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
  const hasActiveTrial = subscriptionStatus === 'trial' && trialEnd && trialEnd > now;
  const canUseAI = hasActiveSubscription || hasActiveTrial;

  const handleCopyOnly = () => {
    navigator.clipboard.writeText(displayPrompt);
    toast.success("Copied to clipboard");
  };

  return (
    <Card className="flex-1 flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>Preview</CardTitle>
          {promptVariants.length > 0 && (
            <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
              {promptVariants.length} variants
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={onRefresh}
            className="text-slate-500 hover:text-slate-700"
            title="Refresh prompt - re-read all tasks"
          >
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          {improvedPrompt && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => onImprove(true)}
              className="text-slate-500 hover:text-slate-700"
            >
              <Cog className="w-4 h-4 mr-1" /> Undo
            </Button>
          )}
          {canUseAI ? (
            <>
              <Button size="sm" variant="outline" onClick={() => onImprove(false)} disabled={!generatedPrompt}>
                {isImproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />} Improve
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onGenerateVariants} 
                disabled={!generatedPrompt || isGeneratingVariants}
                className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                title="Generate 3 diverse prompt variants (Verbalized Sampling)"
              >
                {isGeneratingVariants ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4 mr-1" />} Variants
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" disabled title="AI Improve requires active trial or subscription">
                <Sparkles className="w-4 h-4 mr-1 opacity-50" /> Improve (Trial/Pro)
              </Button>
              <Button size="sm" variant="outline" disabled title="Variants requires active trial or subscription">
                <Layers className="w-4 h-4 mr-1 opacity-50" /> Variants
              </Button>
            </>
          )}
          <Button 
            size="sm" 
            className={`transition-all duration-300 ${saveSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            disabled={!displayPrompt}
            onClick={onQuickSave}
          >
            {saveSuccess ? (
              <><CheckCircle className="w-4 h-4 mr-1" /> Success</>
            ) : (
              <><Copy className="w-4 h-4 mr-1" /> Copy & Save</>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 relative group/preview space-y-4">
        {promptVariants.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {promptVariants.map((variant, idx) => (
              <button
                key={idx}
                onClick={() => setActiveVariantIndex(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  activeVariantIndex === idx
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Variant {idx + 1}
                {variant.probability && <span className="ml-1 opacity-70">({Math.round(variant.probability * 100)}%)</span>}
              </button>
            ))}
          </div>
        )}
        {showReasoning && reasoningSteps && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-amber-900 dark:text-amber-200 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI Reasoning Steps
              </h4>
              <button 
                onClick={onToggleReasoning}
                className="text-xs text-amber-700 dark:text-amber-400 hover:underline"
              >
                Hide
              </button>
            </div>
            <div className="text-xs text-amber-800 dark:text-amber-300 space-y-2 whitespace-pre-wrap">
              {reasoningSteps}
            </div>
          </div>
        )}
        {!showReasoning && reasoningSteps && (
          <button
            onClick={onToggleReasoning}
            className="w-full text-left px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 transition-colors"
          >
            <ChevronDown className="w-3 h-3" />
            Show AI Reasoning Steps
          </button>
        )}
        <div className="bg-slate-900 rounded-lg p-4 min-h-[300px] max-h-[500px] overflow-auto text-slate-300 font-mono text-sm whitespace-pre-wrap">
          {promptVariants.length > 0 
            ? promptVariants[activeVariantIndex]?.content || displayPrompt
            : displayPrompt || (
                selectedThoughts.length > 0 
                  ? "// Tasks loaded. Click 'Generate Prompt' to create preview..." 
                  : "// Create / select tasks to generate prompt..."
              )
          }
        </div>
        {displayPrompt && (
          <Button
            size="icon"
            variant="secondary"
            className="absolute top-6 right-6 opacity-0 group-hover/preview:opacity-100 transition-opacity bg-white/10 hover:bg-white/20 text-white"
            onClick={handleCopyOnly}
          >
            <Copy className="w-4 h-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}