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
  idsToAutoSelect = []
}) => {
  const queryClient = useQueryClient();
  const [selectedThoughtIds, setSelectedThoughtIds] = useState([]);

  // 1. Fetch ALL Thoughts - Single Source of Truth
  const { data: allThoughts = [], isLoading } = useQuery({
    queryKey: ['thoughts', { 
      userEmail: currentUser?.email
    }],
    queryFn: async () => {
      if (!currentUser?.email) return [];

      // Fetch ALL non-deleted thoughts for user (Client-side filtering for projects)
      return await base44.entities.Thought.filter({ 
        created_by: currentUser.email,
        is_deleted: false 
      }, "-created_date");
    },
    enabled: !!currentUser?.email,
    staleTime: 0, // Always fetch fresh on mount/invalidate
    refetchOnWindowFocus: true,
  });

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
      await queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'thoughts'
      });
    } catch (error) {
      console.error("Invalidate failed:", error);
    }
  };

  const createThought = useMutation({
    mutationFn: (data) => base44.entities.Thought.create(data),
    onSuccess: async (newThought) => {
      // Optimistic update: direct toevoegen aan cache
      if (newThought) {
        const queryKey = ['thoughts', { 
          userEmail: currentUser?.email
        }];
        queryClient.setQueryData(queryKey, (old) => [newThought, ...(old || [])]);
      }
      
      await invalidateAllThoughts();
      
      if (newThought?.id) {
        setSelectedThoughtIds(prev => [...prev, newThought.id]);
      }
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

  const deleteThought = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Thought.update(id, { 
        is_deleted: true, 
        deleted_at: new Date().toISOString() 
      });
    },
    onSuccess: (_, id) => {
      invalidateAllThoughts();
      queryClient.invalidateQueries({ queryKey: ['deletedThoughts'] });
      setSelectedThoughtIds(prev => prev.filter(tid => tid !== id));
      
      toast("Task moved to recycle bin", {
        action: {
          label: "Undo",
          onClick: async () => {
            await base44.entities.Thought.update(id, { is_deleted: false, deleted_at: null });
            invalidateAllThoughts();
            queryClient.invalidateQueries({ queryKey: ['deletedThoughts'] });
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
    clearSelection
  };
};