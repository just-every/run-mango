import { useContext } from 'react';
import { ResourceSnapshot } from './resource-snapshot';

/** A demo's own origin, whose pages its letters may link to (demo-links.ts), from the page's `/auth/environment`
 * read. Undefined outside a demo. */
export function useDemoOrigin() {
  return (useContext(ResourceSnapshot)['/auth/environment'] as { demoOrigin?: string } | undefined)?.demoOrigin;
}
