import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Code2, Sparkles, FileText, Star, TrendingUp, Users } from "lucide-react";

export default function StatsOverview({ items }) {
  const stats = [
    {
      label: "Totaal Items",
      value: items.length,
      icon: FileText,
      color: "bg-indigo-500"
    },
    {
      label: "Prompts",
      value: items.filter(i => i.type === "prompt").length,
      icon: Sparkles,
      color: "bg-purple-500"
    },
    {
      label: "Bezoekers (24u)",
      value: "1,234",
      icon: Users,
      color: "bg-green-500"
    },
    {
      label: "Omzet (30d)",
      value: "€ 850",
      icon: TrendingUp,
      color: "bg-yellow-500"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <Card key={index} className="border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.color} bg-opacity-10`}>
                <stat.icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}