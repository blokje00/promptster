import React, { useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Settings, Sparkles, Plus, Archive, User, LogOut, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "../i18n/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const handleLogout = async () => {
    await base44.auth.logout();
  };
  
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
    window.location.reload();
  };

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 md:px-6 py-3 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left side: Logo */}
        <button 
          onClick={handleLogoClick}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f4bcd57ca6479c7acf2f47/2e57f2099_Promptguardpurpletransbeta.png" 
            alt="PromptGuard" 
            className="h-20 w-auto object-contain"
          />
        </button>

        {/* Center: Main Navigation */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          <Link to={createPageUrl("Dashboard")}>
            <Button 
              variant={isVault ? "default" : "ghost"}
              size="sm" 
              className={`gap-1.5 px-2 sm:px-3 ${isVault ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-900'}`}
              title={t("Overzicht van al je items")}
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
              title={t("Nieuwe prompt of item toevoegen")}
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
              title={t("Bouw complexe multi-step prompts")}
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Multi-Step</span>
            </Button>
          </Link>
        </div>

        {/* Right side: Settings */}
        <div className="flex items-center gap-1">
          <Link to={createPageUrl("Features")}>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-indigo-600 font-medium hover:text-indigo-700 hover:bg-indigo-50 hidden md:flex"
              title={t("Bekijk de features")}
            >
              Features
            </Button>
          </Link>
          <Link to={createPageUrl("AIBackoffice")}>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              title={t("Instellingen en AI-configuratie")}
            >
              <Settings className="w-5 h-5" />
            </Button>
          </Link>
          
          <Link to={createPageUrl("RecycleBin")}>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-slate-500 hover:text-red-600 hover:bg-red-50"
              title="Prullenbak"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </Link>
          
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 rounded-full ml-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url} alt={user.full_name} />
                    <AvatarFallback>{user.full_name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.full_name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Uitloggen</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}