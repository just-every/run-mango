import { mkdtemp, mkdir } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';
import { evidenceDirectory } from '../../tests/support/artifacts.mjs';
import { writeTerminal } from './terminal-output.mjs';
import { runStages } from './stages.mjs';
import { options, stageNames, verificationGroups } from './plan.mjs';

const selected = options(process.argv.slice(2), process.env);
if (selected.help) {
  console.log(`Usage: node scripts/verification/run.mjs [--tests-only | --stage NAME [--shard i/n]]\nStages: ${stageNames.join(', ')}\nDefault: routine verification; fresh clone/install journeys run in local-start-slow.`);
  process.exit(0);
}
const cpuBudget = availableParallelism();
const groups = verificationGroups(selected, cpuBudget);
const identity = selected.stage ? `${selected.stage}${selected.shard ? `-${selected.shard.replace('/', '-of-')}` : ''}` : 'routine';
const root = evidenceDirectory('verify');
await mkdir(root, { recursive: true });
const directory = process.env.MANGO_VERIFY_REPORT_DIRECTORY
  ? evidenceDirectory('verify', process.env.MANGO_VERIFY_REPORT_DIRECTORY)
  : await mkdtemp(join(root, `${identity}-`));
const controller = new AbortController();
const handlers = new Map(['SIGINT', 'SIGTERM'].map(signal => [signal, () => controller.abort(Object.assign(new Error(`Cancelled by ${signal}.`), { signal }))]));
for (const [signal, handler] of handlers) process.on(signal, handler);
try {
  await runStages(groups, { directory, signal: controller.signal,
    schedule: { selection: identity, cpuBudget, mainWorkers: Math.min(2, cpuBudget), nativeWorkers: Math.min(2, cpuBudget) } });
}
catch (error) {
  process.exitCode = 1;
  try { await writeTerminal(`Verification failed: ${error.message}\n`, 2, { signal: controller.signal }); }
  catch { /* Preserve failure even when the diagnostic pipe has closed. */ }
}
finally { for (const [signal, handler] of handlers) process.off(signal, handler); }
