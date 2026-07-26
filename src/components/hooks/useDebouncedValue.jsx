import { useEffect, useState } from "react";

/**
 * Returns a debounced copy of a value. Useful for search inputs:
 * the input stays instant while expensive filtering only re-runs
 * after the user pauses typing.
 */
export function useDebouncedValue(value, delay = 200) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
