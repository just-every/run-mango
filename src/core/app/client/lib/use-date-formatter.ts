import { useMemo, useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const defaults = {
  locale: 'en-AU',
  options: { dateStyle: 'medium', timeStyle: 'short' } as Intl.DateTimeFormatOptions,
};

export function useDateFormatter({ locale, options }: { locale: string | undefined; options: Intl.DateTimeFormatOptions } = defaults) {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  // A Worker cannot know a first-time visitor's timezone or locale. Match its
  // first render during hydration, then retain the browser's existing display.
  return useMemo(() => {
    const formatter = new Intl.DateTimeFormat(hydrated ? locale : 'en-AU', {
      ...options,
      ...(!hydrated ? { timeZone: 'UTC' } : {}),
    });
    return (value: string | number | null | undefined) => {
      if (value === null || value === undefined || value === '') return 'Not recorded';
      // Imported source clocks can omit an offset. The Worker reads these in
      // UTC; do the same only for hydration, before the usual local display.
      const input = !hydrated && typeof value === 'string'
        && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value)
        ? `${value.replace(' ', 'T')}Z` : value;
      const date = new Date(input);
      return Number.isNaN(date.getTime()) ? 'Not recorded' : formatter.format(date);
    };
  }, [hydrated, locale, options]);
}
