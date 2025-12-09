/**
 * @file Context prediction configuration and logic
 * Extracted from ContextSelector.jsx for better maintainability
 */

// Default Page to Component mapping (fallback)
export const DEFAULT_PAGE_COMPONENT_MAP = {
  "**/*": ["*"],
  Dashboard: ["ItemCard"],
  AddItem: ["ImageUploadZone", "ZipUploadZone"],
  ViewItem: ["FileChangesFeedback"],
  EditItem: ["ImageUploadZone", "ZipUploadZone", "FileChangesFeedback"],
  Multiprompt: ["ThoughtCard"],
  AIBackoffice: ["LanguageSelector"]
};

export const DEFAULT_PAGES = Object.keys(DEFAULT_PAGE_COMPONENT_MAP);

export const DEFAULT_DOMAINS = [
  "UI",
  "Data", 
  "UploadFlow",
  "i18n",
  "DragDrop",
  "PromptEngine",
  "Routing",
  "Styling",
  "Performance"
];

// Keywords for AI prediction
export const PAGE_KEYWORDS = {
  Dashboard: ["vault", "overview", "items", "list", "search", "filter", "card", "favorite"],
  AddItem: ["new", "add", "create", "upload", "form"],
  ViewItem: ["view", "detail", "show", "display", "read"],
  EditItem: ["edit", "modify", "change", "update"],
  Multiprompt: ["thought", "task", "prompt", "builder", "multi", "project", "template"],
  AIBackoffice: ["settings", "ai", "language", "preferences"]
};

export const COMPONENT_KEYWORDS = {
  ItemCard: ["card", "item", "preview", "favorite", "copy"],
  ImageUploadZone: ["image", "screenshot", "upload", "photo", "picture"],
  ZipUploadZone: ["zip", "file", "download", "code"],
  FileChangesFeedback: ["feedback", "changes", "pkf", "knowledge"],
  ThoughtCard: ["thought", "task", "checkbox", "focus", "drag"],
  LanguageSelector: ["language", "nl", "en", "translation", "i18n"]
};

export const DOMAIN_KEYWORDS = {
  UI: ["button", "layout", "design", "visual", "style", "color", "icon"],
  Data: ["data", "save", "load", "entity", "database", "query"],
  UploadFlow: ["upload", "file", "image", "zip"],
  i18n: ["translation", "language", "translate", "nl", "en"],
  DragDrop: ["drag", "drop", "order", "reorder"],
  PromptEngine: ["prompt", "template", "generate", "builder", "ai"],
  Routing: ["navigation", "route", "page", "link", "url"],
  Styling: ["css", "tailwind", "style", "color", "font", "spacing"],
  Performance: ["fast", "performance", "load", "optimization", "cache"]
};

/**
 * Calculate score based on keyword matches
 * @param {string} text - Text to analyze
 * @param {string[]} keywords - Keywords to match against
 * @returns {number} Score between 0 and 1
 */
function calculateScore(text, keywords) {
  const lowerText = text.toLowerCase();
  let matches = 0;
  for (const keyword of keywords) {
    if (lowerText.includes(keyword)) {
      matches++;
    }
  }
  return keywords.length > 0 ? Math.min(matches / keywords.length * 1.5, 1) : 0;
}

/**
 * Predicts context (page, component, domain) based on keywords
 * @param {string} text - Input text to analyze
 * @returns {Object|null} Prediction object or null
 */
export function predictContext(text) {
  // Early returns for performance
  if (!text || text.length < 5) return null;
  
  const lowerText = text.toLowerCase();
  
  // Quick check: does the text contain any relevant keywords?
  const hasAnyKeyword = Object.values(PAGE_KEYWORDS)
    .flat()
    .some(kw => lowerText.includes(kw));
  
  if (!hasAnyKeyword) return null;

  // Calculate scores only if there are potential matches
  const pageScores = Object.entries(PAGE_KEYWORDS)
    .map(([page, keywords]) => ({
      name: page,
      score: calculateScore(lowerText, keywords)
    }))
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (pageScores.length === 0) return null;

  const componentScores = Object.entries(COMPONENT_KEYWORDS)
    .map(([comp, keywords]) => ({
      name: comp,
      score: calculateScore(lowerText, keywords)
    }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const domainScores = Object.entries(DOMAIN_KEYWORDS)
    .map(([domain, keywords]) => ({
      name: domain,
      score: calculateScore(lowerText, keywords)
    }))
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  return {
    predictedPages: pageScores,
    predictedComponents: componentScores,
    predictedDomains: domainScores,
    explanation: `Keywords in: ${text.substring(0, 50)}...`
  };
}