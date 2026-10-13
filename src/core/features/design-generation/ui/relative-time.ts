/** "in about 3 minutes" for a time ahead, or undefined once it has passed. Coarse on purpose: the sentence it sits in
 * changes at most once a minute, so a screen reader is not told the same wait again on every poll. */
export function relativeTime(at: number, now = Date.now()) {
  const seconds = (at - now) / 1000;
  if (seconds <= 0) return undefined;
  if (seconds < 60) return 'in less than a minute';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `in about ${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.round(minutes / 60);
  return `in about ${hours} hour${hours === 1 ? '' : 's'}`;
}

/** The clock time, shown as a tooltip beside a relative time and to name an earlier run. */
export const clockTime = (at: number) => new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
