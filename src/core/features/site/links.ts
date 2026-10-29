// Where Mango's public pages link. Everything except the credit is this deployment's own page, or the run site's.

/**
 * A first-party public page: the home page (an installed Mango's Lobby, the run site's landing), sign-in, the run site's
 * Run and Contract pages, the docs home, or one docs page by its slug in docs/site.json.
 */
export type SiteTarget = { to: '/' | '/signin' | '/run' | '/docs' | '/contract' } | { to: '/docs/$slug'; slug: string };

export const sitePaths = {
  home: { to: '/' },
  signIn: { to: '/signin' },
  run: { to: '/run' },
  docs: { to: '/docs' },
  contract: { to: '/contract' },
  install: { to: '/docs/$slug', slug: 'install' },
} as const satisfies Record<string, SiteTarget>;

export const creditUrl = 'https://runeditrun.com';
export const sourceUrl = 'https://github.com/just-every/run-mango';
