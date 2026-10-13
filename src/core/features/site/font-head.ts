// The persistent head declaration for the site's faces: one same-origin stylesheet (public/fonts/fonts.css) and a
// preload of each face's Latin file with the URL the stylesheet uses. The root route renders these as links; the
// server-rendered message pages, which bypass the route renderer, write the same head as a string.
export const fontLinks = [
  { rel: 'preload', href: '/fonts/newsreader/newsreader-latin-opsz-normal.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
  { rel: 'preload', href: '/fonts/outfit/outfit-latin-wght-normal.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
  { rel: 'stylesheet', href: '/fonts/fonts.css' },
] as const;

export const fontHead = fontLinks
  .map((link) => `<link ${Object.entries(link).map(([name, value]) => `${name.toLowerCase()}="${value}"`).join(' ')}>`)
  .join('');
