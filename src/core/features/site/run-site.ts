import { createContext, useContext } from 'react';

/**
 * True while the static run site (run-mango.com, src/site/pages.tsx) renders the landing and the docs: every link is a
 * plain anchor, the primary action is Run Mango to /run, and nothing links to an instance-only route such as sign-in.
 * An installed Mango renders its docs with it false.
 */
export const RunSite = createContext(false);

export const useRunSite = () => useContext(RunSite);
