import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, Plus, Star, Code2, Sparkles, Filter, FileArchive, GitBranch } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import ItemCard from "../components/dashboard/ItemCard";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showZipOnly, setShowZipOnly] = useState(false);
  const [showPublishedOnly, setShowPublishedOnly] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: () => base44.entities.Item.list("-updated_date"),
    initialData: [],
  });

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || 
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = filterType === "all" || item.type === filterType;
    const matchesFavorites = !showFavoritesOnly || item.is_favorite;
    const matchesZip = !showZipOnly || (item.zip_files && item.zip_files.length > 0);
    const matchesPublished = !showPublishedOnly || item.is_publish_version;
    
    return matchesSearch && matchesType && matchesFavorites && matchesZip && matchesPublished;
  });

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Mijn Vault
            </h1>
            <p className="text-slate-600 mt-2">Al je prompts en code op één plek</p>
          </div>
          <Link to={createPageUrl("AddItem")}>
            <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30">
              <Plus className="w-5 h-5 mr-2" />
              Nieuw Item
            </Button>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Zoek in je vault..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={showFavoritesOnly ? "bg-yellow-500 hover:bg-yellow-600" : ""}
            >
              <Star className={`w-4 h-4 mr-2 ${showFavoritesOnly ? 'fill-white' : ''}`} />
              Favorieten
            </Button>
            <Button
              variant={showZipOnly ? "default" : "outline"}
              onClick={() => setShowZipOnly(!showZipOnly)}
              className={showZipOnly ? "bg-purple-500 hover:bg-purple-600" : ""}
            >
              <FileArchive className={`w-4 h-4 mr-2`} />
              ZIP
            </Button>
            <Button
              variant={showPublishedOnly ? "default" : "outline"}
              onClick={() => setShowPublishedOnly(!showPublishedOnly)}
              className={showPublishedOnly ? "bg-green-500 hover:bg-green-600" : ""}
            >
              <GitBranch className={`w-4 h-4 mr-2`} />
              Published
            </Button>
          </div>

          <Tabs value={filterType} onValueChange={setFilterType}>
            <TabsList className="bg-slate-100">
              <TabsTrigger value="all" className="data-[state=active]:bg-white">
                Alles <span className="ml-2 text-xs text-slate-500">({items.length})</span>
              </TabsTrigger>
              <TabsTrigger value="prompt" className="data-[state=active]:bg-white">
                                <Sparkles className="w-4 h-4 mr-2" />
                                Prompts <span className="ml-2 text-xs text-slate-500">({items.filter(i => i.type === 'prompt').length})</span>
                              </TabsTrigger>
                              <TabsTrigger value="multiprompt" className="data-[state=active]:bg-white">
                                Multiprompts <span className="ml-2 text-xs text-slate-500">({items.filter(i => i.type === 'multiprompt').length})</span>
                              </TabsTrigger>
              <TabsTrigger value="code" className="data-[state=active]:bg-white">
                <Code2 className="w-4 h-4 mr-2" />
                Code <span className="ml-2 text-xs text-slate-500">({items.filter(i => i.type === 'code').length})</span>
              </TabsTrigger>
              <TabsTrigger value="snippet" className="data-[state=active]:bg-white">
                Snippets <span className="ml-2 text-xs text-slate-500">({items.filter(i => i.type === 'snippet').length})</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-white rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-300">
            <Code2 className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-600 mb-2">
              {searchQuery ? "Geen items gevonden" : "Nog geen items"}
            </h3>
            <p className="text-slate-500 mb-6">
              {searchQuery ? "Probeer een andere zoekopdracht" : "Begin met het toevoegen van je eerste prompt of code snippet"}
            </p>
            <Link to={createPageUrl("AddItem")}>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-5 h-5 mr-2" />
                Voeg je eerste item toe
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}