import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import OCRDebugModal from "@/components/admin/OCRDebugModal";

// Custom Hooks
import { useMultipromptData } from "@/components/hooks/useMultipromptState";
import { useProjectSelection } from "@/components/hooks/useProjectSelection";
import { useTemplateSelection } from "@/components/hooks/useTemplateSelection";
import { useNewThoughtInput } from "@/components/hooks/useNewThoughtInput";
import { usePromptGeneration } from "@/components/hooks/usePromptGeneration";
import { useDragDropUpload } from "@/components/hooks/useDragDropUpload";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Lightbulb, Layers, FileText, FolderOpen, CheckCircle2 } from "lucide-react";

// Sub-components

import TemplatesManager from "@/components/multiprompt/TemplatesManager";
import ProjectsManager from "@/components/multiprompt/ProjectsManager";
import ProjectSelector from "@/components/multiprompt/ProjectSelector";
import TaskInputArea from "@/components/multiprompt/TaskInputArea";
import TasksList from "@/components/multiprompt/TasksList";
import TemplateSelector from "@/components/multiprompt/TemplateSelector";
import PromptPreview from "@/components/multiprompt/PromptPreview";
import SuccessBanner from "@/components/multiprompt/SuccessBanner";
import TrialBanner from "@/components/dashboard/TrialBanner";
import { projectColors, projectBorderColors } from "@/components/lib/constants";
import AccessGuard from "../components/auth/AccessGuard";

