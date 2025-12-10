import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Square, Trash2, MoreHorizontal, GripVertical, Upload, ChevronDown, ChevronUp } from "lucide-react";
import { uploadImageToSupabase } from "@/components/lib/uploadImage";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ContextSelector from "./ContextSelector";
import ScreenshotUploader from "../media/ScreenshotUploader";

/**
 * CollapsibleContent - Shows task content with auto-collapse for long text
 */
function CollapsibleContent({ content }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const lines = content.split('\n');
  const needsCollapse = lines.length > 4;

  if (!needsCollapse) {
    return (
      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words leading-relaxed cursor-text">
        {content}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className={`text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words leading-relaxed cursor-text ${
        isExpanded ? '' : 'line-clamp-4'
      }`}>
        {content}
      </p>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-3 h-3" />
            Show less
          </>
        ) : (
          <>
            <ChevronDown className="w-3 h-3" />
            Show more
          </>
        )}
      </button>
    </div>
  );
}

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
  onUpdateScreenshots,
  onUpdateFocus,
  onUpdateContext,
  dragHandleProps,
  showDragHandle = true
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(thought.content || "");
  const [isDropActive, setIsDropActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // TASK-1: Handle paste in textarea during editing
  const handleTextareaPaste = async (e) => {
    const items = e.clipboardData.items;
    const imageFiles = [];
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    
    if (imageFiles.length > 0) {
      e.preventDefault();
      const currentScreenshots = thought.screenshot_ids || [];
      
      setIsUploading(true);
      try {
        const uploadedUrls = [];
        for (const file of imageFiles) {
          const url = await uploadImageToSupabase(file);
          if (url) uploadedUrls.push(url);
        }
        
        if (uploadedUrls.length > 0) {
          onUpdateScreenshots(thought.id, [...currentScreenshots, ...uploadedUrls]);
          toast.success(`${uploadedUrls.length} image(s) pasted`);
        }
      } catch (error) {
        toast.error("Failed to paste image");
      } finally {
        setIsUploading(false);
      }
    }
  };

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

  // Drag & Drop handlers voor screenshots
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDropActive(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropActive(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      toast.error("Alleen afbeeldingen toegestaan");
      return;
    }

    const currentScreenshots = thought.screenshot_ids || [];
    if (currentScreenshots.length + imageFiles.length > 5) {
      toast.error("Maximum 5 afbeeldingen per task");
      return;
    }

    setIsUploading(true);
    const loadingToast = toast.loading("Screenshots uploaden...");
    
    try {
      const successUrls = [];
      for (const file of imageFiles) {
        try {
          const url = await uploadImageToSupabase(file);
          if (url) successUrls.push(url);
        } catch (error) {
          console.error('Upload error:', error);
        }
      }

      if (successUrls.length > 0) {
        onUpdateScreenshots(thought.id, [...currentScreenshots, ...successUrls]);
        toast.success(`${successUrls.length} afbeelding(en) toegevoegd`);
      } else if (imageFiles.length > 0) {
        toast.error("Uploads mislukt. Probeer opnieuw.");
      }
    } finally {
      toast.dismiss(loadingToast);
      setIsUploading(false);
    }
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
    <div 
      className={`group relative flex gap-3 p-3 rounded-lg border transition-all ${
        isSelected 
          ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-700' 
          : `bg-white dark:bg-slate-800 ${project ? `border-${project.color}-200 hover:border-${project.color}-300` : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'}`
      } ${isDropActive ? 'ring-2 ring-indigo-400 dark:ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 bg-indigo-50 dark:bg-indigo-950/50' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag Handle */}
      {showDragHandle && (
        <div 
          {...dragHandleProps}
          className="mt-2 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 cursor-grab active:cursor-grabbing"
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
          className={`transition-colors ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400'}`}
        >
          {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
        </button>
      </div>

      {/* Drop Overlay */}
      {isDropActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-indigo-100/90 dark:bg-indigo-900/80 rounded-lg z-10 pointer-events-none">
          <div className="text-center">
            <Upload className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mx-auto mb-2 animate-bounce" />
            <p className="text-indigo-700 dark:text-indigo-300 font-semibold">Drop screenshots hier</p>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Header: Project Badge & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {project && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600">
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
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
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
              onPaste={handleTextareaPaste}
              placeholder="Type task... (Cmd+V to paste images)"
              className="min-h-[60px] text-sm resize-none bg-white dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600"
            />
          ) : (
            <CollapsibleContent content={thought.content} />
          )}
        </div>

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

          <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />

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

          <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Screenshots with Upload */}
          <ScreenshotUploader
            screenshotIds={thought.screenshot_ids || []}
            onChange={(ids) => onUpdateScreenshots(thought.id, ids)}
            taskId={thought.id}
            projectId={thought.project_id}
            maxCount={5}
            compact
          />
        </div>
      </div>
    </div>
  );
}