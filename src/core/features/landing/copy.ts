import type { IconName } from './icons/iconPaths';

// Every sentence of the landing's prose. Each claim is true of Mango's default newsletter profile; change the words
// freely, but keep them to what the deployment actually does (CONTRACT.md HOME-001). Sample names, addresses, counts
// and dates live in the drawings (drawings/sample.ts) and are pictures, never records.

export type Feature = { icon: IconName; title: string; text: string };

// The one line that says what Mango replaces, for search and for people who need to know. It names products
// (nominative use) and makes no comparison; the owner approved these exact words on 12 October 2026. The sentence is
// built here once: the meta description uses it as plain text and the hero shows the two product names in bold.
const replacedProducts = ['Mailchimp', 'Klaviyo'] as const;
const replaces = `100% free, open source alternative to ${replacedProducts[0]} and ${replacedProducts[1]}`;

export const copy = {
  meta: {
    title: 'Mango — Newsletters people are glad to get',
    description: `Write it, approve exactly what goes out, and send it only to people who said yes. Your list stays yours. ${replaces}.`,
  },
  hero: {
    title: 'Newsletters people are glad to get.',
    lead: 'Write it, approve exactly what goes out, and send it only to people who said yes. Your list stays yours.',
    replaces,
    replacedProducts,
    primary: 'Start your newsletter',
    // The run site's primary action (run-mango.com), to its Run page.
    run: 'Run Mango',
    secondary: 'Read the docs',
    // The scene drops the audience list on a phone (hero-phone.css), so each layout has its own description.
    art: {
      wide: 'A newsletter on its way: a draft in the editor, the approved letter locked, the envelope stamped with a mango and postmarked APPROVED, a new subscriber confirmed, an audience of four confirmed readers, and 1,204 letters delivered as confirmed by the mail provider.',
      phone: 'A newsletter on its way: a draft in the editor, the approved letter locked, the envelope stamped with a mango and postmarked APPROVED, a new subscriber confirmed, and 1,204 letters delivered as confirmed by the mail provider.',
    },
  },
  how: {
    title: 'How a letter leaves Mango.',
    sub: 'Five calm steps, and you are in charge of every one.',
    steps: [
      { title: 'Collect', text: 'Readers join on your hosted signup page and confirm by email.' },
      { title: 'Write', text: 'Draft in the rich-text editor or in HTML mode, then preview it at desktop and phone widths.' },
      { title: 'Approve', text: 'An operator approves the exact saved letter, and that is the letter that goes.' },
      { title: 'Schedule', text: "Pick the local date and time for each step, in your newsletter's time zone." },
      { title: 'Deliver', text: 'Mango hands each letter to your mail provider and records what the provider confirms.' },
    ],
  },
  consent: {
    title: 'Every reader said yes.',
    sub: 'Your list is built on consent, not assumptions.',
    features: [
      { icon: 'userPlus', title: "A signup page that's ready", text: 'Share your hosted signup page; new readers confirm their address before they get a single letter.' },
      { icon: 'consent', title: 'Consent on record', text: 'Mango keeps when and how each reader agreed, and the exact wording they saw.' },
      { icon: 'upload', title: 'Imports keep their history', text: 'Bring your list as CSV. Opt-outs and suppressions are applied first and never undone by a later import.' },
      { icon: 'unsubscribe', title: 'Unsubscribe, honoured', text: 'Every letter carries a visible unsubscribe link, and an opt-out is recorded before the reader is told it worked.' },
    ] satisfies Feature[],
    art: 'A signup card asking a reader to join the newsletter, the confirmation email it sends, and the consent record kept once the reader confirms from the signup page.',
  },
  approval: {
    title: 'Approve the exact letter.',
    sub: 'What you approve is exactly what goes out.',
    features: [
      { icon: 'recorded', title: 'Approval is recorded', text: 'Mango records who approved the letter and when, against the exact content they saw.' },
      { icon: 'lock', title: 'Locked once approved', text: "After approval the letter can't be edited. To send something different, write it and approve it on its own." },
      { icon: 'checks', title: 'Checks before approval', text: 'Mango blocks approval until the sender, the unsubscribe link, the links and the audience rules are right.' },
    ] satisfies Feature[],
    art: 'The same letter twice: a draft still being edited, with a pencil, and the approved copy, locked, carrying the mango stamp and an APPROVED postmark.',
  },
  schedule: {
    title: 'Send it when you mean to.',
    sub: 'Choose the local time; Mango works out the exact moment.',
    features: [
      { icon: 'clock', title: 'Local time, real time zone', text: "Each step is set in your newsletter's time zone, with the exact UTC moment shown beside it." },
      { icon: 'history', title: 'Every step in view', text: "Campaign history shows each step's time, state and recipient outcomes." },
      { icon: 'pause', title: 'Stop what can still stop', text: 'Cancel queued work while it is waiting. Mango never pretends to recall a letter already sent.' },
    ] satisfies Feature[],
    art: 'A schedule with two steps, Tuesday 13 October and Thursday 15 October at 9:00 London time, each showing its exact UTC moment and marked scheduled, with a letter bearing the mango stamp tucked behind it.',
  },
  delivery: {
    title: 'Know it arrived.',
    sub: 'Reports show what your mail provider confirmed, never guesses.',
    features: [
      { icon: 'delivered', title: 'Delivered means delivered', text: 'A letter counts as delivered only when the provider says so. Accepted is not delivered.' },
      { icon: 'bounce', title: 'Bounces and complaints handled', text: 'A hard bounce or complaint suppresses that address before the next send.' },
      { icon: 'eye', title: 'Nothing invented', text: 'No forecasts or modelled numbers. An unconfirmed send stays unconfirmed.' },
    ] satisfies Feature[],
    art: 'A delivery report: 1,212 handed off, 1,204 delivered, 6 bounced and 1 complaint, stamped confirmed by provider.',
  },
  own: {
    title: 'Your list stays yours.',
    sub: 'Nobody else holds your readers.',
    features: [
      { icon: 'account', title: 'Your readers, your data', text: 'Your readers, letters and history stay in your own database.' },
      { icon: 'download', title: 'Export any time', text: 'Download your audience with its consent history as CSV, ready to import again.' },
      { icon: 'team', title: 'A team of equals', text: 'Every operator has the same powers, and approvals and cancellations record who made them.' },
      { icon: 'code', title: 'Yours to change', text: 'MIT-licensed source you can customise with your own agents.' },
    ] satisfies Feature[],
    art: 'Your data, stamped with a mango, holding your database, job queue and mail settings, with a CSV sheet of readers and their consent sliding out as an export.',
  },
  closing: {
    title: 'Write the first one today.',
    line: 'Set up Mango and send a newsletter people are glad to get.',
  },
} as const;
