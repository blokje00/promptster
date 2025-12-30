import { base44 } from "@/api/base44Client";

/**
 * Uploads any file type using Base44's UploadFile integration.
 * Returns a public URL.
 * 
 * @param {File} file - The file to upload
 * @param {Object} options - Upload options
 * @param {Array<string>} options.allowedTypes - MIME types to allow (e.g., ['image/png', 'application/zip'])
 * @param {number} options.maxSizeMB - Max file size in MB (default: 50MB)
 * @returns {Promise<string>} - The public file URL
 */
export const uploadFile = async (file, options = {}) => {
  const { allowedTypes = [], maxSizeMB = 50 } = options;

  try {
    // Validate file before upload
    if (!file || !(file instanceof File) && !(file instanceof Blob)) {
      throw new Error("Invalid file object");
    }

    // Check file size
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max ${maxSizeMB}MB allowed`);
    }

    // Check file type if restrictions exist
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      throw new Error(`Invalid file type: ${file.type}. Allowed: ${allowedTypes.join(', ')}`);
    }

    console.log(`[Upload] Starting upload for ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    
    if (!file_url) {
      throw new Error("No file URL received from upload service");
    }

    // Verify URL is accessible (basic format check)
    if (!file_url.startsWith('http')) {
      throw new Error(`Invalid file URL format: ${file_url}`);
    }

    console.log(`[Upload] Success: ${file_url}`);
    return file_url;
  } catch (error) {
    console.error("[Upload] Failed:", error);
    throw new Error(`Upload failed: ${error.message || 'Unknown error'}`);
  }
};

// Convenience wrapper for images
export const uploadImageToSupabase = async (file) => {
  return uploadFile(file, {
    allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
    maxSizeMB: 10
  });
};

// Convenience wrapper for ZIP files
export const uploadZipFile = async (file) => {
  return uploadFile(file, {
    allowedTypes: ['application/zip', 'application/x-zip-compressed'],
    maxSizeMB: 50
  });
};