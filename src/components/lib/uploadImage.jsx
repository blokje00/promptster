import { base44 } from "@/api/base44Client";

/**
 * Uploads an image using Base44's UploadFile integration.
 * Returns a public URL that works for both UI display and AI/LLM analysis.
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} - The public URL
 */
export const uploadImageToSupabase = async (file) => {
  try {
    // Use Base44's UploadFile integration
    const result = await base44.integrations.Core.UploadFile({ file });
    
    if (!result?.file_url) {
      throw new Error("Geen file URL ontvangen van upload");
    }

    return result.file_url;
  } catch (error) {
    console.error("Upload failed:", error);
    throw new Error(`Upload mislukt: ${error.message || 'Onbekende fout'}`);
  }
};