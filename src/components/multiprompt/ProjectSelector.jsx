import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderOpen } from "lucide-react";
import { projectColors, projectBorderColors } from "@/components/lib/constants";

export default function ProjectSelector({
  projects,
  selectedProjectId,
  selectedProject,
  onSelectProject,
  allThoughtsCount,
  getProjectCount
}) {
  return (
    <Card className={`mb-6 ${selectedProject ? `border-2 ${projectBorderColors[selectedProject.color]}` : ''}`}>
      <CardContent className="py-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-slate-500" />
            <span className="font-medium text-slate-700">Project:</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={!selectedProjectId ? "default" : "outline"}
              size="sm"
              onClick={() => onSelectProject("")}
              className={!selectedProjectId ? "bg-slate-700" : ""}
            >
              All Projects
              {allThoughtsCount > 0 && (
                <Badge variant="secondary" className="ml-2 bg-red-500 text-white hover:bg-red-600 border-0 px-1.5 py-0 h-4 text-[10px]">
                  {allThoughtsCount}
                </Badge>
              )}
            </Button>
            {projects.map(p => (
              <Button
                key={p.id}
                variant={selectedProjectId === p.id ? "default" : "outline"}
                size="sm"
                onClick={() => onSelectProject(p.id)}
                className={selectedProjectId === p.id ? `${projectColors[p.color]} border-0` : ""}
              >
                <div className={`w-2 h-2 rounded-full mr-2 ${projectColors[p.color]?.replace('bg-', 'bg-').replace('600', '400') || 'bg-slate-400'}`} />
                {p.name} ({getProjectCount(p.id)})
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}