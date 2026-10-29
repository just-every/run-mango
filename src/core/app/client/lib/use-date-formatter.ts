import { useMemo, useSyncExternalStore } from 'react';
import { useTimeZone } from './time-zone';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };

/**
 * Every date on the app reads "29 Oct 2026, 5:51 pm" in the zone chosen in the footer, which starts as the browser's.
 * Before hydration the zone is unknown, so a time reads "…" rather than a value that would change a moment later.
 */
export function useDateFormatter() {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const timeZone = useTimeZone();
  return useMemo(() => {
    const formatter = new Intl.DateTimeFormat('en-AU', { ...options, timeZone });
    return (value: string | number | null | undefined) => {
      if (value === null || value === undefined || value === '') return 'Not recorded';
      if (!hydrated) return '…';
      // Imported source clocks can omit an offset; the Worker reads those as UTC, so do the same.
      const input = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value)
        ? `${value.replace(' ', 'T')}Z` : value;
      const date = new Date(input);
      return Number.isNaN(date.getTime()) ? 'Not recorded' : formatter.format(date);
    };
  }, [hydrated, timeZone]);
}
