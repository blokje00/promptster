import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Lightbulb } from "lucide-react";

export default function AIContextToggle({ enableContextSuggestions, setEnableContextSuggestions }) {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            AI Context Suggestions
          </CardTitle>
          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
            Admin Only
          </Badge>
        </div>
        <CardDescription>
          Automatic AI suggestions for Page, Component and Domain while typing tasks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${!isAdmin ? 'text-slate-400' : ''}`}>Enable AI suggestions</p>
            <p className="text-xs text-slate-500">Get automatic suggested context based on your text</p>
          </div>
          <Switch
            checked={!!enableContextSuggestions}
            onCheckedChange={(checked) => setEnableContextSuggestions(() => checked)}
            disabled={!isAdmin}
          />
        </div>
        {!isAdmin && (
          <p className="text-xs text-slate-500 mt-3 italic">
            This feature is currently restricted to administrators.
          </p>
        )}
      </CardContent>
    </Card>
  );
}