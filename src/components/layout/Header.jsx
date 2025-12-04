import React, { useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Settings, Sparkles, Plus, Archive, User, LogOut, ChevronDown, Trash2, Trash } from "lucide-react";
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

  const { data: deletedCount = 0 } = useQuery({
    queryKey: ['deletedThoughtsCount', user?.email],
    queryFn: async () => {
      if (!user?.email) return 0;
      const result = await base44.entities.Thought.filter({ 
        created_by: user.email,
        is_deleted: true 
      });
      return result.length || 0;
    },
    enabled: !!user?.email,
  });

  const handleLogout = async () => {
    await base44.auth.logout();
  };
  
  const currentPath = location.pathname;
  const isVault = currentPath.includes("Dashboard") || currentPath === "/" || currentPath === "";
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
            src="https://base44.app/api/apps/68f4bcd57ca6479c7acf2f47/files/public/68f4bcd57ca6479c7acf2f47/59f339046_Promptguardlogopurplebeta.png" 
            alt="Promptster" 
            className="h-20 w-auto object-contain"
          />
        </button>

        {/* Center: Main Navigation */}
        <div className="flex items-center gap-0.5 bg-slate-100 rounded-xl p-1">
          <Link to={createPageUrl("Dashboard")}>
            <div 
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                isVault 
                  ? 'bg-slate-800 text-white shadow-md' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
              }`}
            >
              <Archive className="w-4 h-4" />
              <span className="hidden sm:inline">Vault</span>
            </div>
          </Link>
          
          <Link to={createPageUrl("AddItem")}>
            <div 
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                isAddItem 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Prompt</span>
            </div>
          </Link>
          
          <Link to={createPageUrl("Multiprompt")}>
            <div 
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                isMultiprompt 
                  ? 'bg-purple-600 text-white shadow-md' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Multi-Step</span>
            </div>
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
              className="text-slate-500 hover:text-red-600 hover:bg-red-50 relative"
              title="Prullenbak"
            >
              {deletedCount > 0 ? (
                <Trash2 className="w-5 h-5 text-red-500" />
              ) : (
                <Trash className="w-5 h-5" />
              )}
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