import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Copy, CheckCircle, Cog, RefreshCw, Layers, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getNousConfig, isNousConfigured } from "@/lib/nousClient";

function PromptPreview({
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

  // Single-user app: AI is always available; it runs in the browser against
  // Nous Research with the key from AI Backoffice (see src/lib/nousClient.js).
  const nousReady = isNousConfigured();
  const { textModel } = getNousConfig();

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
          <Button
            size="sm"
            variant="outline"
            onClick={() => onImprove(false)}
            disabled={!generatedPrompt}
            title={`Improve with AI via Nous Research (${textModel})`}
          >
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
        <p className="text-xs text-slate-500 dark:text-slate-400">
          AI: Nous Research ·{" "}
          <code className="font-mono">{textModel}</code>
          {!nousReady && (
            <>
              {" "}· <span className="text-amber-600 dark:text-amber-400">sleutel niet ingesteld</span>,{" "}
              <Link to={createPageUrl("AIBackoffice")} className="underline">stel in bij AI Backoffice</Link>
            </>
          )}
        </p>
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
        <Textarea
          value={
            promptVariants.length > 0
              ? promptVariants[activeVariantIndex]?.content || displayPrompt
              : displayPrompt
          }
          onChange={(e) => setImprovedPrompt(e.target.value)}
          placeholder={
            selectedThoughts.length > 0
              ? "// Tasks loaded. Click 'Generate Prompt' to create preview..."
              : "// Create / select tasks to generate prompt..."
          }
          className="bg-slate-900 rounded-lg p-4 min-h-[300px] max-h-[500px] overflow-auto text-slate-300 font-mono text-sm whitespace-pre-wrap resize-none border-0 placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-indigo-500"
        />
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
export default React.memo(PromptPreview);