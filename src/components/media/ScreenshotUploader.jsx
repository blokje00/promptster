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
    try {
      const uploadPromises = imageFiles.map(async (file) => {
        // Use the centralized upload utility that works with Base44
        const fileUrl = await uploadImageToSupabase(file);
        return fileUrl;
      });

      const newUrls = await Promise.all(uploadPromises);
      onChange([...screenshotIds, ...newUrls]);
      toast.success(`${newUrls.length} screenshot(s) uploaded`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Upload failed: " + (error.message || "Unknown error"));
    } finally {
      setIsUploading(false);
    }
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
    setIsDragActive(false);
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
      className={`${compact ? 'flex items-center gap-2' : 'space-y-2'} ${
        isDragActive ? 'ring-2 ring-indigo-400 ring-offset-2 rounded-lg' : ''
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
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
        <div 
          className={`relative transition-all ${
            isDragActive 
              ? 'scale-110 bg-indigo-50 rounded-lg' 
              : ''
          }`}
        >
          <input 
            type="file" 
            multiple 
            accept="image/*"
            className="hidden" 
            id={`screenshot-upload-${taskId || 'new'}`}
            onChange={e => {
              handleUpload(e.target.files);
              e.target.value = ''; // Reset input voor volgende upload
            }} 
          />
          <label 
            htmlFor={`screenshot-upload-${taskId || 'new'}`}
            className={`cursor-pointer flex items-center justify-center ${
              compact 
                ? 'p-1 hover:bg-slate-200 rounded' 
                : `w-20 h-20 border-2 border-dashed rounded transition-all ${
                    isDragActive 
                      ? 'border-indigo-500 bg-indigo-100' 
                      : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50'
                  }`
            }`}
          >
            {isUploading ? (
              <Loader2 className={`${compact ? 'w-4 h-4' : 'w-6 h-6'} animate-spin text-indigo-500`} />
            ) : isDragActive ? (
              <Upload className={`${compact ? 'w-4 h-4' : 'w-6 h-6'} text-indigo-500`} />
            ) : (
              <Plus className={`${compact ? 'w-4 h-4' : 'w-6 h-6'} text-slate-400`} />
            )}
          </label>
        </div>
      )}
    </div>
  );
}