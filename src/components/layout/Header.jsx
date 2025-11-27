import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Code2, Settings, ArrowLeft, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "../i18n/LanguageContext";

export default function Header() {
  const location = useLocation();
  const { t } = useLanguage();
  
  const isHomePage = location.pathname === "/" || 
                     location.pathname === createPageUrl("Dashboard") ||
                     location.pathname.includes("Dashboard");
  
  const handleLogoClick = () => {
    window.location.href = createPageUrl("Dashboard");
  };

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 md:px-6 py-3 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left side: Back button (on sub-pages) or Logo */}
        <div className="flex items-center gap-3">
          {!isHomePage && (
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-slate-900">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{t("back")}</span>
              </Button>
            </Link>
          )}
          
          {/* Logo - always visible, clickable for refresh */}
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
        </div>

        {/* Right side: Action buttons */}
        <div className="flex items-center gap-2">
          <Link to={createPageUrl("AddItem")}>
            <Button 
              size="sm" 
              className="bg-indigo-600 hover:bg-indigo-700 shadow-sm gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Prompt</span>
            </Button>
          </Link>
          
          <Link to={createPageUrl("Multiprompt")}>
            <Button 
              variant="outline" 
              size="sm"
              className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Multi-task</span>
            </Button>
          </Link>
          
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
      </div>
    </header>
  );
}