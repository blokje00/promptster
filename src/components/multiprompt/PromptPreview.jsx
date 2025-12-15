import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Copy, CheckCircle, Cog } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function PromptPreview({
  generatedPrompt,
  improvedPrompt,
  isImproving,
  onImprove,
  saveSuccess,
  onQuickSave
}) {
  const displayPrompt = improvedPrompt || generatedPrompt;

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
        <CardTitle>Preview</CardTitle>
        <div className="flex gap-2">
          {canUseAI ? (
            <Button size="sm" variant="outline" onClick={onImprove} disabled={!generatedPrompt}>
              {isImproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />} Improve
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled title="AI Improve requires active trial or subscription">
              <Sparkles className="w-4 h-4 mr-1 opacity-50" /> Improve (Trial/Pro)
            </Button>
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
      <CardContent className="flex-1 relative group/preview">
        <div className="bg-slate-900 rounded-lg p-4 min-h-[300px] max-h-[500px] overflow-auto text-slate-300 font-mono text-sm whitespace-pre-wrap">
          {displayPrompt || "// Create / select tasks to generate prompt..."}
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