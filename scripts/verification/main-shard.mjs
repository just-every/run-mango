import { spawnSync } from 'node:child_process';

const [shard, ...forwarded] = process.argv.slice(2);
if (!['3/7', '4/7'].includes(shard)) throw new Error('Adjusted main shard must be 3/7 or 4/7.');
const movedFile = 'campaign-authoring/design-generation.spec.ts';
const base = ['exec', 'playwright', 'test', '--config', 'playwright.config.js'];
function collect(extra) {
  const result = spawnSync('pnpm', [...base, ...extra, '--list', '--reporter=json'], {
    encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) throw new Error(`Main shard collection failed: ${result.error?.message ?? result.stderr}`);
  const report = JSON.parse(result.stdout);
  if (report.errors?.length) throw new Error('Main shard collection reported errors.');
  const rows = [];
  function visit(suite, file, titles) {
    for (const spec of suite.specs ?? []) for (const test of spec.tests) {
      rows.push({ id: `${spec.id}:${test.projectName}`, file,
        title: [file, ...titles, spec.title].join(' ') });
    }
    for (const child of suite.suites ?? []) visit(child, file, [...titles, child.title]);
  }
  for (const suite of report.suites) visit(suite, suite.title, []);
  if (!rows.length || new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Main shard collection is empty or ambiguous.');
  return rows;
}
const native = collect([`--shard=${shard}`]);
const moved = collect([`tests/${movedFile}`]);
if (moved.some(row => row.file !== movedFile)) throw new Error('Moved file collection included another file.');
const nativeIds = new Set(native.map(row => row.id));
if (shard === '4/7' && moved.some(row => !nativeIds.has(row.id))) throw new Error('The whole moved file must belong to native main 4/7.');
if (shard === '3/7' && moved.some(row => nativeIds.has(row.id))) throw new Error('Moved file already belongs to native main 3/7.');
const selected = shard === '3/7' ? [...native, ...moved] : native.filter(row => row.file !== movedFile);
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const grep = `(?:^| )(?:${selected.map(row => escape(row.title)).join('|')})(?: @\\S+)*$`;
// Verify the final public CLI selection before running any test. In particular,
// contract() locations name its wrapper, so select by the declaring file/title
// rather than a location-based test list that could silently omit those cases.
const actual = collect(['--grep', grep]);
const expectedIds = new Set(selected.map(row => row.id));
if (actual.length !== selected.length || actual.some(row => !expectedIds.has(row.id))) throw new Error(`Adjusted main shard lost or duplicated a registration: expected ${selected.length}, found ${actual.length}.`);
if (!forwarded.includes('--list')) console.log(`MAIN_SHARD ${shard}: ${selected.length} registrations; whole ${movedFile} moves 4/7 -> 3/7`);
const result = spawnSync('pnpm', [...base, ...forwarded, '--grep', grep], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
