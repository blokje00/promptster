import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * ROBUUSTE HOOK VOOR MULTIPROMPT STATE
 * Vervangt de oude complexe sync-logica met een single-source-of-truth benadering via React Query.
 */
export function useThoughts({ selectedProjectId, currentUser, idsToAutoSelect = [] }) {
  const queryClient = useQueryClient();
  
  // 1. QUERY: Single Source of Truth
  // Haal altijd de laatste data op. De UI rendert direct wat de cache/DB heeft.
  // Geen complexe lokale state sync meer die out-of-sync kan raken.
  const { data: thoughts = [], isLoading } = useQuery({
    queryKey: ['thoughts', currentUser?.email, selectedProjectId || 'all'],
    queryFn: async () => {
      if (!currentUser?.email) return [];

      // Filter logica: Robuust en permissief
      // We willen nooit taken verbergen die "net" zijn aangemaakt of hersteld
      const filter = {
        // Permissieve check voor niet-verwijderde items
        $or: [
          { is_deleted: false },
          { is_deleted: null },
          { is_deleted: { $exists: false } }
        ]
      };

      if (selectedProjectId) {
        // Project context: Toon alles van dit project (ook van teamleden)
        filter.project_id = selectedProjectId;
      } else {
        // Geen project (Global/All): Toon eigendom van user
        filter.created_by = currentUser.email;
      }

      // Sorteer op nieuwste eerst
      return await base44.entities.Thought.filter(filter, "-created_date");
    },
    enabled: !!currentUser?.email,
    // Zorg dat we altijd verse data hebben bij mount/window focus
    staleTime: 0, 
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  // 2. SELECTIE STATE
  const [selectedThoughts, setSelectedThoughts] = useState([]);

  // 3. AUTO-SELECTIE LOGICA (voor Retry/Restore)
  useEffect(() => {
    if (idsToAutoSelect.length > 0 && thoughts.length > 0) {
      // Filter IDs die daadwerkelijk in de huidige lijst staan
      const validIds = thoughts
        .filter(t => idsToAutoSelect.includes(t.id))
        .map(t => t.id);

      if (validIds.length > 0) {
        setSelectedThoughts(prev => {
          // Voeg toe aan bestaande selectie zonder duplicaten
          const next = new Set([...prev, ...validIds]);
          return Array.from(next);
        });
      }
    }
  }, [idsToAutoSelect, thoughts]);

  // 4. CLEANUP SELECTIE
  // Als thoughts verdwijnen (bv. delete), verwijder ze uit selectie
  useEffect(() => {
    if (thoughts.length === 0 && selectedThoughts.length > 0) {
        // Keep selection if logic dictates, but generally if not in list, deselect.
        // Echter, bij project wissel willen we misschien clearen.
        // Voor nu: behoud selectie tenzij expliciet gewist, of filter tegen huidige lijst bij acties.
    }
  }, [thoughts]);

  // 5. MUTATIES
  // Gebruik Optimistische Updates of snelle invalidatie voor responsiviteit

  const createThought = useMutation({
    mutationFn: (data) => base44.entities.Thought.create(data),
    onSuccess: () => {
      // Reset ALLE thoughts queries om zeker te zijn dat filters kloppen
      queryClient.invalidateQueries({ queryKey: ['thoughts'] });
    }
  });

  const updateThought = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Thought.update(id, data),
    onMutate: async ({ id, data }) => {
      // Optimistic Update voor snelle UI
      await queryClient.cancelQueries(['thoughts']);
      const previousThoughts = queryClient.getQueryData(['thoughts', currentUser?.email, selectedProjectId || 'all']);

      if (previousThoughts) {
        queryClient.setQueryData(
          ['thoughts', currentUser?.email, selectedProjectId || 'all'],
          (old) => old.map(t => t.id === id ? { ...t, ...data } : t)
        );
      }
      return { previousThoughts };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousThoughts) {
        queryClient.setQueryData(
          ['thoughts', currentUser?.email, selectedProjectId || 'all'],
          context.previousThoughts
        );
      }
      toast.error("Update failed");
    },
    onSuccess: () => {
      // Silent refresh voor consistentie
      queryClient.invalidateQueries({ queryKey: ['thoughts'] });
    }
  });

  const deleteThought = useMutation({
    mutationFn: (id) => base44.entities.Thought.update(id, { 
      is_deleted: true, 
      deleted_at: new Date().toISOString() 
    }),
    onSuccess: () => {
      toast.success("Task moved to recycle bin");
      queryClient.invalidateQueries({ queryKey: ['thoughts'] });
      queryClient.invalidateQueries({ queryKey: ['deletedThoughts'] });
      queryClient.invalidateQueries({ queryKey: ['deletedThoughtsCount'] });
    }
  });

  // Toggle helper
  const toggleSelection = useCallback((id) => {
    setSelectedThoughts(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  return {
    thoughts, // De directe array uit React Query
    isLoading,
    selectedThoughts,
    setSelectedThoughts,
    createThought,
    updateThought,
    deleteThought,
    toggleSelection
  };
}