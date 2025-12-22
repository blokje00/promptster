import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Sparkles, Loader2 } from "lucide-react";

export default function AIInstructionForm({ 
  instruction, 
  setInstruction, 
  modelPreference, 
  setModelPreference, 
  onSave, 
  isSaving,
  onReset 
}) {
  const handleSave = async () => {
    await onSave();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          Improve with AI - Instruction
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>AI Instruction</Label>
          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Instruction for the AI..."
            className="min-h-[200px] font-mono text-sm"
          />
          <p className="text-xs text-slate-500">
            This instruction is used when you click "Improve with AI". The original prompt is automatically added.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Model Preference</Label>
          <Select value={modelPreference} onValueChange={setModelPreference}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Standard</SelectItem>
              <SelectItem value="creative">Creative (more variation)</SelectItem>
              <SelectItem value="precise">Precise (conservative)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button variant="outline" onClick={onReset}>
            Reset to default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}