import { supabase, SCREENSHOTS_BUCKET } from "./supabaseClient";
import { base44 } from "@/api/base44Client";

/**
 * Uploads an image directly to Supabase Storage.
 * Returns a public URL that works for both UI display and AI/LLM analysis.
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} - The public Supabase URL
 */
export const uploadImageToSupabase = async (file) => {
  try {
    // Get current user for folder organization
    const user = await base44.auth.me();
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    // Create unique filename with user folder
    const timestamp = Date.now();
    const random = crypto.randomUUID().substring(0, 8);
    const ext = file.name.split('.').pop() || 'png';
    const path = `${user.id}/${timestamp}_${random}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(SCREENSHOTS_BUCKET)
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data } = supabase.storage
      .from(SCREENSHOTS_BUCKET)
      .getPublicUrl(path);

    if (!data?.publicUrl) {
      throw new Error("Failed to get public URL");
    }

    return data.publicUrl;
  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
};