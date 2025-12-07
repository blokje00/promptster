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
import ContextSelector from "./ContextSelector";
import ScreenshotUploader from "../media/ScreenshotUploader";

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
      isSelected 
        ? 'bg-indigo-50/50 border-indigo-200' 
        : `bg-white ${project ? `border-${project.color}-200 hover:border-${project.color}-300` : 'border-slate-200 hover:border-indigo-300'}`
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

        {/* Screenshots */}
        {thought.screenshot_ids && thought.screenshot_ids.length > 0 && (
          <ScreenshotUploader
            screenshotIds={thought.screenshot_ids}
            onChange={(ids) => onUpdateScreenshots(thought.id, ids)}
            taskId={thought.id}
            projectId={thought.project_id}
            compact
          />
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

          {/* Add Screenshot */}
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