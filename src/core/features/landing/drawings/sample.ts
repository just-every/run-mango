// The sample content written inside the drawings: example.com addresses, first names, counts and dates. Pictures only;
// nothing here is read from the deployment.
export const sample = {
  hero: {
    editor: 'Write your newsletter',
    approved: 'Approved · locked',
    subscriber: { title: 'New subscriber', email: 'reader@example.com', status: 'Confirmed' },
    audience: { title: 'Your audience', emails: ['reader@example.com', 'friend@example.com', 'team@example.com', 'writer@example.com'] },
    delivered: { count: '1,204 delivered', note: 'confirmed by your provider' },
    postmark: 'APPROVED',
  },
  steps: {
    collect: { title: 'New readers', rows: [['Ana', true], ['Ben', true], ['Cleo', false], ['Dev', true]] as const, waiting: 'waiting' },
    write: 'Spring letter',
    approve: { title: 'Spring letter', status: 'Approved' },
    schedule: { title: 'Schedule' },
  },
  consent: {
    signup: { title: 'Join the newsletter', tagline: 'Letters from the orchard, monthly.', email: 'you@example.com', button: 'Subscribe' },
    record: { title: 'Consent record', rows: [['Date', '9 Oct 2026'], ['Source', 'Signup page'], ['Status', 'Confirmed']] as const },
  },
  approval: {
    subject: 'Spring letter',
    draft: 'Draft · still editing',
    approved: 'Approved · locked',
    postmark: 'APPROVED',
  },
  schedule: {
    title: 'Spring letter · schedule',
    zone: 'Europe/London',
    steps: [
      { day: 'Tue 13 Oct', time: '9:00', utc: '08:00 UTC', state: 'Scheduled' },
      { day: 'Thu 15 Oct', time: '9:00', utc: '08:00 UTC', state: 'Scheduled' },
    ],
  },
  delivery: {
    title: 'Delivery report',
    rows: [
      { kind: 'handoff', label: 'Handed off', value: '1,212' },
      { kind: 'delivered', label: 'Delivered', value: '1,204' },
      { kind: 'bounced', label: 'Bounced', value: '6' },
      { kind: 'complaint', label: 'Complaints', value: '1' },
    ] as const,
    stamp: ['Confirmed', 'by provider'],
  },
  own: {
    account: 'Your data',
    rows: ['Database', 'Job queue', 'Mail settings'],
    csv: { name: 'audience.csv', head: ['email', 'consent', 'status'], rows: [['ana@example.com', 'signup', 'subscribed'], ['ben@example.com', 'import', 'subscribed'], ['cleo@example.com', 'signup', 'opted out']] },
  },
} as const;
