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
    <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          }