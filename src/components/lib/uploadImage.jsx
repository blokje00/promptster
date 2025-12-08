import { createClient } from '@supabase/supabase-js';
import { base44 } from "@/api/base44Client";

const supabaseUrl = 'https://gfqphegxvcbsqbdqfmoc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmcXBoZWd4dmNic3FiZHFmbW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMwNjA5NTcsImV4cCI6MjA0ODYzNjk1N30.VH_2IXLqaXWGd9-Lm5TZ8tYKqxVQJKgXHOXzGqZBm8k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Uploads an image directly to Supabase Storage.
 * Returns a public URL that works for both UI display and AI/LLM analysis.
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} - The public Supabase URL
 */
export const uploadImageToSupabase = async (file) => {
  console.log('[UPLOAD] Starting upload for:', file.name);
  
  try {
    // Get current user for folder organization
    console.log('[UPLOAD] Fetching user...');
    const user = await base44.auth.me();
    console.log('[UPLOAD] User:', user?.id);
    
    if (!user?.id) {
      throw new Error("Gebruiker niet ingelogd");
    }

    // Create unique filename with user folder
    const timestamp = Date.now();
    const random = crypto.randomUUID().substring(0, 8);
    const ext = file.name.split('.').pop() || 'png';
    const path = `${user.id}/${timestamp}_${random}.${ext}`;
    
    console.log('[UPLOAD] Uploading to path:', path);
    console.log('[UPLOAD] Supabase client:', supabase);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('promptster_screenshots')
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

    console.log('[UPLOAD] Upload result:', { uploadData, uploadError });

    if (uploadError) {
      console.error("[UPLOAD] Supabase upload error:", uploadError);
      throw new Error(`Upload mislukt: ${uploadError.message}`);
    }

    // Get public URL
    const { data } = supabase.storage
      .from('promptster_screenshots')
      .getPublicUrl(path);

    console.log('[UPLOAD] Public URL data:', data);

    if (!data?.publicUrl) {
      throw new Error("Kon geen publieke URL genereren");
    }

    console.log('[UPLOAD] Success! URL:', data.publicUrl);
    return data.publicUrl;
  } catch (error) {
    console.error("[UPLOAD] Upload failed:", error);
    throw error;
  }
};