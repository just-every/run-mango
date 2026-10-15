import { mkdtemp, mkdir } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';
import { evidenceDirectory } from '../../tests/support/artifacts.mjs';
import { writeTerminal } from './terminal-output.mjs';
import { runStages } from './stages.mjs';

const flags = new Set(process.argv.slice(2));
for (const flag of flags) if (flag !== '--tests-only') throw new Error(`Unknown verification option: ${flag}`);
const pnpm = (name, args) => ({ name, command: 'pnpm', args });
const browser = (name, config, workers) => ({ ...pnpm(name, ['exec', 'playwright', 'test', '--config', config,
  `--workers=${workers}`, '--reporter=list,./scripts/verification/reporter.mjs']), timingRequired: true });
const cpuBudget = availableParallelism();
const mainWorkers = Math.min(2, cpuBudget);
const overlapMainAndNative = cpuBudget >= mainWorkers + 1;
const groups = flags.has('--tests-only') ? [] : [
  [{ name: 'command-contract', command: process.execPath, args: ['node_modules/@runeditrun/rer/bin/rer.mjs', 'check', '--profile', 'first-party'] }, pnpm('source', ['run', 'source:check'])],
  [pnpm('typecheck', ['run', 'typecheck'])],
  [pnpm('build', ['run', 'build'])],
];
// Test-only runs include the same auth, invitation and deployment boundaries.
// Documentation is exercised through its public pages in the main suite.
groups.push([{ ...pnpm('operations', ['run', 'test:operations']), timingRequired: true }]);
const main = browser('main', 'playwright.config.js', mainWorkers);
const native = browser('local-start', 'tests/local-start/config.js', 1);
groups.push(
  // Independent caches/state permit overlap after the build when both worker
  // pools fit the CPU budget. Native migration/rotation journeys stay serial.
  // CPU availability estimates capacity, not load from other processes.
  ...(overlapMainAndNative ? [[main, native]] : [[main], [native]]),
  // Shared-browser projects mutate settings and remain serial, one worker each.
  [browser('newsletter-ui', 'tests/newsletter-ui/playwright.config.js', 1)],
  [browser('sender-disclosure', 'tests/newsletter-ui/sender-playwright.config.js', 1)],
  [browser('campaign-results', 'tests/campaign-results/playwright.config.js', 1)],
  // Send, signed provider facts, one-click opt-out and restore on one installation.
  [browser('go-live', 'tests/go-live/playwright.config.js', 1)],
  // One account export moved in, reconciled and undone; hostile archives refused.
  [browser('move-in', 'tests/move-in/playwright.config.js', 1)],
);
const root = evidenceDirectory('verify');
await mkdir(root, { recursive: true });
const directory = process.env.MANGO_VERIFY_REPORT_DIRECTORY
  ? evidenceDirectory('verify', process.env.MANGO_VERIFY_REPORT_DIRECTORY)
  : await mkdtemp(join(root, 'routine-'));
const controller = new AbortController();
const handlers = new Map(['SIGINT', 'SIGTERM'].map(signal => [signal, () => controller.abort(Object.assign(new Error(`Cancelled by ${signal}.`), { signal }))]));
for (const [signal, handler] of handlers) process.on(signal, handler);
try {
  await runStages(groups, { directory, signal: controller.signal,
    schedule: { cpuBudget, mainWorkers, nativeWorkers: 1, mainAndNative: overlapMainAndNative ? 'parallel' : 'sequential' } });
}
catch (error) {
  process.exitCode = 1;
  try { await writeTerminal(`Verification failed: ${error.message}\n`, 2, { signal: controller.signal }); }
  catch { /* Preserve failure even when the diagnostic pipe has closed. */ }
}
finally { for (const [signal, handler] of handlers) process.off(signal, handler); }
