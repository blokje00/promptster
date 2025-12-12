import React, { useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload } from "lucide-react";
import { projectBorderColors } from "@/components/lib/constants";
import ScreenshotUploader from "@/components/media/ScreenshotUploader";
import ContextSelector from "./ContextSelector";
import { uploadImageToSupabase } from "@/components/lib/uploadImage";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

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
  const textareaRef = useRef(null);

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
      
      try {
        const uploadedUrls = [];
        const failedUploads = [];
        
        for (const file of imageFiles) {
          try {
            const url = await uploadImageToSupabase(file);
            if (url && url.startsWith('http')) {
              uploadedUrls.push(url);
            } else {
              failedUploads.push('Invalid URL returned');
            }
          } catch (uploadError) {
            console.error('Paste upload error:', uploadError);
            failedUploads.push(uploadError.message);
          }
        }
        
        if (uploadedUrls.length > 0) {
          onScreenshotsChange([...newThoughtScreenshots, ...uploadedUrls]);
          toast.success(`✓ ${uploadedUrls.length} image(s) pasted successfully`);
          
          // TASK-7: Trigger OCR vision analysis immediately after paste
          try {
            for (const url of uploadedUrls) {
              base44.functions.invoke('analyzeScreenshotWithCache', {
                screenshotUrl: url,
                level: 'full'
              }).catch(err => console.warn('[TaskInputArea] Vision analysis failed:', err));
            }
          } catch (error) {
            console.warn('[TaskInputArea] Could not trigger vision analysis:', error);
          }
        }
        
        if (failedUploads.length > 0) {
          toast.error(`❌ Failed to paste ${failedUploads.length} image(s)`, {
            description: failedUploads[0],
            duration: 8000
          });
        }
      } catch (error) {
        console.error('Paste handling error:', error);
        toast.error("Failed to paste image", {
          description: error.message,
          duration: 8000
        });
      }
    }
  };
  return (
    <div 
      className={`relative border-2 rounded-lg transition-all bg-white dark:bg-slate-900 ${
        selectedProject 
          ? `border-dashed ${projectBorderColors[selectedProject.color]}` 
          : 'border-slate-200 dark:border-slate-700'
      } ${
        isDropActive 
          ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 ring-2 ring-indigo-400 dark:ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900' 
          : 'focus-within:border-indigo-400 dark:focus-within:border-indigo-500'
      }`}
      {...dragHandlers}
    >
      {isDropActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-indigo-100/90 dark:bg-indigo-900/80 rounded-lg z-20 pointer-events-none">
          <div className="text-center">
            <Upload className="w-10 h-10 text-indigo-600 dark:text-indigo-400 mx-auto mb-2 animate-bounce" />
            <p className="text-indigo-700 dark:text-indigo-300 font-semibold text-lg">Drop screenshots hier</p>
          </div>
        </div>
      )}

      <Textarea
        ref={textareaRef}
        placeholder={isLimitReached ? `Plan limit of ${maxThoughts} tasks reached.` : "Type task... (Cmd+V to paste images)"}
        value={newThoughtContent}
        onChange={(e) => onContentChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), !isLimitReached && onAddThought())}
        onPaste={handleTextareaPaste}
        disabled={isLimitReached}
        className="min-h-[60px] border-0 focus-visible:ring-0 resize-none dark:bg-slate-900 dark:text-slate-100"
      />

      <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 rounded-b-lg">
        <ScreenshotUploader
          screenshotIds={newThoughtScreenshots}
          onChange={onScreenshotsChange}
          projectId={selectedProjectId}
          maxCount={5}
          compact
        />
        <ContextSelector 
          value={newThoughtContext} 
          onChange={onContextChange} 
          compact 
          enableAISuggestions={enableContextSuggestions}
          selectedProject={selectedProject}
        />
        <Select value={newThoughtFocus} onValueChange={onFocusChange}>
          <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="both">Design + Logic</SelectItem>
            <SelectItem value="design">Design Only</SelectItem>
            <SelectItem value="logic">Logic Only</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}