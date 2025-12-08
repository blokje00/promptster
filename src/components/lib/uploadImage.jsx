import { base44 } from "@/api/base44Client";

/**
 * Uploads a file to Supabase via Base44 integration.
 * @param {File} file - The file to upload
 * @param {number} timeout - Timeout in milliseconds (default 30000)
 * @returns {Promise<string>} - The file URL
 */
export const uploadImageToSupabase = async (file, timeout = 30000) => {
  // Create a unique filename
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
  const uniqueFileName = `${timestamp}_${random}_${cleanName}`;
  
  const renamedFile = new File([file], uniqueFileName, { type: file.type });
  
  // Create a timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Upload timeout - please try again")), timeout);
  });
  
  try {
    // Race between upload and timeout
    const result = await Promise.race([
      base44.integrations.Core.UploadFile({ file: renamedFile }),
      timeoutPromise
    ]);
    
    const { file_url } = result;
    
    if (!file_url) {
      throw new Error("No URL received after upload");
    }
    
    return file_url;
  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
};