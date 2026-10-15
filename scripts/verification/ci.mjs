import { spawnSync } from 'node:child_process';
import { matrix } from './plan.mjs';

const [mode, tier, ...extra] = process.argv.slice(2);
if (mode === '--matrix' && !extra.length) console.log(JSON.stringify(matrix(tier)));
else {
  const selected = matrix('all').include.find(row => row.name === mode);
  if (!selected || tier) throw new Error('Usage: ci.mjs --matrix push|slow|all OR ci.mjs MATRIX_NAME');
  // Keep rer's built-output, local-only boundary and hydration checks in the
  // static job. Its app hook selects exactly the same static stage as the CLI.
  const command = selected.hosted ? 'pnpm' : process.execPath;
  const args = selected.hosted ? ['exec', 'rer', 'verify'] : ['scripts/verification/run.mjs'];
  const child = spawnSync(command, args, { stdio: 'inherit', env: { ...process.env,
    MANGO_VERIFY_STAGE: selected.stage, MANGO_VERIFY_SHARD: selected.shard ?? '' } });
  if (child.error) throw child.error;
  process.exitCode = child.status ?? 1;
}
