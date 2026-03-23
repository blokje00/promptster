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
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">