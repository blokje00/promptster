import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, GripVertical, Image as ImageIcon, Loader2, Plus, Palette, Code, Ban, MoreHorizontal, Copy } from "lucide-react";
import { toast } from "sonner";
import ContextSelector from "./ContextSelector";
import { projectColors, projectBorderColors } from "@/components/lib/constants";
import { uploadImageToSupabase } from "@/components/lib/uploadImage";
import { useLanguage } from "../i18n/LanguageContext";

const focusLabels = {
  both: { label: "Design + Logic", icon: null, color: "text-slate-500" },
  design: { label: "Design Only", icon: Palette, color: "text-pink-600" },
  logic: { label: "Logic Only", icon: Code, color: "text-blue-600" },
  no_design: { label: "No Design", icon: Ban, color: "text-orange-600" }
};

/**
 * Thought card component voor weergave van individuele taken.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.thought - Thought data object
 * @param {Object} props.project - Gekoppeld project (optioneel)
 * @param {boolean} props.isSelected - Selectie status
 * @param {Function} props.onToggleSelect - Toggle selectie handler
 * @param {Function} props.onDelete - Delete handler
 * @param {Function} props.onUpdateImages - Image update handler
 * @param {Function} props.onUpdateContent - Content update handler
 * @param {Function} props.onUpdateFocus - Focus type update handler
 * @param {Function} props.onUpdateContext - Context update handler
 * @param {Object} props.dragHandleProps - DnD drag handle props
 * @param {boolean} props.showDragHandle - Toon drag handle
 */
