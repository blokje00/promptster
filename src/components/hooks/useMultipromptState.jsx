import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as thoughts from "@/api/thoughts";
import * as functions from "@/api/functions";
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

  // Errors surface via the global query error toast; UI falls back to []
  // CANONICAL QUERY - This is the SINGLE SOURCE OF TRUTH for active tasks
  const { data: rawThoughts = [], isLoading } = useQuery({
    queryKey: thoughts.keys.list(currentUser?.email),
    queryFn: () => thoughts.listActive(currentUser?.email),
    enabled: Boolean(currentUser?.email),
    staleTime: 0, // Always fresh
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    retry: false,
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
    return filtered;
  }, [rawThoughts, activeProjectIds]);

  // Client-side filtering for view
  const filteredThoughts = useMemo(() => {
    if (!selectedProjectId) return allThoughts;
    return allThoughts.filter(t => t.project_id === selectedProjectId);
  }, [allThoughts, selectedProjectId]);

  // 2. Auto-select logic (Task 3: Default Select All)
  const [hasInitialSelected, setHasInitialSelected] = useState(false);

  useEffect(() => {
    if (filteredThoughts.length > 0 && !hasInitialSelected) {
      if (idsToAutoSelect && idsToAutoSelect.length > 0) {
        // Retry logic: Select specific IDs (Task 1 Fix: Don't filter against thoughts yet to avoid race conditions)
        setSelectedThoughtIds(idsToAutoSelect);
      } else {
        // Default: Select All
        setSelectedThoughtIds(filteredThoughts.map(t => t.id));
      }
      setHasInitialSelected(true);
    }
  }, [filteredThoughts, idsToAutoSelect, hasInitialSelected]);

  // 3. Mutations — thoughts.useCreate/useUpdate/useSoftDelete/useRestore already
  // invalidate the full activeThoughts/deletedThoughts/allThoughtsCount/thoughts
  // cache set (see thoughts.invalidateThoughtCaches); only the optimistic cache
  // writes and selection-state side effects are handled here.
  const createThought = thoughts.useCreate({
    onSuccess: (newThought) => {
      // Optimistic update: direct toevoegen aan canonical cache
      if (newThought) {
        queryClient.setQueryData(thoughts.keys.list(currentUser?.email), (old) => [newThought, ...(old || [])]);
      }
      if (newThought?.id) {
        setSelectedThoughtIds(prev => [...prev, newThought.id]);
      }
    },
    onError: (error) => {
      console.error("Failed to create thought:", error);
      toast.error("Kon task niet aanmaken");
    }
  });

  const updateThought = thoughts.useUpdate({
    onError: () => {
      toast.error("Failed to save changes");
    }
  });

  const restoreThought = thoughts.useRestore();

  // Trigger vision analysis for screenshots using cached endpoint
  const triggerVisionAnalysis = useCallback(async (thoughtId, screenshotUrls) => {
    if (!screenshotUrls || screenshotUrls.length === 0) return;

    // Update status to analyzing
    await thoughts.update(thoughtId, {
      vision_analysis: { status: 'analyzing', results: [] }
    });

    try {
      const results = [];

      // Analyze each screenshot using the cached endpoint
      for (const url of screenshotUrls) {
        try {
          const data = await functions.analyzeScreenshotWithCache({ screenshotUrl: url, level: 'full' });
          if (data?.ok) {
            results.push(data);
          } else {
            results.push({ error: 'Analysis failed', sourceUrl: url });
          }
        } catch (error) {
          console.error('[useMultipromptState] Vision analysis failed for', url, error);
          results.push({ error: error.message, sourceUrl: url });
        }
      }

      // Save results to thought entity
      await thoughts.update(thoughtId, {
        vision_analysis: { status: 'completed', results }
      });
      thoughts.invalidateThoughtCaches(queryClient);
    } catch (error) {
      console.error('[useMultipromptState] Vision analysis error:', error);
      await thoughts.update(thoughtId, {
        vision_analysis: { status: 'failed', results: [] }
      });
      thoughts.invalidateThoughtCaches(queryClient);
    }
  }, [queryClient]);

  const deleteThought = thoughts.useSoftDelete({
    onSuccess: (_, id) => {
      // Immediate optimistic removal from canonical cache
      queryClient.setQueryData(thoughts.keys.list(currentUser?.email), (old) =>
        (old || []).filter(t => t.id !== id)
      );
      setSelectedThoughtIds(prev => prev.filter(tid => tid !== id));

      toast("Task moved to recycle bin", {
        action: {
          label: "Undo",
          onClick: () => restoreThought.mutate(id)
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
    thoughts: filteredThoughts,
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
