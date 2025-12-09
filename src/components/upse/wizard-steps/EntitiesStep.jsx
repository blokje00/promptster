import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

export default function EntitiesStep({ 
  entities, 
  onUpdate, 
  onAdd, 
  onRemove,
  onAddField,
  onUpdateField,
  onRemoveField
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Define the data entities (tables/types) of your project with their fields.
      </p>
      {entities.map((entity, eIndex) => (
        <Card key={eIndex} className="border-slate-200">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Entity Name</Label>
                  <Input
                    placeholder="Order, Customer, Task..."
                    value={entity.name}
                    onChange={(e) => onUpdate(eIndex, "name", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Input
                    placeholder="Customer orders..."
                    value={entity.description}
                    onChange={(e) => onUpdate(eIndex, "description", e.target.value)}
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(eIndex)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Fields */}
            <div className="pl-4 border-l-2 border-slate-200 space-y-2">
              <Label className="text-xs text-slate-500">Fields</Label>
              {entity.fields.map((field, fIndex) => (
                <div key={fIndex} className="flex items-center gap-2">
                  <Input
                    placeholder="field name"
                    value={field.name}
                    onChange={(e) => onUpdateField(eIndex, fIndex, "name", e.target.value)}
                    className="flex-1"
                  />
                  <select
                    value={field.type}
                    onChange={(e) => onUpdateField(eIndex, fIndex, "type", e.target.value)}
                    className="h-9 rounded-md border border-slate-200 px-2 text-sm"
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="date">Date</option>
                    <option value="enum">Enum</option>
                    <option value="json">JSON</option>
                  </select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveField(eIndex, fIndex)}
                    className="text-red-500 h-8 w-8 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAddField(eIndex)}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Field
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button
        variant="outline"
        onClick={() => onAdd({ name: "", description: "", fields: [] })}
        className="w-full border-dashed"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Entity
      </Button>
    </div>
  );
}