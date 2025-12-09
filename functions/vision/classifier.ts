import type { Region } from "./layoutDetector.ts";

export type UIRole = "button" | "input" | "link" | "heading" | "label" | "image" | "card" | "other";

export interface ClassifiedRegion extends Region {
  role: UIRole;
}

/**
 * Classify regions using rule-based heuristics
 * (Fallback when no ML model is available)
 */
export function classifyRegionsHeuristic(regions: Region[]): ClassifiedRegion[] {
  return regions.map(region => {
    const role = inferRole(region);
    return { ...region, role };
  });
}

function inferRole(region: Region): UIRole {
  const text = region.text || '';
  const { width, height } = region.bbox;
  const aspectRatio = width / height;
  const area = width * height;
  const wordCount = text.split(/\s+/).length;

  // Button: short text, compact, action verbs
  if (wordCount <= 3 && area < 10000 && aspectRatio > 1.5 && aspectRatio < 5) {
    if (/^(submit|save|cancel|delete|edit|add|create|send|login|signup|ok|yes|no)/i.test(text)) {
      return "button";
    }
  }

  // Input: very short or no text, horizontal rectangle
  if (text.length < 3 && aspectRatio > 3 && height < 50) {
    return "input";
  }

  // Link: underlined or short with URL-like text
  if (wordCount <= 5 && /https?:\/\/|www\./i.test(text)) {
    return "link";
  }

  // Heading: short, larger area, few words
  if (wordCount <= 6 && area > 5000 && height > 30) {
    return "heading";
  }

  // Image: no text or very little
  if (text.length < 5 && area > 20000) {
    return "image";
  }

  // Card: moderate size, multiple words
  if (wordCount > 5 && area > 15000) {
    return "card";
  }

  // Label: short text, small
  if (wordCount <= 4 && area < 5000) {
    return "label";
  }

  return "other";
}