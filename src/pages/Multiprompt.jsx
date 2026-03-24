import React, { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";

// Custom Hooks
import { useMultipromptData } from "@/components/hooks/useMultipromptState";
import { useProjectSelection } from "@/components/hooks/useProjectSelection";
import { useTemplateSelection } from "@/components/hooks/useTemplateSelection";
import { useNewThoughtInput } from "@/components/hooks/useNewThoughtInput";
import { usePromptGeneration } from "@/components/hooks/usePromptGeneration";
import { useDragDropUpload } from "@/components/hooks/useDragDropUpload";

// UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Lightbulb, Layers, FileText, FolderOpen } from "lucide-react";

// Sub-components
import TemplatesManager from "@/components/multiprompt/TemplatesManager";
import ProjectsManager from "@/components/multiprompt/ProjectsManager";
import ProjectSelector from "@/components/multiprompt/ProjectSelector";
import TaskInputArea from "@/components/multiprompt/TaskInputArea";
import TasksList from "@/components/multiprompt/TasksList";
import SuccessBanner from "@/components/multiprompt/SuccessBanner";
import TasksColumn from "@/components/multiprompt/TasksColumn";
import PromptColumn from "@/components/multiprompt/PromptColumn";
import BrainstormPanel from "@/components/multiprompt/BrainstormPanel";
import AccessGuard from "../components/auth/AccessGuard";

// Inner component — only mounts when currentUser is confirmed.
// This prevents ALL hooks/queries from running unauthenticated.
function MultipromptContent({ currentUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // --- Data Queries ---
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return await base44.entities.Project.filter({ created_by: currentUser.email });
    },
    enabled: !!currentUser?.email,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return await base44.entities.PromptTemplate.filter({ created_by: currentUser.email });
    },
    enabled: !!currentUser?.email,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: aiSettings = [] } = useQuery({
    queryKey: ['aiSettings', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return await base44.entities.AISettings.filter({ created_by: currentUser.email });
    },
    enabled: !!currentUser?.email,
    retry: false,
  });

  // --- Custom Hooks ---
  const { selectedProjectId, setSelectedProjectId, selectedProject } = useProjectSelection(projects);

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      const demoProjects = projects.filter(p => p.name?.startsWith('DEMO:'));
      if (demoProjects.length > 0) {
        setSelectedProjectId(demoProjects[0].id);
      }
    }
  }, [projects, selectedProjectId, setSelectedProjectId]);

  const {
    thoughts, allThoughts, isLoading, selectedThoughtIds, setSelectedThoughtIds,
    createThought, updateThought, deleteThought, toggleSelection, selectAll, deselectAll, triggerVisionAnalysis
  } = useMultipromptData({
    currentUser,
    selectedProjectId,
    idsToAutoSelect: location.state?.retryThoughtIds,
    activeProjectIds: projects.map(p => p.id)
  });

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
    currentUser: { ...currentUser, ...aiSettings[0] },
    selectedProject,
    templates,
    selectedProjectId
  });

  // --- Derived State ---
  const maxThoughts = Infinity;
  const isLimitReached = false;
  const enableContextSuggestions = aiSettings[0]?.enable_context_suggestions !== false;

  // --- Local UI State ---
  const [showBanner, setShowBanner] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  const createItemMutation = useMutation({
    mutationFn: (data) => base44.entities.Item.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['allThoughtsCount'] });
      selectedThoughtIds.forEach(id => deleteThought.mutate(id));
      setSelectedThoughtIds([]);
      promptGeneration.setImprovedPrompt("");
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 8000);
      toast.success("Prompt saved to Vault");
    }
  });

  const handleAddThought = useCallback(() => {
    if (!currentUser?.email) {
      toast.error("Je moet ingelogd zijn");
      return;
    }
    if (!newThoughtInput.newThoughtContent.trim() && newThoughtInput.newThoughtScreenshots.length === 0) return;

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
  }, [currentUser, newThoughtInput, selectedProjectId, isLimitReached, maxThoughts, createThought, triggerVisionAnalysis]);

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
          promptGeneration.setImprovedPrompt("");
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



  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <SuccessBanner show={showBanner} />

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Multi-Prompt Builder
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
                <TabsTrigger value="brainstorm" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 text-slate-700 dark:text-slate-300"><Lightbulb className="w-4 h-4 mr-2" /> Brainstorm</TabsTrigger>
                <TabsTrigger value="templates" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 text-slate-700 dark:text-slate-300"><FileText className="w-4 h-4 mr-2" /> Templates</TabsTrigger>
                <TabsTrigger value="projects" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 text-slate-700 dark:text-slate-300"><FolderOpen className="w-4 h-4 mr-2" /> My Projects</TabsTrigger>
              </TabsList>
            </CardContent>
          </Card>

          <TabsContent value="brainstorm">
            <BrainstormPanel
              currentUser={currentUser}
              selectedProjectId={selectedProjectId}
            />
          </TabsContent>

          <TabsContent value="build">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TasksColumn
                thoughts={thoughts}
                projects={projects}
                isLoading={isLoading}
                selectedThoughtIds={selectedThoughtIds}
                toggleSelection={toggleSelection}
                selectAll={selectAll}
                deselectAll={deselectAll}
                selectedProject={selectedProject}
                selectedProjectId={selectedProjectId}
                isDropActive={isDropActive}
                dragHandlers={dragHandlers}
                newThoughtInput={newThoughtInput}
                handleAddThought={handleAddThought}
                onDragEnd={onDragEnd}
                deleteThought={deleteThought}
                updateThought={updateThought}
                triggerVisionAnalysis={triggerVisionAnalysis}
                currentUser={currentUser}
                enableContextSuggestions={enableContextSuggestions}
                isLimitReached={isLimitReached}
                maxThoughts={maxThoughts}
              />
              <PromptColumn
                templates={templates}
                templateSelection={templateSelection}
                selectedProject={selectedProject}
                promptGeneration={promptGeneration}
                saveSuccess={saveSuccess}
                handleQuickSave={handleQuickSave}
              />
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
  );
}

// Outer shell — only mounts MultipromptContent when authenticated & user is loaded.
// Prevents all hooks/queries from ever running without a valid user.
export default function Multiprompt() {
  const { currentUser, isAuthenticated, isLoadingAuth } = useAuth();

  return (
    <AccessGuard pageType="protected">
      {isLoadingAuth ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <MultipromptContent currentUser={currentUser} />
      )}
    </AccessGuard>
  );
}