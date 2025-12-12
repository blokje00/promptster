import { useCallback, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * useReliableSaveButton
 * - Houdt een draft in state
 * - Slaat de draft op in localStorage zodat niets verloren gaat
 * - Doet een React Query mutation bij "Save"
 * - Update de cache en geeft duidelijke loading/saved states terug
 *
 * @param {object} options
 * @param {string} options.storageKey - unieke key per user + scope, bv `prefs:${userId}` of `project:${projectId}`
 * @param {any} options.initialValue - startwaarden uit de server (query)
 * @param {function} options.mutationFn - async functie die de draft naar de server schrijft
 * @param {Array} [options.invalidateKeys] - optionele React Query keys om te invalidaten na save
 */
export function useReliableSaveButton({
  storageKey,
  initialValue,
  mutationFn,
  invalidateKeys = [],
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(initialValue);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  // 1) Hydrate draft uit localStorage als die nieuwer is dan initialValue
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setDraft(parsed.value ?? parsed);
      setIsDirty(true);
    } catch (e) {
      console.warn("[useReliableSaveButton] Failed to read localStorage", e);
    }
  }, [storageKey]);

  // 2) Als initialValue verandert vanuit de server, sync dan (behalve als user lokaal aan het editen is)
  useEffect(() => {
    if (!isDirty) {
      setDraft(initialValue);
    }
  }, [initialValue, isDirty]);

  // 3) Elke mutatie van draft ook persist in localStorage
  const updateDraft = useCallback(
    (updater) => {
      setDraft((prev) => {
        const next =
          typeof updater === "function" ? updater(prev) : updater;
        setIsDirty(true);
        try {
          window.localStorage.setItem(
            storageKey,
            JSON.stringify({ value: next, updatedAt: Date.now() })
          );
        } catch (e) {
          console.warn("[useReliableSaveButton] Failed to write localStorage", e);
        }
        return next;
      });
    },
    [storageKey]
  );

  // 4) Mutation voor explicit save
  const mutation = useMutation({
    mutationFn: async () => {
      return await mutationFn(draft);
    },
    onSuccess: (result) => {
      // Cleaning localStorage & flags
      try {
        window.localStorage.removeItem(storageKey);
      } catch (e) {
        console.warn("[useReliableSaveButton] Failed to clear localStorage", e);
      }
      setIsDirty(false);
      setLastSavedAt(new Date().toISOString());

      // Cache updaten / invalidaten
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      return result;
    },
  });

  const handleSave = useCallback(() => {
    if (!isDirty) return;
    mutation.mutate();
  }, [isDirty, mutation]);

  return {
    draft,
    setDraft: updateDraft,
    handleSave,
    isSaving: mutation.isPending,
    isDirty,
    lastSavedAt,
    error: mutation.error,
  };
}