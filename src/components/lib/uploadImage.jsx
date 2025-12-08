import { createClient } from '@supabase/supabase-js';
import { base44 } from "@/api/base44Client";

// Supabase Storage for truly public, anonymous-accessible URLs
const supabaseUrl = 'https://gfqphegxvcbsqbdqfmoc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmcXBoZWd4dmNic3FiZHFmbW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMwNjA5NTcsImV4cCI6MjA0ODYzNjk1N30.VH_2IXLqaXWGd9-Lm5TZ8tYKqxVQJKgXHOXzGqZBm8k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Uploads an image to Supabase Storage with public access.
 * Returns a truly public HTTPS URL accessible by OpenAI/LLMs without auth.
 * 
 * IMPORTANT: Supabase bucket 'promptster_screenshots' must be configured as PUBLIC:
 * 1. Go to Supabase Dashboard > Storage > promptster_screenshots
 * 2. Make bucket public (allows anonymous reads)
 * 3. Set RLS policies to allow authenticated uploads
 * 
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} - The public Supabase CDN URL
 */
export const uploadImageToSupabase = async (file) => {
  try {
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

    // Upload to Supabase Storage (public bucket)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('promptster_screenshots')
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL (works without authentication)
    const { data: urlData } = supabase.storage
      .from('promptster_screenshots')
      .getPublicUrl(path);

    if (!urlData?.publicUrl) {
      throw new Error("Could not generate public URL");
    }

    // Return CDN URL format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
    return urlData.publicUrl;
  } catch (error) {
    console.error("Upload failed:", error);
    throw new Error(`Upload mislukt: ${error.message || 'Onbekende fout'}`);
  }
};