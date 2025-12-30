import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { projectColors, projectLightColors, projectBorderColors } from "@/components/lib/constants";

export default function TemplatesManager({ templates = [], projects = [], selectedProjectId }) {
  const queryClient = useQueryClient();
  
  // State
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("start");
  const [newContent, setNewContent] = useState("");
  
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PromptTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setNewName("");
      setNewContent("");
      toast.success("Template created");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PromptTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setIsEditDialogOpen(false);
      toast.success("Template updated");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PromptTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success("Template deleted");
    }
  });

  // Handlers
  const handleCreate = () => {
    if (!newName.trim() || !newContent.trim()) return;
    createMutation.mutate({
      name: newName,
      type: newType,
      content: newContent,
      project_id: selectedProjectId || null
    });
  };

  const handleEditStart = (template) => {
    setEditingTemplate(template);
    setIsEditDialogOpen(true);
    // Set fields AFTER dialog opens to prevent flash
    setTimeout(() => {
      setEditName(template.name);
      setEditContent(template.content);
    }, 0);
  };

  const handleEditSave = async () => {
    if (!editName.trim() || !editContent.trim()) return;
    try {
      await updateMutation.mutateAsync({
        id: editingTemplate.id,
        data: { name: editName, content: editContent }
      });
    } catch (error) {
      console.error('[TemplatesManager] Update failed:', error);
    }
  };

  // Render Helpers
  const renderTemplateList = (type, title, colorClass) => {
    const filtered = templates.filter(t => t.type === type && (!selectedProjectId || !t.project_id || t.project_id === selectedProjectId));
    
    return (
      <Card className={selectedProject ? `border-2 ${projectBorderColors[selectedProject.color]}` : ''}>
        <CardHeader className="pb-3">
          <CardTitle className={selectedProject ? `text-${selectedProject.color}-700` : colorClass}>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.map(template => {
            const proj = projects.find(p => p.id === template.project_id);
            return (
              <div key={template.id} className={`p-3 rounded-lg border ${selectedProject ? projectLightColors[selectedProject.color] : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800">{template.name}</p>
                      {proj && <Badge className={projectColors[proj.color]}>{proj.name}</Badge>}
                    </div>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">{template.content}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEditStart(template)}>
                      <Pencil className="w-4 h-4 text-slate-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(template.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-slate-400 text-center py-4">No templates</p>}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        {renderTemplateList("start", "Start Texts", "text-green-700")}
        {renderTemplateList("eind", "End Texts", "text-orange-700")}
      </div>

      {/* Add Form */}
      <Card>
        <CardHeader><CardTitle>New Template</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Name..." value={newName} onChange={e => setNewName(e.target.value)} />
          <Select value={newType} onValueChange={setNewType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="start">Start Text</SelectItem>
              <SelectItem value="eind">End Text</SelectItem>
            </SelectContent>
          </Select>
          <Textarea placeholder="Content..." value={newContent} onChange={e => setNewContent(e.target.value)} className="min-h-[150px]" />
          <Button onClick={handleCreate} className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={!newName || !newContent}>
            <Plus className="w-4 h-4 mr-2" /> Save Template
          </Button>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Template</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <Input value={editName} onChange={e => setEditName(e.target.value)} />
            <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="min-h-[200px]" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={updateMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleEditSave} disabled={updateMutation.isPending || !editName.trim() || !editContent.trim()}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}