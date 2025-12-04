import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, X, FileCode, Layers, Zap, CheckCircle, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "../i18n/LanguageContext";

// Default Page to Component mapping (fallback)
const DEFAULT_PAGE_COMPONENT_MAP = {
  Dashboard: ["ItemCard"],
  AddItem: ["ImageUploadZone", "ZipUploadZone"],
  ViewItem: ["FileChangesFeedback"],
  EditItem: ["ImageUploadZone", "ZipUploadZone", "FileChangesFeedback"],
  Multiprompt: ["ThoughtCard"],
  AIBackoffice: ["LanguageSelector"]
};

const DEFAULT_PAGES = Object.keys(DEFAULT_PAGE_COMPONENT_MAP);

const DEFAULT_DOMAINS = [
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
const PAGE_KEYWORDS = {
  Dashboard: ["vault", "overzicht", "items", "lijst", "zoeken", "filter", "card", "favoriet"],
  AddItem: ["nieuw", "toevoegen", "create", "aanmaken", "upload", "formulier"],
  ViewItem: ["bekijken", "view", "detail", "tonen", "weergave", "lezen"],
  EditItem: ["bewerken", "edit", "wijzigen", "aanpassen", "update"],
  Multiprompt: ["thought", "taak", "gedachte", "prompt", "builder", "multi", "project", "template"],
  AIBackoffice: ["settings", "instellingen", "ai", "taal", "language", "voorkeuren"]
};

const COMPONENT_KEYWORDS = {
  ItemCard: ["card", "item", "kaart", "preview", "favoriet", "kopieer"],
  ImageUploadZone: ["afbeelding", "image", "screenshot", "upload", "foto", "plaatje"],
  ZipUploadZone: ["zip", "bestand", "file", "download", "code"],
  FileChangesFeedback: ["feedback", "wijzigingen", "changes", "pkf", "kennis"],
  ThoughtCard: ["thought", "gedachte", "taak", "checkbox", "focus", "drag"],
  LanguageSelector: ["taal", "language", "nl", "en", "vertaling", "i18n"]
};

const DOMAIN_KEYWORDS = {
  UI: ["button", "layout", "design", "visueel", "stijl", "kleur", "icon"],
  Data: ["data", "opslaan", "laden", "entity", "database", "query"],
  UploadFlow: ["upload", "bestand", "file", "afbeelding", "zip"],
  i18n: ["vertaling", "taal", "language", "translate", "nl", "en"],
  DragDrop: ["drag", "drop", "sleep", "volgorde", "reorder"],
  PromptEngine: ["prompt", "template", "genereren", "builder", "ai"],
  Routing: ["navigatie", "route", "pagina", "link", "url"],
  Styling: ["css", "tailwind", "stijl", "kleur", "font", "spacing"],
  Performance: ["snel", "performance", "laden", "optimalisatie", "cache"]
};

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
 * Voorspelt context (pagina, component, domein) op basis van keywords.
 * @param {string} text - Input tekst om te analyseren
 * @returns {Object|null} Predictie object of null
 */
function predictContext(text) {
  // Early returns voor performance
  if (!text || text.length < 5) return null;
  
  const lowerText = text.toLowerCase();
  
  // Quick check: bevat de tekst überhaupt relevante keywords?
  const hasAnyKeyword = Object.values(PAGE_KEYWORDS)
    .flat()
    .some(kw => lowerText.includes(kw));
  
  if (!hasAnyKeyword) return null;

  // Calculate scores alleen als er potentieel matches zijn
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

export default function ContextSelector({ 
  value = {}, 
  onChange, 
  thoughtText = "",
  compact = false,
  selectedProject = null,
  enableAISuggestions = true
}) {
  const { t } = useLanguage();
  const [prediction, setPrediction] = useState(null);
  const [showPrediction, setShowPrediction] = useState(false);
  
  // Custom items state
  const [customPages, setCustomPages] = useState([]);
  const [customComponents, setCustomComponents] = useState([]);
  const [isAddingItem, setIsAddingItem] = useState(null); // 'page' or 'component'
  const [newItemName, setNewItemName] = useState("");

  const { target_page, target_component, target_domain } = value;

  // Get pages list - use project mapping if available, otherwise default
  const availablePages = useMemo(() => {
    let pages = DEFAULT_PAGES;
    if (selectedProject?.component_mapping && Object.keys(selectedProject.component_mapping).length > 0) {
      pages = Object.keys(selectedProject.component_mapping);
    }
    return [...new Set([...pages, ...customPages])];
  }, [selectedProject, customPages]);

  // Available components based on selected page - use project mapping if available
  const availableComponents = useMemo(() => {
    if (!target_page) return [];
    let comps = DEFAULT_PAGE_COMPONENT_MAP[target_page] || [];
    // Check if project has custom mapping
    if (selectedProject?.component_mapping && selectedProject.component_mapping[target_page]) {
      comps = selectedProject.component_mapping[target_page];
    }
    return [...new Set([...comps, ...customComponents])];
  }, [target_page, selectedProject, customComponents]);

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    
    if (isAddingItem === 'page') {
      setCustomPages(prev => [...prev, newItemName.trim()]);
      handlePageChange(newItemName.trim());
    } else if (isAddingItem === 'component') {
      setCustomComponents(prev => [...prev, newItemName.trim()]);
      handleComponentChange(newItemName.trim());
    }
    
    setNewItemName("");
    setIsAddingItem(null);
  };

  // Get domains - use project domains if available
  const availableDomains = useMemo(() => {
    if (selectedProject?.domains && selectedProject.domains.length > 0) {
      return selectedProject.domains;
    }
    return DEFAULT_DOMAINS;
  }, [selectedProject]);

  // AI Prediction on text change - only if enabled
  /**
   * Debounced AI prediction effect.
   * Clears prediction wanneer AI suggestions uitgeschakeld zijn.
   */
  useEffect(() => {
    if (!enableAISuggestions) {
      setPrediction(null);
      setShowPrediction(false);
      return undefined; // Explicit return voor cleanup
    }
    
    // Early return voor korte teksten
    if (!thoughtText || thoughtText.length < 5) {
      setPrediction(null);
      setShowPrediction(false);
      return undefined;
    }

    const timer = setTimeout(() => {
      const pred = predictContext(thoughtText);
      setPrediction(pred);
      setShowPrediction(!!pred);
    }, 500);

    return () => clearTimeout(timer);
  }, [thoughtText, enableAISuggestions]);

  const handlePageChange = (newPage) => {
    // Reset component if it doesn't belong to new page
    const projectMapping = selectedProject?.component_mapping || {};
    const newComponents = projectMapping[newPage] || DEFAULT_PAGE_COMPONENT_MAP[newPage] || [];
    const newComponent = newComponents.includes(target_component) ? target_component : null;
    
    onChange({
      ...value,
      target_page: newPage,
      target_component: newComponent
    });
  };

  const handleComponentChange = (newComponent) => {
    onChange({
      ...value,
      target_component: newComponent
    });
  };

  const handleDomainChange = (newDomain) => {
    onChange({
      ...value,
      target_domain: newDomain
    });
  };

  const handleAcceptPrediction = () => {
    if (!prediction) return;
    
    const newValue = { ...value };
    const projectMapping = selectedProject?.component_mapping || {};
    
    if (prediction.predictedPages[0]) {
      newValue.target_page = prediction.predictedPages[0].name;
    }
    if (prediction.predictedComponents[0]) {
      // Check if component belongs to predicted page
      const pageComps = projectMapping[newValue.target_page] || DEFAULT_PAGE_COMPONENT_MAP[newValue.target_page] || [];
      if (pageComps.includes(prediction.predictedComponents[0].name)) {
        newValue.target_component = prediction.predictedComponents[0].name;
      }
    }
    if (prediction.predictedDomains && prediction.predictedDomains[0]) {
      newValue.target_domain = prediction.predictedDomains[0].name;
    }
    
    newValue.ai_prediction = prediction;
    
    onChange(newValue);
    setShowPrediction(false);
  };

  const clearSelection = () => {
    onChange({
      target_page: null,
      target_component: null,
      target_domain: null,
      ai_prediction: null
    });
  };

  const hasSelection = target_page || target_component || target_domain;

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${compact ? '' : 'w-full'}`}>
      {/* Selection badges - show inline with dropdowns */}
      {hasSelection && (
        <button
          type="button"
          onClick={clearSelection}
          className="text-slate-400 hover:text-slate-600 p-0.5"
          aria-label={t("clearSelection") || "Wis selectie"}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      
      {/* Selectors - always show all 3 dropdowns */}
      <div className="flex items-center gap-1">
        <Select 
          value={target_page || ""} 
          onValueChange={handlePageChange}
        >
          <SelectTrigger 
            className="h-7 text-xs w-auto min-w-[80px] border-dashed bg-white"
            aria-label={t("selectPage") || "Selecteer pagina"}
          >
            <SelectValue placeholder={t("page") || "Pagina"} />
          </SelectTrigger>
          <SelectContent>
            {availablePages.map(page => (
              <SelectItem key={page} value={page} className="text-xs">
                {page}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsAddingItem('page')}
          className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700 bg-white border-dashed"
          title={t("addPage") || "Nieuwe pagina toevoegen"}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Select 
          value={target_component || ""} 
          onValueChange={handleComponentChange}
        >
          <SelectTrigger 
            className="h-7 text-xs w-auto min-w-[90px] border-dashed bg-white"
            aria-label={t("selectComponent") || "Selecteer component"}
          >
            <SelectValue placeholder={t("component") || "Component"} />
          </SelectTrigger>
          <SelectContent>
            {availableComponents.length > 0 ? (
              availableComponents.map(comp => (
                <SelectItem key={comp} value={comp} className="text-xs">
                  {comp}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="_none" disabled className="text-xs text-slate-400">
                {t("choosePageFirst") || "Kies eerst pagina"}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsAddingItem('component')}
          disabled={!target_page}
          className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700 bg-white border-dashed disabled:opacity-30"
          title={t("addComponent") || "Nieuw component toevoegen"}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      <Select 
        value={target_domain || ""} 
        onValueChange={handleDomainChange}
      >
        <SelectTrigger 
          className="h-7 text-xs w-auto min-w-[80px] border-dashed bg-white"
          aria-label={t("selectDomain") || "Selecteer domein"}
        >
          <SelectValue placeholder={t("domain") || "Domein"} />
        </SelectTrigger>
        <SelectContent>
          {availableDomains.map(domain => (
            <SelectItem key={domain} value={domain} className="text-xs">
              {domain}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* AI Prediction - inline */}
      {showPrediction && prediction && enableAISuggestions && (
        <div className="flex items-center gap-1 text-xs bg-purple-50 rounded px-2 py-1 border border-purple-200">
          <Sparkles className="w-3 h-3 text-purple-500" />
          {prediction.predictedPages[0] && (
            <span className="text-purple-600">{prediction.predictedPages[0].name}</span>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleAcceptPrediction}
            className="h-5 px-1.5 text-xs text-purple-700 hover:bg-purple-100"
          >
            <CheckCircle className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Add Item Dialog */}
      <Dialog open={!!isAddingItem} onOpenChange={(open) => !open && setIsAddingItem(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isAddingItem === 'page' ? (t("addNewPage") || "Nieuwe Pagina toevoegen") : (t("addNewComponent") || "Nieuwe Component toevoegen")}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={isAddingItem === 'page' ? (t("pageName") || "Naam van pagina...") : (t("componentName") || "Naam van component...")}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsAddingItem(null)}>{t("cancel") || "Annuleren"}</Button>
            <Button type="submit" onClick={handleAddItem}>{t("add") || "Toevoegen"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}