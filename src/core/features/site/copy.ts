import type { LandingSectionId } from './links';

// The words in the shared header and footer. The owner's name, summary and credit toggle come from src/ext/config.ts.
export const siteCopy = {
  skip: 'Skip to content',
  nav: { label: 'Main', how: 'How it works', docs: 'Docs', contract: 'Contract', signIn: 'Sign in', openApp: 'Open app' },
  footer: {
    label: 'Footer',
    docs: 'Docs',
    signIn: 'Operator sign-in',
    openApp: 'Open app',
    poweredBy: 'Powered by',
    creditLabel: 'runeditrun.com',
  },
  sections: {
    how: 'How it works',
    consent: 'Consent',
    approval: 'Approval',
    schedule: 'Schedule',
    delivery: 'Delivery',
    own: 'Ownership',
  } satisfies Record<LandingSectionId, string>,
} as const;
