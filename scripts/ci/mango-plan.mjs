import { appendFile } from 'node:fs/promises';
import { verificationPlan } from './verify-app.mjs';
import { planVerification } from './verify-plan.mjs';
const plan = await verificationPlan();
// Keep the existing reusable workflow's slow tier as a nightly alias.
const env = { ...process.env, TIER: process.env.TIER === 'slow' ? 'nightly' : process.env.TIER };
// Reusable calls always provide default inputs. Preserve Mango's rule
// that only this workflow's own push/PR entry can reuse push evidence.
const calledPush = env.REUSABLE === 'true' && env.TIER === 'push'
  && ['push', 'pull_request'].includes(env.GITHUB_EVENT_NAME)
  && !env.GITHUB_REF.startsWith('refs/tags/');
const decision = calledPush
  ? { coverage: 'full', skip: false, readers: [], tier: 'push', matrix: { include: plan.push } }
  : await planVerification({ plan, env });
// Base selects coverage; Mango retains every measured partition and timeout.
const partitions = new Map([...plan.push, ...plan.nightly].map(shard => [shard.name, shard]));
const matrix = { include: decision.matrix.include.map(shard => ({
  name: shard.name, browser: shard.browser, timeout: partitions.get(shard.name).timeout ?? 12,
})) };
const output = Object.entries({ coverage: decision.coverage, skip: decision.skip, tier: decision.tier,
  matrix: JSON.stringify(matrix), readers: JSON.stringify(decision.readers), has_shards: matrix.include.length > 0,
}).map(([key, value]) => `${key}=${value}\n`).join('');
await appendFile(process.env.GITHUB_OUTPUT, output);
process.stdout.write(output);
