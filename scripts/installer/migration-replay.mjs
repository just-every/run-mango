import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { appliedMigrations } from '../../src/vendor/base/portability/bridge.mjs';
import { migrationReplay } from '../../src/vendor/base/portability/migration-history.mjs';
import { splitStatements } from '../../src/vendor/base/portability/sql-text.mjs';
import { PortabilityError } from '../../src/vendor/base/portability/index.mjs';

/** Replay the destination's own applied files, retaining its runner's identities and order. */
export async function restoreMigrations(db, root, policy) {
  const inventory = new Map();
  for (const directory of ['core', 'ext']) {
    const path = join(root, 'migrations', directory);
    let files;
    try { files = await readdir(path); }
    catch (error) { if (directory === 'ext' && error.code === 'ENOENT') continue; throw error; }
    for (const file of files.filter(name => name.endsWith('.sql'))) {
      const source = join(path, file);
      inventory.set(`${directory}-${file}`, source);
      if (inventory.has(file)) inventory.set(file, null);
      else inventory.set(file, source);
    }
  }
  const plan = [];
  for (const name of await appliedMigrations(db) ?? []) {
    const file = inventory.get(name);
    if (!file) throw new PortabilityError('schema_mismatch:migration_history', 409);
    const bytes = await readFile(file);
    plan.push({ name, statements: splitStatements(bytes.toString('utf8')),
      sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  return migrationReplay(plan, policy);
}
