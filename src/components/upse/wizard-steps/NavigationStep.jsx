import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

export default function NavigationStep({ navigation, onUpdate, onAdd, onRemove }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Define navigation items (optional). Like menu items in header or sidebar.
      </p>
      {navigation.map((nav, index) => (
        <Card key={index} className="border-slate-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Label (Dashboard)"
                value={nav.label}
                onChange={(e) => onUpdate(index, "label", e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Route (/dashboard)"
                value={nav.route}
                onChange={(e) => onUpdate(index, "route", e.target.value)}
                className="flex-1"
              />
              <select
                value={nav.position || "header"}
                onChange={(e) => onUpdate(index, "position", e.target.value)}
                className="h-9 rounded-md border border-slate-200 px-2 text-sm"
              >
                <option value="header">Header</option>
                <option value="sidebar">Sidebar</option>
                <option value="footer">Footer</option>
              </select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(index)}
                className="text-red-500"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button
        variant="outline"
        onClick={() => onAdd({ label: "", route: "", position: "header", order: navigation.length })}
        className="w-full border-dashed"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Navigation Item
      </Button>
    </div>
  );
}