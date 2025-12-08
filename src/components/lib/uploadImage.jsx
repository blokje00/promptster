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
  const uploadTimeout = 30000;
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Upload timeout na 30 seconden")), uploadTimeout);
  });

  try {
    const uploadPromise = (async () => {
      // Get current user for folder organization
      const user = await base44.auth.me();
      if (!user?.id) {
        throw new Error("Gebruiker niet ingelogd");
      }

      // Create unique filename with user folder
      const timestamp = Date.now();
      const random = crypto.randomUUID().substring(0, 8);
      const ext = file.name.split('.').pop() || 'png';
      const path = `${user.id}/${timestamp}_${random}.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('promptster_screenshots')
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        throw new Error(`Upload mislukt: ${uploadError.message}`);
      }

      // Get public URL
      const { data } = supabase.storage
        .from('promptster_screenshots')
        .getPublicUrl(path);

      if (!data?.publicUrl) {
        throw new Error("Kon geen publieke URL genereren");
      }

      return data.publicUrl;
    })();

    return await Promise.race([uploadPromise, timeoutPromise]);
  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
};