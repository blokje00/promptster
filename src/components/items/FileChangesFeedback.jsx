import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileCode, Save, ChevronDown, ChevronUp, Brain, ClipboardPaste } from "lucide-react";
import { toast } from "sonner";

export default function FileChangesFeedback({ 
  value, 
  onChange, 
  onSave,
  isSaving = false,
  readOnly = false 
}) {
  const [isExpanded, setIsExpanded] = useState(!!value);
  const [localValue, setLocalValue] = useState(value || "");

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setLocalValue(text);
      if (onChange) onChange(text);
      toast.success("Feedback geplakt vanuit klembord");
    } catch (err) {
      toast.error("Kon niet plakken - geef toegang tot klembord");
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(localValue);
    }
  };

  // Parse feedback to extract file names for display
  const extractFileNames = (feedback) => {
    if (!feedback) return [];
    const filePatterns = [
      /(?:bestand|file|pad|path):\s*([^\n,]+)/gi,
      /([a-zA-Z0-9_\-\/]+\.[a-zA-Z]{2,4})/g,
      /(?:pages|components|entities|functions|lib)\/[^\s\n,]+/g
    ];
    
    const files = new Set();
    filePatterns.forEach(pattern => {
      const matches = feedback.match(pattern);
      if (matches) {
        matches.forEach(m => {
          const cleaned = m.replace(/^(bestand|file|pad|path):\s*/i, '').trim();
          if (cleaned.length > 3 && cleaned.includes('/') || cleaned.includes('.')) {
            files.add(cleaned);
          }
        });
      }
    });
    return Array.from(files).slice(0, 20); // Max 20 files shown
  };

  const detectedFiles = extractFileNames(localValue);

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
      <CardHeader 
        className="cursor-pointer pb-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <CardTitle className="text-lg text-purple-800">
              Project Kennis Feedback
            </CardTitle>
            {localValue && (
              <Badge className="bg-purple-200 text-purple-700 text-xs">
                {detectedFiles.length} bestanden gedetecteerd
              </Badge>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-purple-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-purple-500" />
          )}
        </div>
        <CardDescription className="text-purple-600">
          Plak hier de Base44 feedback met gewijzigde bestanden om projectkennis op te bouwen
        </CardDescription>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Detected Files Preview */}
          {detectedFiles.length > 0 && (
            <div className="p-3 bg-white rounded-lg border border-purple-200">
              <p className="text-xs font-medium text-purple-700 mb-2">Gedetecteerde bestanden:</p>
              <div className="flex flex-wrap gap-1">
                {detectedFiles.map((file, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs bg-white border-purple-300 text-purple-700">
                    <FileCode className="w-3 h-3 mr-1" />
                    {file}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Textarea for feedback */}
          {!readOnly ? (
            <>
              <Textarea
                value={localValue}
                onChange={(e) => {
                  setLocalValue(e.target.value);
                  if (onChange) onChange(e.target.value);
                }}
                placeholder={`Plak hier de Base44 feedback na uitvoering van de taken...

Voorbeeld:
--- DEELTAAK 1 ---
Bestand: pages/Dashboard.jsx
Wijziging: Filter toegevoegd op created_by
Regels: 20-35

--- DEELTAAK 2 ---  
Bestand: components/TaskCard.jsx
Wijziging: Drag & drop functionaliteit
Nieuw bestand: components/DragHandle.jsx`}
                className="min-h-[200px] font-mono text-sm bg-white"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePaste}
                  className="border-purple-300 text-purple-700 hover:bg-purple-100"
                >
                  <ClipboardPaste className="w-4 h-4 mr-2" />
                  Plak uit klembord
                </Button>
                {onSave && (
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? "Opslaan..." : "Feedback Opslaan"}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg border border-purple-200 p-4">
              <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono">
                {localValue || "Geen feedback opgeslagen"}
              </pre>
            </div>
          )}

          <p className="text-xs text-purple-600">
            💡 Deze feedback wordt gebruikt om de AI beter te laten begrijpen hoe je project is opgebouwd. 
            Bij toekomstige taken kan de AI hierdoor preciezere suggesties doen.
          </p>
        </CardContent>
      )}
    </Card>
  );
}