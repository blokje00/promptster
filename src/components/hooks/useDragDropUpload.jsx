import { useState, useCallback } from "react";
import { toast } from "sonner";
import { uploadImageToSupabase } from "@/components/lib/uploadImage";

export const useDragDropUpload = (currentScreenshots, onScreenshotsChange, maxCount = 5) => {
  const [isDropActive, setIsDropActive] = useState(false);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDropActive(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropActive(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      toast.error("Alleen afbeeldingen toegestaan");
      return;
    }

    if (currentScreenshots.length + imageFiles.length > maxCount) {
      toast.error(`Maximum ${maxCount} afbeeldingen`);
      return;
    }

    const loadingToast = toast.loading(`${imageFiles.length} afbeelding(en) uploaden...`);
    const successUrls = [];

    for (const file of imageFiles) {
      try {
        const url = await uploadImageToSupabase(file);
        if (url) successUrls.push(url);
      } catch (error) {
        console.error('Upload error:', error);
      }
    }

    toast.dismiss(loadingToast);

    if (successUrls.length > 0) {
      onScreenshotsChange([...currentScreenshots, ...successUrls]);
      toast.success(`${successUrls.length} afbeelding(en) toegevoegd`);
    } else {
      toast.error("Uploads mislukt");
    }
  }, [currentScreenshots, onScreenshotsChange, maxCount]);

  return {
    isDropActive,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop
    }
  };
};