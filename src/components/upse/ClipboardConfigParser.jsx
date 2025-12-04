import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, FileJson, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

const PLATFORM_OPTIONS = [
  { value: "base44", label: "Base44" },
  { value: "bubble", label: "Bubble" },
  { value: "webflow", label: "Webflow" },
  { value: "flutterflow", label: "FlutterFlow" },
  { value: "softr", label: "Softr" },
  { value: "make", label: "Make (Integromat)" },
  { value: "zapier", label: "Zapier" },
  { value: "n8n", label: "n8n" },
  { value: "airtable", label: "Airtable" },
  { value: "notion", label: "Notion" },
  { value: "unknown", label: "Anders / Onbekend" }
];

/**
 * Clipboard Config Parser component
 * Parseert geplakte config/exports van no-code tools met AI
 */
export default function ClipboardConfigParser({ onParse }) {
  const [configText, setConfigText] = useState("");
  const [platform, setPlatform] = useState("unknown");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Analyseert de geplakte config met AI
   */
  const handleAnalyze = async () => {
    if (!configText.trim()) {
      toast.error("Plak eerst config/export tekst");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Je bent een expert in no-code platform analyse. Analyseer de volgende config/export van platform "${platform}" en extraheer de projectstructuur.

BELANGRIJK: Geef ALLEEN valide JSON terug, geen uitleg of markdown.

Input config:
\`\`\`
${configText.substring(0, 15000)}
\`\`\`

Extraheer waar mogelijk:
1. Pages/schermen met routes en types
2. Entities/data types met velden
3. Workflows/automations
4. Navigatie items

Voor elk item, geef een korte beschrijving die bruikbaar is voor AI code-generatie context.`,
        response_json_schema: {
          type: "object",
          properties: {
            platform_detected: { type: "string" },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
            pages: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  route: { type: "string" },
                  page_type: { type: "string" },
                  description: { type: "string" },
                  components: { type: "array", items: { type: "string" } },
                  entities: { type: "array", items: { type: "string" } }
                }
              }
            },
            entities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  fields: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        type: { type: "string" },
                        is_required: { type: "boolean" }
                      }
                    }
                  }
                }
              }
            },
            workflows: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  trigger_description: { type: "string" },
                  actions_description: { type: "string" },
                  related_entities: { type: "array", items: { type: "string" } }
                }
              }
            },
            navigation: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  route: { type: "string" },
                  position: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAnalysisResult(result);
      toast.success("Config geanalyseerd!");
    } catch (err) {
      console.error("Analysis failed:", err);
      setError("Kon de config niet analyseren. Controleer of het een valide export is.");
      toast.error("Analyse mislukt");
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Slaat het analyseresultaat op
   */
  const handleSave = () => {
    if (!analysisResult) return;

    onParse(
      {
        platform_label: analysisResult.platform_detected || platform,
        pages: analysisResult.pages || [],
        entities: analysisResult.entities || [],
        workflows: analysisResult.workflows || [],
        navigation: analysisResult.navigation || []
      },
      {
        source_platform: platform,
        confidence: analysisResult.confidence,
        config_length: configText.length
      }
    );

    // Reset
    setConfigText("");
    setAnalysisResult(null);
    toast.success("Structuur opgeslagen!");
  };

  const getConfidenceColor = (conf) => {
    switch (conf) {
      case "high": return "text-green-600 border-green-300 bg-green-50";
      case "medium": return "text-yellow-600 border-yellow-300 bg-yellow-50";
      default: return "text-red-600 border-red-300 bg-red-50";
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input Section */}
        <div className="space-y-4">
          <div>
            <Label>Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Config / Export / JSON</Label>
            <Textarea
              placeholder={`Plak hier de config of export van je ${platform !== "unknown" ? PLATFORM_OPTIONS.find(p => p.value === platform)?.label : "no-code"} project...

Bijvoorbeeld:
- Base44: entities/*.json bestanden
- Bubble: Database schema export
- Make/Zapier: Scenario JSON
- Airtable: Schema export
- etc.`}
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              {configText.length.toLocaleString()} karakters
            </p>
          </div>

          <Button 
            onClick={handleAnalyze}
            disabled={isAnalyzing || !configText.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyseren...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyseer Config
              </>
            )}
          </Button>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          {error && (
            <Alert className="border-red-300 bg-red-50">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {analysisResult && (
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <FileJson className="w-4 h-4" />
                    Analyse Resultaat
                  </h3>
                  <Badge className={getConfidenceColor(analysisResult.confidence)}>
                    {analysisResult.confidence === "high" ? "Hoge" : 
                     analysisResult.confidence === "medium" ? "Gemiddelde" : "Lage"} betrouwbaarheid
                  </Badge>
                </div>

                {analysisResult.platform_detected && (
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-xs text-slate-500">Gedetecteerd platform: </span>
                    <span className="font-medium">{analysisResult.platform_detected}</span>
                  </div>
                )}

                {/* Pages Summary */}
                {analysisResult.pages?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      Pagina's ({analysisResult.pages.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {analysisResult.pages.map((p, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {p.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Entities Summary */}
                {analysisResult.entities?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      Entiteiten ({analysisResult.entities.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {analysisResult.entities.map((e, i) => (
                        <Badge key={i} variant="outline" className="text-xs bg-blue-50 border-blue-200">
                          {e.name} ({e.fields?.length || 0} velden)
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Workflows Summary */}
                {analysisResult.workflows?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      Workflows ({analysisResult.workflows.length})
                    </h4>
                    <div className="space-y-1">
                      {analysisResult.workflows.slice(0, 3).map((w, i) => (
                        <div key={i} className="text-xs text-slate-600 truncate">
                          • {w.name}
                        </div>
                      ))}
                      {analysisResult.workflows.length > 3 && (
                        <div className="text-xs text-slate-400">
                          +{analysisResult.workflows.length - 3} meer...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Navigation Summary */}
                {analysisResult.navigation?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      Navigatie ({analysisResult.navigation.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {analysisResult.navigation.map((n, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {n.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handleSave}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Opslaan in Project
                </Button>
              </CardContent>
            </Card>
          )}

          {!analysisResult && !error && (
            <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg">
              <div className="text-center text-slate-400">
                <FileJson className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Plak je config en klik op "Analyseer"</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}