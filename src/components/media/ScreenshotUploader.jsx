import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ScreenshotThumb from "./ScreenshotThumb";

export default function ScreenshotUploader({ 
  screenshotIds = [], 
  onChange,
  projectId = null,
  taskId = null,
  maxCount = 10,
  compact = false
}) {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        if (projectId) formData.append('projectId', projectId);
        if (taskId) formData.append('taskId', taskId);

        const response = await fetch('/api/screenshots/upload', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('base44_token')}`
          }
        });
        
        if (!response.ok) throw new Error('Upload failed');
        
        const data = await response.json();
        return data.screenshotId;
      });

      const newIds = await Promise.all(uploadPromises);
      onChange([...screenshotIds, ...newIds]);
      toast.success(`${newIds.length} screenshot(s) uploaded`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = (idToRemove) => {
    onChange(screenshotIds.filter(id => id !== idToRemove));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData.items;
    const files = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      handleUpload(files);
    }
  };

  return (
    <div
      className={`${compact ? 'flex items-center gap-2' : 'space-y-2'}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      <div className={`flex ${compact ? 'gap-2' : 'gap-2 flex-wrap'}`}>
        {screenshotIds.map(id => (
          <ScreenshotThumb
            key={id}
            screenshotId={id}
            onRemove={handleRemove}
          />
        ))}
      </div>
      
      {screenshotIds.length < maxCount && (
        <div className="relative">
          <input 
            type="file" 
            multiple 
            accept="image/*"
            className="hidden" 
            id={`screenshot-upload-${taskId || 'new'}`}
            onChange={e => handleUpload(e.target.files)} 
          />
          <label 
            htmlFor={`screenshot-upload-${taskId || 'new'}`}
            className={`cursor-pointer flex items-center justify-center ${
              compact 
                ? 'p-1 hover:bg-slate-200 rounded' 
                : 'w-20 h-20 border-2 border-dashed border-slate-300 rounded hover:border-indigo-400 hover:bg-indigo-50 transition-colors'
            }`}
          >
            {isUploading ? (
              <Loader2 className={`${compact ? 'w-4 h-4' : 'w-6 h-6'} animate-spin text-indigo-500`} />
            ) : (
              <Plus className={`${compact ? 'w-4 h-4' : 'w-6 h-6'} text-slate-400`} />
            )}
          </label>
        </div>
      )}
    </div>
  );
}