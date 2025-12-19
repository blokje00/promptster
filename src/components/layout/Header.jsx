import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Settings, Sparkles, Plus, Archive, User, LogOut, ChevronDown, Trash2, Trash, MessageCircle, BarChart, ListChecks, FileText, TrendingUp, X, Database, CreditCard } from "lucide-react";
import ThemeToggleButton from "@/components/theme/ThemeToggleButton";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLanguage } from "../i18n/LanguageContext";
import StartTrialModal from "../auth/StartTrialModal";
import { hasValidAccess } from "@/components/lib/subscriptionUtils";
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
  
  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        // User not logged in
        return null;
      }
    },
    retry: false,
  });

  // HARDENED: Badge counts can fail without affecting navigation
  const { data: deletedCount = 0 } = useQuery({
    queryKey: ['deletedThoughtsCount', user?.email],
    queryFn: async () => {
      try {
        if (!user?.email) return 0;
        const result = await base44.entities.Thought.filter({ 
          created_by: user.email,
          is_deleted: true 
        });
        return result?.length || 0;
      } catch (error) {
        console.warn('[Header] Deleted count fetch failed (non-blocking):', error.message);
        return 0; // Hide badge on error
      }
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
    retry: false, // Don't retry badge queries
  });

  // HARDENED: Badge counts are UI-only, failures don't affect access
  const { data: allThoughtsCount = 0 } = useQuery({
    queryKey: ['allThoughtsCount', user?.email],
    queryFn: async () => {
      try {
        if (!user?.email) return 0;
        const thoughts = await base44.entities.Thought.filter({ 
          created_by: user.email,
          is_deleted: false
        });
        return thoughts?.length || 0;
      } catch (error) {
        console.warn('[Header] All thoughts count failed (non-blocking):', error.message);
        return 0;
      }
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // HARDENED: Open tasks badge is non-critical UI feature
  const { data: openTasksCount = 0 } = useQuery({
    queryKey: ['openTasksCount', user?.email],
    queryFn: async () => {
      try {
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
      } catch (error) {
        console.warn('[Header] Open tasks count failed (non-blocking):', error.message);
        return 0;
      }
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const handleLogout = async () => {
    // TASK-2: Use Base44 auth redirect after logout
    const returnUrl = window.location.origin + createPageUrl('Features');
    await base44.auth.logout(returnUrl);
  };

  const handleSeedDemoData = async () => {
    console.log('[Header] 🚀 Starting demo seed process (FORCE MODE)...');
    console.log('[Header] User:', user);
    
    try {
      toast.info('Creating demo data (force mode)...');
      console.log('[Header] ⏳ Invoking seedDemoData function with force=true...');
      
      const response = await base44.functions.invoke('seedDemoData', { force: true });
      
      console.log('[Header] ✅ Function response received:', response);
      console.log('[Header] Response status:', response.status);
      console.log('[Header] Response data:', response.data);
      
      if (response.data?.status === 'already_seeded') {
        console.log('[Header] ℹ️ Demo data already exists');
        toast.info('Demo data already exists');
      } else if (response.data?.status === 'success') {
        console.log('[Header] ✨ Demo created successfully!', response.data);
        toast.success(`Demo created: ${response.data.projects} projects, ${response.data.tasks} tasks!`);
        
        // Force full page reload to refresh all caches
        console.log('[Header] 🔄 Reloading page to show demo data...');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        console.log('[Header] ⚠️ Unexpected response format:', response);
        toast.success('Demo data created!');
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (error) {
      console.error('[Header] ❌ Seed error:', error);
      console.error('[Header] Error name:', error.name);
      console.error('[Header] Error message:', error.message);
      console.error('[Header] Error stack:', error.stack);
      console.error('[Header] Full error object:', JSON.stringify(error, null, 2));
      toast.error(`Failed: ${error.message || 'Unknown error'}`);
    }
    
    console.log('[Header] 🏁 Demo seed process completed');
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

  // Redirect on initial load - HARDENED: no auth = Features, auth + access = Multiprompt
  useEffect(() => {
    if (currentPath === "/" || currentPath === "") {
      if (user === null) {
        // Not loading anymore, definitely no user → Features
        navigate(createPageUrl('Features'), { replace: true });
      } else if (user) {
        // User loaded, check access
        const hasAccess = hasValidAccess(user);
        if (hasAccess) {
          navigate(createPageUrl('Multiprompt'), { replace: true });
        } else {
          navigate(createPageUrl('Subscription'), { replace: true });
        }
      }
      // else: user still loading, wait
    }
  }, [currentPath, navigate, user]);

  // Auto-seed demo data for new users
  useEffect(() => {
    const seedForNewUser = async () => {
      if (!user || !user.email) return;
      
      // PERFORMANCE: Only seed for users with valid access
      if (!hasValidAccess(user)) {
        return;
      }
      
      // Check localStorage to prevent infinite loop
      const seedKey = `demo_seeded_${user.id}`;
      if (localStorage.getItem(seedKey)) {
        return; // Already attempted seeding
      }
      
      // Check if demo_seeded_at is null (new user)
      if (user.demo_seeded_at === null || user.demo_seeded_at === undefined) {
        console.log('[Header] 🆕 New user detected, auto-seeding demo data...');
        localStorage.setItem(seedKey, 'true'); // Mark as attempted
        
        try {
          const response = await base44.functions.invoke('seedDemoData', { force: false });
          
          if (response.data?.status === 'success') {
            console.log('[Header] ✨ Demo data auto-seeded successfully');
            
            // Fetch updated user data to get demo preferences
            const updatedUser = await base44.auth.me();
            
            // Set default project and templates in localStorage
            if (updatedUser.demo_default_project_id) {
              localStorage.setItem('lastSelectedProjectId', updatedUser.demo_default_project_id);
            }
            if (updatedUser.demo_start_template_id) {
              localStorage.setItem('lastStartTemplateId', updatedUser.demo_start_template_id);
            }
            if (updatedUser.demo_end_template_id) {
              localStorage.setItem('lastEndTemplateId', updatedUser.demo_end_template_id);
            }
            
            console.log('[Header] ✅ Demo preferences set in localStorage');
            
            // Reload once to show demo data
            setTimeout(() => {
              window.location.reload();
            }, 800);
          }
        } catch (error) {
          console.error('[Header] ❌ Auto-seed failed:', error);
          // Silent fail - user can still use app
        }
      } else {
        // User already has demo data, mark as completed
        localStorage.setItem(seedKey, 'true');
      }
    };
    
    seedForNewUser();
  }, [user]);
  
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
                      <Link to={createPageUrl("AdminFeatures")} className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 bg-red-50/50 dark:bg-red-950/30">
                        <Sparkles className="mr-2 h-4 w-4" />
                        <span>Features CMS</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl("AdminSupportTickets")} className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 bg-red-50/50 dark:bg-red-950/30">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        <span>Tickets</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSeedDemoData} className="cursor-pointer text-green-600 dark:text-green-400 focus:text-green-600 dark:focus:text-green-400 bg-green-50/50 dark:bg-green-950/30">
                      <Database className="mr-2 h-4 w-4" />
                      <span>Seed Demo Data</span>
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
                <DropdownMenuItem asChild className="hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Link to={createPageUrl("Subscription")} className="cursor-pointer text-slate-700 dark:text-slate-300">
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>Manage Subscription</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
                <DropdownMenuItem asChild className="hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Link to={createPageUrl("RecycleBin")} className="cursor-pointer text-slate-700 dark:text-slate-300">
                    <Trash className="mr-2 h-4 w-4" />
                    <span>Recycle Bin</span>
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
            redirectTo="Multiprompt"
          />
        </div>
      </div>
    </header>
  );
}