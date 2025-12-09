import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Lightbulb } from "lucide-react";

export default function AIContextToggle({ enableContextSuggestions, setEnableContextSuggestions }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          AI Context Suggestions
        </CardTitle>
        <CardDescription>
          Automatic AI suggestions for Page, Component and Domain while typing tasks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Enable AI suggestions</p>
            <p className="text-xs text-slate-500">Get automatic suggested context based on your text</p>
          </div>
          <Switch
            checked={enableContextSuggestions}
            onCheckedChange={setEnableContextSuggestions}
          />
        </div>
      </CardContent>
    </Card>
  );
}