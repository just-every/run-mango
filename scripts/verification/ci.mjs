import { spawnSync } from 'node:child_process';
import { mkdir, readlink, symlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { matrix } from './plan.mjs';

const [mode, tier, ...extra] = process.argv.slice(2);
if (mode === '--matrix' && !extra.length) console.log(JSON.stringify(matrix(tier)));
else {
  const groups = [...matrix('push').include, ...matrix('slow').include];
  const selected = mode === 'static' ? {name:'static',stage:'static',hosted:true} : groups.find(row => row.name === mode)
    ?? groups.flatMap(row => row.members).find(row => row.name === mode);
  if (!selected || tier) throw new Error('Usage: ci.mjs --matrix push|slow|all OR ci.mjs MATRIX_NAME');
  if (process.env.MANGO_VERIFY_MEMBERS && selected.members) selected.members = JSON.parse(process.env.MANGO_VERIFY_MEMBERS);
  const root = resolve(process.env.MANGO_TEST_WORK_DIR ?? join('..', 'mango-verification', selected.name));
  for (const member of selected.members ?? [selected]) {
    // Isolate native runtimes and retain all member diagnostics in the one
    // group evidence directory uploaded by the workflow.
    const workDir = join(root, 'members', member.name);
    const evidence = join(root, 'evidence', member.name);
    await mkdir(workDir, { recursive: true });
    await mkdir(evidence, { recursive: true });
    const link = join(workDir, 'evidence');
    try { await symlink(evidence, link, 'dir'); }
    catch (error) {
      if (error.code !== 'EEXIST' || await readlink(link) !== evidence) throw error;
    }
    // Only static owns rer's built-output, local-only and hydration checks.
    const command = member.hosted ? 'pnpm' : process.execPath;
    const args = member.hosted ? ['exec', 'rer', 'verify'] : ['scripts/verification/run.mjs'];
    console.log(`VERIFY_MEMBER ${member.name}`);
    const child = spawnSync(command, args, { stdio: 'inherit', env: { ...process.env,
      MANGO_TEST_WORK_DIR: workDir,
      MANGO_VERIFY_STAGE: member.stage, MANGO_VERIFY_SHARD: member.shard ?? '',
      MANGO_VERIFY_FILES: member.files ? JSON.stringify(member.files) : '',
      MANGO_NO_FIXTURE_SERVER: member.stage === 'main' && member.files?.every(file => !['docs.spec.ts','rendering.spec.ts'].includes(file)) ? '1' : '0' } });
    if (child.error) console.error(child.error);
    if (child.error || child.status !== 0) process.exitCode = 1;
  }
}
