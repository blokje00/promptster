import { useState, useEffect, useCallback } from "react";
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

  // 1. Fetch Thoughts - Single Source of Truth
  const { data: thoughts = [], isLoading } = useQuery({
    queryKey: ['thoughts', { 
      userEmail: currentUser?.email, 
      projectId: selectedProjectId || 'all' 
    }],
    queryFn: async () => {
      if (!currentUser?.email) return [];

      // Robust filter: not deleted
      const filter = {
        $or: [
          { is_deleted: false },
          { is_deleted: null },
          { is_deleted: { $exists: false } }
        ]
      };

      if (selectedProjectId) {
        // Project view: Show all tasks in this project (team view)
        filter.project_id = selectedProjectId;
      } else {
        // All projects view: Show only my tasks
        filter.created_by = currentUser.email;
      }

      const result = await base44.entities.Thought.filter(filter, "-created_date");
      return result || [];
    },
    enabled: !!currentUser?.email,
    staleTime: 0, // Always fetch fresh on mount/invalidate
    refetchOnWindowFocus: true,
  });

  // 2. Auto-select logic (for retries)
  useEffect(() => {
    if (idsToAutoSelect && idsToAutoSelect.length > 0) {
      // Only select if they exist in the current fetched data
      const validIds = idsToAutoSelect.filter(id => 
        thoughts.some(t => t.id === id)
      );
      
      if (validIds.length > 0) {
        setSelectedThoughtIds(prev => {
          const combined = new Set([...prev, ...validIds]);
          return Array.from(combined);
        });
      }
    }
  }, [idsToAutoSelect, thoughts]); // Re-run when data arrives

  // 3. Mutations with Global Invalidation
  const invalidateAllThoughts = () => {
    // Invalidate everything starting with 'thoughts' to ensure all views (project/global) update
    return queryClient.invalidateQueries({ 
      predicate: (query) => query.queryKey[0] === 'thoughts'
    });
  };

  const createThought = useMutation({
    mutationFn: (data) => base44.entities.Thought.create(data),
    onSuccess: (newThought) => {
      invalidateAllThoughts();
      setSelectedThoughtIds(prev => [...prev, newThought.id]);
    },
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