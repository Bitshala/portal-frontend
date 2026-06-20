import { useEffect, useState } from 'react';

// Returns a debounced copy of `value` that only updates after `delayMs` of
// quiet — used to throttle search inputs before they hit the API.
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
