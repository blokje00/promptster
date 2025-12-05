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
      toast.success("Feedback pasted from clipboard");
    } catch (err) {
      toast.error("Could not paste - grant clipboard access");
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
              Project Knowledge Feedback
            </CardTitle>
            {localValue && (
              <Badge className="bg-purple-200 text-purple-700 text-xs">
                {detectedFiles.length} files detected
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
          Paste the Base44 feedback with changed files here to build project knowledge
        </CardDescription>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Detected Files Preview */}
          {detectedFiles.length > 0 && (
            <div className="p-3 bg-white rounded-lg border border-purple-200">
              <p className="text-xs font-medium text-purple-700 mb-2">Detected files:</p>
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
                placeholder={`Paste the Base44 feedback here after executing the tasks...

Example:
--- SUBTASK 1 ---
File: pages/Dashboard.jsx
Change: Added filter on created_by
Lines: 20-35

--- SUBTASK 2 ---  
File: components/TaskCard.jsx
Change: Drag & drop functionality
New file: components/DragHandle.jsx`}
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
                  Paste from clipboard
                </Button>
                {onSave && (
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Feedback"}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg border border-purple-200 p-4">
              <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono">
                {localValue || "No feedback saved"}
              </pre>
            </div>
          )}

          <p className="text-xs text-purple-600">
            💡 This feedback is used to help the AI better understand how your project is structured. 
            For future tasks, the AI can make more precise suggestions.
          </p>
        </CardContent>
      )}
    </Card>
  );
}