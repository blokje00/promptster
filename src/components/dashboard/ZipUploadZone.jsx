import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, X, FileArchive, Download } from "lucide-react";
import { toast } from "sonner";
import { uploadZipFile } from "@/components/lib/uploadFile";

export default function ZipUploadZone({ zipFiles, onZipFilesChange }) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      // Only deactivate if leaving the component entirely
      if (!e.currentTarget.contains(e.relatedTarget)) {
        setDragActive(false);
      }
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.name.endsWith('.zip')
    );

    if (droppedFiles.length === 0) {
      toast.error("Only ZIP files are allowed");
      return;
    }

    await uploadFiles(droppedFiles);
  };

  const handleFileInput = async (e) => {
    const selectedFiles = Array.from(e.target.files).filter(
      file => file.name.endsWith('.zip')
    );

    if (selectedFiles.length === 0) {
      toast.error("Only ZIP files are allowed");
      return;
    }

    await uploadFiles(selectedFiles);
  };

  const uploadFiles = async (files) => {
    setUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const file_url = await uploadZipFile(file);
        return {
          name: file.name,
          url: file_url
        };
      });

      const newZipFiles = await Promise.all(uploadPromises);
      onZipFilesChange([...(zipFiles || []), ...newZipFiles]);
      toast.success(`${files.length} ZIP file(s) uploaded`);
    } catch (error) {
      toast.error(error.message || "Error uploading ZIP files");
      console.error(error);
    }
    setUploading(false);
  };

  const removeZipFile = (indexToRemove) => {
    onZipFilesChange(zipFiles.filter((_, index) => index !== indexToRemove));
    toast.success("ZIP file removed");
  };

  return (
    <div className="space-y-4">
      <label 
        htmlFor="zip-upload"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer block ${
          dragActive 
            ? "border-purple-500 bg-purple-50 scale-[1.02]" 
            : "border-slate-300 hover:border-purple-400 hover:bg-purple-50/50"
        }`}
      >
        <input
          type="file"
          multiple
          accept=".zip"
          onChange={(e) => {
            handleFileInput(e);
            e.target.value = ''; // Reset for next upload
          }}
          className="hidden"
          id="zip-upload"
          disabled={uploading}
        />
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
            {uploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
            ) : dragActive ? (
              <Upload className="w-8 h-8 text-purple-500" />
            ) : (
              <FileArchive className="w-8 h-8 text-slate-400" />
            )}
          </div>
          <p className="text-slate-700 font-medium mb-1">
            {uploading ? "Uploading..." : dragActive ? "Drop to upload" : "Drop ZIP files here"}
          </p>
          <p className="text-sm text-slate-500">or click anywhere to select files</p>
        </div>
      </label>

      {zipFiles && zipFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-slate-600 font-medium">
            {zipFiles.length} ZIP file(s)
          </p>
          <div className="space-y-2">
            {zipFiles.map((zipFile, index) => (
              <Card key={index} className="p-4 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FileArchive className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{zipFile.name}</p>
                    <p className="text-xs text-slate-500">ZIP file</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a 
                    href={zipFile.url} 
                    download={zipFile.name}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </a>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeZipFile(index)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}