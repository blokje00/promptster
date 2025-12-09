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
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    
    if (!file_url) {
      throw new Error("Geen file URL ontvangen van upload");
    }

    return file_url;
  } catch (error) {
    console.error("Upload failed:", error);
    throw new Error(`Upload mislukt: ${error.message || 'Onbekende fout'}`);
  }
};