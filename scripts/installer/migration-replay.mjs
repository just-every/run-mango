import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { migrationReplay } from '../../src/vendor/base/portability/migration-history.mjs';
import { migrationStatements } from '../../src/vendor/base/portability/migration-sql.mjs';
import { destinationLedger, matchMigrationLedger } from '../../src/vendor/base/portability/ledgers.mjs';
import { all, insist } from '../../src/vendor/base/portability/storage.mjs';

// Wrangler records Mango's core files by bare name; Platform's runner records
// every file under the deployment specification's prefix (packaging specInputs).
// Core files carry that prefixed alias; optional extra directories only exist
// on Platform. Statements are split as the installation's runner stored them.
async function inventory(root, split) {
  const { migrationPrefix = '', extraMigrationDirectories = [] } = JSON.parse(await readFile(join(root, 'scripts/delivery/base/packaging.json'), 'utf8')).artifact.specInputs;
  const directories = [{ path: 'migrations/core', prefix: migrationPrefix, native: true }, ...extraMigrationDirectories.filter(directory => directory.binding === 'DB')];
  const files = [];
  for (const { path, prefix, native, optional } of directories) {
    let names;
    try { names = (await readdir(join(root, path))).filter(name => name.endsWith('.sql')).sort(); }
    catch (error) { if (optional && error.code === 'ENOENT') continue; throw error; }
    for (const name of names) {
      const bytes = await readFile(join(root, path, name));
      files.push({ name: native ? name : prefix + name, statements: migrationStatements(bytes.toString('utf8'), split),
        sha256: createHash('sha256').update(bytes).digest('hex'), ...(native ? { aliases: [prefix + name] } : {}) });
    }
  }
  return files;
}

/** Replay the destination's own applied files in its runner's order, resolving each ledger entry by hash where it records one. */
export async function restoreMigrations(db, root, policy, split) {
  const files = await inventory(root, split);
  const plan = matchMigrationLedger(await destinationLedger(db) ?? [], files).map(name => files.find(file => file.name === name));
  return migrationReplay(plan, policy);
}

/** True for a destination Platform's runner migrated. It stays the sole authority: Wrangler cannot see its ledger, so every local file must already be applied. */
export async function platformLedger(db, root, split) {
  const ledgers = (await all(db, "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('rer_migrations','d1_migrations','_rer_deploy_migrations')")).map(row => row.name);
  if (!ledgers.includes('rer_migrations')) return false;
  insist(ledgers.length === 1, 'migration_ledger:multiple:rer_migrations', 409);
  const files = await inventory(root, split), applied = matchMigrationLedger(await destinationLedger(db), files);
  for (const file of files) insist(applied.includes(file.name), 'migration_ledger:unapplied:' + file.name, 409);
  return true;
}
