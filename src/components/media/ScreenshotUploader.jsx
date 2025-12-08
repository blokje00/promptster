import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import ScreenshotThumb from "./ScreenshotThumb";
import { uploadImageToSupabase } from "@/components/lib/uploadImage";

export default function ScreenshotUploader({ 
  screenshotIds = [], 
  onChange,
  projectId = null,
  taskId = null,
  maxCount = 10,
  compact = false
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  /**
   * Handles file upload via Base44 Supabase integration
   * @param {FileList|File[]} files - Files to upload
   */
  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    // Filter only image files
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (imageFiles.length === 0) {
      toast.error("Only image files are allowed");
      return;
    }
    
    if (screenshotIds.length + imageFiles.length > maxCount) {
      toast.error(`Maximum ${maxCount} images allowed`);
      return;
    }
    
    setIsUploading(true);
    
    const successfulUrls = [];
    const failedUploads = [];
    
    for (const file of imageFiles) {
      try {
        const fileUrl = await uploadImageToSupabase(file);
        if (fileUrl) {
          successfulUrls.push(fileUrl);
        } else {
          failedUploads.push(file.name);
        }
      } catch (error) {
        console.error(`Upload error for ${file.name}:`, error);
        failedUploads.push(file.name);
      }
    }
    
    if (successfulUrls.length > 0) {
      onChange([...screenshotIds, ...successfulUrls]);
      toast.success(`${successfulUrls.length} screenshot(s) uploaded`);
    }
    
    if (failedUploads.length > 0) {
      toast.error(`Failed to upload: ${failedUploads.join(', ')}`);
    }
    
    setIsUploading(false);
  };

  const handleRemove = (idToRemove) => {
    onChange(screenshotIds.filter(id => id !== idToRemove));
  };

  /**
   * Handles drag enter event
   */
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  /**
   * Handles drag leave event
   */
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set inactive if we're leaving the component entirely
    // Check if the related target is outside the component
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragActive(false);
    }
  };

  /**
   * Handles drag over event
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragActive) setIsDragActive(true);
  };

  /**
   * Handles file drop event
   */
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
      e.dataTransfer.clearData();
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
      className={`relative ${
        compact 
          ? 'inline-flex items-center' 
          : `space-y-2 p-4 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
              isDragActive 
                ? 'ring-2 ring-indigo-400 ring-offset-2 bg-indigo-50 border-indigo-500' 
                : 'border-slate-200 hover:border-indigo-300'
            }`
      }`}
      onDragEnter={!compact ? handleDragEnter : undefined}
      onDragLeave={!compact ? handleDragLeave : undefined}
      onDragOver={!compact ? handleDragOver : undefined}
      onDrop={!compact ? handleDrop : undefined}
      onPaste={!compact ? handlePaste : undefined}
    >
      {/* Full-area drop overlay - only in non-compact mode */}
      {!compact && isDragActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-indigo-100/80 rounded-xl z-10 pointer-events-none">
          <div className="text-center">
            <Upload className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
            <p className="text-indigo-600 font-medium">Drop images here</p>
          </div>
        </div>
      )}
      
      {!compact && (
        <div className="flex gap-2 flex-wrap">
          {screenshotIds.map(id => (
            <ScreenshotThumb
              key={id}
              screenshotId={id}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
      
      {/* Hidden file input */}
      <input 
        type="file" 
        multiple 
        accept="image/*"
        className="hidden" 
        id={`screenshot-upload-${taskId || 'new'}`}
        onChange={e => {
          if (e.target.files && e.target.files.length > 0) {
            handleUpload(e.target.files);
          }
          e.target.value = ''; // Reset input voor volgende upload
        }} 
      />
      
      {screenshotIds.length < maxCount && (
        <label 
          htmlFor={`screenshot-upload-${taskId || 'new'}`}
          className="cursor-pointer inline-flex items-center"
        >
          {isUploading ? (
            <Loader2 className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} animate-spin text-indigo-500`} />
          ) : (
            <Plus className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-slate-400 hover:text-indigo-500 transition-colors`} />
          )}
        </label>
      )}
    </div>
  );
}