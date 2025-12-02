import { base44 } from "@/api/base44Client";

const SUPABASE_STORAGE_BASE_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f4bcd57ca6479c7acf2f47/";

/**
 * Uploads a file to Supabase via Base44 integration and returns a guaranteed public URL.
 * @param {File} file - The file to upload
 * @returns {Promise<string>} - The public Supabase URL
 */
export const uploadImageToSupabase = async (file) => {
  // Create a unique filename to ensure we can construct the URL reliably
  // Format: timestamp_random_cleanName
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
  const uniqueFileName = `${timestamp}_${random}_${cleanName}`;
  
  // Create a new File object with the unique name
  const renamedFile = new File([file], uniqueFileName, { type: file.type });
  
  try {
    // Upload using Base44 integration
    // This uploads to the app's public folder in the shared bucket
    const { file_url } = await base44.integrations.Core.UploadFile({ file: renamedFile });
    
    // Check if the returned URL is already the Supabase URL (preferred)
    if (file_url && file_url.includes("supabase.co")) {
      return file_url;
    }
    
    // Fallback: Construct the Supabase URL manually
    // This ensures we always return the direct storage URL even if the integration returns a proxy
    return `${SUPABASE_STORAGE_BASE_URL}${uniqueFileName}`;
  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
};