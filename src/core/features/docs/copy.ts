// The words the docs pages draw round the Markdown: navigation labels, the welcome on the docs home and the 404 page.
// The page text itself is the repository's Markdown (docs/site.json).

export const docsCopy = {
  navLabel: 'Documentation',
  contents: 'Contents',
  onThisPage: 'On this page',
  pager: { label: 'Previous and next pages', previous: 'Previous', next: 'Next' },
  titleSuffix: 'Mango docs',
  welcome: {
    title: 'Welcome. Here is how to run your own newsletter.',
    lead: 'Install Mango, write and approve an issue, collect subscribers with their consent and see what your provider delivered.',
    art: 'A letter in its envelope with a Mango stamp, beside a written page',
  },
  missing: {
    title: 'Page not found',
    eyebrow: 'Mango docs',
    heading: 'This page is not in the docs.',
    text: 'The address may have a typo, or the page may have moved. The docs home lists every page.',
    docs: 'Go to the docs',
    home: 'Back to the home page',
    art: 'An envelope with a Mango stamp, postmarked 404',
    postmark: '404',
  },
} as const;
