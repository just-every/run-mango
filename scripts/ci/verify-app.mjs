import { matrix } from '../verification/plan.mjs';
import { spawnSync } from 'node:child_process';

// Mango owns its measured partitions and their commands. Base's planner only
// needs their identities, browser requirements and tier membership.
export async function verificationPlan() {
 const shards = tier => matrix(tier).include.map(shard => ({ ...shard,
  hosted: shard.members.some(member => member.hosted),
  commands: [`node scripts/verification/ci.mjs ${shard.name}`],
 }));
 return { push: shards('push'), nightly: shards('slow') };
}

export function run(command, env = process.env) {
 console.log(`> ${command}`);
 const result = spawnSync('/bin/bash', ['-euo', 'pipefail', '-c', command], { stdio: 'inherit', env });
 if (result.error) throw result.error;
 if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.argv[1] === import.meta.filename) {
 const plan = await verificationPlan();
 const all = [...plan.push, ...plan.nightly];
 const selected = process.env.SEED_VERIFY_SHARD;
 const shards = selected ? all.filter(shard => shard.name === selected) : all;
 if (!shards.length) throw Error(`Unknown verification shard: ${selected}`);
 for (const shard of shards) for (const command of shard.commands) run(command);
}