export default function Multiprompt() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // --- Data Queries ---
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // HARDENED: Entity queries can fail without affecting access
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentUser?.email],
    queryFn: async () => {
      try {
        if (!currentUser?.email) return [];
        return await base44.entities.Project.filter({ created_by: currentUser.email });
      } catch (error) {
        console.warn('[Multiprompt] Project fetch failed (non-blocking):', error.message);
        return []; // Graceful fallback
      }
    },
    enabled: !!currentUser?.email,
    retry: false,
    staleTime: 5 * 60 * 1000, // Cache 5min to prevent slow reloads
  });

  // HARDENED: Template fetch failures don't block UI
  const { data: templates = [] } = useQuery({
    queryKey: ['templates', currentUser?.email],
    queryFn: async () => {
      try {
        if (!currentUser?.email) return [];
        return await base44.entities.PromptTemplate.filter({ created_by: currentUser.email });
      } catch (error) {
        console.warn('[Multiprompt] Template fetch failed (non-blocking):', error.message);
        return [];
      }
    },
    enabled: !!currentUser?.email,
    retry: false,
    staleTime: 5 * 60 * 1000, // Cache 5min
  });

  // HARDENED: AISettings can fail without blocking page
  const { data: aiSettings = [] } = useQuery({
    queryKey: ['aiSettings', currentUser?.email],
    queryFn: async () => {
      try {
        if (!currentUser?.email) return [];
        return await base44.entities.AISettings.filter({ created_by: currentUser.email });
      } catch (error) {
        console.warn('[Multiprompt] AISettings fetch failed (non-blocking):', error.message);
        return []; // Graceful fallback - use defaults
      }
    },
    enabled: !!currentUser?.email,
    retry: false,
  });

  const { data: subscriptionPlans = [] } = useQuery({
    queryKey: ['subscriptionPlans'],
    queryFn: async () => {
      try {
        return await base44.entities.SubscriptionPlan.list();
      } catch (error) {
        console.warn('[Multiprompt] SubscriptionPlan fetch failed (non-blocking):', error.message);
        return [];
      }
    },
    retry: false,
    staleTime: 10 * 60 * 1000, // Cache 10min (rarely changes)
  });

  // --- Custom Hooks ---
  const { selectedProjectId, setSelectedProjectId, selectedProject } = useProjectSelection(projects);

  // TASK-1: Auto-select first demo project on initial load
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      // Check if user has demo projects (name starts with "DEMO:")
      const demoProjects = projects.filter(p => p.name?.startsWith('DEMO:'));
      if (demoProjects.length > 0) {
        // Select the first demo project
        setSelectedProjectId(demoProjects[0].id);
      }
    }
  }, [projects, selectedProjectId, setSelectedProjectId]);

  // Handle Stripe checkout success and verify session
  useEffect(() => {
    const verifyStripeCheckout = async () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get("session_id");
      
      if (sessionId) {
        try {
          const result = await base44.functions.invoke("verifyStripeSession", { sessionId });
          if (result.data?.success) {
            const status = result.data.status;
            const message = status === 'trialing' 
              ? "✅ Free trial activated! Welcome to Promptster."
              : "✅ Subscription activated! Welcome to Promptster.";
            
            toast.success(message);
            
            // Refresh user data
            await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
            
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (error) {
          console.error("Stripe verification error:", error);
        }
      }
    };

    verifyStripeCheckout();
  }, [queryClient]);

  const {
    thoughts, allThoughts, isLoading, selectedThoughtIds, setSelectedThoughtIds,
    createThought, updateThought, deleteThought, toggleSelection, selectAll, deselectAll, triggerVisionAnalysis
  } = useMultipromptData({
    currentUser,
    selectedProjectId,
    idsToAutoSelect: location.state?.retryThoughtIds,
    activeProjectIds: projects.map(p => p.id) // Only count tasks from visible projects
  });

  // Update getProjectCount with allThoughts from useMultipromptData
  // Note: allThoughts already filtered for is_deleted:false by canonical query
  const getProjectCount = useCallback((pid) => {
    return (allThoughts || []).filter(t => t.project_id === pid).length;
  }, [allThoughts]);

  const templateSelection = useTemplateSelection(selectedProjectId, selectedProject);

  const newThoughtInput = useNewThoughtInput(selectedProjectId);

  const { isDropActive, dragHandlers } = useDragDropUpload(
    newThoughtInput.newThoughtScreenshots,
    newThoughtInput.setNewThoughtScreenshots
  );

  const promptGeneration = usePromptGeneration({
    thoughts, selectedThoughtIds,
    startTemplateId: templateSelection.startTemplateId,
    endTemplateId: templateSelection.endTemplateId,
    includePersonalPrefs: templateSelection.includePersonalPrefs,
    includeProjectConfig: templateSelection.includeProjectConfig,
    currentUser, selectedProject, templates, selectedProjectId
  });

  // --- Derived State ---
  const currentPlan = subscriptionPlans.find(p => p.id === currentUser?.plan_id) || {};
  const maxThoughts = currentPlan.max_thoughts || 10;
  const isLimitReached = currentUser?.role !== 'admin' && thoughts.length >= maxThoughts;
  const enableContextSuggestions = aiSettings[0]?.enable_context_suggestions !== false;

  // --- Local UI State ---
  const [groupBy, setGroupBy] = useState("component");
  const [showBanner, setShowBanner] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showOCRDebug, setShowOCRDebug] = useState(false);
  const [ocrDebugUrl, setOcrDebugUrl] = useState(null);
  const [taskSearchQuery, setTaskSearchQuery] = useState("");

  // --- Generate Checklist Helper ---
  const generateChecklist = useCallback(() => {
    return thoughts
      .filter(t => selectedThoughtIds.includes(t.id))
      .map(t => ({
        task_name: t.content.substring(0, 50) + "...",
        full_description: t.content,
        status: 'open',
        is_checked: false
      }));
  }, [thoughts, selectedThoughtIds]);

  // --- Create Item Mutation ---
  const createItemMutation = useMutation({
    mutationFn: (data) => base44.entities.Item.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      // TASK-2: Reset allThoughtsCount badge after save
      queryClient.invalidateQueries({ queryKey: ['allThoughtsCount'] });
      selectedThoughtIds.forEach(id => deleteThought.mutate(id));
      setSelectedThoughtIds([]);
      promptGeneration.setImprovedPrompt("");
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 8000);
      toast.success("Prompt saved to Vault");
    }
  });

  // --- Handlers ---
  const handleAddThought = useCallback(() => {
    if (!newThoughtInput.newThoughtContent.trim() && newThoughtInput.newThoughtScreenshots.length === 0) return;
    if (!currentUser?.email || isLimitReached) {
      toast.error(isLimitReached ? `Limit reached: Max ${maxThoughts} tasks allowed` : "Je moet ingelogd zijn");
      return;
    }

    createThought.mutate({
      content: newThoughtInput.newThoughtContent.trim(),
      project_id: selectedProjectId || null,
      is_deleted: false,
      screenshot_ids: newThoughtInput.newThoughtScreenshots,
      is_selected: true,
      focus_type: newThoughtInput.newThoughtFocus,
      target_page: newThoughtInput.newThoughtContext.target_page,
      target_component: newThoughtInput.newThoughtContext.target_component,
      target_domain: newThoughtInput.newThoughtContext.target_domain,
      ai_prediction: newThoughtInput.newThoughtContext.ai_prediction,
      created_by: currentUser.email,
      vision_analysis: newThoughtInput.newThoughtScreenshots.length > 0 ? { status: 'pending', results: [] } : undefined
    }, {
      onSuccess: (newThought) => {
        if (newThought?.id && newThoughtInput.newThoughtScreenshots.length > 0) {
          triggerVisionAnalysis(newThought.id, newThoughtInput.newThoughtScreenshots);
        }
        newThoughtInput.resetInput();
        toast.success("Task added");
      }
    });
  }, [newThoughtInput, selectedProjectId, isLimitReached, maxThoughts, createThought, triggerVisionAnalysis, currentUser]);

  const handleQuickSave = useCallback(async () => {
    const content = promptGeneration.improvedPrompt || promptGeneration.generatedPrompt;
    navigator.clipboard.writeText(content);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);

    const timestamp = new Date().toLocaleString('nl-NL', { 
      day: '2-digit', month: '2-digit', year: '2-digit', 
      hour: '2-digit', minute: '2-digit' 
    }).replace(',', '');
    const autoTitle = `${selectedProject?.name || 'Multi-Task'} ${timestamp}`;

    const selectedItems = thoughts.filter(t => selectedThoughtIds.includes(t.id));
    const allScreenshotIds = [...new Set(selectedItems.flatMap(t => t.screenshot_ids || []))];

    createItemMutation.mutate({
      title: autoTitle,
      type: "multiprompt",
      content: content,
      used_thoughts: selectedThoughtIds,
      project_id: selectedProjectId || null,
      task_checks: generateChecklist(),
      start_template_id: templateSelection.startTemplateId || null,
      end_template_id: templateSelection.endTemplateId || null,
      screenshot_ids: allScreenshotIds,
      status: "open"
    }, {
      onSuccess: (newItem) => {
        if (newItem?.id) {
          navigate(createPageUrl("Checks"));
          toast.success("Prompt saved! Sent to Vault Checks.");
        }
      }
    });
  }, [promptGeneration, selectedThoughtIds, thoughts, selectedProjectId, selectedProject, templateSelection, generateChecklist, createItemMutation, navigate]);

  const onDragEnd = useCallback((result) => {
    if (result.destination?.droppableId.startsWith('project-')) {
      const targetId = result.destination.droppableId.replace('project-', '');
      updateThought.mutate({ 
        id: result.draggableId, 
        data: { project_id: targetId === 'none' ? null : targetId } 
      });
      toast.success("Task moved to project");
    }
  }, [updateThought]);

  const filteredThoughts = useMemo(() => {
    let filtered = thoughts;
    
    // Apply search filter
    if (taskSearchQuery.trim()) {
      const query = taskSearchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.content?.toLowerCase().includes(query) ||
        t.target_page?.toLowerCase().includes(query) ||
        t.target_component?.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    return [...filtered].sort((a, b) => {
      if (groupBy === 'component') return (a.target_component || "").localeCompare(b.target_component || "");
      if (groupBy === 'page') return (a.target_page || "").localeCompare(b.target_page || "");
      return 0;
    });
  }, [thoughts, groupBy, taskSearchQuery]);

  // --- Render ---
  return (
    <AccessGuard pageType="protected">
    <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <TrialBanner />
          <SuccessBanner show={showBanner} />

          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Multi-Task Builder
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Collect thoughts and build comprehensive multi-task prompts</p>
          </div>

          <ProjectSelector
            projects={projects}
            selectedProjectId={selectedProjectId}
            selectedProject={selectedProject}
            onSelectProject={setSelectedProjectId}
            allThoughtsCount={allThoughts.length}
            getProjectCount={getProjectCount}
          />

          <Tabs defaultValue="build" className="space-y-6">
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="pt-4 pb-2">
            <TabsList className="bg-slate-100 dark:bg-slate-800">
              <TabsTrigger value="build" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 text-slate-700 dark:text-slate-300"><Layers className="w-4 h-4 mr-2" /> Build Prompt</TabsTrigger>
              <TabsTrigger value="templates" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 text-slate-700 dark:text-slate-300"><FileText className="w-4 h-4 mr-2" /> Templates</TabsTrigger>
              <TabsTrigger value="projects" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 text-slate-700 dark:text-slate-300"><FolderOpen className="w-4 h-4 mr-2" /> My Projects</TabsTrigger>
            </TabsList>
              </CardContent>
            </Card>

            <TabsContent value="build">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT COLUMN */}
                <div className="space-y-4">
                  <Card className={`bg-white dark:bg-slate-800 ${!selectedProjectId ? 'border-2 border-slate-800 dark:border-slate-600' : selectedProject ? `border-2 ${projectBorderColors[selectedProject.color]}` : 'border-slate-200 dark:border-slate-700'}`}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                        <Lightbulb className="w-5 h-5 text-yellow-500" />
                        Tasks {selectedProject && <Badge className={projectColors[selectedProject.color]}>{selectedProject.name}</Badge>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <TaskInputArea
                        selectedProject={selectedProject}
                        isDropActive={isDropActive}
                        dragHandlers={dragHandlers}
                        isLimitReached={isLimitReached}
                        maxThoughts={maxThoughts}
                        {...newThoughtInput}
                        onContentChange={newThoughtInput.setNewThoughtContent}
                        onAddThought={handleAddThought}
                        onScreenshotsChange={newThoughtInput.setNewThoughtScreenshots}
                        onFocusChange={newThoughtInput.setNewThoughtFocus}
                        onContextChange={newThoughtInput.setNewThoughtContext}
                        selectedProjectId={selectedProjectId}
                        enableContextSuggestions={enableContextSuggestions}
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleAddThought} disabled={isLimitReached} className={`flex-1 ${!selectedProjectId ? 'bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600' : selectedProject ? projectColors[selectedProject.color] : 'bg-slate-800'}`}>
                          <Plus className="w-4 h-4 mr-2" /> {isLimitReached ? `Limit Reached (${maxThoughts})` : 'Task'}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-3 px-1 flex-wrap">
                        <div className="flex gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                          <button onClick={() => selectAll(filteredThoughts.map(t => t.id))} className="hover:text-indigo-600 dark:hover:text-indigo-400">Select All</button>
                          <span className="text-slate-300 dark:text-slate-600">|</span>
                          <button onClick={() => deselectAll(filteredThoughts.map(t => t.id))} className="hover:text-indigo-600 dark:hover:text-indigo-400">Deselect All</button>
                        </div>
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            placeholder="Search tasks..."
                            className="h-8 px-3 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 w-[180px]"
                            onChange={(e) => setTaskSearchQuery(e.target.value)}
                          />
                          <Select value={groupBy} onValueChange={setGroupBy}>
                            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="date">By Date</SelectItem>
                              <SelectItem value="page">By Page</SelectItem>
                              <SelectItem value="component">By Component</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <TasksList
                        thoughts={filteredThoughts}
                        projects={projects}
                        isLoading={isLoading}
                        selectedThoughtIds={selectedThoughtIds}
                        onToggleSelect={toggleSelection}
                        onDelete={deleteThought.mutate}
                        onUpdateContent={(id, c) => updateThought.mutate({ id, data: { content: c } })}
                        onUpdateScreenshots={(id, s) => {
                          updateThought.mutate({ id, data: { screenshot_ids: s } });
                          if (s && s.length > 0) triggerVisionAnalysis(id, s);
                        }}
                        onDebugScreenshot={(url) => {
                          if (currentUser?.role === 'admin') {
                            setOcrDebugUrl(url);
                            setShowOCRDebug(true);
                          }
                        }}
                        onUpdateFocus={(id, f) => updateThought.mutate({ id, data: { focus_type: f } })}
                        onUpdateContext={(id, ctx) => updateThought.mutate({ 
                          id, 
                          data: { 
                            target_page: ctx.target_page,
                            target_component: ctx.target_component,
                            target_domain: ctx.target_domain
                          } 
                        })}
                        onDragEnd={onDragEnd}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-4">
                  <TemplateSelector
                    templates={templates}
                    {...templateSelection}
                    onStartTemplateChange={templateSelection.setStartTemplateId}
                    onEndTemplateChange={templateSelection.setEndTemplateId}
                    selectedProject={selectedProject}
                  />
                  <div className="flex gap-4 text-sm px-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`relative w-5 h-5 rounded border-2 transition-all ${
                        templateSelection.includePersonalPrefs 
                          ? `${selectedProject ? projectBorderColors[selectedProject.color] : 'border-indigo-600'} ${selectedProject ? projectColors[selectedProject.color] : 'bg-indigo-600'}` 
                          : 'border-slate-300 bg-white group-hover:border-slate-400'
                      }`}>
                        {templateSelection.includePersonalPrefs && (
                          <CheckCircle2 className="absolute inset-0 w-full h-full text-white p-0.5" strokeWidth={3} />
                        )}
                      </div>
                      <Checkbox 
                        checked={templateSelection.includePersonalPrefs} 
                        onCheckedChange={templateSelection.setIncludePersonalPrefs}
                        className="sr-only"
                      />
                      <a 
                        href={createPageUrl("AIBackoffice") + "#personal-preferences"}
                        className="font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Personal Prefs
                      </a>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`relative w-5 h-5 rounded border-2 transition-all ${
                        templateSelection.includeProjectConfig 
                          ? `${selectedProject ? projectBorderColors[selectedProject.color] : 'border-indigo-600'} ${selectedProject ? projectColors[selectedProject.color] : 'bg-indigo-600'}` 
                          : 'border-slate-300 bg-white group-hover:border-slate-400'
                      }`}>
                        {templateSelection.includeProjectConfig && (
                          <CheckCircle2 className="absolute inset-0 w-full h-full text-white p-0.5" strokeWidth={3} />
                        )}
                      </div>
                      <Checkbox 
                        checked={templateSelection.includeProjectConfig} 
                        onCheckedChange={templateSelection.setIncludeProjectConfig}
                        className="sr-only"
                      />
                      <a 
                        href={createPageUrl("AIBackoffice") + "#project-config"}
                        className="font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Project Config
                      </a>
                    </label>
                  </div>
                  <PromptPreview
                    {...promptGeneration}
                    onImprove={promptGeneration.handleImprovePrompt}
                    saveSuccess={saveSuccess}
                    onQuickSave={handleQuickSave}
                  />
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

        {/* TASK-5: OCR Debug Modal - Admin Only */}
        {currentUser?.role === 'admin' && (
          <OCRDebugModal
            isOpen={showOCRDebug}
            onClose={() => setShowOCRDebug(false)}
            screenshotUrl={ocrDebugUrl}
          />
        )}
      </div>
    </AccessGuard>
  );
}