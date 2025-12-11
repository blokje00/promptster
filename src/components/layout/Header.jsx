import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Settings, Sparkles, Plus, Archive, User, LogOut, ChevronDown, Trash2, Trash, MessageCircle, BarChart, ListChecks, FileText, TrendingUp } from "lucide-react";
import ThemeToggleButton from "@/components/theme/ThemeToggleButton";
import { Button } from "@/components/ui/button";
import { useLanguage } from "../i18n/LanguageContext";
import StartTrialModal from "../auth/StartTrialModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import ExportDialogWrapper from "@/components/export/ExportDialogWrapper";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [showExport, setShowExport] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  
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
      return result?.length || 0;
    },
    enabled: !!user?.email,
    refetchInterval: 5000, 
  });

  // Task 3: All thoughts count (across all projects)
  const { data: allThoughtsCount = 0 } = useQuery({
    queryKey: ['allThoughtsCount', user?.email],
    queryFn: async () => {
      if (!user?.email) return 0;
      const thoughts = await base44.entities.Thought.filter({ 
        created_by: user.email,
        is_deleted: false
      });
      return thoughts?.length || 0;
    },
    enabled: !!user?.email,
    refetchInterval: 5000,
  });

  // Open Tasks Count (Checklist items)
  const { data: openTasksCount = 0 } = useQuery({
    queryKey: ['openTasksCount', user?.email],
    queryFn: async () => {
      if (!user?.email) return 0;
      const items = await base44.entities.Item.filter({ 
        created_by: user.email
      });
      
      let count = 0;
      items.forEach(item => {
        if (item.task_checks && Array.isArray(item.task_checks)) {
          item.task_checks.forEach(check => {
            if (!check.status || check.status === 'open') {
              count++;
            }
          });
        }
      });
      return count;
    },
    enabled: !!user?.email,
    refetchInterval: 10000,
  });

  const handleLogout = async () => {
    await base44.auth.logout();
  };
  
  const currentPath = location.pathname.toLowerCase();
  const isVault = currentPath.includes("dashboard") || currentPath === "/" || currentPath === "";
  const isAddItem = currentPath.includes("additem");
  const isMultiprompt = currentPath.includes("multiprompt");
  const isChecks = currentPath.includes("checks");
  
  // Save last visited main page
  useEffect(() => {
    if (isVault) localStorage.setItem('lastMainPage', 'Dashboard');
    else if (isAddItem) localStorage.setItem('lastMainPage', 'AddItem');
    else if (isMultiprompt) localStorage.setItem('lastMainPage', 'Multiprompt');
    else if (isChecks) localStorage.setItem('lastMainPage', 'Checks');
  }, [isVault, isAddItem, isMultiprompt, isChecks]);

  // Redirect on initial load - to last visited page for subscribers, Multiprompt for new users
  useEffect(() => {
    if (currentPath === "/" || currentPath === "") {
      const hasActiveAccess = user?.subscription_status === 'active' || user?.subscription_status === 'trial';
      if (hasActiveAccess) {
        const lastPage = localStorage.getItem('lastMainPage') || 'Multiprompt';
        navigate(createPageUrl(lastPage), { replace: true });
      } else {
        navigate(createPageUrl('Multiprompt'), { replace: true });
      }
    }
  }, [currentPath, navigate, user]);
  
  const handleLogoClick = () => {
    window.location.href = createPageUrl("Multiprompt");
  };

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-3 sticky top-0 z-50 transition-colors">
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
        <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          <Link to={createPageUrl("Multiprompt")}>
            <div 
              className={`relative flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm transition-all ${
                isMultiprompt 
                  ? 'bg-purple-600 text-white shadow-md font-bold' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700 font-medium'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Multi-Task</span>
              {allThoughtsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-[10px] text-white">
                  {allThoughtsCount}
                </span>
              )}
            </div>
          </Link>

          <Link to={createPageUrl("Checks")}>
            <div 
              className={`relative flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm transition-all ${
                isChecks 
                  ? 'bg-orange-600 text-white shadow-md font-bold' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700 font-medium'
              }`}
            >
              <ListChecks className="w-4 h-4" />
              <span className="hidden sm:inline">Checks</span>
              {openTasksCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {openTasksCount}
                </span>
              )}
            </div>
          </Link>
          
          <Link to={createPageUrl("AddItem")}>
            <div 
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm transition-all ${
                isAddItem 
                  ? 'bg-indigo-600 text-white shadow-md font-bold' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700 font-medium'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Prompt</span>
            </div>
          </Link>
          
          <Link to={createPageUrl("Dashboard")}>
            <div 
              className={`relative flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm transition-all ${
                isVault 
                  ? 'bg-slate-800 dark:bg-slate-600 text-white shadow-md font-bold' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700 font-medium'
              }`}
            >
              <Archive className="w-4 h-4" />
              <span className="hidden sm:inline sm:block">Vault</span>
            </div>
          </Link>
        </div>

        {/* Right side: Settings */}
        <div className="flex items-center gap-1">
          <ThemeToggleButton />
          
          {!user ? (
            <Button 
              onClick={() => base44.auth.redirectToLogin()}
              className="ml-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Get Started
            </Button>
          ) : null}
          
          {/* Admin items moved to dropdown */}
          {false && user?.role === 'admin' && (
            <>
              <Link to={createPageUrl("AdminStats")}>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-red-600 font-medium hover:text-red-700 hover:bg-red-50"
                  title="Admin Statistieken"
                >
                  <BarChart className="w-4 h-4 mr-1" />
                  Stats
                </Button>
              </Link>
              <Link to={createPageUrl("AdminSupportTickets")}>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-red-600 font-medium hover:text-red-700 hover:bg-red-50"
                  title="Support Tickets"
                >
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Tickets
                </Button>
              </Link>
            </>
          )}
          
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 rounded-full ml-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url} alt={user.full_name} />
                    <AvatarFallback className="bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300">
                      {user.full_name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-slate-900 dark:text-slate-100">{user.full_name}</p>
                    <p className="text-xs leading-none text-slate-500 dark:text-slate-400">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
                {user.role === 'admin' && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl("AdminStats")} className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 bg-red-50/50 dark:bg-red-950/30">
                        <BarChart className="mr-2 h-4 w-4" />
                        <span>Admin Stats</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl("AdminAnalytics")} className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 bg-red-50/50 dark:bg-red-950/30">
                        <TrendingUp className="mr-2 h-4 w-4" />
                        <span>Analytics</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl("AdminSupportTickets")} className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 bg-red-50/50 dark:bg-red-950/30">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        <span>Tickets</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
                  </>
                )}
                <DropdownMenuItem asChild className="hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Link to={createPageUrl("Support")} className="cursor-pointer text-slate-700 dark:text-slate-300">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    <span>Support</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Link to={createPageUrl("Legal")} className="cursor-pointer text-slate-700 dark:text-slate-300">
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Legal & Privacy</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
                <DropdownMenuItem onClick={() => setShowExport(true)} className="cursor-pointer text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950">
                  <Archive className="mr-2 h-4 w-4" />
                  <span>Export Vault</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 hover:bg-red-50 dark:hover:bg-red-950">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Export Dialog */}
          <Dialog open={showExport} onOpenChange={setShowExport}>
            <DialogContent className="max-w-md p-0 overflow-hidden">
               {/* Fetch items for export panel - we need to fetch them here or inside panel? 
                   ExportPanel expects 'items' prop. We can fetch them inside ExportPanel if modified, 
                   or fetch here. Since Header is always present, fetching all items might be heavy.
                   Let's assume ExportPanel can handle fetching if items is empty? 
                   No, ExportPanel uses items for stats. 
                   We should fetch items here only when dialog is open.
               */}
               <ExportDialogWrapper onClose={() => setShowExport(false)} />
            </DialogContent>
          </Dialog>

          {/* Trial Activation Modal */}
          <StartTrialModal 
            isOpen={showTrialModal}
            onClose={() => setShowTrialModal(false)}
            onSuccess={() => window.location.reload()}
          />
        </div>
      </div>
    </header>
  );
}