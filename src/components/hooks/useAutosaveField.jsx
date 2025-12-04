import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Generieke autosave hook voor tekstvelden.
 * Slaat waarde op in localStorage met debounce en herstelt bij mount.
 * 
 * @param {Object} options - Hook configuratie
 * @param {string} options.storageKey - Unieke localStorage key
 * @param {string} [options.initialValue=''] - Initiële waarde als geen draft bestaat
 * @param {number} [options.debounceMs=500] - Debounce tijd in ms
 * @param {boolean} [options.enabled=true] - Autosave aan/uit
 * @returns {{ value: string, setValue: Function, resetValue: Function, isRestored: boolean }}
 * 
 * @example
 * const { value, setValue, resetValue } = useAutosaveField({
 *   storageKey: `promptster:item:${itemId}:notes:${userId}`,
 *   initialValue: item?.notes ?? '',
 * });
 */
export function useAutosaveField({
  storageKey,
  initialValue = "",
  debounceMs = 500,
  enabled = true,
}) {
  const [value, setValueInternal] = useState(initialValue);
  const [isRestored, setIsRestored] = useState(false);
  const debounceTimerRef = useRef(null);
  const initializedRef = useRef(false);

  /**
   * Leest waarde uit localStorage.
   * @returns {string|null} Opgeslagen waarde of null
   */
  const loadFromStorage = useCallback(() => {
    if (!enabled || !storageKey) return null;
    try {
      return localStorage.getItem(storageKey);
    } catch (error) {
      console.warn("useAutosaveField: localStorage read failed", error);
      return null;
    }
  }, [storageKey, enabled]);

  /**
   * Schrijft waarde naar localStorage.
   * @param {string} text - Te bewaren tekst
   */
  const saveToStorage = useCallback((text) => {
    if (!enabled || !storageKey) return;
    try {
      if (text) {
        localStorage.setItem(storageKey, text);
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.warn("useAutosaveField: localStorage write failed", error);
    }
  }, [storageKey, enabled]);

  /**
   * Verwijdert draft uit localStorage en reset state.
   */
  const resetValue = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setValueInternal(initialValue);
    if (enabled && storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch (error) {
        console.warn("useAutosaveField: localStorage remove failed", error);
      }
    }
    setIsRestored(false);
  }, [storageKey, initialValue, enabled]);

  /**
   * Stelt nieuwe waarde in met debounced autosave.
   * @param {string} newValue - Nieuwe tekstwaarde
   */
  const setValue = useCallback((newValue) => {
    setValueInternal(newValue);
  }, []);

  // Laad draft bij mount of key change
  useEffect(() => {
    if (!enabled || !storageKey) {
      setValueInternal(initialValue);
      setIsRestored(false);
      return;
    }

    const saved = loadFromStorage();
    if (saved !== null && saved !== "") {
      setValueInternal(saved);
      setIsRestored(true);
    } else {
      setValueInternal(initialValue);
      setIsRestored(false);
    }
    initializedRef.current = true;
  }, [storageKey, enabled]); // Deliberately not including initialValue to avoid overwrites

  // Debounced save effect
  useEffect(() => {
    if (!enabled || !storageKey || !initializedRef.current) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      saveToStorage(value);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, debounceMs, saveToStorage, enabled, storageKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    value,
    setValue,
    resetValue,
    isRestored,
  };
}

export default useAutosaveField;