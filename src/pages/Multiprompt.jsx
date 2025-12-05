import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { useMultipromptData } from "@/components/hooks/useMultipromptState";
import { useAutosaveField } from "@/components/hooks/useAutosaveField";
import { uploadImageToSupabase } from "@/components/lib/uploadImage";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { 
  Plus, Save, Trash2, Copy, CheckCircle, FileText, X, Sparkles, 
  Loader2, FolderOpen, Edit, MoreHorizontal, Settings, Pencil, 
  CheckSquare, Square, Lightbulb, Layers, Cog
} from "lucide-react";

// Sub-components
import ThoughtCard from "@/components/multiprompt/ThoughtCard";
import ContextSelector from "@/components/multiprompt/ContextSelector";
import RequireSubscription from "@/components/auth/RequireSubscription";
import { projectColors, projectBorderColors, projectLightColors } from "@/components/lib/constants";

export default function Multiprompt() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // --- 1. Initialization & Project Context ---

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Determine selected project ID with strict precedence:
  // 1. Location State (from Retry/Restore nav)
  // 2. Local Storage (persistent user preference)
  // 3. Default: "" (All Projects)
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    if (location.state?.projectId) return location.state.projectId;
    return localStorage.getItem('lastSelectedProjectId') || "";
  });

  // Sync changes to LocalStorage & Clean up location state
  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem('lastSelectedProjectId', selectedProjectId);
    } else {
      localStorage.setItem('lastSelectedProjectId', "");
    }
    
    // Clear location state if it exists to prevent stale state on refresh
    if (location.state?.projectId) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [selectedProjectId, location.state, navigate]);

  // Storage Listener for Cross-Component Sync (e.g., RecycleBin Restore)
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'lastSelectedProjectId') {
        setSelectedProjectId(e.newValue || "");
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // --- 2. Data Fetching (via Hook) ---

  const {
    thoughts,
    selectedThoughtIds,
    setSelectedThoughtIds,
    createThought,
    updateThought,
    deleteThought,
    toggleSelection,
    selectAll,
    deselectAll
  } = useMultipromptData({
    currentUser,
    selectedProjectId,
    idsToAutoSelect: location.state?.retryThoughtIds // Pass retry IDs to hook for auto-select
  });

  // Other Data Queries
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentUser?.email],
    queryFn: async () => currentUser ? await base44.entities.Project.filter({ created_by: currentUser.email }) : [],
    enabled: !!currentUser
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates', currentUser?.email],
    queryFn: async () => currentUser ? await base44.entities.PromptTemplate.filter({ created_by: currentUser.email }) : [],
    enabled: !!currentUser
  });

  const { data: aiSettings = [] } = useQuery({
    queryKey: ['aiSettings', currentUser?.email],
    queryFn: async () => currentUser ? await base44.entities.AISettings.filter({ created_by: currentUser.email }) : [],
    enabled: !!currentUser
  });

  // --- 3. UI State Management ---

  // New Thought Input State
  const { 
    value: newThoughtContent, 
    setValue: setNewThoughtContent, 
    resetValue: resetNewThoughtContent 
  } = useAutosaveField({
    storageKey: `promptster:multiprompt:${selectedProjectId || 'all'}:${currentUser?.id}`,
    initialValue: "",
    enabled: !!currentUser
  });
  const [newThoughtImages, setNewThoughtImages] = useState([]);
  const [newThoughtFocus, setNewThoughtFocus] = useState("both");
  const [newThoughtContext, setNewThoughtContext] = useState({});
  const [isUploading, setIsUploading] = useState(false);

  // Filtering/Grouping
  const [groupBy, setGroupBy] = useState("component");

  // Templates & Prompt Generation
  const [startTemplateId, setStartTemplateId] = useState("");
  const [endTemplateId, setEndTemplateId] = useState("");
  const [includePersonalPrefs, setIncludePersonalPrefs] = useState(true);
  const [includeProjectConfig, setIncludeProjectConfig] = useState(true);
  const [improvedPrompt, setImprovedPrompt] = useState("");
  const [isImproving, setIsImproving] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // Save/Copy Dialog
  const [showControlDialog, setShowControlDialog] = useState(false);
  const [promptTitle, setPromptTitle] = useState("");
  const [controlNotes, setControlNotes] = useState("");
  const [taskChecks, setTaskChecks] = useState([]);

  // Helper: Get Selected Project Object
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // --- 4. Handlers ---

  // Add Thought
  const handleAddThought = () => {
    if (!newThoughtContent.trim() && newThoughtImages.length === 0) return;

    createThought.mutate({
      content: newThoughtContent.trim(),
      project_id: selectedProjectId || null,
      image_urls: newThoughtImages,
      is_selected: true, // Auto-select new thoughts
      focus_type: newThoughtFocus,
      target_page: newThoughtContext.target_page,
      target_component: newThoughtContext.target_component,
      target_domain: newThoughtContext.target_domain,
      ai_prediction: newThoughtContext.ai_prediction
    }, {
      onSuccess: () => {
        resetNewThoughtContent();
        setNewThoughtImages([]);
        setNewThoughtFocus("both");
        setNewThoughtContext({});
        toast.success("Task added");
      }
    });
  };

  const handleImageUpload = async (files) => {
    if (!files.length) return;
    setIsUploading(true);
    try {
      const promises = Array.from(files).map(file => uploadImageToSupabase(file));
      const urls = await Promise.all(promises);
      setNewThoughtImages(prev => [...prev, ...urls]);
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  // Thought Updates (Delegates to Hook)
  const handleUpdateContent = (id, content) => updateThought.mutate({ id, data: { content } });
  const handleUpdateImages = (id, urls) => updateThought.mutate({ id, data: { image_urls: urls } });
  const handleUpdateFocus = (id, focus) => updateThought.mutate({ id, data: { focus_type: focus } });
  const handleUpdateContext = (id, ctx) => updateThought.mutate({ 
    id, 
    data: { 
      target_page: ctx.target_page,
      target_component: ctx.target_component,
      target_domain: ctx.target_domain
    } 
  });

  // Drag & Drop Reordering (Visual only for now, logic simplified)
  const onDragEnd = (result) => {
    // Logic to move thought to another project (if dropped on project tab)
    if (result.destination?.droppableId.startsWith('project-')) {
      const targetId = result.destination.droppableId.replace('project-', '');
      const thoughtId = result.draggableId;
      updateThought.mutate({ 
        id: thoughtId, 
        data: { project_id: targetId === 'none' ? null : targetId } 
      });
      toast.success("Task moved to project");
    }
  };

  // --- 5. Prompt Generation Logic ---

  const generatedPrompt = useMemo(() => {
    const selectedItems = thoughts.filter(t => selectedThoughtIds.includes(t.id));
    if (selectedItems.length === 0 && !startTemplateId && !endTemplateId) return "";

    const parts = [];

    // 1. Personal Prefs
    if (includePersonalPrefs && currentUser?.personal_preferences_markdown) {
      parts.push(currentUser.personal_preferences_markdown);
    }

    // 2. Project Config
    if (includeProjectConfig && selectedProject?.technical_config_markdown) {
      parts.push(selectedProject.technical_config_markdown);
    }

    // 3. Start Template
    const startTmpl = templates.find(t => t.id === startTemplateId);
    if (startTmpl) parts.push(startTmpl.content);

    // 4. Tasks JSON
    if (selectedItems.length > 0) {
      const tasks = selectedItems.map((t, i) => ({
        id: `TASK-${i + 1}`,
        title: t.content.substring(0, 50) + "...",
        description: t.content,
        files: [t.target_page ? `pages/${t.target_page}.jsx` : "TBD"],
        priority: "Medium",
        images: t.image_urls
      }));

      const jsonBlock = {
        protocol: { name: "MULTITASK_EXECUTION_v1.0", mode: "serial" },
        subtasks: tasks
      };
      parts.push("```json\n" + JSON.stringify(jsonBlock, null, 2) + "\n```");
    }

    // 5. End Template
    const endTmpl = templates.find(t => t.id === endTemplateId);
    if (endTmpl) parts.push(endTmpl.content);

    return parts.join("\n\n---\n\n");
  }, [thoughts, selectedThoughtIds, startTemplateId, endTemplateId, includePersonalPrefs, includeProjectConfig, currentUser, selectedProject, templates]);

  // AI Improve
  const handleImprovePrompt = async () => {
    if (!generatedPrompt) return;
    setIsImproving(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Improve this prompt:\n${generatedPrompt}`,
      });
      setImprovedPrompt(result);
      toast.success("Prompt improved");
    } catch {
      toast.error("AI Improvement failed");
    } finally {
      setIsImproving(false);
    }
  };

  // --- 6. Save & Finish Logic ---

  // Helper: Generate Checklist from selected thoughts
  const generateChecklist = () => {
    return thoughts
      .filter(t => selectedThoughtIds.includes(t.id))
      .map(t => ({
        task_name: t.content.substring(0, 50) + "...",
        full_description: t.content,
        status: 'open',
        is_checked: false
      }));
  };

  // Mutation for creating the Item (Prompt)
  const createItemMutation = useMutation({
    mutationFn: (data) => base44.entities.Item.create(data),
    onSuccess: () => {
      // 1. Invalidate items to show in dashboard
      queryClient.invalidateQueries({ queryKey: ['items'] });
      
      // 2. Soft Delete Used Thoughts
      // We iterate and delete. Ideally bulk update, but per-item is safer with current API.
      selectedThoughtIds.forEach(id => deleteThought.mutate(id));
      
      // 3. Reset UI
      setSelectedThoughtIds([]);
      setImprovedPrompt("");
      setShowControlDialog(false);
      
      // 4. Show Feedback
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 8000);
      toast.success("Prompt saved to Vault");
    }
  });

  const handleCopyAndSave = async () => {
    const content = improvedPrompt || generatedPrompt;
    navigator.clipboard.writeText(content);
    
    createItemMutation.mutate({
      title: promptTitle || `${selectedProject?.name || 'Multi-Task'} ${new Date().toLocaleDateString()}`,
      type: "multiprompt",
      content: content,
      used_thoughts: selectedThoughtIds,
      project_id: selectedProjectId || null,
      task_checks: generateChecklist(),
      start_template_id: startTemplateId || null,
      end_template_id: endTemplateId || null,
      status: "open"
    });
  };

  // --- 7. Filtering & Sorting for Display ---

  const filteredThoughts = useMemo(() => {
    // Thoughts are already filtered by query (source of truth)
    // Just sort them here
    return [...thoughts].sort((a, b) => {
      if (groupBy === 'component') return (a.target_component || "").localeCompare(b.target_component || "");
      if (groupBy === 'page') return (a.target_page || "").localeCompare(b.target_page || "");
      return 0; // Default sort (date) is handled by DB query
    });
  }, [thoughts, groupBy]);

  // --- UI RENDER ---

  return (
    <RequireSubscription>
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Success Banner */}
          {showBanner && (
             <div className="mb-6 p-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg shadow-lg animate-in fade-in slide-in-from-top-4">
               <p className="text-sm font-medium text-center">
                 ✓ Copied & Saved! Tasks moved to Recycle Bin. Check progress in Vault.
               </p>
             </div>
          )}

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Multi-Task Builder
            </h1>
            <p className="text-slate-600 mt-2">Collect thoughts and build comprehensive multi-task prompts</p>
          </div>

          {/* Project Selector */}
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
                    All Projects
                  </Button>
                  {projects.map(p => (
                    <Button
                      key={p.id}
                      variant={selectedProjectId === p.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedProjectId(p.id)}
                      className={selectedProjectId === p.id ? `${projectColors[p.color]} border-0` : ""}
                    >
                      <div className={`w-2 h-2 rounded-full mr-2 bg-${p.color}-400`} />
                      {p.name}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Builder Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* LEFT COLUMN: Task Management */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    Tasks {selectedProject && <Badge className={projectColors[selectedProject.color]}>{selectedProject.name}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  {/* Input Area */}
                  <div className={`border-2 rounded-lg focus-within:border-indigo-400 transition-all bg-white ${selectedProject ? `border-dashed ${projectBorderColors[selectedProject.color]}` : 'border-slate-200'}`}>
                    <Textarea
                      placeholder="Type task..."
                      value={newThoughtContent}
                      onChange={(e) => setNewThoughtContent(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAddThought())}
                      className="min-h-[60px] border-0 focus-visible:ring-0 resize-none"
                    />
                    
                    {/* Image Previews */}
                    {newThoughtImages.length > 0 && (
                      <div className="flex gap-2 px-3 pb-2">
                        {newThoughtImages.map((url, idx) => (
                          <img key={idx} src={url} className="w-10 h-10 rounded border object-cover" />
                        ))}
                      </div>
                    )}

                    {/* Controls */}
                    <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-100 bg-slate-50/50 rounded-b-lg">
                      <div className="relative">
                        <input type="file" multiple className="hidden" id="new-img" onChange={e => handleImageUpload(e.target.files)} />
                        <label htmlFor="new-img" className="cursor-pointer p-1 hover:bg-slate-200 rounded">
                          {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        </label>
                      </div>
                      <Select value={newThoughtFocus} onValueChange={setNewThoughtFocus}>
                         <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue /></SelectTrigger>
                         <SelectContent>
                           <SelectItem value="both">Design + Logic</SelectItem>
                           <SelectItem value="design">Design Only</SelectItem>
                           <SelectItem value="logic">Logic Only</SelectItem>
                         </SelectContent>
                      </Select>
                      <ContextSelector value={newThoughtContext} onChange={setNewThoughtContext} compact />
                    </div>
                  </div>

                  {/* Add Button */}
                  <div className="flex gap-2">
                    <Button onClick={handleAddThought} className={`flex-1 ${selectedProject ? projectColors[selectedProject.color] : 'bg-slate-800'}`}>
                      <Plus className="w-4 h-4 mr-2" /> Add Task
                    </Button>
                    <Select value={groupBy} onValueChange={setGroupBy}>
                      <SelectTrigger className="w-[120px]"><SelectValue placeholder="Group" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">By Date</SelectItem>
                        <SelectItem value="page">By Page</SelectItem>
                        <SelectItem value="component">By Component</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tasks List */}
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="thoughts-list">
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 max-h-[500px] overflow-y-auto">
                           {filteredThoughts.map((thought, idx) => (
                             <Draggable key={thought.id} draggableId={thought.id} index={idx}>
                               {(provided) => (
                                 <div ref={provided.innerRef} {...provided.draggableProps}>
                                    <ThoughtCard
                                      thought={thought}
                                      project={projects.find(p => p.id === thought.project_id)}
                                      isSelected={selectedThoughtIds.includes(thought.id)}
                                      onToggleSelect={() => toggleSelection(thought.id)}
                                      onDelete={deleteThought.mutate}
                                      onUpdateContent={handleUpdateContent}
                                      onUpdateImages={handleUpdateImages}
                                      onUpdateFocus={handleUpdateFocus}
                                      onUpdateContext={handleUpdateContext}
                                      dragHandleProps={provided.dragHandleProps}
                                    />
                                 </div>
                               )}
                             </Draggable>
                           ))}
                           {provided.placeholder}
                           {filteredThoughts.length === 0 && (
                             <div className="text-center py-8 text-slate-400 italic">No tasks found. Start typing!</div>
                           )}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>

                  {/* Bulk Selection */}
                  {filteredThoughts.length > 0 && (
                    <div className="flex justify-between text-xs text-slate-500">
                      <button onClick={() => selectAll(filteredThoughts.map(t => t.id))} className="hover:text-indigo-600">Select All</button>
                      <button onClick={() => deselectAll(filteredThoughts.map(t => t.id))} className="hover:text-indigo-600">Deselect All</button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN: Templates & Preview */}
            <div className="space-y-4">
              
              {/* Template Selection */}
              <Card>
                <CardHeader className="pb-3"><CardTitle>Templates</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="text-xs font-medium text-slate-600">Start</label>
                     <Select value={startTemplateId} onValueChange={setStartTemplateId}>
                       <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                       <SelectContent>
                         <SelectItem value={null}>None</SelectItem>
                         {templates.filter(t => t.type === 'start').map(t => (
                           <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                   <div>
                     <label className="text-xs font-medium text-slate-600">End</label>
                     <Select value={endTemplateId} onValueChange={setEndTemplateId}>
                       <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                       <SelectContent>
                         <SelectItem value={null}>None</SelectItem>
                         {templates.filter(t => t.type === 'eind').map(t => (
                           <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                   
                   {/* Template Previews */}
                   {(startTemplateId || endTemplateId) && (
                     <div className="col-span-2 grid grid-cols-2 gap-4 text-xs text-slate-500">
                        <div className={`p-2 rounded border h-20 overflow-hidden ${selectedProject ? projectLightColors[selectedProject.color] : 'bg-slate-50'}`}>
                          {templates.find(t => t.id === startTemplateId)?.content || "-"}
                        </div>
                        <div className={`p-2 rounded border h-20 overflow-hidden ${selectedProject ? projectLightColors[selectedProject.color] : 'bg-slate-50'}`}>
                           {templates.find(t => t.id === endTemplateId)?.content || "-"}
                        </div>
                     </div>
                   )}
                </CardContent>
              </Card>

              {/* Config Toggles */}
              <div className="flex gap-4 text-sm text-slate-600 px-1">
                <div className="flex items-center gap-2">
                  <Checkbox checked={includePersonalPrefs} onCheckedChange={setIncludePersonalPrefs} />
                  <span>Personal Prefs</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={includeProjectConfig} onCheckedChange={setIncludeProjectConfig} />
                  <span>Project Config</span>
                </div>
              </div>

              {/* Preview Area */}
              <Card className="flex-1 flex flex-col">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle>Preview</CardTitle>
                  <div className="flex gap-2">
                     <Button size="sm" variant="outline" onClick={handleImprovePrompt} disabled={!generatedPrompt}>
                       {isImproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />} Improve
                     </Button>
                     <Dialog open={showControlDialog} onOpenChange={setShowControlDialog}>
                       <DialogTrigger asChild>
                         <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" disabled={!generatedPrompt && !improvedPrompt}>
                           <Copy className="w-4 h-4 mr-1" /> Copy & Save
                         </Button>
                       </DialogTrigger>
                       <DialogContent>
                         <DialogHeader><DialogTitle>Save Prompt</DialogTitle></DialogHeader>
                         <div className="space-y-4 py-4">
                           <Input placeholder="Prompt Title (optional)" value={promptTitle} onChange={e => setPromptTitle(e.target.value)} />
                           <div className="flex justify-end gap-2">
                             <Button variant="ghost" onClick={() => setShowControlDialog(false)}>Cancel</Button>
                             <Button onClick={handleCopyAndSave}>Confirm Copy & Save</Button>
                           </div>
                         </div>
                       </DialogContent>
                     </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="bg-slate-900 rounded-lg p-4 min-h-[300px] max-h-[500px] overflow-auto text-slate-300 font-mono text-sm whitespace-pre-wrap">
                    {improvedPrompt || generatedPrompt || "// Select tasks to generate prompt..."}
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>

        </div>
      </div>
    </RequireSubscription>
  );
}