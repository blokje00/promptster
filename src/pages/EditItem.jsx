import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, X, Star, GitBranch, Copy, CheckCircle } from "lucide-react";
import FileChangesFeedback from "../components/items/FileChangesFeedback";
import TaskChecklist from "../components/items/TaskChecklist";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import ZipUploadZone from "../components/dashboard/ZipUploadZone";
import ScreenshotUploader from "../components/media/ScreenshotUploader";


export default function EditItem() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(location.search);
  const itemId = urlParams.get("id");

  const [formData, setFormData] = useState(null);
  const [tagInput, setTagInput] = useState("");
  const [contentCopied, setContentCopied] = useState(false);

  const handleCopyContent = () => {
    navigator.clipboard.writeText(formData?.content || '');
    setContentCopied(true);
    setTimeout(() => setContentCopied(false), 2000);
  };

  const { data: item, isLoading } = useQuery({
    queryKey: ['item', itemId],
    queryFn: () => base44.entities.Item.get(itemId),
    enabled: !!itemId,
  });

  useEffect(() => {
    if (item) {
      setFormData({
        ...item,
        tags: item.tags || [],
        screenshot_ids: item.screenshot_ids || [],
        zip_files: item.zip_files || [],
        is_publish_version: item.is_publish_version || false,
        publish_timestamp: item.publish_timestamp || "",
        publish_working_notes: item.publish_working_notes || "",
        publish_reason: item.publish_reason || "",
        file_changes_feedback: item.file_changes_feedback || ""
      });

      // Task 2: Handle scrolling logic
      setTimeout(() => {
        const hash = window.location.hash;
        if (hash === '#checklist') {
          const element = document.getElementById('task-checklist-section');
          if (element) element.scrollIntoView({ behavior: 'smooth' });
        } else if (hash === '#content') {
          const element = document.getElementById('content-section');
          if (element) element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500); // Small delay to ensure rendering
    }
  }, [item]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Item.update(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['item', itemId] });
      navigate(createPageUrl(`ViewItem?id=${itemId}`));
    },
  });

  /**
   * Slaat wijzigingen op inclusief task checks.
   * @param {Event} e - Form submit event
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    const { id, created_date, updated_date, created_by, ...updateData } = formData;
    updateMutation.mutate(updateData);
  };
  
  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      // Task 4: Ensure status is synced when editing form manually
      if (field === 'task_checks') {
        const hasOpen = value.some(c => c.status !== 'success');
        newData.status = hasOpen ? 'open' : 'success';
      }
      return newData;
    });
  }

  const addTag = () => {
    const newTag = tagInput.trim();
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag]
      });
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  if (isLoading || !formData) {
    return <div className="p-8"><Skeleton className="h-screen w-full" /></div>;
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">