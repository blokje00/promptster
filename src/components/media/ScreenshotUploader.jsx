import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import ScreenshotThumbWithOCR from "./ScreenshotThumbWithOCR";
import { uploadImageToSupabase } from "@/components/lib/uploadImage";

export default function ScreenshotUploader({ 
  screenshotIds = [], 
  onChange,
  projectId = null,
  taskId = null,
  maxCount = 10,
  compact = false,
  onDebugClick = null,
  showOCRFeedback = true,
  visionAnalysis = null // vision analysis object from thought
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [analyzingUrls, setAnalyzingUrls] = useState([]);

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
        console.log(`[ScreenshotUploader] Uploading ${file.name}...`);
        const fileUrl = await uploadImageToSupabase(file);
        
        if (!fileUrl) {
          console.error(`[ScreenshotUploader] Empty URL returned for ${file.name}`);
          failedUploads.push(`${file.name}: Empty URL returned`);
          continue;
        }

        // Verify URL format
        if (!fileUrl.startsWith('http')) {
          console.error(`[ScreenshotUploader] Invalid URL format for ${file.name}: ${fileUrl}`);
          failedUploads.push(`${file.name}: Invalid URL format`);
          continue;
        }

        console.log(`[ScreenshotUploader] ✓ Successfully uploaded ${file.name}: ${fileUrl}`);
        successfulUrls.push(fileUrl);
      } catch (error) {
        console.error(`[ScreenshotUploader] Upload error for ${file.name}:`, error);
        failedUploads.push(`${file.name}: ${error.message}`);
      }
    }

    if (successfulUrls.length > 0) {
      // BUGFIX: Use functional update to ensure we always work with the latest state
      // and avoid race conditions where screenshotIds might be stale
      onChange((prevIds) => {
        const currentIds = Array.isArray(prevIds) ? prevIds : screenshotIds;
        return [...currentIds, ...successfulUrls];
      });
      
      // Start OCR analysis in background if feedback is enabled
      if (showOCRFeedback) {
        setAnalyzingUrls(successfulUrls);
        
        // Trigger analysis for each URL
        Promise.all(
          successfulUrls.map(url => 
            base44.functions.invoke('analyzeScreenshotWithCache', {
              screenshotUrl: url,
              level: 'full'
            }).catch(err => {
              console.error('[ScreenshotUploader] OCR analysis failed:', err);
              return null;
            })
          )
        ).then(() => {
          setAnalyzingUrls([]);
        });
      }
      
      toast.success(`✓ ${successfulUrls.length} screenshot(s) uploaded successfully`, {
        description: showOCRFeedback 
          ? "Analyzing with OCR Vision..." 
          : (successfulUrls.length === 1 ? "Screenshot is ready" : "All screenshots are ready")
      });
    }

    if (failedUploads.length > 0) {
      console.error('[ScreenshotUploader] Failed uploads:', failedUploads);
      toast.error(`❌ Upload failed for ${failedUploads.length} file(s)`, {
        description: failedUploads.join(', '),
        duration: 8000
      });
    }

    if (successfulUrls.length === 0 && failedUploads.length > 0) {
      toast.error('⚠️ All uploads failed', {
        description: 'Please try again or use a different image format',
        duration: 10000
      });
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
          ? 'inline-flex items-center gap-2' 
          : `min-h-[120px] p-4 border-2 border-dashed rounded-xl transition-all ${
              isDragActive 
                ? 'ring-2 ring-indigo-400 ring-offset-2 bg-indigo-50 border-indigo-500' 
                : 'border-slate-200 hover:border-indigo-300'
            }`
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      {/* Full-area drop overlay */}
      {isDragActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-indigo-100/90 rounded-xl z-10 pointer-events-none">
          <div className="text-center">
            <Upload className="w-10 h-10 text-indigo-600 mx-auto mb-2" />
            <p className="text-indigo-700 font-semibold">Drop images here</p>
            <p className="text-indigo-500 text-sm">Release to upload</p>
          </div>
        </div>
      )}
      
      {/* Content container */}
      <div className={`${compact ? 'flex items-center gap-2' : 'space-y-3'}`}>
        {/* Existing images */}
        {screenshotIds.length > 0 && (
          <div className={`flex gap-2 ${compact ? '' : 'flex-wrap'}`}>
            {screenshotIds.map((id, index) => {
              const isAnalyzing = analyzingUrls.includes(id);
              // Determine vision status for this specific screenshot
              let visionStatus = null;
              if (isAnalyzing) {
                visionStatus = 'analyzing';
              } else if (visionAnalysis) {
                visionStatus = visionAnalysis.status || null;
              }
              
              return (
                <div key={`${id}-${index}`}>
                  <ScreenshotThumbWithOCR
                    screenshotId={id}
                    onRemove={handleRemove}
                    showCopyEmbed={!compact}
                    onDebugClick={onDebugClick}
                    visionStatus={showOCRFeedback ? visionStatus : null}
                  />
                </div>
              );
            })}
          </div>
        )}
        
        {/* Upload button and helper text */}
        {screenshotIds.length < maxCount && (
          <div className={compact ? '' : 'flex items-center gap-3'}>
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
                e.target.value = '';
              }} 
            />
            
            <label 
              htmlFor={`screenshot-upload-${taskId || 'new'}`}
              className={`cursor-pointer inline-flex items-center justify-center ${
                compact 
                  ? '' 
                  : 'w-20 h-20 border-2 border-dashed border-slate-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-all'
              }`}
            >
              {isUploading ? (
                <Loader2 className={`${compact ? 'w-4 h-4' : 'w-6 h-6'} animate-spin text-indigo-500`} />
              ) : (
                <Plus className={`${compact ? 'w-4 h-4' : 'w-6 h-6'} text-slate-400 hover:text-indigo-500 transition-colors`} />
              )}
            </label>
            
            {!compact && screenshotIds.length === 0 && (
              <div className="text-sm text-slate-500">
                <p className="font-medium text-slate-600">Drop images or click +</p>
                <p className="text-xs">PNG, JPG, GIF up to 10MB each</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}