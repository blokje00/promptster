import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { useMultipromptData } from "@/components/hooks/useMultipromptState";

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
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { 
  Plus, Sparkles, Save, Trash2, Copy, CheckCircle, FileText, X, 
  Loader2, FolderOpen, Edit, MoreHorizontal, Settings, Pencil, 
  CheckSquare, Square, Lightbulb, Layers, Cog, Upload
} from "lucide-react";

// Sub-components
import ThoughtCard from "@/components/multiprompt/ThoughtCard";
import ContextSelector from "@/components/multiprompt/ContextSelector";
import RequireSubscription from "@/components/auth/RequireSubscription";
import TemplatesManager from "@/components/multiprompt/TemplatesManager";
import ProjectsManager from "@/components/multiprompt/ProjectsManager";
import ScreenshotUploader from "@/components/media/ScreenshotUploader";
import { projectColors, projectBorderColors, projectLightColors } from "@/components/lib/constants";
import { uploadImageToSupabase } from "@/components/lib/uploadImage";

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

  // Task 9 & 10: Fix Project Persistence
  // Ensure that we only use location state if it explicitly exists, otherwise fallback to localStorage in initialization
  // This is handled in useState initialization.
  // However, if we navigate away and back, React re-mounts.
  // If 'lastSelectedProjectId' is in localStorage, it should pick it up.
  // But if we explicitly set project to "" (All), localStorage has "".
  
  // Also, we should sync any external changes (like from Checks page)
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'lastSelectedProjectId') {
        // Only update if different to avoid loops
        if (e.newValue !== selectedProjectId) {
             setSelectedProjectId(e.newValue || "");
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [selectedProjectId]);

  // --- 2. Data Fetching (via Hook) ---

  const {
    thoughts,
    allThoughts,
    isLoading,
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

  // Task 6: Fetch Subscription Plans for Limits
  const { data: subscriptionPlans = [] } = useQuery({
    queryKey: ['subscriptionPlans'],
    queryFn: () => base44.entities.SubscriptionPlan.list(),
  });

  // Determine Max Thoughts based on plan
  const currentPlan = subscriptionPlans.find(p => p.id === currentUser?.plan_id || p.monthly_price_id === currentUser?.plan_id) || {};
  const maxThoughts = currentPlan.max_thoughts || 10; // Default limit
  // Task 2: Admin Unlimited Tasks
  const isLimitReached = currentUser?.role !== 'admin' && thoughts.length >= maxThoughts;

  // --- 3. UI State Management ---

  // New Thought Input State
  const [newThoughtContent, setNewThoughtContent] = useState("");

  // Draft Autosave (Simple LocalStorage)
  useEffect(() => {
    const key = `promptster:draft:${selectedProjectId || 'all'}`;
    const saved = localStorage.getItem(key);
    if (saved) setNewThoughtContent(saved);
  }, [selectedProjectId]);

  useEffect(() => {
    const key = `promptster:draft:${selectedProjectId || 'all'}`;
    localStorage.setItem(key, newThoughtContent);
  }, [newThoughtContent, selectedProjectId]);
  const [newThoughtScreenshots, setNewThoughtScreenshots] = useState([]);
  const [newThoughtFocus, setNewThoughtFocus] = useState("both");
  const [newThoughtContext, setNewThoughtContext] = useState({});
  const [isDropActive, setIsDropActive] = useState(false);

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
  
  // Helper: Get Selected Project Object
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Task 1: Count thoughts per project
  const getProjectCount = (pid) => allThoughts?.filter(t => t.project_id === pid).length || 0;

  // Task 1: Enable/Disable Context Suggestions
  const enableContextSuggestions = aiSettings[0]?.enable_context_suggestions !== false;

  // --- Template Autosave & Persistence ---
  
  // 1. Load Templates on Context Change
  useEffect(() => {
    if (selectedProject) {
      // Prioritize project settings
      if (selectedProject.last_start_template_id) setStartTemplateId(selectedProject.last_start_template_id);
      if (selectedProject.last_end_template_id) setEndTemplateId(selectedProject.last_end_template_id);
    } else {
      // Fallback to localStorage for 'all' or generic
      const savedStart = localStorage.getItem(`template_start_${selectedProjectId || 'all'}`);
      const savedEnd = localStorage.getItem(`template_end_${selectedProjectId || 'all'}`);
      if (savedStart) setStartTemplateId(savedStart);
      if (savedEnd) setEndTemplateId(savedEnd);
    }
  }, [selectedProjectId, selectedProject]);

  // 2. Save Templates on Change
  useEffect(() => {
    if (startTemplateId) {
      localStorage.setItem(`template_start_${selectedProjectId || 'all'}`, startTemplateId);
      if (selectedProjectId) {
        base44.entities.Project.update(selectedProjectId, { last_start_template_id: startTemplateId });
      }
    }
  }, [startTemplateId, selectedProjectId]);

  useEffect(() => {
    if (endTemplateId) {
      localStorage.setItem(`template_end_${selectedProjectId || 'all'}`, endTemplateId);
      if (selectedProjectId) {
        base44.entities.Project.update(selectedProjectId, { last_end_template_id: endTemplateId });
      }
    }
  }, [endTemplateId, selectedProjectId]);

  // --- 4. Handlers ---

  // Add Thought
  const handleAddThought = () => {
    if (!newThoughtContent.trim() && newThoughtScreenshots.length === 0) return;
    if (!currentUser?.email) {
      toast.error("Je moet ingelogd zijn om een task toe te voegen");
      return;
    }

    if (isLimitReached) {
      toast.error(`Limit reached: Max ${maxThoughts} tasks allowed on your plan.`);
      return;
    }

    createThought.mutate({
      content: newThoughtContent.trim(),
      project_id: selectedProjectId || null,
      is_deleted: false,
      screenshot_ids: newThoughtScreenshots,
      is_selected: true,
      focus_type: newThoughtFocus,
      target_page: newThoughtContext.target_page,
      target_component: newThoughtContext.target_component,
      target_domain: newThoughtContext.target_domain,
      ai_prediction: newThoughtContext.ai_prediction,
      created_by: currentUser.email
    }, {
      onSuccess: () => {
        setNewThoughtContent("");
        localStorage.removeItem(`promptster:draft:${selectedProjectId || 'all'}`);
        setNewThoughtScreenshots([]);
        setNewThoughtFocus("both");
        setNewThoughtContext({});
        toast.success("Task added");
      }
    });
  };

  // Drag & Drop handlers voor hele input area
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDropActive(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropActive(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      toast.error("Alleen afbeeldingen toegestaan");
      return;
    }

    if (newThoughtScreenshots.length + imageFiles.length > 5) {
      toast.error("Maximum 5 afbeeldingen per task");
      return;
    }

    toast.loading(`${imageFiles.length} afbeelding(en) uploaden...`);

    const successUrls = [];
    for (const file of imageFiles) {
      try {
        const url = await uploadImageToSupabase(file);
        if (url) successUrls.push(url);
      } catch (error) {
        console.error('Upload error:', error);
      }
    }

    if (successUrls.length > 0) {
      setNewThoughtScreenshots([...newThoughtScreenshots, ...successUrls]);
      toast.success(`${successUrls.length} afbeelding(en) toegevoegd`);
    }
  };

  // Thought Updates (Delegates to Hook)
  const handleUpdateContent = (id, content) => updateThought.mutate({ id, data: { content } });
  const handleUpdateScreenshots = (id, screenshotIds) => updateThought.mutate({ id, data: { screenshot_ids: screenshotIds } });
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
        screenshots: t.screenshot_ids || []
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

  // Task 7: Autosave Improved Prompt
  useEffect(() => {
    const savedImproved = localStorage.getItem(`promptster:improved:${selectedProjectId || 'all'}`);
    if (savedImproved) {
      setImprovedPrompt(savedImproved);
    } else {
      setImprovedPrompt(""); // Clear when switching projects if no saved state
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (improvedPrompt) {
      localStorage.setItem(`promptster:improved:${selectedProjectId || 'all'}`, improvedPrompt);
    }
  }, [improvedPrompt, selectedProjectId]);

  // Task 2 & 3: Removed auto-clear to enable autosave persistence
  // The previous useEffect clearing improvedPrompt is removed.

  // AI Improve with Screenshot Analysis
  const handleImprovePrompt = async () => {
    if (!generatedPrompt) return;
    setIsImproving(true);
    try {
      // Collect all screenshots from selected thoughts
      const selectedItems = thoughts.filter(t => selectedThoughtIds.includes(t.id));
      const allScreenshotIds = selectedItems.flatMap(t => t.screenshot_ids || []);
      
      let screenshotContext = "";
      
      // Analyze each screenshot if present
      if (allScreenshotIds.length > 0) {
        const analyses = await Promise.all(
          allScreenshotIds.map(async (screenshotId) => {
            try {
              const response = await fetch('/api/screenshots/analyze', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('base44_token')}`
                },
                body: JSON.stringify({ 
                  screenshotId,
                  prompt: "Analyze this screenshot for UI/UX context. Describe key elements, layout, and functionality visible."
                })
              });
              
              if (!response.ok) throw new Error('Analysis failed');
              
              const data = await response.json();
              return `\n\n--- Screenshot Analysis ---\n${data.analysis}`;
            } catch (err) {
              console.error('Screenshot analysis error:', err);
              return "";
            }
          })
        );
        
        screenshotContext = analyses.filter(a => a).join("\n");
      }

      // Task 5: Remove AI Chatter
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `${screenshotContext}\n\nImprove this prompt:\n${generatedPrompt}\n\nIMPORTANT: Return ONLY the improved prompt content. Do not include any intro, outro, or conversational filler like "Here is the improved prompt". Just the prompt text itself.`,
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

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Task 2: Quick Save (Auto-Generated Title)
  const handleQuickSave = async () => {
    const content = improvedPrompt || generatedPrompt;
    navigator.clipboard.writeText(content);
    
    const timestamp = new Date().toLocaleString('nl-NL', { 
        day: '2-digit', month: '2-digit', year: '2-digit', 
        hour: '2-digit', minute: '2-digit' 
    }).replace(',', '');
    const autoTitle = `${selectedProject?.name || 'Multi-Task'} ${timestamp}`;

    // Task 6: Show success on button
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);

    // Collect all screenshot IDs from selected thoughts
    const selectedItems = thoughts.filter(t => selectedThoughtIds.includes(t.id));
    const allScreenshotIds = [...new Set(selectedItems.flatMap(t => t.screenshot_ids || []))];

    createItemMutation.mutate({
      title: autoTitle,
      type: "multiprompt",
      content: content,
      used_thoughts: selectedThoughtIds,
      project_id: selectedProjectId || null,
      task_checks: generateChecklist(),
      start_template_id: startTemplateId || null,
      end_template_id: endTemplateId || null,
      screenshot_ids: allScreenshotIds,
      status: "open"
    }, {
      onSuccess: (newItem) => {
        // Task 7: Redirect to Checks instead of ViewItem
        if (newItem?.id) {
          navigate(createPageUrl("Checks"));
          toast.success("Prompt saved! Sent to Vault Checks.");
        }
      }
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
          
          {/* Success Banner - Task 8 Fixes */}
          {showBanner && (
             <div className="mb-6 p-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg shadow-lg animate-in fade-in slide-in-from-top-4 text-center">
               <p className="text-sm font-medium">
                 ✓ Copied & Saved! Tekst zit op je plakbord. Tasks moved to Recycle Bin. Check progress in Vault.
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
                    {/* Task 4: Total tasks badge */}
                    {allThoughts?.length > 0 && (
                      <Badge variant="secondary" className="ml-2 bg-red-500 text-white hover:bg-red-600 border-0 px-1.5 py-0 h-4 text-[10px]">
                        {allThoughts.length}
                      </Badge>
                    )}
                  </Button>
                  {projects.map(p => (
                    <Button
                      key={p.id}
                      variant={selectedProjectId === p.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedProjectId(p.id)}
                      className={selectedProjectId === p.id ? `${projectColors[p.color]} border-0` : ""}
                    >
                      <div className={`w-2 h-2 rounded-full mr-2 ${projectColors[p.color] ? projectColors[p.color].replace('bg-', 'bg-').replace('600', '400') : 'bg-slate-400'}`} />
                      {p.name} ({getProjectCount(p.id)})
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="build" className="space-y-6">
            <TabsList className="bg-slate-100">
              <TabsTrigger value="build" className="data-[state=active]:bg-white">
                <Layers className="w-4 h-4 mr-2" /> Build Prompt
              </TabsTrigger>
              <TabsTrigger value="templates" className="data-[state=active]:bg-white">
                <FileText className="w-4 h-4 mr-2" /> Templates
              </TabsTrigger>
              <TabsTrigger value="projects" className="data-[state=active]:bg-white">
                <FolderOpen className="w-4 h-4 mr-2" /> My Projects
              </TabsTrigger>
            </TabsList>

            <TabsContent value="build">
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

                      {/* Input Area with Drag & Drop */}
                      <div 
                        className={`relative border-2 rounded-lg transition-all bg-white ${
                          selectedProject 
                            ? `border-dashed ${projectBorderColors[selectedProject.color]}` 
                            : 'border-slate-200'
                        } ${
                          isDropActive 
                            ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-400 ring-offset-2' 
                            : 'focus-within:border-indigo-400'
                        }`}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      >
                        {/* Drop Overlay */}
                        {isDropActive && (
                          <div className="absolute inset-0 flex items-center justify-center bg-indigo-100/90 rounded-lg z-20 pointer-events-none">
                            <div className="text-center">
                              <Upload className="w-10 h-10 text-indigo-600 mx-auto mb-2 animate-bounce" />
                              <p className="text-indigo-700 font-semibold text-lg">Drop screenshots hier</p>
                              <p className="text-indigo-600 text-sm">Afbeeldingen worden direct geüpload</p>
                            </div>
                          </div>
                        )}

                        <Textarea
                          placeholder={isLimitReached ? `Plan limit of ${maxThoughts} tasks reached.` : "Type task... (of sleep screenshots hier)"}
                          value={newThoughtContent}
                          onChange={(e) => setNewThoughtContent(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), !isLimitReached && handleAddThought())}
                          disabled={isLimitReached}
                          className="min-h-[60px] border-0 focus-visible:ring-0 resize-none"
                        />

                        {/* Screenshot Previews via ScreenshotUploader */}
                        {newThoughtScreenshots.length > 0 && (
                          <div className="px-3 pb-2">
                            <ScreenshotUploader
                              screenshotIds={newThoughtScreenshots}
                              onChange={setNewThoughtScreenshots}
                              projectId={selectedProjectId}
                              maxCount={5}
                            />
                          </div>
                        )}

                        {/* Controls */}
                        <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-100 bg-slate-50/50 rounded-b-lg">
                          <ScreenshotUploader
                            screenshotIds={newThoughtScreenshots}
                            onChange={setNewThoughtScreenshots}
                            projectId={selectedProjectId}
                            maxCount={5}
                            compact
                          />
                          <Select value={newThoughtFocus} onValueChange={setNewThoughtFocus}>
                             <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue /></SelectTrigger>
                             <SelectContent>
                               <SelectItem value="both">Design + Logic</SelectItem>
                               <SelectItem value="design">Design Only</SelectItem>
                               <SelectItem value="logic">Logic Only</SelectItem>
                             </SelectContent>
                          </Select>
                          <ContextSelector value={newThoughtContext} onChange={setNewThoughtContext} compact enableAISuggestions={enableContextSuggestions} />
                        </div>
                      </div>

                      {/* Add Button & Bulk Selection (Task 3) */}
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Button 
                            onClick={handleAddThought} 
                            disabled={isLimitReached}
                            // Task 1: Rename + Add Task to + Task
                            className={`flex-1 text-white ${selectedProject ? projectColors[selectedProject.color] : 'bg-slate-800 hover:bg-slate-900'} ${isLimitReached ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <Plus className="w-4 h-4 mr-2" /> {isLimitReached ? `Limit Reached (${maxThoughts})` : 'Task'}
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
                        
                        {filteredThoughts.length > 0 && (
                          <div className="flex justify-end gap-3 text-xs font-medium text-slate-500 px-1">
                            <button onClick={() => selectAll(filteredThoughts.map(t => t.id))} className="hover:text-indigo-600 transition-colors">Select All</button>
                            <span className="text-slate-300">|</span>
                            <button onClick={() => deselectAll(filteredThoughts.map(t => t.id))} className="hover:text-indigo-600 transition-colors">Deselect All</button>
                          </div>
                        )}
                      </div>

                      {/* Tasks List */}
                      <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="thoughts-list">
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 max-h-[500px] overflow-y-auto p-1">
                               {/* Task 5: Loading State */}
                               {isLoading && filteredThoughts.length === 0 && (
                                 <div className="py-8 text-center">
                                   <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
                                   <p className="text-sm text-slate-500">Loading tasks...</p>
                                 </div>
                               )}
                               {!isLoading && filteredThoughts.map((thought, idx) => (
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
                                          onUpdateScreenshots={handleUpdateScreenshots}
                                          onUpdateFocus={handleUpdateFocus}
                                          onUpdateContext={handleUpdateContext}
                                          dragHandleProps={provided.dragHandleProps}
                                        />
                                     </div>
                                   )}
                                 </Draggable>
                               ))}
                               {provided.placeholder}
                               {!isLoading && filteredThoughts.length === 0 && (
                                 <div className="text-center py-8 text-slate-400 italic">No tasks found. Start typing!</div>
                               )}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
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
                        {/* Task 4: Restore Settings Gear */}
                        <Link to={createPageUrl("AIBackoffice")}>
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                             <Cog className="w-4 h-4" />
                           </Button>
                        </Link>
                        <Button size="sm" variant="outline" onClick={handleImprovePrompt} disabled={!generatedPrompt}>
                          {isImproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />} Improve
                        </Button>
                        <Button 
                           size="sm" 
                           className={`transition-all duration-300 ${saveSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                           disabled={!generatedPrompt && !improvedPrompt}
                           onClick={handleQuickSave}
                        >
                          {saveSuccess ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" /> Success
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-1" /> Copy & Save
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 relative group/preview">
                      <div className="bg-slate-900 rounded-lg p-4 min-h-[300px] max-h-[500px] overflow-auto text-slate-300 font-mono text-sm whitespace-pre-wrap">
                        {improvedPrompt || generatedPrompt || "// Select tasks to generate prompt..."}
                      </div>
                      {/* Task 7: Floating Copy Icon */}
                      {(improvedPrompt || generatedPrompt) && (
                        <Button
                          size="icon"
                          variant="secondary"
                          className="absolute top-6 right-6 opacity-0 group-hover/preview:opacity-100 transition-opacity bg-white/10 hover:bg-white/20 text-white"
                          onClick={() => {
                            navigator.clipboard.writeText(improvedPrompt || generatedPrompt);
                            toast.success("Copied to clipboard");
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                </div>
              </div>
            </TabsContent>

            <TabsContent value="templates">
              <TemplatesManager templates={templates} projects={projects} selectedProjectId={selectedProjectId} />
            </TabsContent>

            <TabsContent value="projects">
              <ProjectsManager projects={projects} />
            </TabsContent>

          </Tabs>

        </div>
      </div>
    </RequireSubscription>
  );
}