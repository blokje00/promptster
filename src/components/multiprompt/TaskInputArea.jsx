import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload } from "lucide-react";
import { projectBorderColors } from "@/components/lib/constants";
import ScreenshotUploader from "@/components/media/ScreenshotUploader";
import ContextSelector from "./ContextSelector";

export default function TaskInputArea({
  selectedProject,
  isDropActive,
  dragHandlers,
  isLimitReached,
  maxThoughts,
  newThoughtContent,
  onContentChange,
  onAddThought,
  newThoughtScreenshots,
  onScreenshotsChange,
  newThoughtFocus,
  onFocusChange,
  newThoughtContext,
  onContextChange,
  selectedProjectId,
  enableContextSuggestions
}) {
  return (
    <div 
      className={`relative border-2 rounded-lg transition-all bg-white ${
        selectedProject 
          ? `border-dashed ${projectBorderColors[selectedProject.color]}` 
          : 'border-slate-200'
      } ${
        isDropActive 
          ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-400 ring-offset-2' 
          : 'focus-within:border-indigo-400'
      }`}
      {...dragHandlers}
    >
      {isDropActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-indigo-100/90 rounded-lg z-20 pointer-events-none">
          <div className="text-center">
            <Upload className="w-10 h-10 text-indigo-600 mx-auto mb-2 animate-bounce" />
            <p className="text-indigo-700 font-semibold text-lg">Drop screenshots hier</p>
          </div>
        </div>
      )}

      <Textarea
        placeholder={isLimitReached ? `Plan limit of ${maxThoughts} tasks reached.` : "Type task..."}
        value={newThoughtContent}
        onChange={(e) => onContentChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), !isLimitReached && onAddThought())}
        disabled={isLimitReached}
        className="min-h-[60px] border-0 focus-visible:ring-0 resize-none"
      />

      <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-100 bg-slate-50/50 rounded-b-lg">
        <ScreenshotUploader
          screenshotIds={newThoughtScreenshots}
          onChange={onScreenshotsChange}
          projectId={selectedProjectId}
          maxCount={5}
          compact
        />
        <Select value={newThoughtFocus} onValueChange={onFocusChange}>
          <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="both">Design + Logic</SelectItem>
            <SelectItem value="design">Design Only</SelectItem>
            <SelectItem value="logic">Logic Only</SelectItem>
          </SelectContent>
        </Select>
        <ContextSelector value={newThoughtContext} onChange={onContextChange} compact enableAISuggestions={enableContextSuggestions} />
      </div>
    </div>
  );
}