"use client";

import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);

    // Runs before the next effect and on unmount, so a pending update is
    // dropped rather than landing after the component has gone away.
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
