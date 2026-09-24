// src/client/useNow.ts
import { useEffect, useState } from 'react';

/**
 * The current time, updated on an interval, for text like "Checked 2 min ago". Null until the
 * first render in the browser, so nothing time-based is rendered at build time.
 */
export const useNow = (intervalMs = 30_000): Date | null => {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
};
