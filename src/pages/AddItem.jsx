import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Star } from "lucide-react";
import ScreenshotUploader from "../components/media/ScreenshotUploader";
import ZipUploadZone from "../components/dashboard/ZipUploadZone";
import ItemDetailsForm from "../components/items/ItemDetailsForm";
import StatusSelector from "../components/items/StatusSelector";
import ContentSection from "../components/items/ContentSection";
import PublishVersionSection from "../components/items/PublishVersionSection";
import { projectColors } from "@/components/lib/constants";
import AccessGuard from "../components/auth/AccessGuard";

export default function AddItem() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return await base44.entities.Project.filter({ created_by: currentUser.email }) || [];
    },
    enabled: !!currentUser?.email,
  });

  const [selectedProjectId, setSelectedProjectId] = useState(() => localStorage.getItem('lastSelectedProjectId') || "");
  
  // Find selected project for styling
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const borderColorClass = selectedProject ? `border-${selectedProject.color}-500` : 'border-slate-200';
  
  const [formData, setFormData] = useState({
    title: "",
    type: "prompt",
    project_id: localStorage.getItem('lastSelectedProjectId') || null,
    content: "",
    language: "javascript",
    description: "",
    tags: [],
    is_favorite: false,
    notes: "",
    screenshot_ids: [],
    zip_files: [],
    is_publish_version: false,
    publish_timestamp: "",
    publish_working_notes: "",
    publish_reason: "",
    status: "open"
  });
  const [tagInput, setTagInput] = useState("");
  const [isRestoringDraft, setIsRestoringDraft] = useState(true);

  // Autosave
  useEffect(() => {
    if (!isRestoringDraft && currentUser?.id) {
      const draftData = { ...formData, timestamp: new Date().getTime() };
      localStorage.setItem(`additem_draft_${currentUser.id}`, JSON.stringify(draftData));
      localStorage.setItem(`additem_tag_draft_${currentUser.id}`, tagInput);
    }
  }, [formData, tagInput, currentUser, isRestoringDraft]);

  // Restore draft
  useEffect(() => {
    if (currentUser?.id) {
      const savedDraft = localStorage.getItem(`additem_draft_${currentUser.id}`);
      const savedTag = localStorage.getItem(`additem_tag_draft_${currentUser.id}`);
      
      if (savedDraft) {
        try {
          const parsedDraft = JSON.parse(savedDraft);
          if (new Date().getTime() - parsedDraft.timestamp < 24 * 60 * 60 * 1000) {
            delete parsedDraft.timestamp;
            setFormData(prev => ({...prev, ...parsedDraft}));
          }
        } catch (e) {
          console.error("Failed to parse draft", e);
        }
      }
      
      if (savedTag) setTagInput(savedTag);
      setIsRestoringDraft(false);
    }
  }, [currentUser]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Item.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      if (currentUser?.id) {
        localStorage.removeItem(`additem_draft_${currentUser.id}`);
        localStorage.removeItem(`additem_tag_draft_${currentUser.id}`);
      }
      navigate(createPageUrl("Dashboard"));
    },
  });

  const handleProjectChange = (projectId) => {
    setSelectedProjectId(projectId);
    localStorage.setItem('lastSelectedProjectId', projectId);
    setFormData(prev => ({ ...prev, project_id: projectId || null }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData({ ...formData, tags: formData.tags.filter(tag => tag !== tagToRemove) });
  };

  const handleContentPaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          try {
            const { uploadImageToSupabase } = await import("@/components/lib/uploadImage");
            const url = await uploadImageToSupabase(file);
            if (url) {
              setFormData(prev => ({ ...prev, screenshot_ids: [...prev.screenshot_ids, url] }));
            }
          } catch (error) {
            console.error('Image paste failed:', error);
          }
        }
      }
    }
  };

  return (
    <AccessGuard pageType="protected">
    <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => navigate(createPageUrl("Dashboard"))} className="rounded-xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Add New Item
                </h1>
                <p className="text-slate-600 mt-1">Add a new prompt or code snippet</p>
              </div>
            </div>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              <Save className="w-4 h-4 mr-2" />
              {createMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>

          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={!selectedProjectId ? "default" : "outline"}
                size="sm"
                onClick={() => handleProjectChange("")}
                className={!selectedProjectId ? "bg-slate-700" : ""}
              >
                No Project
              </Button>
              {projects.map(project => (
                <Button
                  key={project.id}
                  variant={selectedProjectId === project.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleProjectChange(project.id)}
                  className={`${selectedProjectId === project.id ? `${projectColors[project.color]} border-0` : ""}`}
                >
                  <div className={`w-3 h-3 rounded-full ${projectColors[project.color]} mr-2 border border-white/50`} />
                  {project.name}
                </Button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <Card className={`shadow-lg border-2 ${selectedProject ? projectColors[selectedProject.color].replace('bg-', 'border-') : 'border-slate-200'}`}>
              <CardHeader className={`border-b ${selectedProject ? projectColors[selectedProject.color].replace('bg-', 'border-').replace('hover:', '') + ' bg-opacity-5' : 'border-slate-100'}`}>
                <CardTitle>Item Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <ItemDetailsForm formData={formData} onChange={setFormData} />
                <StatusSelector status={formData.status} onChange={(status) => setFormData({...formData, status})} />
                <ContentSection
                  content={formData.content}
                  notes={formData.notes}
                  tags={formData.tags}
                  tagInput={tagInput}
                  onContentChange={(content) => setFormData({...formData, content})}
                  onNotesChange={(notes) => setFormData({...formData, notes})}
                  onTagInputChange={setTagInput}
                  onAddTag={addTag}
                  onRemoveTag={removeTag}
                  onContentPaste={handleContentPaste}
                />

                <div className="space-y-2">
                  <ScreenshotUploader
                    screenshotIds={formData.screenshot_ids}
                    onChange={(ids) => setFormData({...formData, screenshot_ids: ids})}
                    projectId={formData.project_id}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">ZIP Files (Code)</label>
                  <ZipUploadZone
                    zipFiles={formData.zip_files}
                    onZipFilesChange={(files) => setFormData({...formData, zip_files: files})}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={formData.is_favorite ? "default" : "outline"}
                    onClick={() => setFormData({...formData, is_favorite: !formData.is_favorite})}
                    className={formData.is_favorite ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                  >
                    <Star className={`w-4 h-4 mr-2 ${formData.is_favorite ? 'fill-white' : ''}`} />
                    {formData.is_favorite ? 'Favorite' : 'Mark as favorite'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="mt-6">
              <PublishVersionSection formData={formData} onChange={setFormData} />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="outline" onClick={() => navigate(createPageUrl("Dashboard"))}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-4 h-4 mr-2" />
                {createMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
          </div>
          </div>
          </AccessGuard>
          );
          }