import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ReviewStep({ wizardData }) {
  const counts = {
    pages: wizardData.pages.filter(p => p.name.trim()).length,
    entities: wizardData.entities.filter(e => e.name.trim()).length,
    workflows: wizardData.workflows.filter(w => w.name.trim()).length,
    navigation: wizardData.navigation.filter(n => n.label.trim()).length
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Review your input and click "Save" to add the structure to your project.
      </p>
      
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Pages</span>
              <Badge className="bg-green-100 text-green-700">{counts.pages}</Badge>
            </div>
            <div className="mt-2 space-y-1">
              {wizardData.pages.filter(p => p.name).map((p, i) => (
                <div key={i} className="text-xs text-slate-600">• {p.name}</div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Entities</span>
              <Badge className="bg-blue-100 text-blue-700">{counts.entities}</Badge>
            </div>
            <div className="mt-2 space-y-1">
              {wizardData.entities.filter(e => e.name).map((e, i) => (
                <div key={i} className="text-xs text-slate-600">
                  • {e.name} ({e.fields.length} fields)
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Workflows</span>
              <Badge className="bg-orange-100 text-orange-700">{counts.workflows}</Badge>
            </div>
            <div className="mt-2 space-y-1">
              {wizardData.workflows.filter(w => w.name).map((w, i) => (
                <div key={i} className="text-xs text-slate-600">• {w.name}</div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Navigation</span>
              <Badge className="bg-purple-100 text-purple-700">{counts.navigation}</Badge>
            </div>
            <div className="mt-2 space-y-1">
              {wizardData.navigation.filter(n => n.label).map((n, i) => (
                <div key={i} className="text-xs text-slate-600">• {n.label}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}