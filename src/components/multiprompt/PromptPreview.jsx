import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Copy, CheckCircle, Cog } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

export default function PromptPreview({
  generatedPrompt,
  improvedPrompt,
  isImproving,
  onImprove,
  saveSuccess,
  onQuickSave
}) {
  const displayPrompt = improvedPrompt || generatedPrompt;

  const handleCopyOnly = () => {
    navigator.clipboard.writeText(displayPrompt);
    toast.success("Copied to clipboard");
  };

  return (
    <Card className="flex-1 flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle>Preview</CardTitle>
        <div className="flex gap-2">
          <Link to={createPageUrl("AIBackoffice")}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
              <Cog className="w-4 h-4" />
            </Button>
          </Link>
          <Button size="sm" variant="outline" onClick={onImprove} disabled={!generatedPrompt}>
            {isImproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />} Improve
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
      <CardContent className="flex-1 relative group/preview">
        <div className="bg-slate-900 rounded-lg p-4 min-h-[300px] max-h-[500px] overflow-auto text-slate-300 font-mono text-sm whitespace-pre-wrap">
          {displayPrompt || "// Select tasks to generate prompt..."}
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