export default function ThoughtCard({ 
  thought, 
  project, 
  isSelected, 
  onToggleSelect, 
  onDelete,
  onUpdateImages,
  onUpdateContent,
  onUpdateFocus,
  onUpdateContext,
  dragHandleProps,
  showDragHandle = true
}) {
  const { t } = useLanguage();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(thought.content || "");
  const fileInputRef = useRef(null);
  const cardRef = useRef(null);
  const textareaRef = useRef(null);

  // Get images from thought - always ensure array
  const imageUrls = thought.image_urls || [];

  const handleImageUpload = React.useCallback(async (file) => {
  if (!file || !file.type.startsWith('image/')) {
    toast.error(t("onlyImagesAllowed") || "Alleen afbeeldingen zijn toegestaan");
    return;
  }

  setIsUploading(true);

  try {
    // Use standardized upload util for universal Supabase URL
    const file_url = await uploadImageToSupabase(file);

    const newImages = [...imageUrls, file_url];
    onUpdateImages(thought.id, newImages);
    toast.success(t("screenshotAdded") || "Screenshot toegevoegd");
  } catch (error) {
    console.error("Upload error:", error);
    toast.error(t("imageUploadFailed") || "Kon afbeelding niet uploaden");
  } finally {
    setIsUploading(false);
  }
  }, [imageUrls, onUpdateImages, thought.id, t]);

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = async (e) => {
      if (!cardRef.current?.contains(document.activeElement) && 
          document.activeElement !== cardRef.current) {
        return;
      }
      
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handleImageUpload(file);
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handleImageUpload]); // handleImageUpload is al useCallback

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleRemoveImage = (e, indexToRemove) => {
    e.stopPropagation();
    const newImages = imageUrls.filter((_, idx) => idx !== indexToRemove);
    onUpdateImages(thought.id, newImages);
    toast.success(t("screenshotRemoved") || "Screenshot verwijderd");
  };

  const handleCopyContent = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(thought.content || "");
    toast.success(t("copied") || "Gekopieerd!");
  };

  const handleStartEditing = (e) => {
    e.stopPropagation();
    setEditContent(thought.content || "");
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleSaveEdit = () => {
    if (onUpdateContent) {
      onUpdateContent(thought.id, editContent);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(thought.content || "");
    setIsEditing(false);
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div 
      ref={cardRef}
      tabIndex={0}
      className={`p-3 rounded-lg border-2 transition-all outline-none focus:ring-2 focus:ring-indigo-300 ${
        isDragOver ? 'border-indigo-400 bg-indigo-50' :
        isSelected
          ? 'border-indigo-500 bg-indigo-50'
          : project 
            ? `${projectBorderColors[project.color]} bg-white`
            : 'border-slate-200 hover:border-slate-300'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="flex items-start gap-3">
        {showDragHandle && (
          <div 
            {...(dragHandleProps || {})}
            className="text-slate-400 cursor-grab active:cursor-grabbing mt-1"
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}
        <Checkbox 
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          className="mt-1 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
        />
        <div className="flex-1 min-w-0">
          <div className="flex gap-1 mb-1 flex-wrap">
            {project && (
              <Badge className={`${projectColors[project.color]} text-white text-xs`}>
                {project.name}
              </Badge>
            )}
            {thought.retry_from_item_id && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs flex items-center gap-1">
                <Loader2 className="w-3 h-3" /> Retry
              </Badge>
            )}
          </div>
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleEditKeyDown}
                onBlur={handleSaveEdit}
                className="w-full text-sm text-slate-700 p-2 border rounded-md min-h-[60px] focus:outline-none focus:ring-2 focus:ring-indigo-300"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ) : (
            <div 
              className="text-sm text-slate-700 whitespace-pre-wrap cursor-text hover:bg-slate-50 rounded p-1 -m-1 h-[12em] md:h-[4.5em] overflow-y-auto" 
              onClick={handleStartEditing}
              title={t("clickToEdit") || "Klik om te bewerken"}
            >
              {thought.content || <span className="text-slate-400 italic">{t("clickToAddText") || "Klik om tekst toe te voegen..."}</span>}
            </div>
          )}
          
          {/* Images display - show ALL images */}
          {imageUrls.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {imageUrls.map((url, idx) => (
                <div key={idx} className="relative inline-block">
                  <img 
                    src={url} 
                    alt={`Screenshot ${idx + 1}`} 
                    className="w-16 h-16 object-cover rounded border border-slate-200"
                  />
                  <button
                    onClick={(e) => handleRemoveImage(e, idx)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Upload zone and Focus selector */}
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files[0] && handleImageUpload(e.target.files[0])}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={isUploading}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
            >
              {isUploading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Plus className="w-3 h-3" />
              )}
              {isUploading ? (t("uploading") || "Uploaden...") : (t("addImage") || "Afbeelding")}
            </button>

            {/* Focus Type Selector */}
            <Select 
              value={thought.focus_type || "both"} 
              onValueChange={(value) => onUpdateFocus && onUpdateFocus(thought.id, value)}
            >
              <SelectTrigger className="h-6 text-xs w-auto min-w-[100px] border-dashed" onClick={(e) => e.stopPropagation()}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">
                  <span className="text-slate-600">Design + Logic</span>
                </SelectItem>
                <SelectItem value="design">
                  <span className="flex items-center gap-1 text-pink-600">
                    <Palette className="w-3 h-3" /> Design Only
                  </span>
                </SelectItem>
                <SelectItem value="logic">
                  <span className="flex items-center gap-1 text-blue-600">
                    <Code className="w-3 h-3" /> Logic Only
                  </span>
                </SelectItem>
                <SelectItem value="no_design">
                  <span className="flex items-center gap-1 text-orange-600">
                    <Ban className="w-3 h-3" /> No Design
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="h-4 w-px bg-slate-300 mx-1" />

            {/* Context Selector */}
            <div onClick={(e) => e.stopPropagation()}>
              <ContextSelector
                value={{
                  target_page: thought.target_page,
                  target_component: thought.target_component,
                  target_domain: thought.target_domain,
                  ai_prediction: thought.ai_prediction
                }}
                onChange={(newContext) => onUpdateContext && onUpdateContext(thought.id, newContext)}
                thoughtText={thought.content}
                compact={true}
                selectedProject={project}
                enableAISuggestions={false} // Disable AI here to prevent popup spam on list
              />
            </div>

            <div className="h-4 w-px bg-slate-300 mx-1" />

            <Select onValueChange={(val) => onUpdateContent && onUpdateContent(thought.id, (thought.content || "") + "\n\n" + val)}>
              <SelectTrigger className="h-6 text-xs w-auto min-w-[24px] px-1 border-dashed" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="w-3 h-3" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Search and replace in /pages/**/*">/pages/**/*</SelectItem>
                <SelectItem value="Search and replace in /components/**/*">/components/**/*</SelectItem>
                <SelectItem value="Search and replace in **/*">**/*</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-slate-400 hover:text-indigo-500 shrink-0"
            onClick={handleCopyContent}
            title={t("copy") || "Kopieer"}
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-slate-400 hover:text-red-500 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}