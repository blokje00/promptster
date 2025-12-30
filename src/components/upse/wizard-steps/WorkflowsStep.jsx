import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

export default function WorkflowsStep({ workflows, onUpdate, onAdd, onRemove }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Define workflows and automations (optional). E.g. "On new order → send email".
      </p>
      {workflows.map((workflow, index) => (
        <Card key={index} className="border-slate-200">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-3">
                <div>
                  <Label className="text-xs">Workflow Name</Label>
                  <Input
                    placeholder="New order notification..."
                    value={workflow.name}
                    onChange={(e) => onUpdate(index, "name", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Trigger</Label>
                  <Input
                    placeholder="When a new Order is created..."
                    value={workflow.trigger_description}
                    onChange={(e) => onUpdate(index, "trigger_description", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Actions</Label>
                  <Textarea
                    placeholder="Send email to customer, create invoice..."
                    value={workflow.actions_description}
                    onChange={(e) => onUpdate(index, "actions_description", e.target.value)}
                    className="min-h-[60px]"
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(index)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button
        variant="outline"
        onClick={() => onAdd({ name: "", trigger_description: "", actions_description: "", related_entities: [] })}
        className="w-full border-dashed"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Workflow
      </Button>
    </div>
  );
}