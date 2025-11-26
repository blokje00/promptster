import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X, GripVertical, Image as ImageIcon, Loader2 } from "lucide-react";
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
  dragHandleProps 
}) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [localImageUrl, setLocalImageUrl] = useState(thought.image_url);
  const fileInputRef = useRef(null);
  const cardRef = useRef(null);

  // Sync local image with thought
  useEffect(() => {
    setLocalImageUrl(thought.image_url);
  }, [thought.image_url]);

  const updateThoughtMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Thought.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thoughts'] });
    },
  });

  const handleImageUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error("Alleen afbeeldingen zijn toegestaan");
      return;
    }

    setIsUploading(true);
    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setLocalImageUrl(previewUrl);
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setLocalImageUrl(file_url);
      updateThoughtMutation.mutate({
        id: thought.id,
        data: { image_url: file_url }
      });
      toast.success("Screenshot toegevoegd");
    } catch (error) {
      setLocalImageUrl(null);
      toast.error("Kon afbeelding niet uploaden");
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(previewUrl);
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
  }, [thought.id]);

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

  const handleRemoveImage = (e) => {
    e.stopPropagation();
    setLocalImageUrl(null);
    updateThoughtMutation.mutate({
      id: thought.id,
      data: { image_url: null }
    });
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
            {thought.content}
          </p>
          
          {/* Image display */}
          {localImageUrl && (
            <div className="mt-2 relative inline-block">
              <img 
                src={localImageUrl} 
                alt="Screenshot" 
                className="max-w-full max-h-32 rounded border border-slate-200"
              />
              {isUploading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                </div>
              )}
              <button
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
              >
                ×
              </button>
            </div>
          )}
          
          {/* Upload zone */}
          {!localImageUrl && (
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
                  <ImageIcon className="w-3 h-3" />
                )}
                {isUploading ? "Uploaden..." : "Drop, plak (Ctrl+V) of klik"}
              </button>
            </div>
          )}
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