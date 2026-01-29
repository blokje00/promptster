import React, { useState, useMemo } from "react";

import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, Plus, Star, Code2, Sparkles, FileArchive, GitBranch, ClipboardCheck, FolderOpen, X, Grid3x3, Table } from "lucide-react";
import { useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import ItemCard from "../components/dashboard/ItemCard";
import AccessGuard from "../components/auth/AccessGuard";
import TrialBanner from "../components/dashboard/TrialBanner";
import VaultTableView from "../components/dashboard/VaultTableView";
import { projectColors } from "@/components/lib/constants";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showZipOnly, setShowZipOnly] = useState(false);
  const [showPublishedOnly, setShowPublishedOnly] = useState(false);
  const [showPendingCheckOnly, setShowPendingCheckOnly] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [viewMode, setViewMode] = useState("cards");

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const result = await base44.entities.Project.filter({ created_by: currentUser.email });
      return result || [];
    },
    enabled: !!currentUser?.email,
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ['items', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const result = await base44.entities.Item.filter({ created_by: currentUser.email }, "-updated_date");
      return result || [];
    },
    enabled: !!currentUser?.email,
    initialData: [],
  });

  const itemCounts = useMemo(() => ({
    all: items.length,
    prompt: items.filter(i => i.type === 'prompt').length,
    multiprompt: items.filter(i => i.type === 'multiprompt').length,
    code: items.filter(i => i.type === 'code').length,
    snippet: items.filter(i => i.type === 'snippet').length,
  }), [items]);

  const filteredItems = useMemo(() => items.filter(item => {
    const matchesSearch = !searchQuery || 
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = filterType === "all" || item.type === filterType || (filterType === "multiprompt" && item.type === "multiprompt");
    const matchesFavorites = !showFavoritesOnly || item.is_favorite;
    const matchesZip = !showZipOnly || (item.zip_files && item.zip_files.length > 0);
    const matchesPublished = !showPublishedOnly || item.is_publish_version;
    const matchesPendingCheck = !showPendingCheckOnly || item.is_pending_check;
    const matchesProject = selectedProjectId === "all" || item.project_id === selectedProjectId;
    
    return matchesSearch && matchesType && matchesFavorites && matchesZip && matchesPublished && matchesPendingCheck && matchesProject;
  }), [items, searchQuery, filterType, showFavoritesOnly, showZipOnly, showPublishedOnly, showPendingCheckOnly, selectedProjectId]);

  // Auto-activate trial moved to AccessGuard - removed from here to prevent duplicate activations

  return (
    <AccessGuard pageType="protected">
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <TrialBanner />
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              My Vault
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">All your tasks, prompts and code in one place</p>
          </div>
          <Link to={createPageUrl("AddItem")}>
            <Button 
              className={
                selectedProjectId !== "all" && projects.find(p => p.id === selectedProjectId)
                  ? projectColors[projects.find(p => p.id === selectedProjectId).color]
                  : "bg-indigo-600 hover:bg-indigo-700"
              }
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Item
            </Button>
          </Link>
        </div>



        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <div className="flex flex-col gap-4 mb-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search in your vault..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex gap-1 bg-slate-200 dark:bg-slate-700 rounded-md p-1">
                <Button
                  variant={viewMode === "cards" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("cards")}
                  className="h-7 px-2"
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="h-7 px-2"
                >
                  <Table className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`text-xs sm:text-sm ${showFavoritesOnly ? "bg-yellow-500 hover:bg-yellow-600" : ""}`}
                size="sm"
              >
                <Star className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 ${showFavoritesOnly ? 'fill-white' : ''}`} />
                Favorites
              </Button>
              <Button
                variant={showZipOnly ? "default" : "outline"}
                onClick={() => setShowZipOnly(!showZipOnly)}
                className={`text-xs sm:text-sm ${showZipOnly ? "bg-purple-500 hover:bg-purple-600" : ""}`}
                size="sm"
              >
                <FileArchive className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                ZIP
              </Button>
              <Button
                variant={showPublishedOnly ? "default" : "outline"}
                onClick={() => setShowPublishedOnly(!showPublishedOnly)}
                className={`text-xs sm:text-sm ${showPublishedOnly ? "bg-green-500 hover:bg-green-600" : ""}`}
                size="sm"
              >
                <GitBranch className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Published
              </Button>
              <Button
                variant={showPendingCheckOnly ? "default" : "outline"}
                onClick={() => setShowPendingCheckOnly(!showPendingCheckOnly)}
                className={`text-xs sm:text-sm ${showPendingCheckOnly ? "bg-orange-500 hover:bg-orange-600" : ""}`}
                size="sm"
              >
                <ClipboardCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Pending Check
              </Button>

              <div className="flex items-center gap-2">
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="w-[180px] h-9">
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <FolderOpen className="w-3 h-3 sm:w-4 sm:h-4 text-slate-500" />
                      <SelectValue placeholder="Filter op Project" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${projectColors[p.color]}`} />
                          {p.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProjectId !== "all" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedProjectId("all")}
                    className="h-9 w-9"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Tabs value={filterType} onValueChange={setFilterType}>
            <TabsList className="bg-slate-100 dark:bg-slate-900 flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="all" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                All <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">({itemCounts.all})</span>
              </TabsTrigger>
              <TabsTrigger value="prompt" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Prompts <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">({itemCounts.prompt})</span>
              </TabsTrigger>
              <TabsTrigger value="multiprompt" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                Multi-Steps <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">({itemCounts.multiprompt})</span>
              </TabsTrigger>
              <TabsTrigger value="code" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <Code2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Code <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">({itemCounts.code})</span>
              </TabsTrigger>
              <TabsTrigger value="snippet" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                Snippets <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">({itemCounts.snippet})</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-white dark:bg-slate-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600">
            <Code2 className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-300 mb-2">
              {searchQuery ? "No items found" : "No items yet"}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              {searchQuery ? "Try a different search" : "Start by adding your first prompt or code snippet"}
            </p>
            <Link to={createPageUrl("AddItem")}>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-5 h-5 mr-2" />
                Add your first item
              </Button>
            </Link>
          </div>
        ) : viewMode === "cards" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <ItemCard key={item.id} item={item} project={projects.find(p => p.id === item.project_id)} />
            ))}
          </div>
        ) : (
          <VaultTableView items={filteredItems} projects={projects} />
        )}
      </div>
    </div>
    </AccessGuard>
  );
}