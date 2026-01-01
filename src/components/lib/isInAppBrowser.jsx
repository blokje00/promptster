/**
 * Detects if the user is accessing the app from an in-app browser
 * (LinkedIn, Facebook, Instagram, Twitter, etc.)
 * 
 * These browsers are blocked by Google OAuth for security reasons.
 */
export function isInAppBrowser() {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent || navigator.vendor || window.opera || "";

  return /LinkedInApp|FBAN|FBAV|Instagram|Twitter|Line|Snapchat|WhatsApp/i.test(ua);
}

/**
 * Check if user came from LinkedIn source parameter
 */
export function isLinkedInSource() {
  if (typeof window === "undefined") return false;
  
  const params = new URLSearchParams(window.location.search);
  return params.get("source") === "linkedin";
}