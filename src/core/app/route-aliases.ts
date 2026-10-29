// Addresses an owner or a link is likely to guess for an operator page, and the page that holds what they meant.
// A list root, an activity or contacts address, or a "new" address goes to its list instead of answering 404.
const aliases: Record<string, string> = {
  '/app/activity': '/app/settings/activity',
  '/app/contacts': '/app/audience',
  '/app/segments': '/app/audience',
  '/app/audience/segments': '/app/audience',
  '/app/audience/new': '/app/audience',
  '/app/imports': '/app/audience/import',
  '/app/templates': '/app/campaigns',
  '/app/campaigns/new': '/app/campaigns',
  '/app/flows/new': '/app/flows',
  '/app/insights/reports': '/app/insights',
  '/app/settings/operators': '/app/settings',
  '/app/settings/sender': '/app/settings',
  '/app/settings/usage': '/app/settings',
};

/** The page an unrouted operator address stands for, or undefined when it is not one of the known guesses. */
export function aliasTarget(pathname: string): string | undefined {
  return aliases[pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname];
}
