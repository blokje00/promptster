import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X, GripVertical, Image as ImageIcon, Loader2, Plus } from "lucide-react";
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

export default function ThoughtCard({ 
  thought, 
  project, 
  isSelected, 
  onToggleSelect, 
  onDelete,
  onUpdateImages,
  dragHandleProps 
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const cardRef = useRef(null);

  // Get images from thought - always ensure array
  const imageUrls = thought.image_urls || [];

  const handleImageUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error("Alleen afbeeldingen zijn toegestaan");
      return;
    }

    setIsUploading(true);
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      // Add to existing images array
      const newImages = [...imageUrls, file_url];
      onUpdateImages(thought.id, newImages);
      toast.success("Screenshot toegevoegd");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Kon afbeelding niet uploaden");
    } finally {
      setIsUploading(false);
    }
  };

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
        {dragHandleProps && (
          <div 
            {...dragHandleProps}
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
          <p className="text-sm text-slate-700 whitespace-pre-wrap cursor-pointer" onClick={onToggleSelect}>
            {thought.content || <span className="text-slate-400 italic">Geen tekst</span>}
          </p>
          
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
          
          {/* Upload zone - always visible */}
          <div className="mt-2">
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
              {isUploading ? "Uploaden..." : "Afbeelding toevoegen"}
            </button>
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