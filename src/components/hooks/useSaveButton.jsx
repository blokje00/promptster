import { useCallback, useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * useSaveButton - Generieke hook voor betrouwbare save buttons
 * 
 * Features:
 * - Automatische loading state
 * - Error handling met toast feedback
 * - Success feedback met toast
 * - Debounce ter voorkoming van double-clicks
 * - Dirty state tracking
 * - Optional localStorage backup
 * - React Query cache invalidation
 */
export function useSaveButton({
  saveFn,
  invalidateKeys = [],
  successMessage = "Opgeslagen",
  errorMessage = "Opslaan mislukt",
  storageKey = null,
  initialData = null,
  debounceMs = 300,
  onSuccess,
  onError,
}) {
  const queryClient = useQueryClient();
  const [data, setDataInternal] = useState(initialData);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const lastClickRef = useRef(0);
  const initialDataRef = useRef(initialData);

  const syncInitialData = useCallback((newInitial) => {
    initialDataRef.current = newInitial;
    if (!isDirty) {
      setDataInternal(newInitial);
    }
  }, [isDirty]);

  const setData = useCallback((newData) => {
    const value = typeof newData === 'function' ? newData(data) : newData;
    setDataInternal(value);
    setIsDirty(true);

    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          value,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn('[useSaveButton] localStorage write failed:', e);
      }
    }
  }, [data, storageKey]);

  const restoreFromStorage = useCallback(() => {
    if (!storageKey) return null;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.value;
      }
    } catch (e) {
      console.warn('[useSaveButton] localStorage read failed:', e);
    }
    return null;
  }, [storageKey]);

  const clearStorage = useCallback(() => {
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {
        console.warn('[useSaveButton] localStorage clear failed:', e);
      }
    }
  }, [storageKey]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!saveFn) throw new Error('No saveFn provided');
      return await saveFn(data);
    },
    onSuccess: (result) => {
      clearStorage();
      setIsDirty(false);
      setLastSavedAt(new Date().toISOString());
      
      invalidateKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      toast.success(successMessage);

      if (onSuccess) onSuccess(result);

      return result;
    },
    onError: (error) => {
      console.error('[useSaveButton] Save failed:', error);
      
      toast.error(errorMessage, {
        description: error.message || 'Probeer het opnieuw',
        duration: 5000
      });

      if (onError) onError(error);
    }
  });

  const handleSave = useCallback(async () => {
    const now = Date.now();
    if (now - lastClickRef.current < debounceMs) {
      return;
    }
    lastClickRef.current = now;

    if (!isDirty) {
      toast.info("Geen wijzigingen om op te slaan");
      return;
    }

    return mutation.mutateAsync();
  }, [isDirty, mutation, debounceMs]);

  const reset = useCallback(() => {
    setDataInternal(initialDataRef.current);
    setIsDirty(false);
    clearStorage();
  }, [clearStorage]);

  return {
    data,
    setData,
    isSaving: mutation.isPending,
    isDirty,
    lastSavedAt,
    error: mutation.error,
    handleSave,
    reset,
    syncInitialData,
    restoreFromStorage,
    buttonProps: {
      onClick: handleSave,
      disabled: mutation.isPending || !isDirty,
    },
    buttonText: mutation.isPending ? "Opslaan..." : "Opslaan",
  };
}

export default useSaveButton;