import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { projectLightColors } from "@/components/lib/constants";

function TemplateSelector({
  templates,
  startTemplateId,
  onStartTemplateChange,
  endTemplateId,
  onEndTemplateChange,
  selectedProject
}) {
  const startTemplates = templates.filter(t => t.type === 'start');
  const endTemplates = templates.filter(t => t.type === 'eind');

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle>Templates</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-600">Start</label>
          <Select value={startTemplateId} onValueChange={onStartTemplateChange}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>None</SelectItem>
              {startTemplates.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">End</label>
          <Select value={endTemplateId} onValueChange={onEndTemplateChange}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>None</SelectItem>
              {endTemplates.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {(startTemplateId || endTemplateId) && (
          <div className="col-span-2 grid grid-cols-2 gap-4 text-xs text-slate-500">
            <div className={`p-2 rounded border h-20 overflow-hidden ${selectedProject ? projectLightColors[selectedProject.color] : 'bg-slate-50'}`}>
              {templates.find(t => t.id === startTemplateId)?.content || "-"}
            </div>
            <div className={`p-2 rounded border h-20 overflow-hidden ${selectedProject ? projectLightColors[selectedProject.color] : 'bg-slate-50'}`}>
              {templates.find(t => t.id === endTemplateId)?.content || "-"}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
export default React.memo(TemplateSelector);