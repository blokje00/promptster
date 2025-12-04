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
export function useThoughts({ dbThoughts = [], selectedProjectId, currentUser }) {
  const queryClient = useQueryClient();
  const [localThoughts, setLocalThoughts] = useState([]);
  const [selectedThoughts, setSelectedThoughts] = useState([]);
  const prevDbIdsRef = useRef("");
  const hasManualSelectionRef = useRef(false);
  const prevProjectIdRef = useRef(selectedProjectId);

  // Sync DB naar lokale state - inclusief lege state afhandeling
  useEffect(() => {
    // Handle empty dbThoughts - clear local state for immediate deletion visibility
    if (!dbThoughts || dbThoughts.length === 0) {
      if (localThoughts.length > 0) {
        setLocalThoughts([]);
        setSelectedThoughts([]);
      }
      prevDbIdsRef.current = "";
      return;
    }
    
    const currentDbIds = dbThoughts.map(t => t.id).sort().join(',');
    if (prevDbIdsRef.current === currentDbIds) return;
    prevDbIdsRef.current = currentDbIds;

    setLocalThoughts(prev => {
      if (prev.length === 0) return dbThoughts;
      const localIds = new Set(prev.map(t => t.id));
      const newItems = dbThoughts.filter(t => !localIds.has(t.id));
      return newItems.length > 0 ? [...newItems, ...prev] : prev;
    });
  }, [dbThoughts, localThoughts.length]);

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
      toast("Taak verplaatst naar prullenbak", {
        action: {
          label: "Ongedaan maken",
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