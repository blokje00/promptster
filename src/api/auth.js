import { base44 } from "./base44Client";

/**
 * Plain (non-hook) auth helpers for code that runs outside React components,
 * e.g. the client-side AI services in src/lib/ai/. Inside components use
 * `useAuth()` from src/lib/AuthContext.jsx instead — its `updateMe` also
 * refreshes the shared auth cache.
 */

/** Current signed-in user, or null. */
export async function me() {
  try {
    return await base44.auth.me();
  } catch {
    return null;
  }
}

/** Update fields on the signed-in user. Callers must refresh the auth cache
 *  themselves (useAuth().refreshUser) when they run inside React. */
export function updateMe(data) {
  return base44.auth.updateMe(data);
}
