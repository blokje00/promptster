import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus, Copy, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { projectColors, projectBorderColors } from "@/components/lib/constants";

export default function ProjectsManager({ projects = [] }) {
  const queryClient = useQueryClient();

  // Dialog State (used for both create and edit)
  const [dialogMode, setDialogMode] = useState("edit"); // "create" or "edit"
  const [editingProject, setEditingProject] = useState(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("blue");
  const [editDesc, setEditDesc] = useState("");
  const [editConfig, setEditConfig] = useState("");
  const [pastedJSON, setPastedJSON] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data) => {
      console.log('[ProjectsManager] Creating project:', data);
      const result = await base44.entities.Project.create(data);
      console.log('[ProjectsManager] Created project:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsDialogOpen(false);
      toast.success("Project created");
    },
    onError: (error) => {
      console.error('[ProjectsManager] Create error:', error);
      toast.error("Failed to create project: " + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      console.log('[ProjectsManager] Updating project:', id, data);
      const result = await base44.entities.Project.update(id, data);
      console.log('[ProjectsManager] Updated project:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsDialogOpen(false);
      toast.success("Project updated");
    },
    onError: (error) => {
      console.error('[ProjectsManager] Update error:', error);
      toast.error("Failed to update project: " + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success("Project deleted");
    }
  });

  // Handlers
  const handleCreateStart = () => {
    setDialogMode("create");
    setEditingProject(null);
    setEditName("");
    setEditColor("blue");
    setEditDesc("");
    setEditConfig("");
    setPastedJSON("");
    setIsDialogOpen(true);
  };

  const handleEditStart = (project) => {
    setDialogMode("edit");
    setEditingProject(project);
    setIsDialogOpen(true);
    // Set fields AFTER dialog opens to prevent flash
    setTimeout(() => {
      setEditName(project.name);
      setEditColor(project.color);
      setEditDesc(project.description || "");
      setEditConfig(project.technical_config_markdown || "");
      setPastedJSON("");
    }, 0);
  };

  const handleJSONPaste = (value) => {
    setPastedJSON(value);
    
    if (!value.trim()) return;
    
    try {
      const jsonMatch = value.match(/```json\n([\s\S]*?)\n```/) || value.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : value;
      const data = JSON.parse(jsonStr);
      
      if (data.name) setEditName(data.name);
      if (data.description) setEditDesc(data.description);
      if (data.technical_config_markdown) setEditConfig(data.technical_config_markdown);
      
      toast.success("Auto-parsed project structure!");
    } catch (e) {
      // Silent fail - user might still be typing
    }
  };

  const handleSave = async () => {
    console.log('[ProjectsManager] handleSave called', { dialogMode, editName, editColor, editDesc, editConfig });
    
    if (!editName.trim()) {
      toast.error("Project name is required");
      return;
    }
    
    const projectData = {
      name: editName,
      color: editColor,
      description: editDesc,
      technical_config_markdown: editConfig
    };

    console.log('[ProjectsManager] Saving project data:', projectData);

    try {
      if (dialogMode === "create") {
        console.log('[ProjectsManager] Creating new project');
        await createMutation.mutateAsync(projectData);
      } else {
        console.log('[ProjectsManager] Updating existing project:', editingProject?.id);
        if (!editingProject?.id) {
          toast.error("No project ID found");
          return;
        }
        await updateMutation.mutateAsync({
          id: editingProject.id,
          data: projectData
        });
      }
    } catch (error) {
      console.error('[ProjectsManager] Save failed:', error);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Create Button Card */}
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader><CardTitle className="dark:text-slate-100">New Project</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center min-h-[200px]">
          <Button 
            onClick={handleCreateStart} 
            size="lg"
            className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            <Plus className="w-5 h-5 mr-2" /> Create New Project
          </Button>
        </CardContent>
      </Card>

      {/* Project List */}
      <Card>
        <CardHeader><CardTitle>My Projects</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {projects.map(project => (
            <div key={project.id} className={`p-4 rounded-lg border-2 ${projectBorderColors[project.color]} bg-white`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${projectColors[project.color]}`} />
                  <div>
                    <p className="font-medium text-slate-800">{project.name}</p>
                    <p className="text-sm text-slate-500">{project.description}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEditStart(project)}>
                    <Pencil className="w-4 h-4 text-slate-500" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(project.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {projects.length === 0 && <p className="text-center text-slate-400 py-4">No projects yet</p>}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "Create New Project" : "Edit Project"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto px-1">
            <Input value={editName} onChange={e => setEditName(e.target.value)} />
            <div className="flex gap-2">
              {Object.keys(projectColors).map(color => (
                <button
                  key={color}
                  onClick={() => setEditColor(color)}
                  className={`w-6 h-6 rounded-full ${projectColors[color]} ${editColor === color ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                />
              ))}
            </div>
            <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description..." />
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Technical Config (Markdown)</label>
              <Textarea value={editConfig} onChange={e => setEditConfig(e.target.value)} className="font-mono text-sm min-h-[150px]" />
              <div className="flex justify-between items-center pt-1">
                 <span className="text-xs text-slate-500">Need structure? Copy this prompt for your LLM:</span>
                 <Button
                   variant="outline"
                   size="sm"
                   className="h-7 text-xs gap-1"
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

            <div className="space-y-2 pt-4 border-t border-slate-100">
               <div className="flex items-center justify-between">
                 <label className="text-sm font-medium">Auto-Parse Project Structure</label>
                 <Button
                   variant="outline"
                   size="sm"
                   className="h-7 text-xs gap-1"
                   onClick={() => {
                     const prompt = `Analyze this codebase and provide a complete structural overview in JSON format:

{
  "name": "Project Name",
  "description": "Brief project description",
  "technical_config_markdown": "# Tech Stack\\n- Framework: ...\\n- Libraries: ...\\n\\n# Architecture\\n...",
  "pages": [
    {"name": "PageName", "path": "/path", "components": ["Component1"], "purpose": "..."}
  ],
  "components": [
    {"name": "ComponentName", "location": "components/...", "purpose": "...", "props": ["prop1"]}
  ],
  "entities": [
    {"name": "EntityName", "fields": ["field1", "field2"], "purpose": "..."}
  ],
  "buttons_and_actions": [
    {"label": "Button Text", "location": "PageName", "action": "what it does"}
  ],
  "routing": "How navigation works",
  "state_management": "How data flows",
  "styling": "Tailwind/CSS approach"
}

Be thorough - include ALL pages, components, buttons, forms, and key functionality.`;
                     navigator.clipboard.writeText(prompt);
                     toast.success("Structure analysis prompt copied!");
                   }}
                 >
                   <Copy className="w-3 h-3" /> Copy Analysis Prompt
                 </Button>
               </div>
               <Textarea 
                 placeholder="Paste LLM's JSON response (will auto-fill fields above)..." 
                 className="min-h-[100px] text-xs font-mono"
                 value={pastedJSON}
                 onChange={(e) => handleJSONPaste(e.target.value)}
               />
               <p className="text-xs text-slate-500">💡 Fields above will auto-populate when you paste valid JSON</p>
            </div>

            <div className="flex justify-end gap-2 pt-6 border-t border-slate-100 mt-6">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleSave}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={!editName.trim() || createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : (dialogMode === "create" ? "Create Project" : "Save Changes")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}