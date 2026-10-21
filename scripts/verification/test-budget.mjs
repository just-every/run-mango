import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { configs } from './plan.mjs';

const policy = JSON.parse(await readFile('test-budget.json', 'utf8'));
if (policy.schemaVersion !== 1 || !Number.isSafeInteger(policy.maxTests) || policy.maxTests < 1
    || (policy.maxTests > 200 && (typeof policy.reason !== 'string' || !policy.reason.trim()))) {
  throw new Error('A test-budget exception must give a positive integer cap and written reason.');
}
function collect(command, args) {
  const result = spawnSync(command, args, {encoding: 'utf8', maxBuffer: 16 * 1024 * 1024});
  if (result.error || result.status !== 0) throw new Error(`Test collection failed: ${result.error?.message ?? result.stderr}`);
  return JSON.parse(result.stdout);
}
function count(suite) {
  return (suite.specs ?? []).reduce((sum, spec) => sum + spec.tests.length, 0)
    + (suite.suites ?? []).reduce((sum, child) => sum + count(child), 0);
}
const categories = {};
for (const [name, config] of Object.entries(configs)) {
  const args = ['exec', 'playwright', 'test', '--config', config, '--list', '--reporter=json'];
  if (name === 'local-start-slow') args.push('local.journey.ts');
  const report = collect('pnpm', args);
  if (report.errors?.length) throw new Error(`Playwright collection errors in ${name}`);
  categories[name] = count(report);
  if (!categories[name]) throw new Error(`Empty test category: ${name}`);
}
const operations = collect(process.execPath, ['scripts/verification/collect-operations.mjs']);
if (!operations.length) throw new Error('Empty operations category');
categories.operations = operations.length;
const total = Object.values(categories).reduce((sum, value) => sum + value, 0);
console.log(JSON.stringify({categories, total, maxTests: policy.maxTests, status: total <= policy.maxTests ? 'PASS' : 'FAIL'}, null, 2));
if (total > policy.maxTests) throw new Error(`Aggregate test budget exceeded: ${total} > ${policy.maxTests}`);
