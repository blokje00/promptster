import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Plus, 
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
  Settings,
  Pencil,
  CheckSquare,
  Square,
  Image as ImageIcon,
  User,
  Cog,
  Lightbulb,
  Layers
} from "lucide-react";
import { Link } from "react-router-dom";
// Language translations removed - all text in English

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
 * Multi-Step Builder pagina component.
 * Stelt gebruikers in staat om meerdere taken te verzamelen
 * en om te zetten naar gestructureerde prompts.
 * 
 * @component
 * @example
 * <Multiprompt />
 */
export default function Multiprompt() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  // Removed useLanguage - all text is now hardcoded in English
  
  // Check for incoming navigation state (from TaskChecklist retry)
  const incomingProjectId = location.state?.projectId ?? null;
  const retryThoughtIds = location.state?.retryThoughtIds ?? [];
  
  // Get current user first (needed for autosave keys)
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return user;
    },
  });

  // Selected project state - prefer incoming projectId from navigation state
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    return incomingProjectId ?? localStorage.getItem('lastSelectedProjectId') ?? "";
  });

  // Force refresh when project selection changes
  useEffect(() => {
    // Persist selection
    if (selectedProjectId) {
      localStorage.setItem('lastSelectedProjectId', selectedProjectId);
    } else {
      localStorage.setItem('lastSelectedProjectId', "");
    }
    
    // Invalidate to ensure we get fresh data for the new view
    if (currentUser?.email) {
      queryClient.invalidateQueries({ 
        queryKey: ['thoughts', currentUser.email, selectedProjectId || 'all'] 
      });
    }
  }, [selectedProjectId, currentUser?.email, queryClient]);

  // Luister naar storage events voor cross-page synchronisatie (bijv. na restore in RecycleBin)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'lastSelectedProjectId' && e.newValue) {
        setSelectedProjectId(e.newValue);
        // Force refetch
        if (currentUser?.email) {
          queryClient.resetQueries({ 
            queryKey: ['thoughts', currentUser.email, e.newValue] 
          });
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentUser?.email, queryClient]);

  // Autosave for create task field using generic hook
  const { 
    value: newThought, 
    setValue: setNewThought, 
    resetValue: resetNewThought 
  } = useAutosaveField({
    storageKey: `promptster:multiprompt:createTask:${selectedProjectId || 'all'}:${currentUser?.id ?? 'anon'}`,
    initialValue: "",
    debounceMs: 500,
    enabled: !!currentUser?.id,
  });
  const [newThoughtImages, setNewThoughtImages] = useState([]);
  const [isUploadingNewImage, setIsUploadingNewImage] = useState(false);
  const [newThoughtFocus, setNewThoughtFocus] = useState("both");
  const [newThoughtContext, setNewThoughtContext] = useState({
    target_page: null,
    target_component: null,
    target_domain: null,
    ai_prediction: null
  });
  const [groupBy, setGroupBy] = useState("component");
  const newThoughtInputRef = useRef(null);
  const newThoughtFileInputRef = useRef(null);
  
  const [builderInstanceKey, setBuilderInstanceKey] = useState(Date.now()); // Force remount key
  const [startTemplateId, setStartTemplateId] = useState("");
  const [endTemplateId, setEndTemplateId] = useState("");
  const [customStartText, setCustomStartText] = useState("");
  const [customEndText, setCustomEndText] = useState("");
  const [promptTitle, setPromptTitle] = useState("");
  const [copied, setCopied] = useState(false);
  const [improvedPrompt, setImprovedPrompt] = useState("");
  const [isImproving, setIsImproving] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

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
  const [editProjectConfig, setEditProjectConfig] = useState("");
  const [editProjectMapping, setEditProjectMapping] = useState("");
  const [editMappingError, setEditMappingError] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Post-copy control flow
  const [showControlDialog, setShowControlDialog] = useState(false);
  const [taskChecks, setTaskChecks] = useState([]);
  const [controlNotes, setControlNotes] = useState("");

  const { data: dbThoughts = [] } = useQuery({
    queryKey: ['thoughts', currentUser?.email, selectedProjectId || 'all'],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      
      // Guarantee Visibility: Override client-side filters for deletion
      const filter = {
        $or: [
          { is_deleted: false },
          { is_deleted: null }, 
          { is_deleted: { $exists: false } }
        ]
      };

      // Force-Assign Project Logic in Query
      // If a project is selected, we MUST fetch tasks for that project.
      if (selectedProjectId) {
        filter.project_id = selectedProjectId;
        // Note: We deliberately DO NOT filter by created_by when in a project, 
        // to see team tasks and ensure retries (which might have different owner metadata) are seen.
      } else {
        // No project selected -> Show "My Personal/Global" tasks
        filter.created_by = currentUser.email;
        // Optional: We might want to explicitly exclude project tasks here to avoid clutter, 
        // but usually "All Projects" view might show everything. 
        // Current logic: Show my tasks that are NOT in a project (or just my tasks).
        // To be safe and follow "Guarantee Visibility", we keep it simple.
      }

      const result = await base44.entities.Thought.filter(filter, "-created_date");
      return result || [];
    },
    enabled: !!currentUser?.email,
  });

  // Use custom hook for thought state
  const {
    localThoughts,
    selectedThoughts,
    setLocalThoughts,
    setSelectedThoughts,
    createThought,
    deleteThought,
    updateThought,
    toggleSelection
  } = useThoughts({ 
    dbThoughts, 
    selectedProjectId,
    currentUser,
    idsToAutoSelect: retryThoughtIds
  });



  // Force refetch bij mount om eventuele restores van RecycleBin op te pikken
  useEffect(() => {
    if (currentUser?.email) {
      // Kleine delay om race conditions te voorkomen
      const timer = setTimeout(() => {
        queryClient.refetchQueries({ 
          queryKey: ['thoughts', currentUser.email, selectedProjectId || 'all'],
          exact: true 
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentUser?.email, selectedProjectId, queryClient]);

  const { data: templates = [] } = useQuery({
    queryKey: ['templates', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const result = await base44.entities.PromptTemplate.filter({ created_by: currentUser.email });
      return result || [];
    },
    enabled: !!currentUser?.email,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const result = await base44.entities.Project.filter({ created_by: currentUser.email });
      return result || [];
    },
    enabled: !!currentUser?.email,
  });

  const { data: aiSettings = [] } = useQuery({
    queryKey: ['aiSettings', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const result = await base44.entities.AISettings.filter({ created_by: currentUser.email });
      return result || [];
    },
    enabled: !!currentUser?.email,
  });

  // Edit template state
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editTemplateName, setEditTemplateName] = useState("");
  const [editTemplateContent, setEditTemplateContent] = useState("");
  const [editTemplateDialogOpen, setEditTemplateDialogOpen] = useState(false);

  // Handle incoming navigation state from TaskChecklist retry
  // Clear navigation state after processing to prevent re-triggering
  useEffect(() => {
    if (!incomingProjectId) return;
    setSelectedProjectId(incomingProjectId);
    localStorage.setItem("lastSelectedProjectId", incomingProjectId);
    // Clear navigation state to prevent re-triggering on refresh
    navigate(location.pathname, { replace: true, state: null });
  }, [incomingProjectId, navigate, location.pathname]);



  // Sanity check for empty results when expecting retries
  useEffect(() => {
    if (retryThoughtIds.length > 0 && dbThoughts.length === 0 && !queryClient.isFetching()) {
      console.warn("Expected retry tasks but query returned empty. Check filters.");
    }
  }, [retryThoughtIds, dbThoughts, queryClient]);

  // Clear autosave helper
  const clearThoughtDraft = () => {
    resetNewThought();
  };

  /**
   * Maakt nieuwe thought aan en wist draft.
   * @param {Object} data - Thought data
   */
  const handleCreateThought = (data) => {
    createThought.mutate(data, {
      onSuccess: () => {
        resetNewThought(); // Clear autosave via hook
        setNewThoughtImages([]);
        toast.success("Task added");
      }
    });
  };

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.PromptTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setNewTemplateName("");
      setNewTemplateContent("");
      toast.success("Template saved");
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.PromptTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success("Template deleted");
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PromptTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setEditTemplateDialogOpen(false);
      setEditingTemplate(null);
      toast.success("Template updated");
    },
  });

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setEditTemplateName(template.name);
    setEditTemplateContent(template.content);
    setEditTemplateDialogOpen(true);
  };

  const handleSaveEditTemplate = () => {
    if (!editTemplateName.trim() || !editTemplateContent.trim()) return;
    updateTemplateMutation.mutate({
      id: editingTemplate.id,
      data: {
        name: editTemplateName.trim(),
        content: editTemplateContent.trim()
      }
    });
  };

  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);

  const createProjectMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setNewProjectName("");
      setNewProjectDescription("");
      setNewProjectDialogOpen(false);
      toast.success("Project added");
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (selectedProjectId === editingProject?.id) setSelectedProjectId("");
      toast.success("Project deleted");
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditDialogOpen(false);
      setEditingProject(null);
      toast.success("Project updated");
    },
  });

  const createMultipromptMutation = useMutation({
    mutationFn: (data) => base44.entities.Item.create(data),
    onSuccess: (newItem) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success("Multi-Step saved!");
      // Reset builder state locally just in case
      resetBuilder();
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
      await Promise.all(thoughtIds.map(id => base44.entities.Thought.delete(id)));
    },
    onMutate: (thoughtIds) => {
      // Store for potential rollback
      const previousThoughts = [...localThoughts];
      const previousSelected = [...selectedThoughts];
      // Immediately clear local thoughts
      setLocalThoughts([]);
      setSelectedThoughts([]);
      return { previousThoughts, previousSelected };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thoughts'] });
      toast.success("Tasks deleted!");
      resetBuilder();
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousThoughts) {
        setLocalThoughts(context.previousThoughts);
        setSelectedThoughts(context.previousSelected);
      }
      toast.error("Delete failed");
    },
  });

  /**
   * Hard reset van alle thought-gerelateerde state.
   * Templates worden NOOIT gereset - die blijven altijd behouden.
   */
  const resetBuilder = () => {
    // Reset ALL thought-related states via hook
    setLocalThoughts([]);
    setSelectedThoughts([]);
    
    setNewThought("");
    setNewThoughtImages([]);
    setNewThoughtFocus("both");
    setNewThoughtContext({
      target_page: null,
      target_component: null,
      target_domain: null,
      ai_prediction: null
    });
    setGroupBy("component");
    
    // Reset prompt generation state
    setCustomStartText("");
    setCustomEndText("");
    setPromptTitle("");
    setImprovedPrompt("");
    
    // Reset control dialog state
    setShowControlDialog(false);
    setTaskChecks([]);
    setControlNotes("");
    
    // Force remount of entire builder UI to clear any cached state
    setBuilderInstanceKey(Date.now());
  };

  const handleAddThought = async () => {
    if (!newThought.trim() && newThoughtImages.length === 0) return;
    
    handleCreateThought({ 
      content: newThought.trim(),
      project_id: selectedProjectId || null,
      image_urls: newThoughtImages,
      is_selected: true,
      focus_type: newThoughtFocus,
      target_page: newThoughtContext.target_page,
      target_component: newThoughtContext.target_component,
      target_domain: newThoughtContext.target_domain,
      ai_prediction: newThoughtContext.ai_prediction
    });
    
    setNewThoughtImages([]);
    setNewThoughtFocus("both");
    setNewThoughtContext({
      target_page: null,
      target_component: null,
      target_domain: null,
      ai_prediction: null
    });
  };

  // Handle paste in new thought textarea
  const handleNewThoughtPaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await uploadNewThoughtImage(file);
        }
        break;
      }
    }
  };

  /**
   * Upload afbeelding of PDF naar Supabase.
   * @param {File} file - Het te uploaden bestand
   */
  const uploadNewThoughtImage = async (file) => {
    if (!file || (!file.type.startsWith('image/') && file.type !== 'application/pdf')) {
      toast.error("Only images and PDFs are allowed");
      return;
    }
    setIsUploadingNewImage(true);
    try {
      const file_url = await uploadImageToSupabase(file);
      setNewThoughtImages(prev => [...prev, file_url]);
      toast.success("File added");
    } catch (error) {
      console.error(error);
      toast.error("Could not upload file");
    } finally {
      setIsUploadingNewImage(false);
    }
  };

  /**
   * Handler voor drag-and-drop van afbeeldingen en PDFs.
   * @param {DragEvent} e - Drop event
   */
  const handleNewThoughtDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      await uploadNewThoughtImage(file);
    }
  };

  // Update handlers using hook
  const handleUpdateThoughtImages = (thoughtId, newImages) => {
    updateThought(thoughtId, { image_urls: newImages });
  };

  const handleUpdateThoughtContent = (thoughtId, newContent) => {
    updateThought(thoughtId, { content: newContent });
  };

  /**
   * Update focus type van een thought met rollback bij fout.
   * @param {string} thoughtId - ID van de thought
   * @param {string} newFocus - Nieuwe focus type
   */
  const handleUpdateThoughtFocus = async (thoughtId, newFocus) => {
    const previousFocus = localThoughts.find(t => t.id === thoughtId)?.focus_type;
    updateThought(thoughtId, { focus_type: newFocus });
    
    try {
      await base44.entities.Thought.update(thoughtId, { focus_type: newFocus });
    } catch (error) {
      // Rollback on error
      updateThought(thoughtId, { focus_type: previousFocus });
      toast.error("Update failed");
    }
  };

  /**
   * Update context van een thought met rollback bij fout.
   * @param {string} thoughtId - ID van de thought
   * @param {Object} newContext - Nieuwe context object
   */
  const handleUpdateThoughtContext = async (thoughtId, newContext) => {
    const thought = localThoughts.find(t => t.id === thoughtId);
    const previousContext = {
      target_page: thought?.target_page,
      target_component: thought?.target_component,
      target_domain: thought?.target_domain,
      ai_prediction: thought?.ai_prediction
    };
    
    updateThought(thoughtId, {
      target_page: newContext.target_page,
      target_component: newContext.target_component,
      target_domain: newContext.target_domain,
      ai_prediction: newContext.ai_prediction
    });
    
    try {
      await base44.entities.Thought.update(thoughtId, {
        target_page: newContext.target_page,
        target_component: newContext.target_component,
        target_domain: newContext.target_domain,
        ai_prediction: newContext.ai_prediction
      });
    } catch (error) {
      // Rollback on error
      updateThought(thoughtId, previousContext);
      toast.error("Update failed");
    }
  };

  /**
   * Verplaats thought naar ander project met rollback bij fout.
   * @param {string} thoughtId - ID van de thought
   * @param {string} newProjectId - ID van nieuw project
   */
  const handleMoveThoughtToProject = async (thoughtId, newProjectId) => {
    const previousProjectId = localThoughts.find(t => t.id === thoughtId)?.project_id;
    updateThought(thoughtId, { project_id: newProjectId });
    
    try {
      await base44.entities.Thought.update(thoughtId, { project_id: newProjectId });
      queryClient.invalidateQueries({ queryKey: ['thoughts'] });
      toast.success("Task moved to project");
    } catch (error) {
      // Rollback on error
      updateThought(thoughtId, { project_id: previousProjectId });
      toast.error("Update failed");
    }
  };

  // Save all thoughts to database (for "Controle opslaan")
  const [isSavingAll, setIsSavingAll] = useState(false);
  
  /**
   * Slaat alle lokale thoughts op naar de database.
   * Gebruikt Promise.allSettled voor parallelle verwerking met foutafhandeling.
   */
  const handleSaveAllThoughts = async () => {
    setIsSavingAll(true);
    try {
      const updatePromises = localThoughts.map(thought => 
        base44.entities.Thought.update(thought.id, {
          content: thought.content || "",
          image_urls: thought.image_urls || [],
          is_selected: selectedThoughts.includes(thought.id),
          project_id: thought.project_id
        })
      );

      const results = await Promise.allSettled(updatePromises);
      
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        console.error("Sommige updates faalden:", failures);
        toast.warning(`${localThoughts.length - failures.length}/${localThoughts.length} tasks saved`);
      } else {
        toast.success("All tasks saved!");
      }
      
      queryClient.invalidateQueries({ queryKey: ['thoughts'] });
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Could not save all tasks");
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleAddTemplate = () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) return;
    createTemplateMutation.mutate({
      name: newTemplateName.trim(),
      type: newTemplateType,
      content: newTemplateContent.trim(),
      project_id: selectedProjectId || null
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
    setEditProjectConfig(project.technical_config_markdown || "");
    setEditProjectMapping(project.component_mapping ? JSON.stringify(project.component_mapping, null, 2) : "");
    setEditMappingError("");
    setEditDialogOpen(true);
  };

  const handleSaveEditProject = () => {
    if (!editProjectName.trim()) return;
    
    // Parse component mapping if provided
    let componentMapping = null;
    if (editProjectMapping.trim()) {
      try {
        componentMapping = JSON.parse(editProjectMapping);
        setEditMappingError("");
      } catch (e) {
        setEditMappingError("Invalid JSON format");
        return;
      }
    }
    
    updateProjectMutation.mutate({
      id: editingProject.id,
      data: {
        name: editProjectName.trim(),
        color: editProjectColor,
        description: editProjectDescription.trim(),
        technical_config_markdown: editProjectConfig.trim(),
        component_mapping: componentMapping
      }
    });
  };

  const generateMappingPrompt = (projectName) => {
    return `Ik werk aan het project "${projectName}" en wil een component mapping maken voor mijn prompt builder tool.

Geef me een JSON object met de volgende structuur:
- Keys zijn pagina namen (bijv. "Dashboard", "Settings", "UserProfile")
- Values zijn arrays met component namen die op die pagina gebruikt worden

Analyseer het project en geef me een realistische mapping van alle pagina's en hun componenten.

Antwoord ALLEEN met valide JSON in dit format:
{
  "PaginaNaam1": ["Component1", "Component2"],
  "PaginaNaam2": ["Component3", "Component4"]
}

Geen uitleg, alleen de JSON.`;
  };

  /**
   * Kopieert mapping prompt en toont instructies.
   */
  const handleCopyMappingPrompt = () => {
    if (!editingProject) return;
    const prompt = generateMappingPrompt(editingProject.name);
    navigator.clipboard.writeText(prompt);
    toast.success("✓ Copied! Paste in AI, copy JSON back and paste below", { duration: 5000 });
  };

  // toggleThoughtSelection is now toggleSelection from hook

  const toggleSelectAll = () => {
    const allFilteredIds = filteredThoughts.map(t => t.id);
    const allSelected = allFilteredIds.every(id => selectedThoughts.includes(id));
    
    if (allSelected) {
      // Deselect all filtered thoughts
      setSelectedThoughts(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      // Select all filtered thoughts
      setSelectedThoughts(prev => [...new Set([...prev, ...allFilteredIds])]);
    }
  };

  const handleSelectedThoughtsDragEnd = (result) => {
    if (!result.destination) return;
    const newSelected = [...selectedThoughts];
    const [removed] = newSelected.splice(result.source.index, 1);
    newSelected.splice(result.destination.index, 0, removed);
    setSelectedThoughts(newSelected);
  };

  const handleThoughtsDragEnd = (result) => {
    // Check if dropped on a project zone
    if (result.destination?.droppableId.startsWith('project-')) {
      const projectId = result.destination.droppableId.replace('project-', '');
      const thoughtId = result.draggableId;
      handleMoveThoughtToProject(thoughtId, projectId === 'none' ? null : projectId);
      return;
    }
    
    // Handle reordering within thoughts-list
    if (result.destination && result.source.droppableId === 'thoughts-list' && result.destination.droppableId === 'thoughts-list') {
      const sourceIndex = result.source.index;
      const destIndex = result.destination.index;
      
      if (sourceIndex !== destIndex) {
        // Reorder filteredThoughts based on drag
        const reorderedFiltered = [...filteredThoughts];
        const [removed] = reorderedFiltered.splice(sourceIndex, 1);
        reorderedFiltered.splice(destIndex, 0, removed);
        
        // Update localThoughts to reflect new order
        // Keep non-filtered thoughts in place, replace filtered ones with reordered
        const nonFilteredThoughts = localThoughts.filter(t => 
          selectedProjectId ? t.project_id !== selectedProjectId : false
        );
        
        if (selectedProjectId) {
          // Project filter active: combine non-filtered + reordered filtered
          setLocalThoughts([...nonFilteredThoughts, ...reorderedFiltered]);
        } else {
          // No filter: just use reordered
          setLocalThoughts(reorderedFiltered);
        }
        
        // Also update selectedThoughts order if needed
        const newSelectedOrder = reorderedFiltered
          .filter(t => selectedThoughts.includes(t.id))
          .map(t => t.id);
        const unselectedFromOther = selectedThoughts.filter(id => 
          !reorderedFiltered.find(t => t.id === id)
        );
        setSelectedThoughts([...unselectedFromOther, ...newSelectedOrder]);
      }
    }
  };

  // Filter templates by selected project (or show all if no project selected)
  const startTemplates = templates.filter(t => t.type === "start" && (!selectedProjectId || !t.project_id || t.project_id === selectedProjectId));
  const endTemplates = templates.filter(t => t.type === "eind" && (!selectedProjectId || !t.project_id || t.project_id === selectedProjectId));
  
  // Save template selection to localStorage when changed
  useEffect(() => {
    if (startTemplateId) {
      localStorage.setItem(`template_start_${selectedProjectId || 'all'}`, startTemplateId);
    }
  }, [startTemplateId, selectedProjectId]);
  
  useEffect(() => {
    if (endTemplateId) {
      localStorage.setItem(`template_end_${selectedProjectId || 'all'}`, endTemplateId);
    }
  }, [endTemplateId, selectedProjectId]);
  
  // Load templates when project changes - use project's saved templates first
  useEffect(() => {
    if (selectedProjectId) {
      const project = projects.find(p => p.id === selectedProjectId);
      if (project) {
        // Use project's saved templates if available
        const projectStart = project.last_start_template_id || "";
        const projectEnd = project.last_end_template_id || "";
        if (projectStart || projectEnd) {
          setStartTemplateId(projectStart);
          setEndTemplateId(projectEnd);
          return;
        }
      }
    }
    // Fallback to localStorage
    const storedStart = localStorage.getItem(`template_start_${selectedProjectId || 'all'}`) || "";
    const storedEnd = localStorage.getItem(`template_end_${selectedProjectId || 'all'}`) || "";
    setStartTemplateId(storedStart);
    setEndTemplateId(storedEnd);
  }, [selectedProjectId, projects]);

  const selectedStartTemplate = templates.find(t => t.id === startTemplateId);
  const selectedEndTemplate = templates.find(t => t.id === endTemplateId);
  
  // Filter thoughts by selected project - uses localThoughts for instant updates
  const filteredThoughtsUnsorted = selectedProjectId 
    ? localThoughts.filter(t => t.project_id === selectedProjectId)
    : localThoughts;
    
  // Check limit
  const isProjectLimitReached = selectedProjectId && filteredThoughtsUnsorted.length >= 10;

  // Sort thoughts based on groupBy
  const filteredThoughts = [...filteredThoughtsUnsorted].sort((a, b) => {
    if (groupBy === 'page') {
      const pageA = a.target_page || 'zzz';
      const pageB = b.target_page || 'zzz';
      if (pageA !== pageB) return pageA.localeCompare(pageB);
    }
    if (groupBy === 'component') {
      const compA = a.target_component || 'zzz';
      const compB = b.target_component || 'zzz';
      if (compA !== compB) return compA.localeCompare(compB);
    }
    // Default date/id sort (already in Unsorted) or secondary sort
    return 0;
  });

  // Use filteredThoughts order for preview (same as UI display order)
  const selectedThoughtData = filteredThoughts
    .filter(t => selectedThoughts.includes(t.id));
  
  const selectedThoughtContents = selectedThoughtData.map(t => t.content);

  const startText = customStartText || selectedStartTemplate?.content || "";
  const endText = customEndText || selectedEndTemplate?.content || "";
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Config inclusion toggles
  const [includePersonalPrefs, setIncludePersonalPrefs] = useState(true);
  const [includeProjectConfig, setIncludeProjectConfig] = useState(true);

  const buildSubtaskJson = (thought, i, focusToChanges) => {
    // Build files array from context
    const files = [];
    if (thought.target_page) {
      files.push(`pages/${thought.target_page}.jsx`);
    }
    if (thought.target_component) {
      // Try to determine component path
      const componentPath = thought.target_page 
        ? `components/${thought.target_page.toLowerCase()}/${thought.target_component}.jsx`
        : `components/${thought.target_component}.jsx`;
      files.push(componentPath);
    }
    
    // Build acceptance criteria
    const acceptance = [];
    if (thought.target_page) {
      acceptance.push(`Test: Wijziging werkt correct op ${thought.target_page} pagina`);
    }
    if (thought.target_component) {
      acceptance.push(`Test: ${thought.target_component} component functioneert naar verwachting`);
    }
    if (acceptance.length === 0) {
      acceptance.push("Test: Functionaliteit werkt zoals beschreven");
    }
    
    // Build the JSON subtask
    const subtask = {
      id: `TAAK-${i + 1}`,
      title: (thought.content || '').substring(0, 50) + ((thought.content || '').length > 50 ? '...' : ''),
      description: thought.content || '',
      files: files.length > 0 ? files : ["te bepalen"],
      changes: focusToChanges[thought.focus_type || "both"],
      acceptance: acceptance,
      priority: "Medium"
    };
    
    // Add domain info if present
    if (thought.target_domain) {
      subtask.domain = thought.target_domain;
    }
    
    // Add images if present
    const images = thought.image_urls || [];
    if (images.length > 0) {
      subtask.screenshots = images;
    }
    
    return subtask;
  };

  const generatedPrompt = useMemo(() => {
    // Als er geen enkele input is, return empty
    if (selectedThoughtData.length === 0 && !startText && !endText) {
      return "";
    }

    const promptParts = [];

    // Personal preferences (if enabled)
    const personalPrefs = currentUser?.personal_preferences_markdown;
    if (includePersonalPrefs && personalPrefs) {
      promptParts.push(personalPrefs);
    }

    // Project configuration (if enabled and project selected)
    const projectConfig = selectedProject?.technical_config_markdown;
    if (includeProjectConfig && projectConfig) {
      promptParts.push(projectConfig);
    }
    
    // Start template
    if (startText) {
      promptParts.push(startText);
    }

    // Taken als JSON subtasks (inclusief afbeeldingen en focus)
    if (selectedThoughtData.length > 0) {
      const focusToChanges = {
        both: "Design en logica aanpassen",
        design: "Alleen DESIGN aanpassen - geen logica wijzigen",
        logic: "Alleen LOGICA aanpassen - geen design wijzigen",
        no_design: "BLIJF AF VAN HET DESIGN - alleen functionaliteit/logica",
        discuss: "DISCUSS - Bespreek en analyseer"
      };
      
      const subtasks = selectedThoughtData.map((thought, i) => buildSubtaskJson(thought, i, focusToChanges));
      
      // Calculate file scope
      const allFiles = new Set();
      subtasks.forEach(t => {
        if (t.files && Array.isArray(t.files)) {
          t.files.forEach(f => allFiles.add(f));
        }
      });
      
      const fileScope = allFiles.size > 0 ? Array.from(allFiles) : ["te bepalen"];

      const protocol = {
        name: "MULTITASK_EXECUTION_v1.0",
        max_subtasks: 10,
        execution_mode: "serial",
        file_scope: fileScope,
        style: "volg 'Mijn Persoonlijke Development Voorkeuren' (camelCase, async/await, JSDoc)",
        fallback: {
          split_if_too_large: true,
          max_loc: 200,
          max_files: 3,
          max_dependencies: 5
        }
      };

      const jsonBlock = {
        protocol,
        subtasks
      };
      
      promptParts.push("```json\n" + JSON.stringify(jsonBlock, null, 2) + "\n```");
    }

    // Eind template
    if (endText) {
      promptParts.push(endText);
    }

    return promptParts.join("\n\n---\n\n");
  }, [
    selectedThoughtData,
    startText,
    endText,
    includePersonalPrefs,
    includeProjectConfig,
    currentUser?.personal_preferences_markdown,
    selectedProject?.technical_config_markdown
  ]);



  // generatedPrompt is now a useMemo constant
  
  // Maak task checks gebaseerd op geselecteerde gedachten
  const generateTaskChecks = () => {
    return selectedThoughtContents.map((content, i) => ({
      task_name: `Deeltaak ${i + 1}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
      full_description: content,
      is_checked: false,
      status: 'open'
    }));
  };

  const handleImprovePrompt = async () => {
    if (!generatedPrompt.trim()) return;
    
    setIsImproving(true);
    try {
      // Use custom AI instruction from settings if available
      const customInstruction = aiSettings[0]?.improve_prompt_instruction || 
        `Verbeter de volgende prompt technisch en taalkundig. Maak de tekst professioneler, duidelijker en beter gestructureerd. Behoud de originele intentie en inhoud, maar verbeter grammatica, spelling, en technische precisie. Geef alleen de verbeterde tekst terug, geen uitleg.`;
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `${customInstruction}

Originele prompt:
${generatedPrompt}`,
      });
      setImprovedPrompt(result);
      toast.success("Prompt improved!");
    } catch (error) {
      toast.error("Could not improve prompt");
    } finally {
      setIsImproving(false);
    }
  };

  // Reset improved prompt when source changes
  useEffect(() => {
    setImprovedPrompt("");
  }, [generatedPrompt]);

  /**
   * Kopieert prompt, slaat op, verwijdert taken en toont banner.
   * Uses soft-delete (is_deleted=true) which is the same pattern as deleteThought mutation.
   */
  const handleCopyPrompt = async () => {
    const textToCopy = improvedPrompt || generatedPrompt;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    
    // Store thoughts to delete before any state changes
    const thoughtsToDelete = [...selectedThoughts];
    
    try {
      const defaultTitle = selectedProject 
        ? `[${selectedProject.name}] ${new Date().toLocaleString('en-US')}`
        : `Multi-Task ${new Date().toLocaleString('en-US')}`;
        
      // Save template preferences
      if (selectedProjectId && (startTemplateId || endTemplateId)) {
        try {
          await base44.entities.Project.update(selectedProjectId, {
            last_start_template_id: startTemplateId || null,
            last_end_template_id: endTemplateId || null
          });
        } catch (e) {
          console.error("Could not save template preferences", e);
        }
      }

      // Create item first
      await createMultipromptMutation.mutateAsync({
        title: defaultTitle,
        type: "multiprompt",
        content: textToCopy,
        used_thoughts: thoughtsToDelete,
        start_template_id: startTemplateId || null,
        end_template_id: endTemplateId || null,
        task_checks: generateTaskChecks(),
        project_id: selectedProjectId || null,
        status: "open"
      });
      
      // Soft-delete selected thoughts (move to recycle bin) - same pattern as deleteThought mutation
      if (thoughtsToDelete.length > 0) {
        // Update all thoughts in DB to mark as deleted
        await Promise.all(thoughtsToDelete.map(id => 
          base44.entities.Thought.update(id, { 
            is_deleted: true, 
            deleted_at: new Date().toISOString() 
          })
        ));

        // Invalidate and refetch queries BEFORE clearing local state
        // This ensures the query refetches from DB with the filter (is_deleted: false)
        await queryClient.invalidateQueries({ queryKey: ['thoughts'] });
        
        // Also refresh deleted count for recycle bin header badge
        await queryClient.invalidateQueries({ queryKey: ['deletedThoughtsCount'] });
        
        // Force refetch to get fresh data from server
        await queryClient.refetchQueries({ queryKey: ['thoughts', currentUser?.email] });
      }

      // Show banner and scroll to top
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 10000);
      setCopied(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (e) {
      console.error("Direct save failed:", e);
      toast.error("Save failed: " + e.message);
      setCopied(false);
    }
  };

  const handleSaveAsPrompt = async () => {
    // Store thoughts to delete before any state changes
    const thoughtsToDelete = [...selectedThoughts];
    
    try {
      const finalPrompt = improvedPrompt || generatedPrompt;
      const defaultTitle = selectedProject 
        ? `[${selectedProject.name}] ${new Date().toLocaleString('en-US')}`
        : `Multi-Step ${new Date().toLocaleString('en-US')}`;
        
      const title = promptTitle.trim() || defaultTitle;

      // Save template selection to project
      if (selectedProjectId && (startTemplateId || endTemplateId)) {
        try {
          await base44.entities.Project.update(selectedProjectId, {
            last_start_template_id: startTemplateId || null,
            last_end_template_id: endTemplateId || null
          });
          queryClient.invalidateQueries({ queryKey: ['projects'] });
        } catch (e) {
          console.error("Could not save template preferences to project", e);
        }
      }

      // 1. Create the prompt item
      await createMultipromptMutation.mutateAsync({
        title: title,
        type: "multiprompt",
        content: finalPrompt,
        used_thoughts: thoughtsToDelete,
        start_template_id: startTemplateId || null,
        end_template_id: endTemplateId || null,
        task_checks: taskChecks,
        project_id: selectedProjectId || null,
        status: "open"
      });
      
      // 2. Soft-delete selected thoughts (move to recycle bin)
      if (thoughtsToDelete.length > 0) {
        await Promise.all(thoughtsToDelete.map(id => 
          base44.entities.Thought.update(id, { 
            is_deleted: true, 
            deleted_at: new Date().toISOString() 
          })
        ));

        // Invalidate and refetch queries - DB is source of truth
        await queryClient.invalidateQueries({ queryKey: ['thoughts'] });
        await queryClient.invalidateQueries({ queryKey: ['deletedThoughtsCount'] });
        await queryClient.refetchQueries({ queryKey: ['thoughts', currentUser?.email] });
      }

      // 3. Close dialog and scroll to top
      setShowControlDialog(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (e) {
      console.error("Save failed:", e);
      toast.error("Save failed: " + (e.message || "Unknown error"));
    }
  };

  /**
   * Slaat huidige state op als controle item.
   * Gebruikt Promise.allSettled voor parallelle thought updates.
   */
  const handleSaveAsCheck = async () => {
    setIsSavingAll(true);
    try {
      // 1. Save all thoughts state to DB in parallel
      const updatePromises = localThoughts.map(thought => 
        base44.entities.Thought.update(thought.id, {
          content: thought.content || "",
          image_urls: thought.image_urls || [],
          is_selected: selectedThoughts.includes(thought.id),
          project_id: thought.project_id
        })
      );
      
      const results = await Promise.allSettled(updatePromises);
      const failures = results.filter(r => r.status === 'rejected');
      
      if (failures.length > 0) {
        console.warn("Sommige thought updates faalden:", failures);
      }
      
      queryClient.invalidateQueries({ queryKey: ['thoughts'] });
      
      // 2. Save as Item with is_pending_check flag
      const finalPrompt = improvedPrompt || generatedPrompt;
      const defaultTitle = selectedProject 
        ? `[${selectedProject.name}] Check ${new Date().toLocaleString('en-US')}`
                    : `Check ${new Date().toLocaleString('en-US')}`;
        
      const title = promptTitle.trim() || defaultTitle;
      
      await createMultipromptMutation.mutateAsync({
        title: title,
        type: "multiprompt",
        content: finalPrompt,
        used_thoughts: selectedThoughts,
        start_template_id: startTemplateId || null,
        end_template_id: endTemplateId || null,
        task_checks: taskChecks,
        project_id: selectedProjectId || null,
        is_pending_check: true,
        notes: controlNotes,
        status: "open"
      });

      // 3. Hard Reload to reset state
      resetBuilder();
      navigate("/Multiprompt", { replace: true });
      queryClient.invalidateQueries();

    } catch (error) {
      console.error("Save error:", error);
      toast.error("Save failed: " + (error.message || "Unknown error"));
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleDeleteAndClear = () => {
    deleteUsedThoughtsMutation.mutate(selectedThoughts);
    setShowControlDialog(false);
  };

  const handleDiscardPrompt = () => {
    // Alleen dialog sluiten, NIET thoughts of templates resetten
    setShowControlDialog(false);
    setPromptTitle("");
    setTaskChecks([]);
    setControlNotes("");
    toast.info("Prompt closed");
  };

  const updateTaskStatus = (index, status) => {
    const newChecks = [...taskChecks];
    newChecks[index].status = status;
    // Sync is_checked for backward compatibility
    newChecks[index].is_checked = status === 'success'; 
    setTaskChecks(newChecks);
  };

  useEffect(() => {
    if (selectedThoughts.length === 0 && improvedPrompt) {
      setImprovedPrompt("");
    }
  }, [selectedThoughts, improvedPrompt]);

  return (
    <RequireSubscription>
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Banner notification */}
        {showBanner && (
          <div className="mb-6 p-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg shadow-lg animate-in fade-in slide-in-from-top-4">
            <p className="text-sm font-medium text-center">
              ✓ The Multi-prompt has been copied. Paste it in your project and check off the tasks later via the saved version in Vault.
            </p>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Multi-Task Builder
          </h1>
          <p className="text-slate-600 mt-2">Collect thoughts and build comprehensive multi-task prompts</p>
        </div>

        {/* Project Selector Bar */}
        <Card className={`mb-6 ${selectedProject ? `border-2 ${projectBorderColors[selectedProject.color]}` : ''}`}>
          <CardContent className="py-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-slate-500" />
                <span className="font-medium text-slate-700">Project:</span>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <Button
                  variant={!selectedProjectId ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedProjectId("");
                    localStorage.setItem('lastSelectedProjectId', "");
                  }}
                  className={!selectedProjectId ? "bg-slate-700" : ""}
                >
                  All Projects
                </Button>
                {projects.map(project => {
                  const projectTaskCount = localThoughts.filter(t => t.project_id === project.id).length;
                  return (
                  <div key={project.id} className="inline-flex items-center">
                    <Button
                      variant={selectedProjectId === project.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        localStorage.setItem('lastSelectedProjectId', project.id);
                      }}
                      className={`rounded-r-none ${selectedProjectId === project.id ? `${projectColors[project.color]} border-0` : ""}`}
                    >
                      <div className={`w-3 h-3 rounded-full ${projectColors[project.color]} mr-2`} />
                      {project.name}
                      {projectTaskCount > 0 && (
                        <Badge variant="secondary" className={`ml-1.5 text-xs h-5 min-w-5 px-1.5 ${projectTaskCount >= 10 ? 'bg-red-600 text-white animate-pulse' : 'bg-white/20'}`}>
                          {projectTaskCount}
                        </Badge>
                      )}
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
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => deleteProjectMutation.mutate(project.id)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  );
                })}
                
                {/* Quick Add Project Button */}
                <Dialog open={newProjectDialogOpen} onOpenChange={setNewProjectDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-dashed border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-400"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                        <DialogTitle>New Project</DialogTitle>
                      </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <Input
                        placeholder="Project name..."
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                      />
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">Color</label>
                        <div className="flex gap-2 flex-wrap">
                          {Object.keys(projectColors).map(color => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setNewProjectColor(color)}
                              className={`w-8 h-8 rounded-full ${projectColors[color]} ${
                                newProjectColor === color ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <Textarea
                        placeholder="Description (optional)..."
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.target.value)}
                        className="min-h-[60px]"
                      />
                      <Button
                        onClick={() => {
                          handleAddProject();
                        }}
                        disabled={!newProjectName.trim()}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Project
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Project Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700 block">
                    Technische Configuratie (Markdown)
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditProjectConfig(`# Project Configuratie

## Technische Context
- Platform: Base44
- Framework: React + Tailwind CSS
- Componenten: shadcn/ui
- Icons: Lucide React

## Bestandsstructuur
- pages/ - Pagina componenten
- components/ - Herbruikbare componenten
- entities/ - Data modellen (JSON schema)

## Stijlrichtlijnen
- Kleuren: Gebruik Tailwind klassen (indigo-600, slate-700, etc.)
- Spacing: p-4 voor padding, gap-4 voor flex/grid gaps
- Responsive: mobile-first (sm:, md:, lg: breakpoints)

## Code Conventies
- camelCase voor variabelen
- PascalCase voor componenten
- async/await voor async operaties`)}
                    className="text-xs"
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    Voorbeeld
                  </Button>
                </div>
                <Textarea
                  placeholder="# Project Configuratie&#10;&#10;## Technische Context&#10;- Platform: ...&#10;- Framework: ..."
                  value={editProjectConfig}
                  onChange={(e) => setEditProjectConfig(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                <p className="text-xs text-slate-500">
                  Definieer hier project-specifieke configuratie zoals bestandsstructuur, kleuren, API endpoints, etc.
                </p>
              </div>

              {/* Component Mapping Section */}
              <div className="space-y-2 border-t pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700 block">
                    Component Mapping (JSON)
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyMappingPrompt}
                    className="text-xs bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100"
                    title="Kopieer AI prompt → Plak in AI → Kopieer JSON resultaat → Plak hieronder"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    📋 Kopieer AI Prompt
                  </Button>
                </div>
                <Textarea
                  placeholder='{"Dashboard": ["StatCard", "Chart"], "Settings": ["FormField", "Toggle"]}'
                  value={editProjectMapping}
                  onChange={(e) => {
                    setEditProjectMapping(e.target.value);
                    setEditMappingError("");
                  }}
                  className={`min-h-[150px] font-mono text-sm ${editMappingError ? 'border-red-500' : ''}`}
                />
                {editMappingError && (
                  <p className="text-xs text-red-500">{editMappingError}</p>
                )}
                <p className="text-xs text-slate-500">
                  Plak hier de JSON mapping van pagina's naar componenten. Gebruik de "Mapping Prompt" knop om een AI prompt te genereren.
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEditProject} className="bg-indigo-600 hover:bg-indigo-700">
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Tabs defaultValue="build" className="space-y-6">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="build" className="data-[state=active]:bg-white">
              <Layers className="w-4 h-4 mr-2" />
              Build Prompt
            </TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-white">
              <FileText className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="projects" className="data-[state=active]:bg-white">
              <FolderOpen className="w-4 h-4 mr-2" />
              My Projects
            </TabsTrigger>
          </TabsList>

          <TabsContent value="build" className="space-y-6">
            <div key={builderInstanceKey} className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Left: Thoughts */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="w-5 h-5 text-yellow-500" />
                          Tasks
                        {selectedProject && (
                          <Badge className={`${projectColors[selectedProject.color]} text-white ml-2`}>
                            {selectedProject.name}
                          </Badge>
                        )}
                      </div>
{/* Selection button moved to footer */}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div 
                      className="space-y-0"
                      onDrop={handleNewThoughtDrop}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      {/* Combined input box with all controls inside */}
                      <div className={`border-2 rounded-lg focus-within:border-indigo-400 transition-all bg-white ${selectedProject ? `border-dashed ${projectBorderColors[selectedProject.color]}` : 'border-slate-200'}`}>
                        <Textarea
                          ref={newThoughtInputRef}
                          placeholder="Type task and/or drop image"
                          value={newThought}
                          onChange={(e) => setNewThought(e.target.value)}
                          onPaste={handleNewThoughtPaste}
                          className="min-h-[60px] border-0 focus-visible:ring-0 resize-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddThought();
                            }
                          }}
                        />
                        
                        {/* Image preview inside box */}
                        {newThoughtImages.length > 0 && (
                          <div className="flex flex-wrap gap-2 px-3 pb-2">
                            {newThoughtImages.map((url, idx) => (
                              <div key={idx} className="relative">
                                <img src={url} alt={`Preview ${idx + 1}`} className="w-10 h-10 object-cover rounded border" />
                                <button
                                  onClick={() => setNewThoughtImages(prev => prev.filter((_, i) => i !== idx))}
                                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                                >×</button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Controls bar inside box */}
                        <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-100 flex-wrap bg-slate-50/50 rounded-b-lg">
                          {/* Image upload */}
                          <input
                            type="file"
                            ref={newThoughtFileInputRef}
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={(e) => e.target.files[0] && uploadNewThoughtImage(e.target.files[0])}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => newThoughtFileInputRef.current?.click()}
                            disabled={isUploadingNewImage}
                            className="h-7 w-7 p-0"
                            title="Screenshot of PDF toevoegen"
                          >
                            {isUploadingNewImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
                          </Button>
                          
                          {/* Focus Type Selector */}
                          <Select 
                            value={newThoughtFocus} 
                            onValueChange={setNewThoughtFocus}
                          >
                            <SelectTrigger className="h-7 text-xs w-auto min-w-[100px] border-dashed bg-white" title="Kies focus of type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="both">Design + Logica</SelectItem>
                              <SelectItem value="design">Alleen Design</SelectItem>
                              <SelectItem value="logic">Alleen Logica</SelectItem>
                              <SelectItem value="no_design">Geen Design</SelectItem>
                              <SelectItem value="discuss">Discuss</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <div className="h-4 w-px bg-slate-300" />
                          
                          {/* Context Selector - 3 dropdowns */}
                          <ContextSelector
                            value={newThoughtContext}
                            onChange={setNewThoughtContext}
                            thoughtText={newThought}
                            compact={true}
                            selectedProject={selectedProject}
                            enableAISuggestions={aiSettings[0]?.enable_context_suggestions !== false}
                          />

                          <div className="h-4 w-px bg-slate-300" />

                          {/* Search & Replace Dropdown */}
                          <Select onValueChange={(val) => setNewThought(prev => prev + (prev ? "\n\n" : "") + val)}>
                            <SelectTrigger className="h-7 text-xs w-auto min-w-[24px] px-1 border-dashed bg-white" title="Speciale functies">
                              <MoreHorizontal className="w-4 h-4" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Zoek en vervang in /pages/**/*">/pages/**/*</SelectItem>
                              <SelectItem value="Zoek en vervang in /components/**/*">/components/**/*</SelectItem>
                              <SelectItem value="Zoek en vervang in /lib/**/*">/lib/**/*</SelectItem>
                              <SelectItem value="Zoek en vervang in /utils/**/*">/utils/**/*</SelectItem>
                              <SelectItem value="Zoek en vervang in /context/**/*">/context/**/*</SelectItem>
                              <SelectItem value="Zoek en vervang in /hooks/**/*">/hooks/**/*</SelectItem>
                              <SelectItem value="Zoek en vervang in /styles/**/*">/styles/**/*</SelectItem>
                              <SelectItem value="Zoek en vervang in /public/**/*">/public/**/*</SelectItem>
                              <SelectItem value="Zoek en vervang in **/*">**/* (alles)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        onClick={handleAddThought} 
                        disabled={(!newThought.trim() && newThoughtImages.length === 0) || isProjectLimitReached}
                        className={`flex-1 ${selectedProject ? projectColors[selectedProject.color] : 'bg-slate-800'} hover:opacity-90 text-white transition-all`}
                        title="Add this task to your list"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {isProjectLimitReached ? "Limit reached" : "Task"}
                      </Button>

                      {filteredThoughts.length > 0 && (
                        <Button
                          variant="outline"
                          onClick={toggleSelectAll}
                          className="flex-1 md:flex-none"
                        >
                          {filteredThoughts.every(th => selectedThoughts.includes(th.id)) ? (
                            <>
                              <Square className="w-4 h-4 mr-2" />
                              Deselect all
                            </>
                          ) : (
                            <>
                              <CheckSquare className="w-4 h-4 mr-2" />
                              Select all
                            </>
                          )}
                        </Button>
                      )}

                      <Select value={groupBy} onValueChange={setGroupBy}>
                        <SelectTrigger className="w-[130px]">
                          <SelectValue placeholder="Group by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date">By input</SelectItem>
                          <SelectItem value="page">Page</SelectItem>
                          <SelectItem value="component">Component</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <DragDropContext onDragEnd={handleThoughtsDragEnd}>
                      <Droppable droppableId="thoughts-list">
                        {(provided) => (
                          <div 
                            className="space-y-2 max-h-[400px] overflow-auto"
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                          >
                            {filteredThoughts.map((thought, index) => {
                              const thoughtProject = projects.find(p => p.id === thought.project_id);
                              return (
                                <Draggable key={thought.id} draggableId={thought.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                    >
                                      <ThoughtCard
                                        thought={thought}
                                        project={thoughtProject}
                                        isSelected={selectedThoughts.includes(thought.id)}
                                        onToggleSelect={() => toggleSelection(thought.id)}
                                        onDelete={() => deleteThought.mutate(thought.id)}
                                        onUpdateImages={handleUpdateThoughtImages}
                                        onUpdateContent={handleUpdateThoughtContent}
                                        onUpdateFocus={handleUpdateThoughtFocus}
                                        onUpdateContext={handleUpdateThoughtContext}
                                        dragHandleProps={provided.dragHandleProps}
                                        showDragHandle={true}
                                      />
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                            {filteredThoughts.length === 0 && (
                              <p className="text-center text-slate-400 py-8">
                                No tasks yet{selectedProject ? ` for ${selectedProject.name}` : ''}. Start typing!
                              </p>
                            )}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Templates & Preview */}
              <div className="space-y-4">
                {/* Config Inclusion Toggles - Compact inline */}
                <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <Cog className="w-4 h-4 text-slate-500 shrink-0" />

                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="personalPrefs"
                      checked={includePersonalPrefs && !!currentUser?.personal_preferences_markdown}
                      onCheckedChange={setIncludePersonalPrefs}
                      disabled={!currentUser?.personal_preferences_markdown}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 text-white"
                    />
                    <Link to={createPageUrl("AIBackoffice")} className="text-xs text-slate-700 underline hover:text-indigo-600">
                      Persoonlijk
                    </Link>
                    {!currentUser?.personal_preferences_markdown && (
                      <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 h-5">!</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="projectConfig"
                      checked={includeProjectConfig && !!selectedProject?.technical_config_markdown}
                      onCheckedChange={setIncludeProjectConfig}
                      disabled={!selectedProject?.technical_config_markdown}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 text-white"
                    />
                    {selectedProject ? (
                      <button onClick={() => handleEditProject(selectedProject)} className="text-xs text-slate-700 underline hover:text-indigo-600">
                        Project
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Project</span>
                    )}
                    {selectedProject && !selectedProject.technical_config_markdown && (
                      <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 h-5">!</Badge>
                    )}
                    {!selectedProject && (
                      <Badge variant="outline" className="text-xs text-slate-400 h-5">-</Badge>
                    )}
                  </div>
                </div>

                {/* Template Selection */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Templates</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Start text
                        </label>
                        <Select value={startTemplateId || "none"} onValueChange={(val) => {
                          const newVal = val === "none" ? "" : val;
                          setStartTemplateId(newVal);
                          if (val && val !== "none") setCustomStartText("");
                          // Save to project immediately
                          if (selectedProjectId) {
                            base44.entities.Project.update(selectedProjectId, {
                              last_start_template_id: newVal || null
                            }).then(() => queryClient.invalidateQueries({ queryKey: ['projects'] }));
                          }
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Start..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No template</SelectItem>
                            {startTemplates.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          End text
                        </label>
                        <Select value={endTemplateId || "none"} onValueChange={(val) => {
                          const newVal = val === "none" ? "" : val;
                          setEndTemplateId(newVal);
                          if (val && val !== "none") setCustomEndText("");
                          // Save to project immediately
                          if (selectedProjectId) {
                            base44.entities.Project.update(selectedProjectId, {
                              last_end_template_id: newVal || null
                            }).then(() => queryClient.invalidateQueries({ queryKey: ['projects'] }));
                          }
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Eind..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No template</SelectItem>
                            {endTemplates.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {(startTemplateId && selectedStartTemplate) || (endTemplateId && selectedEndTemplate) ? (
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        {startTemplateId && selectedStartTemplate && (
                          <div className={`p-2 rounded text-xs max-h-20 overflow-auto ${selectedProject ? projectLightColors[selectedProject.color] : 'bg-green-50 text-green-700 border-green-200'}`}>
                            {selectedStartTemplate.content}
                          </div>
                        )}
                        {endTemplateId && selectedEndTemplate && (
                          <div className={`p-2 rounded text-xs max-h-20 overflow-auto ${selectedProject ? projectLightColors[selectedProject.color] : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                            {selectedEndTemplate.content}
                          </div>
                        )}
                      </div>
                    ) : null}

                  </CardContent>
                </Card>

                {/* Preview */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <span>Preview</span>
                      <div className="flex flex-wrap gap-2">
                        <Link to={createPageUrl("AIBackoffice")}>
                          <Button variant="ghost" size="sm" className="text-slate-500">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleImprovePrompt}
                          disabled={!generatedPrompt || isImproving}
                        >
                          {isImproving ? (
                            <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4 sm:mr-2" />
                          )}
                          <span className="hidden sm:inline">{isImproving ? "Processing..." : "Improve with AI"}</span>
                        </Button>
                        {improvedPrompt && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setImprovedPrompt("")}
                            className="text-slate-500"
                          >
                            <X className="w-4 h-4 sm:mr-1" />
                            <span className="hidden sm:inline">Reset</span>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={handleCopyPrompt}
                          disabled={!generatedPrompt && !improvedPrompt}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          {copied ? <CheckCircle className="w-4 h-4 sm:mr-2" /> : <Copy className="w-4 h-4 sm:mr-2" />}
                          <span className="hidden sm:inline">{copied ? "Bezig..." : "Copy & Close & Restart"}</span>
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {improvedPrompt && (
                      <div className="mb-3">
                        <Badge className="bg-green-100 text-green-700 mb-2">AI Improved</Badge>
                      </div>
                    )}
                    <div className="bg-slate-900 rounded-xl relative group">
                      <div className="p-4 max-h-[400px] overflow-auto">
                        <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap">
                          {improvedPrompt || generatedPrompt || "Select tasks and templates to see a preview..."}
                        </pre>
                      </div>
                      {(generatedPrompt || improvedPrompt) && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(improvedPrompt || generatedPrompt);
                            toast.success("Prompt copied!");
                          }}
                          className="absolute top-2 right-2 p-2 bg-slate-700 hover:bg-slate-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Kopieer naar klembord"
                        >
                          <Copy className="w-4 h-4 text-white" />
                        </button>
                      )}
                    </div>
                    {!generatedPrompt && (
                      <p className="text-sm text-slate-500 mt-3 text-center">
                        Select tasks on the left and choose templates above
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
                    Prompt Copied - What's next?
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <p className="text-sm text-slate-600">
                    The prompt is copied. After execution, check if each subtask was processed correctly:
                  </p>

                  {/* Task Checklist */}
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {taskChecks.map((check, index) => (
                      <div 
                        key={index}
                        className="p-3 rounded-lg border bg-slate-50 border-slate-200 flex items-center justify-between gap-3"
                      >
                        <span className={`text-sm flex-1 ${check.status === 'success' ? 'text-green-700 font-medium' : check.status === 'failed' ? 'text-red-700' : 'text-slate-700'}`}>
                          {check.task_name}
                        </span>
                        <Select 
                          value={check.status || "open"} 
                          onValueChange={(val) => updateTaskStatus(index, val)}
                        >
                          <SelectTrigger className={`w-[110px] h-8 text-xs ${
                            check.status === 'success' ? 'bg-green-50 border-green-300 text-green-700' : 
                            check.status === 'failed' ? 'bg-red-50 border-red-300 text-red-700' : ''
                          }`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="success">Goed</SelectItem>
                            <SelectItem value="failed">Fout</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
                  <Textarea
                    placeholder="Notes (optional)..."
                    value={controlNotes}
                    onChange={(e) => setControlNotes(e.target.value)}
                    className="min-h-[60px]"
                  />

                  {/* Title for saving */}
                  <Input
                    placeholder="Title for saving..."
                    value={promptTitle}
                    onChange={(e) => setPromptTitle(e.target.value)}
                  />

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleSaveAsPrompt}
                      disabled={isSavingAll}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {promptTitle.trim() ? "Save as Prompt" : "Quick Save"}
                    </Button>
                    <Button
                      onClick={handleSaveAsCheck}
                      disabled={isSavingAll}
                      variant="outline"
                      className="border-green-500 text-green-700 hover:bg-green-50"
                    >
                      {isSavingAll ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      {isSavingAll ? "Saving..." : "Save as Check"}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleDeleteAndClear}
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete tasks
                    </Button>
                    <Button
                      onClick={handleDiscardPrompt}
                      variant="ghost"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Close only
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Templates List */}
              <div className="space-y-4">
                <Card className={selectedProject ? `border-2 ${projectBorderColors[selectedProject.color]}` : ''}>
                  <CardHeader className="pb-3">
                    <CardTitle className={selectedProject ? `text-${selectedProject.color}-700` : "text-green-700"}>Start texts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {startTemplates.map(template => {
                      const templateProject = projects.find(p => p.id === template.project_id);
                      return (
                        <div key={template.id} className={`p-3 rounded-lg border ${selectedProject ? projectLightColors[selectedProject.color] : 'bg-green-50 border-green-200'}`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-green-800">{template.name}</p>
                                {templateProject && (
                                  <Badge className={`${projectColors[templateProject.color]} text-white text-xs`}>
                                    {templateProject.name}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-green-600 mt-1 line-clamp-2">{template.content}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-500 hover:bg-slate-100"
                                onClick={() => handleEditTemplate(template)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
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
                        </div>
                      );
                    })}
                    {startTemplates.length === 0 && (
                      <p className="text-slate-400 text-center py-4">No start texts</p>
                    )}
                  </CardContent>
                </Card>

                <Card className={selectedProject ? `border-2 ${projectBorderColors[selectedProject.color]}` : ''}>
                  <CardHeader className="pb-3">
                    <CardTitle className={selectedProject ? `text-${selectedProject.color}-700` : "text-orange-700"}>End texts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {endTemplates.map(template => {
                      const templateProject = projects.find(p => p.id === template.project_id);
                      return (
                        <div key={template.id} className={`p-3 rounded-lg border ${selectedProject ? projectLightColors[selectedProject.color] : 'bg-orange-50 border-orange-200'}`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-orange-800">{template.name}</p>
                                {templateProject && (
                                  <Badge className={`${projectColors[templateProject.color]} text-white text-xs`}>
                                    {templateProject.name}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-orange-600 mt-1 line-clamp-2">{template.content}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-500 hover:bg-slate-100"
                                onClick={() => handleEditTemplate(template)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
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
                        </div>
                      );
                    })}
                    {endTemplates.length === 0 && (
                      <p className="text-slate-400 text-center py-4">No end texts</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Add Template Form */}
              <Card>
                <CardHeader>
                  <CardTitle>New Template</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Template name..."
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                  />
                  <Select value={newTemplateType} onValueChange={setNewTemplateType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="start">Start text</SelectItem>
                      <SelectItem value="eind">End text</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Template content..."
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
                    Save Template
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Edit Template Dialog */}
            <Dialog open={editTemplateDialogOpen} onOpenChange={setEditTemplateDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Template</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    placeholder="Template name..."
                    value={editTemplateName}
                    onChange={(e) => setEditTemplateName(e.target.value)}
                  />
                  <Textarea
                    placeholder="Template content..."
                    value={editTemplateContent}
                    onChange={(e) => setEditTemplateContent(e.target.value)}
                    className="min-h-[200px]"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setEditTemplateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveEditTemplate} className="bg-indigo-600 hover:bg-indigo-700">
                      Save
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Add Project Form */}
              <Card>
                <CardHeader>
                  <CardTitle>New Project</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Project name..."
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                  />
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Color</label>
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
                    placeholder="Description (optional)..."
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
                    Add Project
                  </Button>
                  </CardContent>
                  </Card>

                  {/* Projects List */}
                  <Card>
                  <CardHeader>
                  <CardTitle>My Projects</CardTitle>
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
                              {localThoughts.filter(t => t.project_id === project.id).length} taken
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-500 hover:bg-slate-100"
                            onClick={() => handleEditProject(project)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
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
                    </div>
                  ))}
                  {projects.length === 0 && (
                    <p className="text-slate-400 text-center py-8">No projects yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </RequireSubscription>
  );
}