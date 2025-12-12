import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FolderOpen, Plus, Copy, Sparkles } from "lucide-react";
import { projectColors, projectBorderColors } from "@/components/lib/constants";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ProjectSelector({
  projects,
  selectedProjectId,
  selectedProject,
  onSelectProject,
  allThoughtsCount,
  getProjectCount
}) {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("blue");
  const [newDesc, setNewDesc] = useState("");
  const [newConfig, setNewConfig] = useState("");

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setNewName("");
      setNewDesc("");
      setNewColor("blue");
      setNewConfig("");
      setIsCreateDialogOpen(false);
      toast.success("Project created");
    }
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate({
      name: newName,
      color: newColor,
      description: newDesc,
      technical_config_markdown: newConfig
    });
  };

  // Determine if "All Projects" is selected (black theme)
  const isAllProjectsSelected = !selectedProjectId;

  return (
    <>
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300">My Projects</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCreateDialogOpen(true)}
          className="border-dashed border-2 hover:bg-indigo-50 dark:hover:bg-slate-800 h-9 px-4"
        >
          <Plus className="w-5 h-5 mr-1" />
          New Project
        </Button>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={!selectedProjectId ? "default" : "outline"}
          size="sm"
          onClick={() => onSelectProject("")}
          className={!selectedProjectId ? "bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600" : ""}
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

    {/* Create Project Dialog */}
    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-800">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-slate-100">Create New Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <Input 
            placeholder="Project Name..." 
            value={newName} 
            onChange={e => setNewName(e.target.value)}
            className="dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500"
          />
          
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Color</label>
            <div className="flex gap-2 flex-wrap">
              {Object.keys(projectColors).map(color => (
                <button
                  key={color}
                  onClick={() => setNewColor(color)}
                  className={`w-8 h-8 rounded-full ${projectColors[color]} ${newColor === color ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-500 dark:ring-offset-slate-800' : ''}`}
                />
              ))}
            </div>
          </div>

          <Textarea 
            placeholder="Description..." 
            value={newDesc} 
            onChange={e => setNewDesc(e.target.value)} 
            className="min-h-[80px] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500"
          />
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Technical Config (Markdown)</label>
            <Textarea 
              value={newConfig} 
              onChange={e => setNewConfig(e.target.value)} 
              placeholder="Technical project configuration..." 
              className="font-mono text-sm min-h-[100px] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500" 
            />
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">Need structure? Copy this prompt:</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                onClick={() => {
                  const prompt = `Analyze the codebase and provide a technical configuration summary in Markdown. Include:
1. Tech Stack (Frameworks, Libraries)
2. File Structure (Key directories)
3. Key Components & Entities
4. Styling & Theming Approach
5. Conventions (Naming, Async, Error Handling)

Format as clear Markdown headers and lists.`;
                  navigator.clipboard.writeText(prompt);
                  toast.success("Structure prompt copied!");
                }}
              >
                <Copy className="w-3 h-3" /> Copy Prompt
              </Button>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">LLM Response Parser</label>
            <div className="flex gap-2">
              <Textarea 
                placeholder="Paste LLM response to auto-fill..." 
                className="min-h-[80px] text-xs font-mono dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500"
                id="create-llm-response-input"
              />
              <Button 
                variant="secondary" 
                className="h-auto w-20 flex-col gap-1 text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                onClick={() => {
                  const input = document.getElementById('create-llm-response-input').value;
                  if (!input) return;
                  try {
                    const jsonMatch = input.match(/```json\n([\s\S]*?)\n```/) || input.match(/\{[\s\S]*\}/);
                    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : input;
                    const data = JSON.parse(jsonStr);
                    
                    if (data.technical_config_markdown) setNewConfig(data.technical_config_markdown);
                    if (data.description) setNewDesc(data.description);
                    if (data.name) setNewName(data.name);
                    toast.success("Project auto-filled from LLM");
                  } catch (e) {
                    toast.error("Failed to parse JSON");
                  }
                }}
              >
                <Sparkles className="w-4 h-4" />
                Auto Fill
              </Button>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              Cancel
            </Button>
            <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600" disabled={!newName}>
              <Plus className="w-4 h-4 mr-2" /> Create Project
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}