import { base44 } from "@/api/base44Client";

/**
 * Uploads an image using Base44's UploadFile integration with public visibility.
 * Returns a public URL that works for both UI display and AI/LLM analysis.
 * 
 * The URL returned is a Base44 public file URL that should be accessible
 * without authentication for vision analysis.
 * 
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} - The public HTTPS URL
 */
export const uploadImageToSupabase = async (file) => {
  try {
    // Upload via Base44 UploadFile integration
    const result = await base44.integrations.Core.UploadFile({ file });
    
    if (!result?.file_url) {
      throw new Error("Geen file URL ontvangen van upload");
    }

    // Base44 returns URLs in format: /api/apps/{app_id}/files/public/{app_id}/{filename}
    // These should be publicly accessible without auth
    const fileUrl = result.file_url;
    
    // Convert relative URLs to absolute HTTPS URLs
    let publicUrl = fileUrl;
    if (fileUrl.startsWith('/')) {
      // Get the base URL from window.location
      const baseUrl = window.location.origin;
      publicUrl = `${baseUrl}${fileUrl}`;
    }
    
    // Verify URL is accessible (optional runtime check)
    try {
      const testResponse = await fetch(publicUrl, { 
        method: 'HEAD',
        // No credentials to test anonymous access
        credentials: 'omit'
      });
      
      if (!testResponse.ok) {
        console.warn(`Warning: Uploaded file returned status ${testResponse.status}`);
      }
      
      const contentType = testResponse.headers.get('content-type');
      if (!contentType?.startsWith('image/')) {
        console.warn(`Warning: Uploaded file has content-type: ${contentType}`);
      }
    } catch (verifyError) {
      console.warn('Could not verify public accessibility:', verifyError);
    }

    return publicUrl;
  } catch (error) {
    console.error("Upload failed:", error);
    throw new Error(`Upload mislukt: ${error.message || 'Onbekende fout'}`);
  }
};