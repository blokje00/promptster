import React, { useState } from "react";
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

  // Add State
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("blue");
  const [newDesc, setNewDesc] = useState("");
  const [newConfig, setNewConfig] = useState("");

  // Edit State
  const [editingProject, setEditingProject] = useState(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("blue");
  const [editDesc, setEditDesc] = useState("");
  const [editConfig, setEditConfig] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setNewName("");
      setNewDesc("");
      setNewColor("blue");
      setNewConfig("");
      toast.success("Project created");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsEditDialogOpen(false);
      toast.success("Project updated");
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
  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate({
      name: newName,
      color: newColor,
      description: newDesc,
      technical_config_markdown: newConfig
    });
  };

  const handleEditStart = (project) => {
    setEditingProject(project);
    setEditName(project.name);
    setEditColor(project.color);
    setEditDesc(project.description || "");
    setEditConfig(project.technical_config_markdown || "");
    setIsEditDialogOpen(true);
  };

  const handleEditSave = () => {
    if (!editName.trim()) return;
    updateMutation.mutate({
      id: editingProject.id,
      data: {
        name: editName,
        color: editColor,
        description: editDesc,
        technical_config_markdown: editConfig
      }
    });
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Create Form */}
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader><CardTitle className="dark:text-slate-100">New Project</CardTitle></CardHeader>
        <CardContent className="space-y-4">
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
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">LLM Response Parser</label>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
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
              placeholder="Paste the LLM's JSON response here..." 
              className="min-h-[80px] text-xs font-mono dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500"
              id="create-llm-response-input"
            />
          </div>
          
          <Button onClick={handleCreate} className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600" disabled={!newName}>
            <Plus className="w-4 h-4 mr-2" /> Create Project
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
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
                 <label className="text-sm font-medium">LLM Response Parser</label>
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
                 placeholder="Paste the LLM's JSON response here..." 
                 className="min-h-[100px] text-xs font-mono"
                 id="llm-response-input"
               />
            </div>

            <div className="flex justify-end gap-2 pt-6 border-t border-slate-100 mt-6">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleEditSave}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={!editName.trim()}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}