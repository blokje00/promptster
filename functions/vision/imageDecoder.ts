import { PNG } from "npm:pngjs@7.0.0";
import jpeg from "npm:jpeg-js@0.4.4";

export interface ImageData {
  data: Uint8Array;
  width: number;
  height: number;
}

/**
 * Fetch and decode an image from a public URL
 * @param url - Public HTTPS URL to image
 * @returns ImageData with RGBA pixel buffer
 */
export async function fetchAndDecodeImage(url: string): Promise<ImageData> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const buffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    // Detect format and decode
    if (contentType.includes('png') || isPNG(uint8Array)) {
      return decodePNG(uint8Array);
    } else if (contentType.includes('jpeg') || contentType.includes('jpg') || isJPEG(uint8Array)) {
      return decodeJPEG(uint8Array);
    } else {
      throw new Error(`Unsupported image format: ${contentType}`);
    }
  } catch (error) {
    throw new Error(`Image decoding failed: ${error.message}`);
  }
}

function isPNG(data: Uint8Array): boolean {
  return data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47;
}

function isJPEG(data: Uint8Array): boolean {
  return data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF;
}

function decodePNG(data: Uint8Array): ImageData {
  const png = PNG.sync.read(Buffer.from(data));
  return {
    data: new Uint8Array(png.data),
    width: png.width,
    height: png.height
  };
}

function decodeJPEG(data: Uint8Array): ImageData {
  const decoded = jpeg.decode(data, { useTArray: true });
  return {
    data: decoded.data,
    width: decoded.width,
    height: decoded.height
  };
}

/**
 * Normalize image size (downscale if too large)
 */
export function normalizeImageSize(img: ImageData, maxDimension = 1920): ImageData {
  if (img.width <= maxDimension && img.height <= maxDimension) {
    return img;
  }

  const scale = Math.min(maxDimension / img.width, maxDimension / img.height);
  const newWidth = Math.floor(img.width * scale);
  const newHeight = Math.floor(img.height * scale);

  // Simple nearest-neighbor downscaling
  const newData = new Uint8Array(newWidth * newHeight * 4);
  
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = Math.floor(x / scale);
      const srcY = Math.floor(y / scale);
      const srcIdx = (srcY * img.width + srcX) * 4;
      const dstIdx = (y * newWidth + x) * 4;
      
      newData[dstIdx] = img.data[srcIdx];
      newData[dstIdx + 1] = img.data[srcIdx + 1];
      newData[dstIdx + 2] = img.data[srcIdx + 2];
      newData[dstIdx + 3] = img.data[srcIdx + 3];
    }
  }

  return { data: newData, width: newWidth, height: newHeight };
}