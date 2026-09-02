import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PrefetchLink } from "@/components/PrefetchLink";
import * as thoughts from "@/api/thoughts";
import * as projects from "@/api/projects";
import * as items from "@/api/items";
// base44 is used ONLY for auth.logout(redirectUrl) below — the SDK auth call is
// out of scope for the entity data-layer migration (src/api/index.js) and
// AuthContext.jsx's logout() has no custom-redirect-URL option; see handleLogout.
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";
import { Settings, Sparkles, Plus, Archive, LogOut, Trash, MessageCircle, BarChart, ListChecks, FileText, TrendingUp } from "lucide-react";
import ThemeToggleButton from "@/components/theme/ThemeToggleButton";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ExportDialogWrapper from "@/components/export/ExportDialogWrapper";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showExport, setShowExport] = useState(false);

  const { currentUser: user, logout } = useAuth();

  // HARDENED: Badge counts can fail without affecting navigation.
  // Errors surface via the global query error toast; UI falls back to 0/[].
  const { data: deletedCount = 0 } = thoughts.useDeletedThoughts({
    select: (data) => data?.length || 0,
    staleTime: 5 * 60 * 1000,
    retry: false, // Don't retry badge queries
  });

  // Fetch active projects to filter thoughts
  const { data: activeProjects = [] } = projects.useList({
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // HARDENED: Badge counts derived from CANONICAL activeThoughts query
  // This ensures Header badge always matches Multiprompt badge
  const { data: rawThoughts = [] } = thoughts.useActiveThoughts({
    staleTime: 30 * 1000,
    retry: false,
  });

  // Filter: only count thoughts from active projects OR without project
  const activeProjectIds = activeProjects.map(p => p.id);
  const activeThoughts = rawThoughts.filter(t =>
    !t.project_id || activeProjectIds.includes(t.project_id)
  );
  const allThoughtsCount = activeThoughts.length;

  // HARDENED: Open tasks badge is non-critical UI feature
  const { data: openTasksCount = 0 } = items.useOpenChecksCount({
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });

  const handleLogout = () => {
    // Back to the public Features page after the SDK cleared the session.
    logout(window.location.origin + createPageUrl('Features'));
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

  // Redirect on initial load
  useEffect(() => {
    if (currentPath === "/" || currentPath === "") {
      if (user === null) {
        navigate(createPageUrl('Features'), { replace: true });
      } else if (user) {
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
            src="https://base44.app/api/apps/68f4bcd57ca6479c7acf2f47/files/public/68f4bcd57ca6479c7acf2f47/495110831_Promptsterbeta.png" 
            alt="Promptster" 
            className="h-20 w-auto object-contain"
          />
        </button>

        {/* Center: Main Navigation */}
        <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          <PrefetchLink page="Multiprompt" to={createPageUrl("Multiprompt")}>
            <div 
              className={`relative flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm transition-all ${
                isMultiprompt 
                  ? 'bg-purple-600 text-white shadow-md font-bold' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700 font-medium'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Multi-Prompt</span>
              {allThoughtsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-[10px] text-white">
                  {allThoughtsCount}
                </span>
              )}
            </div>
          </PrefetchLink>

          <PrefetchLink page="Checks" to={createPageUrl("Checks")}>
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
          </PrefetchLink>
          
          <PrefetchLink page="AddItem" to={createPageUrl("AddItem")}>
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
          </PrefetchLink>
          
          <PrefetchLink page="Dashboard" to={createPageUrl("Dashboard")}>
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
          </PrefetchLink>
        </div>

        {/* Right side: Settings */}
        <div className="flex items-center gap-1">
          {/* Theme toggle - outside dropdown */}
          {user && <ThemeToggleButton />}
          
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
                      <Link to={createPageUrl("AIBackoffice")} className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 bg-red-50/50 dark:bg-red-950/30">
                        <TrendingUp className="mr-2 h-4 w-4" />
                        <span>AI Backoffice</span>
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
                  <Link to={createPageUrl("Features")} className="cursor-pointer text-slate-700 dark:text-slate-300">
                    <Sparkles className="mr-2 h-4 w-4" />
                    <span>Features</span>
                  </Link>
                </DropdownMenuItem>
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

                
                {user?.role === 'admin' && (
                  <DropdownMenuItem asChild className="hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Link to={createPageUrl("AdminSettings")} className="cursor-pointer text-purple-600 dark:text-purple-400 font-medium">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>⚙️ App Settings</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
                <DropdownMenuItem asChild className="hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Link to={createPageUrl("RecycleBin")} className="cursor-pointer text-slate-700 dark:text-slate-300">
                    <div className="relative flex items-center">
                      <Trash className={`mr-2 h-4 w-4 ${deletedCount > 0 ? 'text-red-600 dark:text-red-400' : ''}`} />
                      <span>Recycle Bin</span>
                      {deletedCount > 0 && (
                        <span className="ml-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
                          {deletedCount}
                        </span>
                      )}
                    </div>
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
               <ExportDialogWrapper />
            </DialogContent>
          </Dialog>


        </div>
      </div>
    </header>
  );
}