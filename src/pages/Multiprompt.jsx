import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Plus, 
  Lightbulb, 
  Layers, 
  Save, 
  Trash2, 
  Copy, 
  CheckCircle,
  FileText,
  X,
  Sparkles,
  Loader2,
  FolderOpen,
  Edit,
  MoreHorizontal,
  GripVertical
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const projectColors = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500"
};

const projectBorderColors = {
  red: "border-red-500",
  orange: "border-orange-500",
  yellow: "border-yellow-500",
  green: "border-green-500",
  blue: "border-blue-500",
  indigo: "border-indigo-500",
  purple: "border-purple-500",
  pink: "border-pink-500"
};

export default function Multiprompt() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newThought, setNewThought] = useState("");
  const [selectedThoughts, setSelectedThoughts] = useState([]);
  const [startTemplateId, setStartTemplateId] = useState("");
  const [endTemplateId, setEndTemplateId] = useState("");
  const [customStartText, setCustomStartText] = useState("");
  const [customEndText, setCustomEndText] = useState("");
  const [promptTitle, setPromptTitle] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [improvedPrompt, setImprovedPrompt] = useState("");
  const [isImproving, setIsImproving] = useState(false);

  // Template form state
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateType, setNewTemplateType] = useState("start");
  const [newTemplateContent, setNewTemplateContent] = useState("");

  // Project form state
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState("blue");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  // Edit project state
  const [editingProject, setEditingProject] = useState(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectColor, setEditProjectColor] = useState("blue");
  const [editProjectDescription, setEditProjectDescription] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Post-copy control flow
  const [showControlDialog, setShowControlDialog] = useState(false);
  const [taskChecks, setTaskChecks] = useState([]);
  const [controlNotes, setControlNotes] = useState("");

  const { data: thoughts = [] } = useQuery({
    queryKey: ['thoughts'],
    queryFn: () => base44.entities.Thought.list("-created_date"),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => base44.entities.PromptTemplate.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const createThoughtMutation = useMutation({
    mutationFn: (data) => base44.entities.Thought.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thoughts'] });
      setNewThought("");
      toast.success("Gedachte toegevoegd");
    },
  });

  const deleteThoughtMutation = useMutation({
    mutationFn: (id) => base44.entities.Thought.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thoughts'] });
      toast.success("Gedachte verwijderd");
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.PromptTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setNewTemplateName("");
      setNewTemplateContent("");
      toast.success("Template opgeslagen");
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.PromptTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success("Template verwijderd");
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setNewProjectName("");
      setNewProjectDescription("");
      toast.success("Project toegevoegd");
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (selectedProjectId === editingProject?.id) setSelectedProjectId("");
      toast.success("Project verwijderd");
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditDialogOpen(false);
      setEditingProject(null);
      toast.success("Project bijgewerkt");
    },
  });

  const createMultipromptMutation = useMutation({
    mutationFn: (data) => base44.entities.Item.create(data),
    onSuccess: (newItem) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success("Multi-task opgeslagen!");
      navigate(createPageUrl(`ViewItem?id=${newItem.id}`));
    },
  });

  const createPromptCheckMutation = useMutation({
    mutationFn: (data) => base44.entities.PromptCheck.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promptChecks'] });
      toast.success("Controle item aangemaakt!");
      resetBuilder();
    },
  });

  const deleteUsedThoughtsMutation = useMutation({
    mutationFn: async (thoughtIds) => {
      for (const id of thoughtIds) {
        await base44.entities.Thought.delete(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thoughts'] });
      toast.success("Gedachten verwijderd!");
      resetBuilder();
    },
  });

  const resetBuilder = () => {
    setSelectedThoughts([]);
    setStartTemplateId("");
    setEndTemplateId("");
    setCustomStartText("");
    setCustomEndText("");
    setPromptTitle("");
    setImprovedPrompt("");
    setShowControlDialog(false);
    setTaskChecks([]);
    setControlNotes("");
  };

  const handleAddThought = () => {
    if (!newThought.trim()) return;
    createThoughtMutation.mutate({ 
      content: newThought.trim(),
      project_id: selectedProjectId || null
    });
  };

  const handleAddTemplate = () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) return;
    createTemplateMutation.mutate({
      name: newTemplateName.trim(),
      type: newTemplateType,
      content: newTemplateContent.trim()
    });
  };

  const handleAddProject = () => {
    if (!newProjectName.trim()) return;
    createProjectMutation.mutate({
      name: newProjectName.trim(),
      color: newProjectColor,
      description: newProjectDescription.trim()
    });
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setEditProjectName(project.name);
    setEditProjectColor(project.color);
    setEditProjectDescription(project.description || "");
    setEditDialogOpen(true);
  };

  const handleSaveEditProject = () => {
    if (!editProjectName.trim()) return;
    updateProjectMutation.mutate({
      id: editingProject.id,
      data: {
        name: editProjectName.trim(),
        color: editProjectColor,
        description: editProjectDescription.trim()
      }
    });
  };

  const toggleThoughtSelection = (thoughtId) => {
    setSelectedThoughts(prev => 
      prev.includes(thoughtId) 
        ? prev.filter(id => id !== thoughtId)
        : [...prev, thoughtId]
    );
  };

  const handleSelectedThoughtsDragEnd = (result) => {
    if (!result.destination) return;
    const newSelected = [...selectedThoughts];
    const [removed] = newSelected.splice(result.source.index, 1);
    newSelected.splice(result.destination.index, 0, removed);
    setSelectedThoughts(newSelected);
  };

  const startTemplates = templates.filter(t => t.type === "start");
  const endTemplates = templates.filter(t => t.type === "eind");

  const selectedStartTemplate = templates.find(t => t.id === startTemplateId);
  const selectedEndTemplate = templates.find(t => t.id === endTemplateId);
  // Behoud volgorde van selectie, niet van originele thoughts array
  const selectedThoughtContents = selectedThoughts
    .map(id => thoughts.find(t => t.id === id))
    .filter(Boolean)
    .map(t => t.content);

  const startText = customStartText || selectedStartTemplate?.content || "";
  const endText = customEndText || selectedEndTemplate?.content || "";

  // Build multi-task prompt: starttekst + gedachten als deeltaken + eindtekst
  const buildStructuredPrompt = () => {
    if (selectedThoughtContents.length === 0 && !startText && !endText) {
      return "";
    }

    const promptParts = [];
    
    // Start template
    if (startText) {
      promptParts.push(startText);
    }

    // Gedachten als genummerde deeltaken
    if (selectedThoughtContents.length > 0) {
      const tasksSection = selectedThoughtContents
        .map((content, i) => `--- DEELTAAK ${i + 1} ---\n${content}`)
        .join("\n\n");
      
      promptParts.push(`DEELTAKEN (verwerk in volgorde):\n\n${tasksSection}`);
    }

    // Eind template
    if (endText) {
      promptParts.push(endText);
    }

    return promptParts.join("\n\n");
  };

  const generatedPrompt = buildStructuredPrompt();
  
  // Maak task checks gebaseerd op geselecteerde gedachten
  const generateTaskChecks = () => {
    return selectedThoughtContents.map((content, i) => ({
      task_name: `Deeltaak ${i + 1}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
      is_checked: false
    }));
  };

  // Filter thoughts by selected project
  const filteredThoughts = selectedProjectId 
    ? thoughts.filter(t => t.project_id === selectedProjectId)
    : thoughts;

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleImprovePrompt = async () => {
    if (!generatedPrompt.trim()) return;
    
    setIsImproving(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Verbeter de volgende prompt technisch en taalkundig. Maak de tekst professioneler, duidelijker en beter gestructureerd. Behoud de originele intentie en inhoud, maar verbeter grammatica, spelling, en technische precisie. Geef alleen de verbeterde tekst terug, geen uitleg.

Originele prompt:
${generatedPrompt}`,
      });
      setImprovedPrompt(result);
      toast.success("Prompt verbeterd!");
    } catch (error) {
      toast.error("Kon prompt niet verbeteren");
    } finally {
      setIsImproving(false);
    }
  };

  // Reset improved prompt when source changes
  useEffect(() => {
    setImprovedPrompt("");
  }, [generatedPrompt]);

  const handleCopyPrompt = () => {
    const textToCopy = improvedPrompt || generatedPrompt;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success("Prompt gekopieerd!");
    
    // Open control dialog after copy
    setTaskChecks(generateTaskChecks());
    setTimeout(() => {
      setCopied(false);
      setShowControlDialog(true);
    }, 500);
  };

  const handleSaveAsPrompt = () => {
    if (!promptTitle.trim()) {
      toast.error("Geef de prompt een titel");
      return;
    }
    const finalPrompt = improvedPrompt || generatedPrompt;

    createMultipromptMutation.mutate({
      title: promptTitle.trim(),
      type: "multiprompt",
      content: finalPrompt,
      used_thoughts: selectedThoughts,
      start_template_id: startTemplateId || null,
      end_template_id: endTemplateId || null
    });
    setShowControlDialog(false);
  };

  const handleSaveAsCheck = () => {
    if (!promptTitle.trim()) {
      toast.error("Geef de controle een titel");
      return;
    }
    const finalPrompt = improvedPrompt || generatedPrompt;

    createPromptCheckMutation.mutate({
      title: promptTitle.trim(),
      prompt_content: finalPrompt,
      project_id: selectedProjectId || null,
      thought_ids: selectedThoughts,
      task_checks: taskChecks,
      status: "pending",
      notes: controlNotes
    });
  };

  const handleDeleteAndClear = () => {
    deleteUsedThoughtsMutation.mutate(selectedThoughts);
    setShowControlDialog(false);
  };

  const handleDiscardPrompt = () => {
    resetBuilder();
    toast.info("Prompt verwijderd");
  };

  const toggleTaskCheck = (index) => {
    const newChecks = [...taskChecks];
    newChecks[index].is_checked = !newChecks[index].is_checked;
    setTaskChecks(newChecks);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Promptguard Multi-task Builder
          </h1>
          <p className="text-slate-600 mt-2">Verzamel gedachten en bouw uitgebreide multi-task prompts</p>
        </div>

        {/* Project Selector Bar */}
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
                  onClick={() => setSelectedProjectId("")}
                  className={!selectedProjectId ? "bg-slate-700" : ""}
                >
                  Alle
                </Button>
                {projects.map(project => (
                  <div key={project.id} className="flex items-center">
                    <Button
                      variant={selectedProjectId === project.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedProjectId(project.id)}
                      className={`rounded-r-none ${selectedProjectId === project.id ? `${projectColors[project.color]} border-0` : ""}`}
                    >
                      <div className={`w-3 h-3 rounded-full ${projectColors[project.color]} mr-2`} />
                      {project.name}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant={selectedProjectId === project.id ? "default" : "outline"}
                          size="sm"
                          className={`rounded-l-none border-l-0 px-1 ${selectedProjectId === project.id ? `${projectColors[project.color]} border-0` : ""}`}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleEditProject(project)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Bewerken
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteProjectMutation.mutate(project.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Verwijderen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Project Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Project Bewerken</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Project naam..."
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
              />
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Kleur</label>
                <div className="flex gap-2 flex-wrap">
                  {Object.keys(projectColors).map(color => (
                    <button
                      key={color}
                      onClick={() => setEditProjectColor(color)}
                      className={`w-8 h-8 rounded-full ${projectColors[color]} ${
                        editProjectColor === color ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>
              <Textarea
                placeholder="Beschrijving (optioneel)..."
                value={editProjectDescription}
                onChange={(e) => setEditProjectDescription(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button onClick={handleSaveEditProject} className="bg-indigo-600 hover:bg-indigo-700">
                  Opslaan
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Tabs defaultValue="build" className="space-y-6">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="build" className="data-[state=active]:bg-white">
              <Layers className="w-4 h-4 mr-2" />
              Bouw Prompt
            </TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-white">
              <FileText className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="projects" className="data-[state=active]:bg-white">
              <FolderOpen className="w-4 h-4 mr-2" />
              Projecten
            </TabsTrigger>
          </TabsList>

          <TabsContent value="build" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left: Thoughts */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-500" />
                      Gedachten
                      {selectedProject && (
                        <Badge className={`${projectColors[selectedProject.color]} text-white ml-2`}>
                          {selectedProject.name}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Typ een gedachte of idee..."
                        value={newThought}
                        onChange={(e) => setNewThought(e.target.value)}
                        className="min-h-[80px]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddThought();
                          }
                        }}
                      />
                    </div>
                    <Button 
                      onClick={handleAddThought} 
                      disabled={!newThought.trim()}
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Gedachte Toevoegen {selectedProject && `aan ${selectedProject.name}`}
                    </Button>

                    <div className="space-y-2 max-h-[400px] overflow-auto">
                      {filteredThoughts.map((thought) => {
                        const thoughtProject = projects.find(p => p.id === thought.project_id);
                        return (
                          <div 
                            key={thought.id}
                            className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                              selectedThoughts.includes(thought.id)
                                ? 'border-indigo-500 bg-indigo-50'
                                : thoughtProject 
                                  ? `${projectBorderColors[thoughtProject.color]} bg-white`
                                  : 'border-slate-200 hover:border-slate-300'
                            }`}
                            onClick={() => toggleThoughtSelection(thought.id)}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox 
                                checked={selectedThoughts.includes(thought.id)}
                                onCheckedChange={() => toggleThoughtSelection(thought.id)}
                              />
                              <div className="flex-1">
                                {thoughtProject && (
                                  <Badge className={`${projectColors[thoughtProject.color]} text-white text-xs mb-1`}>
                                    {thoughtProject.name}
                                  </Badge>
                                )}
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                  {thought.content}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-slate-400 hover:text-red-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteThoughtMutation.mutate(thought.id);
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      {filteredThoughts.length === 0 && (
                        <p className="text-center text-slate-400 py-8">
                          Nog geen gedachten{selectedProject ? ` voor ${selectedProject.name}` : ''}. Begin met typen!
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Templates & Preview */}
              <div className="space-y-4">
                {/* Template Selection */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Templates</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Starttekst
                      </label>
                      <Select value={startTemplateId || "none"} onValueChange={(val) => {
                        setStartTemplateId(val === "none" ? "" : val);
                        if (val && val !== "none") setCustomStartText("");
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Kies starttekst template..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Geen template</SelectItem>
                          {startTemplates.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {startTemplateId && selectedStartTemplate && (
                        <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-700 max-h-20 overflow-auto">
                          {selectedStartTemplate.content}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Eindtekst
                      </label>
                      <Select value={endTemplateId || "none"} onValueChange={(val) => {
                        setEndTemplateId(val === "none" ? "" : val);
                        if (val && val !== "none") setCustomEndText("");
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Kies eindtekst template..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Geen template</SelectItem>
                          {endTemplates.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {endTemplateId && selectedEndTemplate && (
                        <div className="mt-2 p-2 bg-orange-50 rounded text-xs text-orange-700 max-h-20 overflow-auto">
                          {selectedEndTemplate.content}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t">
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Geselecteerde gedachten: {selectedThoughts.length} (sleep om te herordenen)
                      </label>
                      <DragDropContext onDragEnd={handleSelectedThoughtsDragEnd}>
                        <Droppable droppableId="selected-thoughts">
                          {(provided) => (
                            <div 
                              {...provided.droppableProps} 
                              ref={provided.innerRef}
                              className="space-y-1"
                            >
                              {selectedThoughts.map((id, idx) => {
                                const thought = thoughts.find(t => t.id === id);
                                return (
                                  <Draggable key={id} draggableId={id} index={idx}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={`flex items-center gap-2 p-2 bg-slate-100 rounded text-xs ${
                                          snapshot.isDragging ? 'shadow-lg bg-white' : ''
                                        }`}
                                      >
                                        <div 
                                          {...provided.dragHandleProps}
                                          className="text-slate-400 cursor-grab active:cursor-grabbing"
                                        >
                                          <GripVertical className="w-4 h-4" />
                                        </div>
                                        <Badge variant="secondary" className="text-xs shrink-0">
                                          {idx + 1}
                                        </Badge>
                                        <span className="truncate text-slate-600 flex-1">{thought?.content?.substring(0, 40)}...</span>
                                        <button 
                                          onClick={() => toggleThoughtSelection(id)}
                                          className="text-red-400 hover:text-red-600"
                                        >×</button>
                                      </div>
                                    )}
                                  </Draggable>
                                );
                              })}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                    </div>
                  </CardContent>
                </Card>

                {/* Preview */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <span>Preview</span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleImprovePrompt}
                          disabled={!generatedPrompt || isImproving}
                        >
                          {isImproving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                          )}
                          {isImproving ? "Bezig..." : "Verbeter met AI"}
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleCopyPrompt}
                          disabled={!generatedPrompt && !improvedPrompt}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          {copied ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                          {copied ? "Gekopieerd" : "Kopieer & Ga verder"}
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {improvedPrompt && (
                      <div className="mb-3">
                        <Badge className="bg-green-100 text-green-700 mb-2">AI Verbeterd</Badge>
                      </div>
                    )}
                    <div className="bg-slate-900 rounded-xl p-4 max-h-[400px] overflow-auto">
                      <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap">
                        {improvedPrompt || generatedPrompt || "Selecteer gedachten en templates om een preview te zien..."}
                      </pre>
                    </div>
                    {!generatedPrompt && (
                      <p className="text-sm text-slate-500 mt-3 text-center">
                        Selecteer links gedachten en kies hierboven templates
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Control Dialog after Copy */}
            <Dialog open={showControlDialog} onOpenChange={setShowControlDialog}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Prompt Gekopieerd - Wat nu?
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <p className="text-sm text-slate-600">
                    De prompt is gekopieerd. Na het uitvoeren, controleer of elke deeltaak goed is verwerkt:
                  </p>

                  {/* Task Checklist */}
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {taskChecks.map((check, index) => (
                      <div 
                        key={index}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          check.is_checked 
                            ? 'bg-green-50 border-green-300' 
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => toggleTaskCheck(index)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            checked={check.is_checked}
                            onCheckedChange={() => toggleTaskCheck(index)}
                          />
                          <span className={`text-sm ${check.is_checked ? 'text-green-700 line-through' : 'text-slate-700'}`}>
                            {check.task_name}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
                  <Textarea
                    placeholder="Opmerkingen (optioneel)..."
                    value={controlNotes}
                    onChange={(e) => setControlNotes(e.target.value)}
                    className="min-h-[60px]"
                  />

                  {/* Title for saving */}
                  <Input
                    placeholder="Titel voor opslag..."
                    value={promptTitle}
                    onChange={(e) => setPromptTitle(e.target.value)}
                  />

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleSaveAsPrompt}
                      disabled={!promptTitle.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Opslaan als Prompt
                    </Button>
                    <Button
                      onClick={handleSaveAsCheck}
                      disabled={!promptTitle.trim()}
                      variant="outline"
                      className="border-green-500 text-green-700 hover:bg-green-50"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Opslaan als Controle
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleDeleteAndClear}
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Verwijder gedachten
                    </Button>
                    <Button
                      onClick={handleDiscardPrompt}
                      variant="ghost"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Alleen sluiten
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Add Template Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Nieuwe Template</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Template naam..."
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                  />
                  <Select value={newTemplateType} onValueChange={setNewTemplateType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="start">Starttekst</SelectItem>
                      <SelectItem value="eind">Eindtekst</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Template inhoud..."
                    value={newTemplateContent}
                    onChange={(e) => setNewTemplateContent(e.target.value)}
                    className="min-h-[150px]"
                  />
                  <Button
                    onClick={handleAddTemplate}
                    disabled={!newTemplateName.trim() || !newTemplateContent.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Template Opslaan
                  </Button>
                </CardContent>
              </Card>

              {/* Templates List */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-green-700">Startteksten</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {startTemplates.map(template => (
                      <div key={template.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-green-800">{template.name}</p>
                            <p className="text-sm text-green-600 mt-1 line-clamp-2">{template.content}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:bg-red-50"
                            onClick={() => deleteTemplateMutation.mutate(template.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {startTemplates.length === 0 && (
                      <p className="text-slate-400 text-center py-4">Geen startteksten</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-orange-700">Eindteksten</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {endTemplates.map(template => (
                      <div key={template.id} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-orange-800">{template.name}</p>
                            <p className="text-sm text-orange-600 mt-1 line-clamp-2">{template.content}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:bg-red-50"
                            onClick={() => deleteTemplateMutation.mutate(template.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {endTemplates.length === 0 && (
                      <p className="text-slate-400 text-center py-4">Geen eindteksten</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Add Project Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Nieuw Project</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Project naam..."
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                  />
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Kleur</label>
                    <div className="flex gap-2 flex-wrap">
                      {Object.keys(projectColors).map(color => (
                        <button
                          key={color}
                          onClick={() => setNewProjectColor(color)}
                          className={`w-8 h-8 rounded-full ${projectColors[color]} ${
                            newProjectColor === color ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <Textarea
                    placeholder="Beschrijving (optioneel)..."
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button
                    onClick={handleAddProject}
                    disabled={!newProjectName.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Project Toevoegen
                  </Button>
                </CardContent>
              </Card>

              {/* Projects List */}
              <Card>
                <CardHeader>
                  <CardTitle>Mijn Projecten</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {projects.map(project => (
                    <div 
                      key={project.id} 
                      className={`p-4 rounded-lg border-2 ${projectBorderColors[project.color]} bg-white`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full ${projectColors[project.color]}`} />
                          <div>
                            <p className="font-medium text-slate-800">{project.name}</p>
                            {project.description && (
                              <p className="text-sm text-slate-500 mt-1">{project.description}</p>
                            )}
                            <p className="text-xs text-slate-400 mt-1">
                              {thoughts.filter(t => t.project_id === project.id).length} gedachten
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => deleteProjectMutation.mutate(project.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {projects.length === 0 && (
                    <p className="text-slate-400 text-center py-8">Nog geen projecten</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}