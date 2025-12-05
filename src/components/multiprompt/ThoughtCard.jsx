import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Square, Trash2, MoreHorizontal, GripVertical, Calendar, Image as ImageIcon, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { uploadImageToSupabase } from "@/components/lib/uploadImage";
import ImageUploadZone from "../dashboard/ImageUploadZone";
import ContextSelector from "./ContextSelector";

/**
 * ThoughtCard - UI Component
 * Purely presentational logic for editing a single thought.
 * Delegates actual data mutations to parent callbacks.
 */
export default function ThoughtCard({
  thought,
  project,
  isSelected,
  onToggleSelect,
  onDelete,
  onUpdateContent,
  onUpdateImages,
  onUpdateFocus,
  onUpdateContext,
  dragHandleProps,
  showDragHandle = true
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(thought.content || "");

  // Update handlers
  const handleContentSave = () => {
    if (editedContent !== thought.content) {
      onUpdateContent(thought.id, editedContent);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleContentSave();
    }
  };

  // Image handlers
  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    try {
      // Upload all files
      const uploadPromises = Array.from(files).map(file => uploadImageToSupabase(file));
      const urls = await Promise.all(uploadPromises);
      
      const currentImages = thought.image_urls || [];
      onUpdateImages(thought.id, [...currentImages, ...urls]);
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    const currentImages = thought.image_urls || [];
    const newImages = currentImages.filter((_, index) => index !== indexToRemove);
    onUpdateImages(thought.id, newImages);
  };

  // Focus type display mapping
  const focusConfig = {
    both: { label: "Design & Logic", color: "bg-blue-100 text-blue-700 border-blue-200" },
    design: { label: "Design Only", color: "bg-purple-100 text-purple-700 border-purple-200" },
    logic: { label: "Logic Only", color: "bg-amber-100 text-amber-700 border-amber-200" },
    no_design: { label: "No Design", color: "bg-red-100 text-red-700 border-red-200" },
    discuss: { label: "Discuss", color: "bg-green-100 text-green-700 border-green-200" }
  };

  const currentFocus = focusConfig[thought.focus_type] || focusConfig.both;

  return (
    <div className={`group relative flex gap-3 p-3 rounded-lg border transition-all ${
      isSelected ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-300'
    }`}>
      {/* Drag Handle */}
      {showDragHandle && (
        <div 
          {...dragHandleProps}
          className="mt-2 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-5 h-5" />
        </div>
      )}

      {/* Selection Checkbox */}
      <div className="mt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className={`transition-colors ${isSelected ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-500'}`}
        >
          {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Header: Project Badge & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {project && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-slate-100 text-slate-600 border-slate-200">
                <div className={`w-1.5 h-1.5 rounded-full mr-1.5 bg-${project.color}-500`} />
                {project.name}
              </Badge>
            )}
            {thought.retry_from_item_id && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-orange-600 border-orange-200 bg-orange-50">
                Retry
              </Badge>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => onDelete(thought.id)}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Editable Content */}
        <div onClick={() => setIsEditing(true)}>
          {isEditing ? (
            <Textarea
              autoFocus
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              onBlur={handleContentSave}
              onKeyDown={handleKeyDown}
              className="min-h-[60px] text-sm resize-none bg-white"
            />
          ) : (
            <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed cursor-text">
              {thought.content}
            </p>
          )}
        </div>

        {/* Images */}
        {thought.image_urls && thought.image_urls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {thought.image_urls.map((url, idx) => (
              <div key={idx} className="relative group/image">
                <img 
                  src={url} 
                  alt={`Attachment ${idx}`} 
                  className="w-16 h-16 object-cover rounded-md border border-slate-200"
                />
                <button
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Controls Footer */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Focus Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${currentFocus.color}`}>
                {currentFocus.label}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {Object.entries(focusConfig).map(([key, config]) => (
                <DropdownMenuItem 
                  key={key}
                  onClick={() => onUpdateFocus(thought.id, key)}
                  className="text-xs"
                >
                  {config.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-3 w-px bg-slate-200" />

          {/* Context Selector */}
          <ContextSelector 
            value={{
              target_page: thought.target_page,
              target_component: thought.target_component,
              target_domain: thought.target_domain
            }}
            onChange={(newCtx) => onUpdateContext(thought.id, newCtx)}
            compact={true}
            thoughtText={thought.content}
          />

          <div className="h-3 w-px bg-slate-200" />

          {/* Add Image Button */}
          <div className="relative">
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              id={`img-upload-${thought.id}`}
              onChange={(e) => handleImageUpload(e.target.files)}
            />
            <label 
              htmlFor={`img-upload-${thought.id}`}
              className="cursor-pointer flex items-center gap-1 text-[10px] text-slate-500 hover:text-indigo-600 px-1.5 py-1 rounded hover:bg-slate-100"
            >
              <ImageIcon className="w-3 h-3" />
              Add Image
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}