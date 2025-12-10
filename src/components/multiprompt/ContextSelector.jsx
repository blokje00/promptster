import React, { useState, useEffect, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sparkles, X, CheckCircle, Plus } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { 
  DEFAULT_PAGE_COMPONENT_MAP, 
  DEFAULT_PAGES, 
  DEFAULT_DOMAINS,
  predictContext 
} from "./contextPrediction";
import AddCustomItemDialog from "./AddCustomItemDialog";

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

  const handleAddItem = (name) => {
    if (isAddingItem === 'page') {
      setCustomPages(prev => [...prev, name]);
      handlePageChange(name);
    } else if (isAddingItem === 'component') {
      setCustomComponents(prev => [...prev, name]);
      handleComponentChange(name);
    }
    setIsAddingItem(null);
  };

  // Get domains - use project domains if available
  const availableDomains = useMemo(() => {
    if (selectedProject?.domains && selectedProject.domains.length > 0) {
      return selectedProject.domains;
    }
    return DEFAULT_DOMAINS;
  }, [selectedProject]);

  // AI Prediction on text change - disabled for all users (admin feature)
  // Debounced AI prediction effect
  useEffect(() => {
    // Always disabled - admin feature only
    setPrediction(null);
    setShowPrediction(false);
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
          className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-0.5"
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
            className="h-7 text-xs w-auto min-w-[80px] border-dashed bg-white dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700"
            aria-label={t("selectPage") || "Selecteer pagina"}
          >
            <SelectValue placeholder={t("page") || "Pagina"} />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            {availablePages.map(page => (
              <SelectItem key={page} value={page} className="text-xs text-slate-700 dark:text-slate-300">
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
          className="h-7 w-7 p-0 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-white dark:bg-slate-900 border-dashed dark:border-slate-700"
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
            className="h-7 text-xs w-auto min-w-[90px] border-dashed bg-white dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700"
            aria-label={t("selectComponent") || "Selecteer component"}
          >
            <SelectValue placeholder={t("component") || "Component"} />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            {availableComponents.length > 0 ? (
              availableComponents.map(comp => (
                <SelectItem key={comp} value={comp} className="text-xs text-slate-700 dark:text-slate-300">
                  {comp}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="_none" disabled className="text-xs text-slate-400 dark:text-slate-500">
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
          className="h-7 w-7 p-0 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-white dark:bg-slate-900 border-dashed dark:border-slate-700 disabled:opacity-30"
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
          className="h-7 text-xs w-auto min-w-[80px] border-dashed bg-white dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700"
          aria-label={t("selectDomain") || "Selecteer domein"}
        >
          <SelectValue placeholder={t("domain") || "Domein"} />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          {availableDomains.map(domain => (
            <SelectItem key={domain} value={domain} className="text-xs text-slate-700 dark:text-slate-300">
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
      <AddCustomItemDialog
        isOpen={!!isAddingItem}
        onClose={() => setIsAddingItem(null)}
        type={isAddingItem}
        onAdd={handleAddItem}
      />
    </div>
  );
}