import { spawnSync } from 'node:child_process';

const [shard, ...forwarded] = process.argv.slice(2);
const match = /^([1-9]|10|11)\/11$/.exec(shard ?? '');
if (!match) throw new Error('Adjusted go-live shard must be 1/11 through 11/11.');
const index = Number(match[1]);
// Split only the two previously slow native groups, preserving their native test selections.
const splits = {
  1: { native: 1, files: ['contact-links.journeys.ts', 'content-checks.journeys.ts'] },
  10: { native: 1, files: ['delivery-recovery.journeys.ts'] },
  4: { native: 4, files: ['list-growth.journeys.ts', 'mailbox-provider.journeys.ts'] },
  11: { native: 4, files: ['managed-mail.journeys.ts', 'open-estimates.journeys.ts'] },
};
const selection = splits[index] ?? { native: index };
const base = ['exec', 'playwright', 'test', '--config', 'tests/go-live/playwright.config.js'];
if (!selection.files) {
  const result = spawnSync('pnpm', [...base, ...forwarded, `--shard=${selection.native}/9`], { stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}
function collect(extra) {
  const result = spawnSync('pnpm', [...base, ...extra, '--list', '--reporter=json'], {
    encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) throw new Error(`Go-live collection failed: ${result.error?.message ?? result.stderr}`);
  const report = JSON.parse(result.stdout);
  if (report.errors?.length) throw new Error('Go-live collection reported errors.');
  const rows = [];
  function visit(suite, file, titles) {
    for (const spec of suite.specs ?? []) for (const test of spec.tests) {
      rows.push({ id: `${spec.id}:${test.projectName}`, file,
        title: [file, ...titles, spec.title].join(' ') });
    }
    for (const child of suite.suites ?? []) visit(child, file, [...titles, child.title]);
  }
  for (const suite of report.suites) visit(suite, suite.title, []);
  if (!rows.length || new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Go-live collection is empty or ambiguous.');
  return rows;
}
const native = collect([`--shard=${selection.native}/9`]);
// Assert the old declaring-file partition so inventory drift cannot omit a registration.
if (selection.files) {
  const expected = Object.values(splits).filter(row => row.native === selection.native).flatMap(row => row.files);
  const actual = new Set(native.map(row => row.file));
  if (actual.size !== expected.length || expected.some(file => !actual.has(file))) throw new Error('Slow native go-live group changed; reconcile its whole-file partition.');
}
const selected = native.filter(row => !selection.files || selection.files.includes(row.file));
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const grep = `(?:^| )(?:${selected.map(row => escape(row.title)).join('|')})(?: @\\S+)*$`;
const actual = collect(['--grep', grep]);
const expectedIds = new Set(selected.map(row => row.id));
if (actual.length !== selected.length || actual.some(row => !expectedIds.has(row.id))) throw new Error('Adjusted go-live shard lost or duplicated a registration.');
const result = spawnSync('pnpm', [...base, ...forwarded, '--grep', grep], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
