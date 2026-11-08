import { useEffect, useSyncExternalStore, type ReactNode } from 'react';

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
  publish();
}

const serverSnapshot = { hydrated: false, timeZone: 'UTC' };
let snapshot = serverSnapshot;
const getSnapshot = () => snapshot;
const getServerSnapshot = () => serverSnapshot;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

function publish() {
  const timeZone = chosenZone();
  if (snapshot.hydrated && snapshot.timeZone === timeZone) return;
  snapshot = { hydrated: true, timeZone };
  listeners.forEach(listener => listener());
}

/**
 * Publish above streamed routes, without updating their ancestor context. A
 * context update can render a second copy while a route is still hydrating.
 * Only committed store subscribers update; a later boundary hydrates against
 * the stable server snapshot before reading the current browser snapshot.
 */
export function TimeZoneProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    window.addEventListener('storage', publish);
    publish();
    return () => { window.removeEventListener('storage', publish); };
  }, []);
  return children;
}

/** A Worker cannot know the zone: server and first client render read UTC. */
export function useTimeZone() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot).timeZone;
}

/** Server and first client render agree, then the document publishes hydration. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot).hydrated;
}

/**
 * The zones to pick from. The browser's list can differ from the server's, so until hydration only the current zone is
 * offered; that keeps the server HTML and the first client render identical.
 */
export function zoneList(hydrated: boolean, current: string) {
  const all = hydrated && typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  return all.includes(current) ? all : [current, ...all];
}

export function useZoneChoices(current: string) {
  return zoneList(useHydrated(), current);
}

/** An instant as the value of a datetime-local field in a zone: 2026-10-29T17:51. */
export function localDateTime(instant: string, timezone: string) {
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant)).map(part=>[part.type,part.value]));
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  } catch { return ''; }
}
