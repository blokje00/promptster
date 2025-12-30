import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

export default function PagesStep({ pages, onUpdate, onAdd, onRemove }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Define the pages/screens of your project. Give each page a name and route.
      </p>
      {pages.map((page, index) => (
        <Card key={index} className="border-slate-200">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input
                    placeholder="Dashboard, Orders, etc."
                    value={page.name}
                    onChange={(e) => onUpdate(index, "name", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Route</Label>
                  <Input
                    placeholder="/dashboard, /orders/:id"
                    value={page.route}
                    onChange={(e) => onUpdate(index, "route", e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Description</Label>
                  <Input
                    placeholder="Overview with stats and recent items..."
                    value={page.description}
                    onChange={(e) => onUpdate(index, "description", e.target.value)}
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
        onClick={() => onAdd({ name: "", route: "", page_type: "other", description: "" })}
        className="w-full border-dashed"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Page
      </Button>
    </div>
  );
}