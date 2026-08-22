"use client";

import { useEffect, useState } from "react";

/**
 * Returns `value` after it has stopped changing for `delay` milliseconds.
 *
 * Used to keep the customer search from firing a query per keystroke: the
 * input stays controlled and responsive, while the debounced value is what
 * feeds the TanStack Query key.
 *
 * The timer resets on every change, so a fast typist triggers exactly one
 * update once they pause. Comparing `value !== debouncedValue` at the call
 * site tells you a change is still pending, which is enough to drive a
 * "searching…" affordance without extra state.
 */
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
