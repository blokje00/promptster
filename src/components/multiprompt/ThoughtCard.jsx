import React, { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Trash2, 
  Image as ImageIcon, 
  GripVertical, 
  MoreHorizontal,
  Copy
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { uploadImageToSupabase } from "@/components/lib/uploadImage";
import ContextSelector from "./ContextSelector";
import { toast } from "sonner";

/**
 * ThoughtCard - Volledig herschreven logica, behoud van UI.
 * Beheert zijn eigen edit-state en commit naar DB bij blur/enter.
 */
export default function ThoughtCard({
  thought,
  project,
  isSelected,
  onToggleSelect,
  onDelete,
  onUpdateContent, // Via parent (useMutation)
  onUpdateImages,  // Via parent (useMutation)
  onUpdateFocus,   // Via parent (useMutation)
  onUpdateContext, // Via parent (useMutation)
  dragHandleProps,
  showDragHandle = false
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(thought.content);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Focus opties en styling
  const focusOptions = {
    both: { label: "Both", color: "bg-slate-100 text-slate-700" },
    design: { label: "Design", color: "bg-pink-100 text-pink-700" },
    logic: { label: "Logic", color: "bg-blue-100 text-blue-700" },
    no_design: { label: "No Design", color: "bg-orange-100 text-orange-700" },
    discuss: { label: "Discuss", color: "bg-purple-100 text-purple-700" }
  };

  const currentFocus = focusOptions[thought.focus_type || 'both'] || focusOptions.both;

  // Handlers
  const handleSaveContent = () => {
    if (editValue !== thought.content) {
      onUpdateContent(thought.id, editValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveContent();
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadImageToSupabase(file);
      const currentImages = thought.image_urls || [];
      onUpdateImages(thought.id, [...currentImages, url]);
      toast.success("Image added");
    } catch (error) {
      console.error(error);
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (urlToRemove) => {
    const currentImages = thought.image_urls || [];
    onUpdateImages(thought.id, currentImages.filter(url => url !== urlToRemove));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(thought.content);
    toast.success("Copied");
  };

  return (
    <Card className={`group relative transition-all duration-200 ${isSelected ? 'ring-2 ring-indigo-500 shadow-md' : 'hover:shadow-sm border-slate-200'}`}>
      <div className="p-3 flex gap-3 items-start">
        {/* Drag Handle & Checkbox */}
        <div className="flex flex-col items-center gap-2 pt-1">
          {showDragHandle && (
            <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
              <GripVertical className="w-4 h-4" />
            </div>
          )}
          <Checkbox 
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Header: Project Badge & Context */}
          <div className="flex flex-wrap items-center gap-2">
            {project && (
              <Badge variant="outline" className={`text-[10px] px-1.5 h-5 bg-white border-slate-200 text-slate-600`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 bg-${project.color}-500`} />
                {project.name}
              </Badge>
            )}
            
            {/* Context Display/Edit */}
            <div className="flex-1">
               <ContextSelector
                 value={{
                   target_page: thought.target_page,
                   target_component: thought.target_component,
                   target_domain: thought.target_domain
                 }}
                 onChange={(newCtx) => onUpdateContext(thought.id, newCtx)}
                 compact={true}
                 readOnly={!isSelected} // Alleen bewerken als geselecteerd (of altijd, afhankelijk van UX voorkeur)
               />
            </div>

            {/* Focus Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${currentFocus.color}`}>
                  {currentFocus.label}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {Object.entries(focusOptions).map(([key, conf]) => (
                  <DropdownMenuItem key={key} onClick={() => onUpdateFocus(thought.id, key)}>
                    {conf.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Text Content */}
          <div className="relative">
            {isEditing ? (
              <Textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSaveContent}
                onKeyDown={handleKeyDown}
                autoFocus
                className="min-h-[60px] text-sm resize-none focus-visible:ring-1"
              />
            ) : (
              <div 
                onClick={() => setIsEditing(true)}
                className="text-sm text-slate-700 whitespace-pre-wrap cursor-text min-h-[20px] hover:bg-slate-50 rounded px-1 -ml-1 transition-colors"
              >
                {thought.content}
              </div>
            )}
          </div>

          {/* Images */}
          {(thought.image_urls?.length > 0 || isUploading) && (
            <div className="flex flex-wrap gap-2">
              {thought.image_urls?.map((url, idx) => (
                <div key={idx} className="relative group/img w-16 h-16 rounded-md overflow-hidden border border-slate-200">
                  <img src={url} alt="attachment" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeImage(url)}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
              {isUploading && (
                <div className="w-16 h-16 rounded-md bg-slate-100 flex items-center justify-center animate-pulse">
                  <ImageIcon className="w-4 h-4 text-slate-400" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="w-4 h-4 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={copyToClipboard}>
                <Copy className="w-4 h-4 mr-2" /> Copy text
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <ImageIcon className="w-4 h-4 mr-2" /> Add image
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleImageUpload}
          />
        </div>
      </div>
    </Card>
  );
}