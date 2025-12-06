import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus, Copy, FileText } from "lucide-react";
import { toast } from "sonner";
import { projectColors, projectBorderColors } from "@/components/lib/constants";

export default function ProjectsManager({ projects = [] }) {
  const queryClient = useQueryClient();

  // Add State
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("blue");
  const [newDesc, setNewDesc] = useState("");

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
      description: newDesc
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
      <Card>
        <CardHeader><CardTitle>New Project</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Project Name..." value={newName} onChange={e => setNewName(e.target.value)} />
          
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Color</label>
            <div className="flex gap-2 flex-wrap">
              {Object.keys(projectColors).map(color => (
                <button
                  key={color}
                  onClick={() => setNewColor(color)}
                  className={`w-8 h-8 rounded-full ${projectColors[color]} ${newColor === color ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                />
              ))}
            </div>
          </div>

          <Textarea placeholder="Description..." value={newDesc} onChange={e => setNewDesc(e.target.value)} className="min-h-[80px]" />
          
          <Button onClick={handleCreate} className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={!newName}>
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

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleEditSave}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}