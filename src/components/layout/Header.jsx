import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Code2, Settings, Sparkles, Plus, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "../i18n/LanguageContext";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const currentPath = location.pathname;
  const isVault = currentPath.includes("Dashboard");
  const isAddItem = currentPath.includes("AddItem");
  const isMultiprompt = currentPath.includes("Multiprompt");
  
  // Save last visited main page
  useEffect(() => {
    if (isVault) localStorage.setItem('lastMainPage', 'Dashboard');
    else if (isAddItem) localStorage.setItem('lastMainPage', 'AddItem');
    else if (isMultiprompt) localStorage.setItem('lastMainPage', 'Multiprompt');
  }, [isVault, isAddItem, isMultiprompt]);

  // Redirect to last page on initial load
  useEffect(() => {
    if (currentPath === "/" || currentPath === "") {
      const lastPage = localStorage.getItem('lastMainPage') || 'Dashboard';
      navigate(createPageUrl(lastPage), { replace: true });
    }
  }, [currentPath, navigate]);
  
  const handleLogoClick = () => {
    const lastPage = localStorage.getItem('lastMainPage') || 'Dashboard';
    window.location.href = createPageUrl(lastPage);
  };

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 md:px-6 py-3 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left side: Logo */}
        <button 
          onClick={handleLogoClick}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-slate-900 text-lg leading-tight">Promptguard</h1>
            <p className="text-xs text-slate-500 leading-tight">Code Vault</p>
          </div>
        </button>

        {/* Center: Main Navigation */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          <Link to={createPageUrl("Dashboard")}>
            <Button 
              variant={isVault ? "default" : "ghost"}
              size="sm" 
              className={`gap-1.5 px-2 sm:px-3 ${isVault ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Archive className="w-4 h-4" />
              <span className="hidden sm:inline">Vault</span>
            </Button>
          </Link>
          
          <Link to={createPageUrl("AddItem")}>
            <Button 
              variant={isAddItem ? "default" : "ghost"}
              size="sm" 
              className={`gap-1.5 px-2 sm:px-3 ${isAddItem ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Prompt</span>
            </Button>
          </Link>
          
          <Link to={createPageUrl("Multiprompt")}>
            <Button 
              variant={isMultiprompt ? "default" : "ghost"}
              size="sm"
              className={`gap-1.5 px-2 sm:px-3 ${isMultiprompt ? 'bg-purple-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Multi-task</span>
            </Button>
          </Link>
        </div>

        {/* Right side: Settings */}
        <Link to={createPageUrl("AIBackoffice")}>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            title={t("settings")}
          >
            <Settings className="w-5 h-5" />
          </Button>
        </Link>
      </div>
    </header>
  );
}