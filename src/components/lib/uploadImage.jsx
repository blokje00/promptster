import { base44 } from "@/api/base44Client";

/**
 * Uploads a file to Supabase via Base44 integration.
 * @param {File} file - The file to upload
 * @returns {Promise<string>} - The file URL
 */
export const uploadImageToSupabase = async (file) => {
  // Create a unique filename
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
  const uniqueFileName = `${timestamp}_${random}_${cleanName}`;
  
  const renamedFile = new File([file], uniqueFileName, { type: file.type });
  
  try {
    const { file_url } = await base44.integrations.Core.UploadFile({ file: renamedFile });
    
    if (!file_url) {
      throw new Error("Geen URL ontvangen na upload");
    }
    
    return file_url;
  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
};