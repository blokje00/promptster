import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Hook voor beheer van Multiprompt thoughts state.
 * Handelt synchronisatie tussen lokale en database state.
 * Behoudt handmatige selecties bij project wisseling.
 * 
 * @param {Object} params - Hook parameters
 * @param {Array} params.dbThoughts - Thoughts uit database query
 * @param {string} params.selectedProjectId - Actief project ID
 * @returns {Object} Thoughts state en handlers
 */
export function useThoughts({ dbThoughts = [], selectedProjectId, currentUser, idsToAutoSelect = [] }) {
  const queryClient = useQueryClient();
  const [localThoughts, setLocalThoughts] = useState([]);
  const [selectedThoughts, setSelectedThoughts] = useState([]);
  const prevDbIdsRef = useRef("");
  const hasManualSelectionRef = useRef(false);
  const prevProjectIdRef = useRef(selectedProjectId);

  // Sync DB naar lokale state - DB is source of truth
  useEffect(() => {
    // Handle empty dbThoughts - clear local state
    if (!dbThoughts || dbThoughts.length === 0) {
      if (localThoughts.length > 0) {
        setLocalThoughts([]);
        setSelectedThoughts([]);
      }
      prevDbIdsRef.current = "";
      return;
    }
    
    // Filter out any deleted thoughts (should already be filtered by query, but double-check)
    const activeDbThoughts = dbThoughts.filter(t => !t.is_deleted);
    
    const currentDbIds = activeDbThoughts.map(t => t.id).sort().join(',');
    if (prevDbIdsRef.current === currentDbIds) return;
    prevDbIdsRef.current = currentDbIds;

    // When DB changes, sync local state to match DB (DB is source of truth)
    // Remove any local thoughts that no longer exist in DB
    const dbIdSet = new Set(activeDbThoughts.map(t => t.id));
    
    setLocalThoughts(prev => {
      // Filter out thoughts that are no longer in DB
      const filteredPrev = prev.filter(t => dbIdSet.has(t.id));
      // Add new thoughts from DB that aren't in local state
      const localIds = new Set(filteredPrev.map(t => t.id));
      const newItems = activeDbThoughts.filter(t => !localIds.has(t.id));
      return newItems.length > 0 ? [...newItems, ...filteredPrev] : filteredPrev;
    });
    
    // Also clean up selected thoughts that no longer exist
    setSelectedThoughts(prev => prev.filter(id => dbIdSet.has(id)));
  }, [dbThoughts]);

  // Auto-select specific IDs when they appear (e.g. retried tasks)
  useEffect(() => {
    if (!idsToAutoSelect || idsToAutoSelect.length === 0) return;
    
    // Find items that should be selected but aren't yet
    // Using a Set for O(1) lookup
    const selectedSet = new Set(selectedThoughts);
    const itemsToSelect = localThoughts.filter(t => 
      idsToAutoSelect.includes(t.id) && !selectedSet.has(t.id)
    );
    
    if (itemsToSelect.length > 0) {
      const newIds = itemsToSelect.map(t => t.id);
      setSelectedThoughts(prev => [...prev, ...newIds]);
      toast.info(`${newIds.length} retry tasks reopened`);
      // Mark as manual selection so they stick around if project changes (though retries usually set project too)
      hasManualSelectionRef.current = true; 
    }
  }, [localThoughts, idsToAutoSelect, selectedThoughts]);

  // Reset manual selection flag when project changes
  useEffect(() => {
    if (prevProjectIdRef.current !== selectedProjectId) {
      hasManualSelectionRef.current = false;
      prevProjectIdRef.current = selectedProjectId;
    }
  }, [selectedProjectId]);

  // Project change handler - only auto-select if no manual selection made
  useEffect(() => {
    // Skip auto-selection if user made manual selections
    if (hasManualSelectionRef.current) return;
    
    const relevantIds = selectedProjectId 
      ? localThoughts.filter(t => t.project_id === selectedProjectId).map(t => t.id)
      : localThoughts.map(t => t.id);
    
    if (relevantIds.length > 0) {
      setSelectedThoughts(relevantIds);
    }
  }, [selectedProjectId, localThoughts]);

  // Mutations
  const createThought = useMutation({
    mutationFn: (data) => base44.entities.Thought.create(data),
    onSuccess: (newThought) => {
      setLocalThoughts(prev => [newThought, ...prev.filter(t => t.id !== newThought.id)]);
      setSelectedThoughts(prev => [...prev, newThought.id]);
      queryClient.invalidateQueries({ queryKey: ['thoughts'] });
    },
  });

  const deleteThought = useMutation({
    mutationFn: (id) => base44.entities.Thought.update(id, { 
      is_deleted: true,
      deleted_at: new Date().toISOString()
    }),
    onMutate: (id) => {
      const thoughtToRestore = localThoughts.find(t => t.id === id);
      setLocalThoughts(prev => prev.filter(t => t.id !== id));
      setSelectedThoughts(prev => prev.filter(tid => tid !== id));
      return { thoughtToRestore };
    },
    onSuccess: (_, id, context) => {
      queryClient.invalidateQueries({ queryKey: ['thoughts'] });
      toast("Task moved to recycle bin", {
        action: {
          label: "Undo",
          onClick: async () => {
            await base44.entities.Thought.update(id, { is_deleted: false, deleted_at: null });
            if (context?.thoughtToRestore) {
              setLocalThoughts(prev => [context.thoughtToRestore, ...prev]);
            }
            queryClient.invalidateQueries({ queryKey: ['thoughts'] });
          }
        },
        duration: 5000
      });
    },
  });

  const updateThought = useCallback((thoughtId, updates) => {
    setLocalThoughts(prev => prev.map(t => 
      t.id === thoughtId ? { ...t, ...updates } : t
    ));
  }, []);

  /**
   * Toggle selectie van een thought.
   * Markeert dat gebruiker handmatige selectie heeft gemaakt.
   * @param {string} thoughtId - ID van de thought
   */
  const toggleSelection = useCallback((thoughtId) => {
    hasManualSelectionRef.current = true;
    setSelectedThoughts(prev => 
      prev.includes(thoughtId) 
        ? prev.filter(id => id !== thoughtId)
        : [...prev, thoughtId]
    );
  }, []);

  return {
    localThoughts,
    selectedThoughts,
    setLocalThoughts,
    setSelectedThoughts,
    createThought,
    deleteThought,
    updateThought,
    toggleSelection
  };
}