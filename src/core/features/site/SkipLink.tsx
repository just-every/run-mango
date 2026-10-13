import { siteCopy } from './copy';

/** The first focusable element on a public page: jumps past the header to the page's `<main id="main">`. */
export function SkipLink() {
  return <a className="site-skip" href="#main">{siteCopy.skip}</a>;
}
