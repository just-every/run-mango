import { useSyncExternalStore } from 'react';

const key = 'mango-time-zone';
const listeners = new Set<() => void>();

function valid(zone: string | null | undefined): zone is string {
  if (!zone) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: zone }); return true; } catch { return false; }
}

/** The zone this browser is set to: where every time on the app starts until the person picks another. */
export function browserZone() {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return valid(zone) ? zone : 'UTC';
}

function chosenZone() {
  try {
    const saved = localStorage.getItem(key);
    if (valid(saved)) return saved;
  } catch { /* storage can be blocked; the browser's zone applies */ }
  return browserZone();
}

export function setTimeZone(zone: string) {
  try { localStorage.setItem(key, zone); } catch { /* the choice then lasts until reload */ }
  listeners.forEach(listener => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => { listeners.delete(listener); window.removeEventListener('storage', listener); };
};

/** The zone times are shown in. A Worker cannot know it, so the server and the first client render read UTC. */
export function useTimeZone() {
  return useSyncExternalStore(subscribe, chosenZone, () => 'UTC');
}

export function zoneChoices(current: string) {
  const all = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  return all.includes(current) ? all : [current, ...all];
}

/** An instant as the value of a datetime-local field in a zone: 2026-10-29T17:51. */
export function localDateTime(instant: string, timezone: string) {
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant)).map(part=>[part.type,part.value]));
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  } catch { return ''; }
}
