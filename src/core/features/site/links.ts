// Where Mango's public pages link. Everything except the credit is this deployment's own page.

/** A first-party public page: the landing, sign-in, the docs home, or one docs page by its slug in docs/site.json. */
export type SiteTarget = { to: '/' | '/signin' | '/docs' } | { to: '/docs/$slug'; slug: string };

export const sitePaths = {
  home: { to: '/' },
  signIn: { to: '/signin' },
  docs: { to: '/docs' },
  install: { to: '/docs/$slug', slug: 'install' },
} as const satisfies Record<string, SiteTarget>;

/** The landing's section anchors, in page order (the header's "How it works" and the footer's links point at them). */
export const landingSectionIds = ['how', 'consent', 'approval', 'schedule', 'delivery', 'own'] as const;
export type LandingSectionId = (typeof landingSectionIds)[number];

export const creditUrl = 'https://runeditrun.com';
