import { useEffect } from 'react';

/** The design the operator asked for with "Use this design" and is still waiting on, as `<run>:<slot>`. Set by that
 * request and cleared by the operator's next key press, pointer press or wheel anywhere in this tab, so the import
 * path opens by itself only as the direct continuation of that request: never once the operator is doing something
 * else, such as typing in the body while the layout is prepared. Kept per tab in sessionStorage, so a reload while the
 * layout is prepared keeps the request; when storage is unavailable it lasts until the page reloads. */
const storageKey = 'mango-awaiting-design';
let memory: string | undefined;

export const awaitingDesign = {
  get(): string | undefined {
    try { return sessionStorage.getItem(storageKey) ?? undefined; } catch { return memory; }
  },
  set(key: string) {
    memory = key;
    try { sessionStorage.setItem(storageKey, key); } catch { /* the in-memory copy stands */ }
  },
  clear() {
    memory = undefined;
    try { sessionStorage.removeItem(storageKey); } catch { /* nothing stored */ }
  },
};

const activity = ['keydown', 'pointerdown', 'wheel'] as const;

/** Clears the awaited design on any operator activity. Listeners run in the capture phase, before the control's own
 * handler, so pressing "Use this design" clears an older request and then sets its own. */
export function useOperatorActivity() {
  useEffect(() => {
    const clear = () => awaitingDesign.clear();
    for (const type of activity) document.addEventListener(type, clear, { capture: true, passive: true });
    return () => { for (const type of activity) document.removeEventListener(type, clear, { capture: true }); };
  }, []);
}
