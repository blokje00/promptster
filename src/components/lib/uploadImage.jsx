import { base44 } from "@/api/base44Client";

/**
 * Uploads an image using Base44's UploadFile integration.
 * Returns a public URL that works for both UI display and AI/LLM vision analysis.
 * 
 * Simplified implementation following Circadian app pattern:
 * - Direct UploadFile call
 * - Public URL automatically accessible
 * - No transformations or validation needed
 * 
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} - The public file URL
 */
export const uploadImageToSupabase = async (file) => {
  try {
    // Validate file before upload
    if (!file || !(file instanceof File) && !(file instanceof Blob)) {
      throw new Error("Invalid file object");
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 10MB allowed`);
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      throw new Error(`Invalid file type: ${file.type}. Only images are allowed`);
    }

    console.log(`[Upload] Starting upload for ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    
    if (!file_url) {
      throw new Error("No file URL received from upload service");
    }

    // Verify URL is accessible (basic format check)
    if (!file_url.startsWith('http')) {
      throw new Error(`Invalid file URL format: ${file_url}`);
    }

    console.log(`[Upload] Success: ${file_url}`);
    return file_url;
  } catch (error) {
    console.error("[Upload] Failed:", error);
    throw new Error(`Upload failed: ${error.message || 'Unknown error'}`);
  }
};