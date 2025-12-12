import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { User, Save, FileText, Loader2 } from "lucide-react";

export default function PersonalPreferencesForm({ 
  personalPreferences, 
  setPersonalPreferences, 
  onSave, 
  isSaving,
  isDirty = true,
  defaultExample
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-blue-500" />
          Personal Preferences
        </CardTitle>
        <CardDescription>
          Your reusable preferences that are automatically added to Multi-Step prompts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Preferences (Markdown)</Label>
          <Textarea
            value={personalPreferences}
            onChange={(e) => setPersonalPreferences(e.target.value)}
            placeholder="# My Personal Preferences&#10;&#10;## Code Style&#10;- Naming: camelCase..."
            className="min-h-[300px] font-mono text-sm"
          />
          <p className="text-xs text-slate-500">
            Define your personal code style, UI/UX philosophy, testing preferences, etc. These are saved once and reused in all your prompts.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={onSave} 
            disabled={isSaving || !isDirty}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isSaving ? "Saving..." : "Save Preferences"}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setPersonalPreferences(defaultExample)}
          >
            <FileText className="w-4 h-4 mr-2" />
            Load Example
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}