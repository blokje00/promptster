import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, GripVertical, Image as ImageIcon, Loader2, Plus, Palette, Code, Ban } from "lucide-react";
import { toast } from "sonner";

const projectColors = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500"
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

const focusLabels = {
  both: { label: "Design + Logica", icon: null, color: "text-slate-500" },
  design: { label: "Alleen Design", icon: Palette, color: "text-pink-600" },
  logic: { label: "Alleen Logica", icon: Code, color: "text-blue-600" },
  no_design: { label: "Geen Design", icon: Ban, color: "text-orange-600" }
};

export default function ThoughtCard({ 
  thought, 
  project, 
  isSelected, 
  onToggleSelect, 
  onDelete,
  onUpdateImages,
  onUpdateContent,
  onUpdateFocus,
  dragHandleProps,
  showDragHandle = true
}) {
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
      toast.error("Alleen afbeeldingen zijn toegestaan");
      return;
    }

    setIsUploading(true);
    
    try {
      // Create a new file with thought context in the name
      const thoughtPreview = (thought.content || 'no-content').substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_');
      const timestamp = Date.now();
      const extension = file.name.split('.').pop() || 'png';
      const newFileName = `thought_${thought.id}_${thoughtPreview}_${timestamp}.${extension}`;
      
      // Create new file with renamed name
      const renamedFile = new File([file], newFileName, { type: file.type });
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file: renamedFile });
      const newImages = [...imageUrls, file_url];
      onUpdateImages(thought.id, newImages);
      toast.success("Screenshot toegevoegd");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Kon afbeelding niet uploaden");
    } finally {
      setIsUploading(false);
    }
  }, [imageUrls, onUpdateImages, thought.id, thought.content]);

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = async (e) => {
      if (!cardRef.current?.contains(document.activeElement) && document.activeElement !== cardRef.current) {
        return;
      }
      
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            handleImageUpload(file);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [thought.id, imageUrls]);

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
    toast.success("Screenshot verwijderd");
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
          {project && (
            <Badge className={`${projectColors[project.color]} text-white text-xs mb-1`}>
              {project.name}
            </Badge>
          )}
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
            <p 
              className="text-sm text-slate-700 whitespace-pre-wrap cursor-text hover:bg-slate-50 rounded p-1 -m-1" 
              onClick={handleStartEditing}
              title="Klik om te bewerken"
            >
              {thought.content || <span className="text-slate-400 italic">Klik om tekst toe te voegen...</span>}
            </p>
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
              {isUploading ? "Uploaden..." : "Afbeelding"}
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
                  <span className="text-slate-600">Design + Logica</span>
                </SelectItem>
                <SelectItem value="design">
                  <span className="flex items-center gap-1 text-pink-600">
                    <Palette className="w-3 h-3" /> Alleen Design
                  </span>
                </SelectItem>
                <SelectItem value="logic">
                  <span className="flex items-center gap-1 text-blue-600">
                    <Code className="w-3 h-3" /> Alleen Logica
                  </span>
                </SelectItem>
                <SelectItem value="no_design">
                  <span className="flex items-center gap-1 text-orange-600">
                    <Ban className="w-3 h-3" /> Geen Design
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>
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
  );
}