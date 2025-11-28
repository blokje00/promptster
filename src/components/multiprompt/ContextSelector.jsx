import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, X, FileCode, Layers, Zap, CheckCircle } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";

// Page to Component mapping
const PAGE_COMPONENT_MAP = {
  Dashboard: ["ItemCard"],
  AddItem: ["ImageUploadZone", "ZipUploadZone"],
  ViewItem: ["FileChangesFeedback"],
  EditItem: ["ImageUploadZone", "ZipUploadZone", "FileChangesFeedback"],
  Multiprompt: ["ThoughtCard"],
  AIBackoffice: ["LanguageSelector"]
};

const PAGES = Object.keys(PAGE_COMPONENT_MAP);

const DOMAINS = [
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

function predictContext(text) {
  if (!text || text.length < 3) return null;

  // Calculate page scores
  const pageScores = PAGES.map(page => ({
    name: page,
    score: calculateScore(text, PAGE_KEYWORDS[page])
  })).filter(p => p.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);

  // Calculate component scores
  const componentScores = Object.keys(COMPONENT_KEYWORDS).map(comp => ({
    name: comp,
    score: calculateScore(text, COMPONENT_KEYWORDS[comp])
  })).filter(c => c.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);

  // Calculate domain scores
  const domainScores = DOMAINS.map(domain => ({
    name: domain,
    score: calculateScore(text, DOMAIN_KEYWORDS[domain])
  })).filter(d => d.score > 0).sort((a, b) => b.score - a.score).slice(0, 2);

  if (pageScores.length === 0 && componentScores.length === 0) return null;

  return {
    predictedPages: pageScores,
    predictedComponents: componentScores,
    predictedDomains: domainScores,
    explanation: `Keywords gevonden in: ${text.substring(0, 50)}...`
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

  const { target_page, target_component, target_domain } = value;

  // Available components based on selected page - use project mapping if available
  const availableComponents = useMemo(() => {
    if (!target_page) return [];
    // Check if project has custom mapping
    if (selectedProject?.component_mapping && selectedProject.component_mapping[target_page]) {
      return selectedProject.component_mapping[target_page];
    }
    return PAGE_COMPONENT_MAP[target_page] || [];
  }, [target_page, selectedProject]);

  // AI Prediction on text change - only if enabled
  useEffect(() => {
    if (!enableAISuggestions) {
      setPrediction(null);
      setShowPrediction(false);
      return;
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
    const newComponents = PAGE_COMPONENT_MAP[newPage] || [];
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
    
    if (prediction.predictedPages[0]) {
      newValue.target_page = prediction.predictedPages[0].name;
    }
    if (prediction.predictedComponents[0]) {
      // Check if component belongs to predicted page
      const pageComps = PAGE_COMPONENT_MAP[newValue.target_page] || [];
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
      {/* Selection chips - inline */}
      {hasSelection && (
        <>
          {target_page && (
            <Badge variant="outline" className="bg-blue-50 border-blue-300 text-blue-700 text-xs h-7 px-2">
              <FileCode className="w-3 h-3 mr-1" />
              {target_page}
            </Badge>
          )}
          {target_component && (
            <Badge variant="outline" className="bg-purple-50 border-purple-300 text-purple-700 text-xs h-7 px-2">
              <Layers className="w-3 h-3 mr-1" />
              {target_component}
            </Badge>
          )}
          {target_domain && (
            <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700 text-xs h-7 px-2">
              <Zap className="w-3 h-3 mr-1" />
              {target_domain}
            </Badge>
          )}
          <button
            type="button"
            onClick={clearSelection}
            className="text-slate-400 hover:text-slate-600 p-0.5"
            aria-label={t("clearSelection") || "Wis selectie"}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </>
      )}
      
      {/* Selectors - inline compact */}
      {!hasSelection && (
        <>
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
              {PAGES.map(page => (
                <SelectItem key={page} value={page} className="text-xs">
                  {page}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={target_component || ""} 
            onValueChange={handleComponentChange}
            disabled={!target_page}
          >
            <SelectTrigger 
              className="h-7 text-xs w-auto min-w-[90px] border-dashed bg-white"
              aria-label={t("selectComponent") || "Selecteer component"}
            >
              <SelectValue placeholder={t("component") || "Component"} />
            </SelectTrigger>
            <SelectContent>
              {availableComponents.map(comp => (
                <SelectItem key={comp} value={comp} className="text-xs">
                  {comp}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
              {DOMAINS.map(domain => (
                <SelectItem key={domain} value={domain} className="text-xs">
                  {domain}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

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
    </div>
  );
}