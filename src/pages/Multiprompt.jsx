import React, { useState, useEffect, useRef } from "react";
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
import { useLanguage } from "../components/i18n/LanguageContext";

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

const projectColors = {
  red: "bg-red-500 hover:bg-red-600",
  orange: "bg-orange-500 hover:bg-orange-600",
  yellow: "bg-yellow-500 hover:bg-yellow-600",
  green: "bg-green-500 hover:bg-green-600",
  blue: "bg-blue-500 hover:bg-blue-600",
  indigo: "bg-indigo-500 hover:bg-indigo-600",
  purple: "bg-purple-500 hover:bg-purple-600",
  pink: "bg-pink-500 hover:bg-pink-600"
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

const projectLightColors = {
  red: "bg-red-50 text-red-700 border-red-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
  green: "bg-green-50 text-green-700 border-green-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  pink: "bg-pink-50 text-pink-700 border-pink-200"
};

export default function Multiprompt() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [newThought, setNewThought] = useState("");
  const [newThoughtImages, setNewThoughtImages] = useState([]);
  const [isUploadingNewImage, setIsUploadingNewImage] = useState(false);
  const [newThoughtFocus, setNewThoughtFocus] = useState("both");
  const [newThoughtContext, setNewThoughtContext] = useState({
    target_page: null,
    target_component: null,
    target_domain: null,
    ai_prediction: null
  });
  const [groupBy, setGroupBy] = useState("date");
  const newThoughtInputRef = useRef(null);
  const newThoughtFileInputRef = useRef(null);
  const [selectedThoughts, setSelectedThoughts] = useState([]);
  const [localThoughts, setLocalThoughts] = useState([]); // UI source of truth
  const [builderInstanceKey, setBuilderInstanceKey] = useState(Date.now()); // Force remount key
  const [startTemplateId, setStartTemplateId] = useState("");
  const [endTemplateId, setEndTemplateId] = useState("");
  const [customStartText, setCustomStartText] = useState("");
  const [customEndText, setCustomEndText] = useState("");
  const [promptTitle, setPromptTitle] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    // Load last selected project from localStorage
    return localStorage.getItem('lastSelectedProjectId') || "";
  });
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
  const [editProjectConfig, setEditProjectConfig] = useState("");
  const [editProjectMapping, setEditProjectMapping] = useState("");
  const [editMappingError, setEditMappingError] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Post-copy control flow
  const [showControlDialog, setShowControlDialog] = useState(false);
  const [taskChecks, setTaskChecks] = useState([]);
  const [controlNotes, setControlNotes] = useState("");

  // Get current user for personal preferences - MUST be first
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return user;
    },
  });

  const { data: dbThoughts = [] } = useQuery({
    queryKey: ['thoughts', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const result = await base44.entities.Thought.filter({ created_by: currentUser.email }, "-created_date");
      return result || [];
    },
    enabled: !!currentUser?.email,
  });
  
  // Sync DB thoughts to local state
  useEffect(() => {
    setLocalThoughts(dbThoughts);
  }, [dbThoughts]);

  // Handle auto-selection logic
  useEffect(() => {
    // Calculate relevant IDs for current view
    const relevantIds = selectedProjectId 
      ? (dbThoughts || []).filter(t => t.project_id === selectedProjectId).map(t => t.id)
      : (dbThoughts || []).map(t => t.id);

    // Auto-select if we have items but nothing selected (Initial Load)
    // OR if we switched projects (we detect this by checking if current selection mismatches project)
    // We use a ref or just simplified logic:
    
    setSelectedThoughts(prev => {
      // If empty and we have items -> Select All (Initial load)
      if (prev.length === 0 && relevantIds.length > 0) {
        return relevantIds;
      }
      
      // If we have a selection, but we switched to a project where these items aren't visible?
      // The filteredThoughts logic handles visibility.
      // But if we want to "Reset selection on project change", we need to detect project change.
      // This effect runs on dbThoughts change.
      
      return prev;
    });
  }, [dbThoughts]);

  // Explicitly handle project change to reset selection
  useEffect(() => {
    const relevantIds = selectedProjectId 
      ? localThoughts.filter(t => t.project_id === selectedProjectId).map(t => t.id)
      : localThoughts.map(t => t.id);
    
    if (relevantIds.length > 0) {
      setSelectedThoughts(relevantIds);
    }
    setImprovedPrompt("");
  }, [selectedProjectId]);

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

  const createThoughtMutation = useMutation({
    mutationFn: (data) => base44.entities.Thought.create(data),
    onSuccess: (newThoughtData) => {
      // Immediately add to local state for instant UI update - use functional update
      setLocalThoughts(prev => {
        // Add new thought at beginning, ensure no duplicates
        const filtered = prev.filter(t => t.id !== newThoughtData.id);
        return [newThoughtData, ...filtered];
      });
      setSelectedThoughts(prev => {
        if (prev.includes(newThoughtData.id)) return prev;
        return [...prev, newThoughtData.id];
      });
      setNewThought("");
      clearThoughtDraft(); // Clear autosave
      setNewThoughtImages([]);
      toast.success("Taak toegevoegd");
      // Background sync with DB
      queryClient.invalidateQueries({ queryKey: ['thoughts'] });
    },
  });

  // Soft Delete Mutation for Recycle Bin
  const softDeleteThoughtMutation = useMutation({
    mutationFn: (id) => base44.entities.Thought.update(id, { 
      is_deleted: true,
      deleted_at: new Date().toISOString()
    }),
    onMutate: (id) => {
      // Store for undo
      const thoughtToRestore = localThoughts.find(t => t.id === id);
      
      // Immediately remove from local state
      setLocalThoughts(prev => prev.filter(t => t.id !== id));
      setSelectedThoughts(prev => prev.filter(tid => tid !== id));
      
      return { thoughtToRestore };
    },
    onSuccess: (data, id, context) => {
      queryClient.invalidateQueries({ queryKey: ['thoughts'] });
      queryClient.invalidateQueries({ queryKey: ['deletedThoughts'] }); // Refresh bin if visible somewhere
      
      toast("Taak verplaatst naar prullenbak", {
        action: {
          label: "Ongedaan maken",
          onClick: () => {
            // Restore immediately via mutation
            base44.entities.Thought.update(id, { is_deleted: false, deleted_at: null })
              .then(() => {
                 // Restore to local state
                 if (context?.thoughtToRestore) {
                   setLocalThoughts(prev => [context.thoughtToRestore, ...prev]);
                   if (context.thoughtToRestore.is_selected) {
                      setSelectedThoughts(prev => [...prev, id]);
                   }
                 }
                 queryClient.invalidateQueries({ queryKey: ['thoughts'] });
                 toast.success("Hersteld!");
              });
          }
        },
        duration: 5000
      });
    },
  });

  // Use soft delete instead of hard delete for UI
  const deleteThoughtMutation = softDeleteThoughtMutation;

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

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PromptTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setEditTemplateDialogOpen(false);
      setEditingTemplate(null);
      toast.success("Template bijgewerkt");
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
      toast.success("Multi-Step opgeslagen!");
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
      for (const id of thoughtIds) {
        await base44.entities.Thought.delete(id);
      }
    },
    onMutate: () => {
      // Immediately clear ALL local thoughts
      setLocalThoughts([]);
      setSelectedThoughts([]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thoughts'] });
      toast.success("Taken verwijderd!");
      // Full reset (templates stay intact)
      resetBuilder();
    },
  });

  /**
   * Hard reset van alle thought-gerelateerde state.
   * Templates worden NOOIT gereset - die blijven altijd behouden.
   */
  const resetBuilder = () => {
    // Reset ALL thought-related states
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
    setGroupBy("date");
    
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
    
    createThoughtMutation.mutate({ 
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

  const uploadNewThoughtImage = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error("Alleen afbeeldingen zijn toegestaan");
      return;
    }
    setIsUploadingNewImage(true);
    try {
      // Use UploadPrivateFile + Proxy for ChatGPT access
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const proxyUrl = `${window.location.origin}/api/functions/serveImage?uri=${encodeURIComponent(file_uri)}`;
      
      setNewThoughtImages(prev => [...prev, proxyUrl]);
      toast.success("Afbeelding toegevoegd");
    } catch (error) {
      toast.error("Kon afbeelding niet uploaden");
    } finally {
      setIsUploadingNewImage(false);
    }
  };

  const handleNewThoughtDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      await uploadNewThoughtImage(file);
    }
  };

  // Update images for a thought in local state
  const handleUpdateThoughtImages = (thoughtId, newImages) => {
    setLocalThoughts(prev => prev.map(t => 
      t.id === thoughtId ? { ...t, image_urls: newImages } : t
    ));
  };

  // Update content for a thought in local state
  const handleUpdateThoughtContent = (thoughtId, newContent) => {
    setLocalThoughts(prev => prev.map(t => 
      t.id === thoughtId ? { ...t, content: newContent } : t
    ));
  };

  // Update focus type for a thought in local state AND persist to DB
  const handleUpdateThoughtFocus = (thoughtId, newFocus) => {
    setLocalThoughts(prev => prev.map(t => 
      t.id === thoughtId ? { ...t, focus_type: newFocus } : t
    ));
    // Persist to DB
    base44.entities.Thought.update(thoughtId, { focus_type: newFocus });
  };

  // Update context for a thought
  const handleUpdateThoughtContext = (thoughtId, newContext) => {
    setLocalThoughts(prev => prev.map(t => 
      t.id === thoughtId ? { 
        ...t, 
        target_page: newContext.target_page,
        target_component: newContext.target_component,
        target_domain: newContext.target_domain,
        ai_prediction: newContext.ai_prediction
      } : t
    ));
    // Persist to DB
    base44.entities.Thought.update(thoughtId, {
      target_page: newContext.target_page,
      target_component: newContext.target_component,
      target_domain: newContext.target_domain,
      ai_prediction: newContext.ai_prediction
    });
  };

  // Move thought to different project
  const updateThoughtProjectMutation = useMutation({
    mutationFn: ({ id, project_id }) => base44.entities.Thought.update(id, { project_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thoughts'] });
      toast.success("Taak verplaatst naar project");
    },
  });

  const handleMoveThoughtToProject = (thoughtId, newProjectId) => {
    // Update local state immediately
    setLocalThoughts(prev => prev.map(t => 
      t.id === thoughtId ? { ...t, project_id: newProjectId } : t
    ));
    // Persist to DB
    updateThoughtProjectMutation.mutate({ id: thoughtId, project_id: newProjectId });
  };

  // Save all thoughts to database (for "Controle opslaan")
  const [isSavingAll, setIsSavingAll] = useState(false);
  
  const handleSaveAllThoughts = async () => {
    setIsSavingAll(true);
    try {
      for (const thought of localThoughts) {
        // Update each thought with its current state including images
        await base44.entities.Thought.update(thought.id, {
          content: thought.content || "",
          image_urls: thought.image_urls || [],
          is_selected: selectedThoughts.includes(thought.id),
          project_id: thought.project_id
        });
      }
      queryClient.invalidateQueries({ queryKey: ['thoughts'] });
      toast.success("Alle taken opgeslagen!");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Kon niet alle taken opslaan");
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
        setEditMappingError("Ongeldige JSON format");
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

  const handleCopyMappingPrompt = () => {
    if (!editingProject) return;
    const prompt = generateMappingPrompt(editingProject.name);
    navigator.clipboard.writeText(prompt);
    toast.success("Mapping prompt gekopieerd!");
  };

  const toggleThoughtSelection = (thoughtId) => {
    setSelectedThoughts(prev => 
      prev.includes(thoughtId) 
        ? prev.filter(id => id !== thoughtId)
        : [...prev, thoughtId]
    );
  };

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

  // Build multi-task prompt: voorkeuren + project config + starttekst + gedachten als deeltaken + eindtekst
  const buildStructuredPrompt = () => {
    // Als er geen enkele input is, toon placeholder
    if (selectedThoughtData.length === 0 && !startText && !endText) {
      return "";
    }

    const promptParts = [];

    // Personal preferences (if enabled)
    const personalPrefs = currentUser?.personal_preferences_markdown;
    if (includePersonalPrefs && personalPrefs) {
      promptParts.push(`# PERSOONLIJKE VOORKEUREN\n${personalPrefs}`);
    }

    // Project configuration (if enabled and project selected)
    const projectConfig = selectedProject?.technical_config_markdown;
    if (includeProjectConfig && projectConfig) {
      promptParts.push(`# PROJECT CONFIGURATIE\n${projectConfig}`);
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
        no_design: "BLIJF AF VAN HET DESIGN - alleen functionaliteit/logica"
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
  };

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

  const generatedPrompt = buildStructuredPrompt();
  
  // Maak task checks gebaseerd op geselecteerde gedachten
  const generateTaskChecks = () => {
    return selectedThoughtContents.map((content, i) => ({
      task_name: `Deeltaak ${i + 1}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
      full_description: content,
      is_checked: false
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

  const handleCopyPrompt = async () => {
    const textToCopy = improvedPrompt || generatedPrompt;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success("Prompt gekopieerd! Opslaan...");
    
    // Direct save logic
    try {
      const defaultTitle = selectedProject 
        ? `[${selectedProject.name}] ${new Date().toLocaleString('nl-NL')}`
        : `Multi-Step ${new Date().toLocaleString('nl-NL')}`;
        
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

      // Create item
      await createMultipromptMutation.mutateAsync({
        title: defaultTitle,
        type: "multiprompt",
        content: textToCopy,
        used_thoughts: selectedThoughts,
        start_template_id: startTemplateId || null,
        end_template_id: endTemplateId || null,
        task_checks: generateTaskChecks(),
        project_id: selectedProjectId || null
      });
      
      // Delete ONLY selected/used thoughts
      if (selectedThoughts.length > 0) {
        await deleteUsedThoughtsMutation.mutateAsync(selectedThoughts);
      }

      // Reload
      resetBuilder();
      window.location.href = "/Multiprompt";

    } catch (e) {
      console.error("Direct save failed:", e);
      toast.error("Opslaan mislukt: " + e.message);
      setCopied(false);
    }
  };

  const handleSaveAsPrompt = async () => {
    try {
      const finalPrompt = improvedPrompt || generatedPrompt;
      const defaultTitle = selectedProject 
        ? `[${selectedProject.name}] ${new Date().toLocaleString('nl-NL')}`
        : `Multi-Step ${new Date().toLocaleString('nl-NL')}`;
        
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
        used_thoughts: selectedThoughts,
        start_template_id: startTemplateId || null,
        end_template_id: endTemplateId || null,
        task_checks: taskChecks,
        project_id: selectedProjectId || null
      });
      
      // 2. Delete ONLY selected/used thoughts
      if (selectedThoughts.length > 0) {
        await deleteUsedThoughtsMutation.mutateAsync(selectedThoughts);
      }

      // 3. Close dialog and Hard Reload as requested to clear all state
      setShowControlDialog(false);
      resetBuilder();
      window.location.href = "/Multiprompt";

    } catch (e) {
      console.error("Save failed:", e);
      toast.error("Opslaan mislukt: " + (e.message || "Onbekende fout"));
    }
  };

  const handleSaveAsCheck = async () => {
    setIsSavingAll(true);
    try {
      // 1. Save all thoughts state to DB
      for (const thought of localThoughts) {
        await base44.entities.Thought.update(thought.id, {
          content: thought.content || "",
          image_urls: thought.image_urls || [],
          is_selected: selectedThoughts.includes(thought.id),
          project_id: thought.project_id
        });
      }
      queryClient.invalidateQueries({ queryKey: ['thoughts'] });
      
      // 2. Save as Item with is_pending_check flag
      const finalPrompt = improvedPrompt || generatedPrompt;
      const defaultTitle = selectedProject 
        ? `[${selectedProject.name}] Controle ${new Date().toLocaleString('nl-NL')}`
        : `Controle ${new Date().toLocaleString('nl-NL')}`;
        
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
        notes: controlNotes
      });

      // 3. Hard Reload to reset state
      resetBuilder();
      window.location.href = "/Multiprompt";

    } catch (error) {
      console.error("Save error:", error);
      toast.error("Kon niet opslaan: " + (error.message || "Onbekende fout"));
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
    toast.info("Prompt gesloten");
  };

  const toggleTaskCheck = (index) => {
    const newChecks = [...taskChecks];
    newChecks[index].is_checked = !newChecks[index].is_checked;
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
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Multi-Step Builder
          </h1>
          <p className="text-slate-600 mt-2">{t("collectThoughts")}</p>
        </div>

        {/* Project Selector Bar */}
        <Card className={`mb-6 ${selectedProject ? `border-2 ${projectBorderColors[selectedProject.color]}` : ''}`}>
          <CardContent className="py-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-slate-500" />
                <span className="font-medium text-slate-700">{t("project")}:</span>
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
                  {t("allProjects")}
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
                          {t("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteProjectMutation.mutate(project.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  );
                })}
                
                {/* Quick Add Project Button */}
                <Dialog>
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
                      <DialogTitle>{t("newProject")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <Input
                        placeholder={t("projectName")}
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                      />
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">{t("color")}</label>
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
                        placeholder={t("descriptionOptional")}
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
                        {t("addProject")}
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
              <DialogTitle>{t("editProject")}</DialogTitle>
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
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Mapping Prompt
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
                  {t("cancel")}
                </Button>
                <Button onClick={handleSaveEditProject} className="bg-indigo-600 hover:bg-indigo-700">
                  {t("save")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Tabs defaultValue="build" className="space-y-6">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="build" className="data-[state=active]:bg-white">
              <Layers className="w-4 h-4 mr-2" />
              {t("buildPrompt")}
            </TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-white">
              <FileText className="w-4 h-4 mr-2" />
              {t("templates")}
            </TabsTrigger>
            <TabsTrigger value="projects" className="data-[state=active]:bg-white">
              <FolderOpen className="w-4 h-4 mr-2" />
              {t("myProjects")}
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
                        {t("tasks")}
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
                          placeholder={t("taskPlaceholder")}
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
                            accept="image/*"
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
                            title="Screenshot toevoegen"
                          >
                            {isUploadingNewImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
                          </Button>
                          
                          {/* Focus Type Selector */}
                          <Select 
                            value={newThoughtFocus} 
                            onValueChange={setNewThoughtFocus}
                          >
                            <SelectTrigger className="h-7 text-xs w-auto min-w-[100px] border-dashed bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="both">Design + Logica</SelectItem>
                              <SelectItem value="design">Alleen Design</SelectItem>
                              <SelectItem value="logic">Alleen Logica</SelectItem>
                              <SelectItem value="no_design">Geen Design</SelectItem>
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
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {isProjectLimitReached ? "Limiet bereikt" : "Step"}
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
                              {t("deselectAll")}
                            </>
                          ) : (
                            <>
                              <CheckSquare className="w-4 h-4 mr-2" />
                              {t("selectAll")}
                            </>
                          )}
                        </Button>
                      )}

                      <Select value={groupBy} onValueChange={setGroupBy}>
                        <SelectTrigger className="w-[130px]">
                          <SelectValue placeholder="Groepeer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date">Op invoer</SelectItem>
                          <SelectItem value="page">Pagina</SelectItem>
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
                                        onToggleSelect={() => toggleThoughtSelection(thought.id)}
                                        onDelete={() => deleteThoughtMutation.mutate(thought.id)}
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
                                {t("noTasksYet")}{selectedProject ? ` ${selectedProject.name}` : ''}. {t("startTyping")}
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
                    <CardTitle>{t("templates")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          {t("startText")}
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
                            <SelectItem value="none">{t("noTemplate")}</SelectItem>
                            {startTemplates.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          {t("endText")}
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
                            <SelectItem value="none">{t("noTemplate")}</SelectItem>
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
                      <span>{t("preview")}</span>
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
                          <span className="hidden sm:inline">{isImproving ? t("improving") : t("improveWithAI")}</span>
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
                          <span className="hidden sm:inline">{copied ? t("copied") : t("copyAndContinue")}</span>
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {improvedPrompt && (
                      <div className="mb-3">
                        <Badge className="bg-green-100 text-green-700 mb-2">{t("aiImproved")}</Badge>
                      </div>
                    )}
                    <div className="bg-slate-900 rounded-xl relative group">
                      <div className="p-4 max-h-[400px] overflow-auto">
                        <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap">
                          {improvedPrompt || generatedPrompt || t("selectTasksAndTemplates")}
                        </pre>
                      </div>
                      {(generatedPrompt || improvedPrompt) && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(improvedPrompt || generatedPrompt);
                            toast.success("Prompt gekopieerd!");
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
                        {t("selectTasksLeft")}
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
                    {t("promptCopied")}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <p className="text-sm text-slate-600">
                    {t("promptCopiedDesc")}
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
                    placeholder={t("notesOptional")}
                    value={controlNotes}
                    onChange={(e) => setControlNotes(e.target.value)}
                    className="min-h-[60px]"
                  />

                  {/* Title for saving */}
                  <Input
                    placeholder={t("titleForSave")}
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
                      {promptTitle.trim() ? t("saveAsPrompt") : t("quickSave")}
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
                      {isSavingAll ? t("saving") : t("saveAsCheck")}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleDeleteAndClear}
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t("deleteTasks")}
                    </Button>
                    <Button
                      onClick={handleDiscardPrompt}
                      variant="ghost"
                    >
                      <X className="w-4 h-4 mr-2" />
                      {t("closeOnly")}
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
                    <CardTitle className={selectedProject ? `text-${selectedProject.color}-700` : "text-green-700"}>{t("startTexts")}</CardTitle>
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
                      <p className="text-slate-400 text-center py-4">{t("noStartTexts")}</p>
                    )}
                  </CardContent>
                </Card>

                <Card className={selectedProject ? `border-2 ${projectBorderColors[selectedProject.color]}` : ''}>
                  <CardHeader className="pb-3">
                    <CardTitle className={selectedProject ? `text-${selectedProject.color}-700` : "text-orange-700"}>{t("endTexts")}</CardTitle>
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
                      <p className="text-slate-400 text-center py-4">{t("noEndTexts")}</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Add Template Form */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("newTemplate")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder={t("templateName")}
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                  />
                  <Select value={newTemplateType} onValueChange={setNewTemplateType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="start">{t("startText")}</SelectItem>
                      <SelectItem value="eind">{t("endText")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder={t("templateContent")}
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
                    {t("saveTemplate")}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Edit Template Dialog */}
            <Dialog open={editTemplateDialogOpen} onOpenChange={setEditTemplateDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("edit")} Template</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    placeholder={t("templateName")}
                    value={editTemplateName}
                    onChange={(e) => setEditTemplateName(e.target.value)}
                  />
                  <Textarea
                    placeholder={t("templateContent")}
                    value={editTemplateContent}
                    onChange={(e) => setEditTemplateContent(e.target.value)}
                    className="min-h-[200px]"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setEditTemplateDialogOpen(false)}>
                      {t("cancel")}
                    </Button>
                    <Button onClick={handleSaveEditTemplate} className="bg-indigo-600 hover:bg-indigo-700">
                      {t("save")}
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
                  <CardTitle>{t("newProject")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder={t("projectName")}
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                  />
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">{t("color")}</label>
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
                    placeholder={t("descriptionOptional")}
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
                    {t("addProject")}
                  </Button>
                </CardContent>
              </Card>

              {/* Projects List */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("myProjects")}</CardTitle>
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
                    <p className="text-slate-400 text-center py-8">{t("noProjectsYet")}</p>
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