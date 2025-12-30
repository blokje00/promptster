import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Simplified hook for managing thoughts data and selection.
 * Removes complex syncing logic in favor of React Query as the single source of truth.
 */
export const useMultipromptData = ({ 
  currentUser, 
  selectedProjectId, 
  idsToAutoSelect = [],
  activeProjectIds = [] // NEW: List of active project IDs
}) => {
  const queryClient = useQueryClient();
  const [selectedThoughtIds, setSelectedThoughtIds] = useState([]);

  // HARDENED: Thought fetch can fail without blocking access
  // CANONICAL QUERY - This is the SINGLE SOURCE OF TRUTH for active tasks
  const { data: rawThoughts = [], isLoading } = useQuery({
    queryKey: ['activeThoughts', currentUser?.email],
    queryFn: async () => {
      try {
        if (!currentUser?.email) return [];
        
        // Fetch ONLY non-deleted thoughts - server-side filter for performance
        const thoughts = await base44.entities.Thought.filter({ 
          created_by: currentUser.email,
          is_deleted: false 
        }, "-created_date");
        
        console.log('[useMultipromptState] ✓ Fetched active thoughts:', thoughts?.length || 0);
        return thoughts || [];
      } catch (error) {
        console.warn('[useMultipromptState] Thought fetch failed (non-blocking):', error.message);
        return []; // Graceful fallback - empty list, not error state
      }
    },
    enabled: Boolean(currentUser?.email),
    staleTime: 0, // Always fresh
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    retry: 1,
  });

  // Filter thoughts: only from active projects OR no project (orphaned)
  const allThoughts = useMemo(() => {
    if (!activeProjectIds || activeProjectIds.length === 0) {
      // No projects loaded yet, show all thoughts
      return rawThoughts;
    }
    
    // Only show thoughts from active projects OR without project
    const filtered = rawThoughts.filter(t => 
      !t.project_id || activeProjectIds.includes(t.project_id)
    );
    
    console.log(`[useMultipromptState] Filtered ${rawThoughts.length} → ${filtered.length} (active projects only)`);
    return filtered;
  }, [rawThoughts, activeProjectIds]);

  // Client-side filtering for view
  const thoughts = useMemo(() => {
    if (!selectedProjectId) return allThoughts;
    return allThoughts.filter(t => t.project_id === selectedProjectId);
  }, [allThoughts, selectedProjectId]);

  // 2. Auto-select logic (Task 3: Default Select All)
  const [hasInitialSelected, setHasInitialSelected] = useState(false);

  useEffect(() => {
    if (thoughts.length > 0 && !hasInitialSelected) {
      if (idsToAutoSelect && idsToAutoSelect.length > 0) {
        // Retry logic: Select specific IDs (Task 1 Fix: Don't filter against thoughts yet to avoid race conditions)
        setSelectedThoughtIds(idsToAutoSelect);
      } else {
        // Default: Select All
        setSelectedThoughtIds(thoughts.map(t => t.id));
      }
      setHasInitialSelected(true);
    }
  }, [thoughts, idsToAutoSelect, hasInitialSelected]);

  // 3. Mutations with Global Invalidation
  const invalidateAllThoughts = async () => {
    try {
      // Invalidate ALL thought-related queries (unified approach)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['activeThoughts'] }),
        queryClient.invalidateQueries({ queryKey: ['allThoughtsCount'] }),
        queryClient.invalidateQueries({ queryKey: ['thoughts'] })
      ]);
      console.log('[useMultipromptState] ✓ Invalidated all thought caches');
    } catch (error) {
      console.error("Invalidate failed:", error);
    }
  };

  const createThought = useMutation({
    mutationFn: (data) => base44.entities.Thought.create(data),
    onSuccess: async (newThought) => {
      // Optimistic update: direct toevoegen aan canonical cache
      if (newThought) {
        queryClient.setQueryData(['activeThoughts', currentUser?.email], (old) => [newThought, ...(old || [])]);
      }
      
      await invalidateAllThoughts();
      
      if (newThought?.id) {
        setSelectedThoughtIds(prev => [...prev, newThought.id]);
      }
      
      console.log('[useMultipromptState] ✓ Task created, badge count updated');
    },
    onError: (error) => {
      console.error("Failed to create thought:", error);
      toast.error("Kon task niet aanmaken");
    }
  });

  const updateThought = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Thought.update(id, data),
    onSuccess: () => {
      invalidateAllThoughts();
    },
    onError: () => {
      toast.error("Failed to save changes");
    }
  });

  // Trigger vision analysis for screenshots using cached endpoint
  const triggerVisionAnalysis = useCallback(async (thoughtId, screenshotUrls) => {
    if (!screenshotUrls || screenshotUrls.length === 0) return;

    console.log('[useMultipromptState] Starting vision analysis for thought:', thoughtId);

    // Update status to analyzing
    await base44.entities.Thought.update(thoughtId, {
      vision_analysis: { status: 'analyzing', results: [] }
    });

    try {
      const results = [];
      
      // Analyze each screenshot using the cached endpoint
      for (const url of screenshotUrls) {
        try {
          console.log('[useMultipromptState] Analyzing screenshot:', url);
          const response = await base44.functions.invoke('analyzeScreenshotWithCache', { 
            screenshotUrl: url,
            level: 'full'
          });
          
          if (response.data?.ok) {
            console.log('[useMultipromptState] ✓ Analysis complete', response.data.cached ? '(cached)' : '(fresh)');
            results.push(response.data);
          } else {
            console.error('[useMultipromptState] Analysis failed:', response.data);
            results.push({ error: 'Analysis failed', sourceUrl: url });
          }
        } catch (error) {
          console.error('[useMultipromptState] Vision analysis failed for', url, error);
          results.push({ error: error.message, sourceUrl: url });
        }
      }

      // Save results to thought entity
      await base44.entities.Thought.update(thoughtId, {
        vision_analysis: { status: 'completed', results }
      });

      console.log('[useMultipromptState] ✓ Vision analysis saved to thought');
      invalidateAllThoughts();
    } catch (error) {
      console.error('[useMultipromptState] Vision analysis error:', error);
      await base44.entities.Thought.update(thoughtId, {
        vision_analysis: { status: 'failed', results: [] }
      });
      invalidateAllThoughts();
    }
  }, [invalidateAllThoughts]);

  const deleteThought = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Thought.update(id, { 
        is_deleted: true, 
        deleted_at: new Date().toISOString() 
      });
    },
    onSuccess: (_, id) => {
      // Immediate optimistic removal from canonical cache
      queryClient.setQueryData(['activeThoughts', currentUser?.email], (old) => 
        (old || []).filter(t => t.id !== id)
      );
      
      invalidateAllThoughts();
      queryClient.invalidateQueries({ queryKey: ['deletedThoughts'] });
      setSelectedThoughtIds(prev => prev.filter(tid => tid !== id));
      
      console.log('[useMultipromptState] ✓ Task deleted, badge count updated');
      
      toast("Task moved to recycle bin", {
        action: {
          label: "Undo",
          onClick: async () => {
            await base44.entities.Thought.update(id, { is_deleted: false, deleted_at: null });
            invalidateAllThoughts();
            queryClient.invalidateQueries({ queryKey: ['deletedThoughts'] });
            console.log('[useMultipromptState] ✓ Task restored, badge count updated');
          }
        },
        duration: 5000
      });
    },
  });

  // Selection helpers
  const toggleSelection = useCallback((id) => {
    setSelectedThoughtIds(prev => 
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  }, []);

  const selectAll = useCallback((ids) => {
    setSelectedThoughtIds(prev => {
      const set = new Set([...prev, ...ids]);
      return Array.from(set);
    });
  }, []);

  const deselectAll = useCallback((ids) => {
    setSelectedThoughtIds(prev => prev.filter(id => !ids.includes(id)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedThoughtIds([]);
  }, []);

  return {
    thoughts,
    allThoughts,
    isLoading,
    selectedThoughtIds,
    setSelectedThoughtIds,
    createThought,
    updateThought,
    deleteThought,
    toggleSelection,
    selectAll,
    deselectAll,
    clearSelection,
    triggerVisionAnalysis
  };
};