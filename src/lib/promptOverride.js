/**
 * The Multiprompt preview shows the live prompt assembled from the selected
 * tasks, unless the user improved it with AI or edited it by hand. That
 * override is bound to the exact prompt it was derived from: as soon as the
 * tasks, templates or toggles change, the live prompt wins again. Nothing is
 * deleted; the override simply no longer matches.
 *
 * An override is `{ source, text }` — `source` is the generated prompt the
 * override replaces, `text` is what to show instead.
 */

/** Text to display for a given override and the current live prompt. */
export function resolveOverride(override, generatedPrompt) {
  if (!override || typeof override.text !== "string" || !override.text) return "";
  return override.source === generatedPrompt ? override.text : "";
}

/** Build an override for `text` on top of `generatedPrompt`; empty text clears it. */
export function bindOverride(text, generatedPrompt) {
  return text ? { source: generatedPrompt, text } : null;
}

/** Parse a stored override; legacy plain strings (unbound) are discarded. */
export function parseStoredOverride(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && typeof parsed.text === "string" && typeof parsed.source === "string") {
      return parsed.text ? parsed : null;
    }
  } catch {
    // legacy value: a bare string saved before overrides were bound to their source
  }
  return null;
}
