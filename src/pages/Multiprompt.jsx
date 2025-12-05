import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
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
  Plus, Save, Trash2, Copy, CheckCircle, FileText, X, Sparkles, Loader2, 
  FolderOpen, Edit, MoreHorizontal, Settings, Pencil, CheckSquare, Square, 
  Lightbulb, Layers, Cog
} from "lucide-react";
import { Link } from "react-router-dom";
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

import ThoughtCard from "../components/multiprompt/ThoughtCard";
import ContextSelector from "../components/multiprompt/ContextSelector";
import RequireSubscription from "../components/auth/RequireSubscription";
import { projectColors, projectBorderColors, projectLightColors } from "@/components/lib/constants";
import { useThoughts } from "@/components/hooks/useMultipromptState";
import { uploadImageToSupabase } from "@/components/lib/uploadImage";
import { useAutosaveField } from "@/components/hooks/useAutosaveField";

/**
 * Multiprompt Page - Completely Rebuilt Logic
 * Source of Truth: React Query (via useThoughts hook)
 * Project Sync: LocalStorage + Navigation State + Window Events
 */
export default function Multiprompt() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // 1. USER
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // 2. PROJECT CONTEXT MANAGEMENT
  // Prioriteit: Nav State > LocalStorage > null
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    const navProject = location.state?.projectId;
    const storedProject = localStorage.getItem('lastSelectedProjectId');
    // Handle "null" string from storage
    const validStored = storedProject === "null" ? null : storedProject;
    return navProject || validStored || "";
  });

  // Listener voor updates uit andere tabs/components (zoals RecycleBin restore)
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'lastSelectedProjectId' && e.newValue) {
        const newVal = e.newValue === "null" ? "" : e.newValue;
        setSelectedProjectId(newVal);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Persist selection change
  const handleProjectChange = (id) => {
    setSelectedProjectId(id);
    localStorage.setItem('lastSelectedProjectId', id || "null");
  };

  // Cleanup nav state on mount om refresh-loops te voorkomen
  useEffect(() => {
    if (location.state?.projectId || location.state?.retryThoughtIds) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  // 3. DATA & STATE (via Hook)
  const {
    thoughts,
    selectedThoughts, // Array of IDs
    setSelectedThoughts,
    createThought,
    updateThought,
    deleteThought,
    toggleSelection
  } = useThoughts({ 
    selectedProjectId, 
    currentUser,
    idsToAutoSelect: location.state?.retryThoughtIds // Auto-select from retry
  });

  // 4. DERIVED STATE & SORTING
  const [groupBy, setGroupBy] = useState("component");
  
  // Sortering logic
  const sortedThoughts = useMemo(() => {
    const base = [...thoughts];
    if (groupBy === 'page') return base.sort((a, b) => (a.target_page || 'z').localeCompare(b.target_page || 'z'));
    if (groupBy === 'component') return base.sort((a, b) => (a.target_component || 'z').localeCompare(b.target_component || 'z'));
    return base; // Default: created_date (via API)
  }, [thoughts, groupBy]);

  // Filtering voor Drag & Drop
  const filteredThoughts = selectedProjectId 
    ? sortedThoughts.filter(t => t.project_id === selectedProjectId)
    : sortedThoughts;

  // 5. LOCAL UI STATE
  // New thought input
  const { value: newThought, setValue: setNewThought, resetValue: resetNewThought } = useAutosaveField({
    storageKey: `promptster:new:${selectedProjectId || 'all'}`,
    initialValue: ""
  });
  const [newThoughtImages, setNewThoughtImages] = useState([]);
  const [newThoughtContext, setNewThoughtContext] = useState({});
  const [newThoughtFocus, setNewThoughtFocus] = useState("both");
  const [isUploading, setIsUploading] = useState(false);

  // Templates & Config
  const [startTemplateId, setStartTemplateId] = useState("");
  const [endTemplateId, setEndTemplateId] = useState("");
  const [includePersonalPrefs, setIncludePersonalPrefs] = useState(true);
  const [includeProjectConfig, setIncludeProjectConfig] = useState(true);
  const [promptTitle, setPromptTitle] = useState("");
  const [showControlDialog, setShowControlDialog] = useState(false);
  
  // 6. AUXILIARY QUERIES
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentUser?.email],
    queryFn: () => base44.entities.Project.filter({ created_by: currentUser?.email }),
    enabled: !!currentUser?.email
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates', currentUser?.email],
    queryFn: () => base44.entities.PromptTemplate.filter({ created_by: currentUser?.email }),
    enabled: !!currentUser?.email
  });

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const startTemplates = templates.filter(t => t.type === 'start');
  const endTemplates = templates.filter(t => t.type === 'eind');

  // 7. ACTIONS
  const handleAddThought = () => {
    if (!newThought.trim() && newThoughtImages.length === 0) return;
    
    createThought.mutate({
      content: newThought,
      project_id: selectedProjectId || null,
      image_urls: newThoughtImages,
      is_selected: true,
      focus_type: newThoughtFocus,
      ...newThoughtContext
    });

    // Reset inputs
    resetNewThought();
    setNewThoughtImages([]);
    setNewThoughtContext({});
  };

  const handleCopyPrompt = async () => {
    // Generate Prompt Logic (Simplified for brevity, assuming generatedPrompt is built)
    const promptText = generatePromptText(); // Extracted to helper
    navigator.clipboard.writeText(promptText);
    
    // Save Item
    await base44.entities.Item.create({
        title: promptTitle || `Multi-Task ${new Date().toLocaleTimeString()}`,
        type: "multiprompt",
        content: promptText,
        used_thoughts: selectedThoughts,
        project_id: selectedProjectId,
        status: "open",
        task_checks: selectedThoughts.map(id => {
            const t = thoughts.find(x => x.id === id);
            return { task_name: "Task", full_description: t?.content, status: "open" };
        })
    });

    toast.success("Prompt copied & saved!");

    // Soft Delete used thoughts
    const deletePromises = selectedThoughts.map(id => 
        base44.entities.Thought.update(id, { is_deleted: true, deleted_at: new Date().toISOString() })
    );
    await Promise.all(deletePromises);

    // Aggressive refresh
    queryClient.resetQueries({ queryKey: ['thoughts'] });
    setSelectedThoughts([]);
    setShowControlDialog(false);
  };

  const generatePromptText = () => {
    // Basic generator logic based on selectedThoughts + templates
    const tasks = thoughts.filter(t => selectedThoughts.includes(t.id));
    const startT = templates.find(t => t.id === startTemplateId)?.content || "";
    const endT = templates.find(t => t.id === endTemplateId)?.content || "";
    
    let text = "";
    if (includePersonalPrefs && currentUser?.personal_preferences_markdown) text += currentUser.personal_preferences_markdown + "\n\n";
    if (includeProjectConfig && selectedProject?.technical_config_markdown) text += selectedProject.technical_config_markdown + "\n\n";
    if (startT) text += startT + "\n\n";
    
    text += "TASKS:\n";
    tasks.forEach((t, i) => {
        text += `${i+1}. ${t.content} [${t.focus_type}]\n`;
    });

    if (endT) text += "\n" + endT;
    return text;
  };

  const handleSelectAll = () => {
    const allIds = filteredThoughts.map(t => t.id);
    const allSelected = allIds.every(id => selectedThoughts.includes(id));
    if (allSelected) {
        setSelectedThoughts(prev => prev.filter(id => !allIds.includes(id)));
    } else {
        setSelectedThoughts(prev => [...new Set([...prev, ...allIds])]);
    }
  };

  // UI RENDER
  return (
    <RequireSubscription>
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Multi-Task Builder
          </h1>
        </div>

        {/* PROJECT SELECTOR */}
        <Card className="mb-6 border-2 border-slate-100">
          <CardContent className="py-4 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <FolderOpen className="w-5 h-5" /> Project:
            </div>
            <Button
              variant={!selectedProjectId ? "default" : "outline"}
              size="sm"
              onClick={() => handleProjectChange("")}
              className={!selectedProjectId ? "bg-slate-800" : ""}
            >
              All Projects
            </Button>
            {projects.map(p => (
              <Button
                key={p.id}
                variant={selectedProjectId === p.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleProjectChange(p.id)}
                className={selectedProjectId === p.id ? `${projectColors[p.color]} text-white border-0` : ""}
              >
                <div className={`w-2 h-2 rounded-full mr-2 ${projectColors[p.color]} bg-current`} />
                {p.name}
              </Button>
            ))}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LEFT COLUMN: INPUT & LIST */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Tasks
                  {selectedProject && <Badge className={projectColors[selectedProject.color]}>{selectedProject.name}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* INPUT AREA */}
                <div className={`border-2 rounded-lg p-1 bg-slate-50/50 focus-within:border-indigo-400 transition-all ${selectedProject ? projectBorderColors[selectedProject.color] : 'border-slate-200'}`}>
                  <Textarea
                    value={newThought}
                    onChange={e => setNewThought(e.target.value)}
                    placeholder="New task..."
                    className="border-0 shadow-none focus-visible:ring-0 bg-transparent min-h-[60px]"
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAddThought())}
                  />
                  {/* Controls (Image, Context, Add) - Simplified for brevity */}
                  <div className="flex justify-between items-center px-2 py-1 border-t border-slate-200/50 pt-2">
                    <Button size="sm" variant="ghost" onClick={() => document.getElementById('img-upload').click()}>
                       <span className="sr-only">Upload</span> <i className="lucide-image" /> 📷
                    </Button>
                    <input id="img-upload" type="file" className="hidden" onChange={async (e) => {
                        if(e.target.files[0]) {
                            setIsUploading(true);
                            const url = await uploadImageToSupabase(e.target.files[0]);
                            setNewThoughtImages(prev => [...prev, url]);
                            setIsUploading(false);
                        }
                    }} />
                    <Button size="sm" onClick={handleAddThought} disabled={!newThought.trim()}>Add</Button>
                  </div>
                </div>

                {/* LIST ACTIONS */}
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleSelectAll}>
                        {filteredThoughts.length > 0 && filteredThoughts.every(t => selectedThoughts.includes(t.id)) ? "Deselect All" : "Select All"}
                    </Button>
                    <Select value={groupBy} onValueChange={setGroupBy}>
                        <SelectTrigger className="w-[120px] h-9"><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="component">By Component</SelectItem>
                            <SelectItem value="page">By Page</SelectItem>
                            <SelectItem value="date">Recent</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* THOUGHTS LIST */}
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {filteredThoughts.map(thought => (
                        <ThoughtCard
                            key={thought.id}
                            thought={thought}
                            project={projects.find(p => p.id === thought.project_id)}
                            isSelected={selectedThoughts.includes(thought.id)}
                            onToggleSelect={() => toggleSelection(thought.id)}
                            onDelete={() => deleteThought.mutate(thought.id)}
                            onUpdateContent={(id, txt) => updateThought.mutate({id, data: {content: txt}})}
                            onUpdateFocus={(id, focus) => updateThought.mutate({id, data: {focus_type: focus}})}
                            onUpdateContext={(id, ctx) => updateThought.mutate({id, data: ctx})}
                            onUpdateImages={(id, imgs) => updateThought.mutate({id, data: {image_urls: imgs}})}
                        />
                    ))}
                    {filteredThoughts.length === 0 && (
                        <div className="text-center py-8 text-slate-400">No tasks found.</div>
                    )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: PREVIEW & TEMPLATES */}
          <div className="space-y-4">
             {/* CONFIG BAR */}
             <div className="flex gap-4 p-3 bg-slate-50 rounded border">
                <div className="flex items-center gap-2">
                    <Checkbox checked={includePersonalPrefs} onCheckedChange={setIncludePersonalPrefs} />
                    <span className="text-sm">Personal Prefs</span>
                </div>
                <div className="flex items-center gap-2">
                    <Checkbox checked={includeProjectConfig} onCheckedChange={setIncludeProjectConfig} disabled={!selectedProject} />
                    <span className="text-sm">Project Config</span>
                </div>
             </div>

             {/* TEMPLATES */}
             <Card>
                <CardHeader><CardTitle>Templates</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <Select value={startTemplateId} onValueChange={setStartTemplateId}>
                        <SelectTrigger><SelectValue placeholder="Start..."/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {startTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={endTemplateId} onValueChange={setEndTemplateId}>
                        <SelectTrigger><SelectValue placeholder="End..."/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {endTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </CardContent>
             </Card>

             {/* PREVIEW */}
             <Card className="h-full max-h-[500px] flex flex-col">
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle>Preview</CardTitle>
                    <Button onClick={() => setShowControlDialog(true)} disabled={selectedThoughts.length === 0}>
                        Generate
                    </Button>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto bg-slate-950 text-slate-300 p-4 font-mono text-xs rounded-b-lg mx-4 mb-4">
                    <pre className="whitespace-pre-wrap">{generatePromptText()}</pre>
                </CardContent>
             </Card>
          </div>
        </div>

        {/* SAVE DIALOG */}
        <Dialog open={showControlDialog} onOpenChange={setShowControlDialog}>
            <DialogContent>
                <DialogHeader><DialogTitle>Save & Copy</DialogTitle></DialogHeader>
                <div className="py-4">
                    <Input value={promptTitle} onChange={e => setPromptTitle(e.target.value)} placeholder="Prompt Title" />
                    <p className="text-sm text-slate-500 mt-2">
                        {selectedThoughts.length} tasks will be moved to the archive (deleted).
                    </p>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowControlDialog(false)}>Cancel</Button>
                    <Button onClick={handleCopyPrompt}>Copy & Save</Button>
                </div>
            </DialogContent>
        </Dialog>

      </div>
    </RequireSubscription>
  );
}