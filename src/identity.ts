import type { EditionIdentity } from '@/base/identity';
import { copy } from '@/core/features/landing/copy';
import { productConfig } from '@/ext/config';

/**
 * What the installed Lobby and the run site (run-mango.com) say about Mango. The deployment's name is the owner's own
 * `organizationName` in src/ext/config.ts; the tagline is the approved landing's hero line.
 */
export const identity: EditionIdentity = {
  product: productConfig.productName,
  deployment: productConfig.organizationName,
  purpose: '{deployment}’s newsletter, sent only to readers who asked for it.',
  tagline: copy.hero.title,
  signInPath: '/signin',
  runSite: 'https://run-mango.com',
  installedHome: 'lobby',
  theme: '/rer-theme.css',
  mark: '/favicon.svg',
  band: '/brand/band.svg',
  fonts: '/fonts/fonts.css',
};
