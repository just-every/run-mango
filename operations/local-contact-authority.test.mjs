import assert from 'node:assert/strict';
import { link, lstat, mkdir, mkdtemp, rename, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { contract } from '../tests/contract.js';
import { scratchDirectory } from '../tests/support/artifacts.mjs';
import { localVariables } from '../scripts/installer/environment.mjs';
import { assertFreshContactStore, contactSaltAssignment, retainedContactHashSalt } from '../scripts/installer/contact-authority.mjs';
import { localContactHashSalt, localContactAuthorityVersion } from '../src/core/platform/local-contact-authority.ts';
import { readUnchangedFile } from '../scripts/installer/credential-custody.mjs';

contract('CONT-006', 'a forced local refresh keeps the contact hash authority that retained suppressions depend on', () => {
  const previous = { MANGO_LOCAL_HASH_AUTHORITY: localContactAuthorityVersion, SESSION_SIGNING_KEY: 'previous session authority', CONTACT_HASH_SALT: 'retained contact authority' };
  const salt = retainedContactHashSalt(previous);
  assert.equal(salt, previous.CONTACT_HASH_SALT);
  assert.equal(localContactHashSalt({ MANGO_LOCAL_HASH_AUTHORITY: localContactAuthorityVersion, CONTACT_HASH_SALT: salt, SESSION_SIGNING_KEY: 'new session authority' }), salt);
  assert.equal(retainedContactHashSalt({ ...previous, SESSION_SIGNING_KEY: 'another session authority' }), salt);
  assert.deepEqual(previous, { MANGO_LOCAL_HASH_AUTHORITY: localContactAuthorityVersion, SESSION_SIGNING_KEY: 'previous session authority', CONTACT_HASH_SALT: 'retained contact authority' });
});

contract('CONT-004', 'local hash authority never invents a replacement for missing or empty credentials', () => {
  for (const value of [undefined, '', ' ']) {
    assert.throws(() => localContactHashSalt({ MANGO_LOCAL_HASH_AUTHORITY: localContactAuthorityVersion, CONTACT_HASH_SALT: value }), /CONTACT_HASH_SALT/);
    assert.throws(() => retainedContactHashSalt({ MANGO_LOCAL_HASH_AUTHORITY: localContactAuthorityVersion, SESSION_SIGNING_KEY: 'session', CONTACT_HASH_SALT: value }), /CONTACT_HASH_SALT/);
  }
  assert.throws(() => localContactHashSalt({ MANGO_LOCAL_HASH_AUTHORITY: localContactAuthorityVersion, SESSION_SIGNING_KEY: 'a session key is not a contact salt' }), /CONTACT_HASH_SALT/);
});

contract('OPER-001', 'local authority serialization preserves parsed dotenv bytes including whitespace and quoted keys', () => {
  for (const source of [
    'CONTACT_HASH_SALT=" spaces and # hash "', "export CONTACT_HASH_SALT='single and \"double\"'",
    'CONTACT_HASH_SALT=`all \' and " inside`', 'CONTACT_HASH_SALT="line one\nline two"',
    "CONTACT_HASH_SALT='literal \\n value'", 'CONTACT_HASH_SALT=unquoted\'"`value',
  ]) {
    const previous = { ...localVariables(source), MANGO_LOCAL_HASH_AUTHORITY: localContactAuthorityVersion };
    const value = retainedContactHashSalt(previous);
    assert.equal(localVariables(contactSaltAssignment(value)).CONTACT_HASH_SALT, previous.CONTACT_HASH_SALT);
  }
});

contract('CONT-006', 'missing local credentials cannot create a new hash authority over retained D1', async () => {
  const root = scratchDirectory('local-contact-authority');
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(join(root, 'state-'));
  try {
    await assertFreshContactStore(directory);
    await mkdir(join(directory, 'd1'));
    await writeFile(join(directory, 'd1', 'retained.sqlite'), 'retained database marker');
    await assert.rejects(assertFreshContactStore(directory), /Restore its local credentials/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

contract('OPER-001', 'retained authority reads bind to the inspected regular file and refuse replacement or links', async () => {
  const root = scratchDirectory('local-contact-authority');
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(join(root, 'custody-'));
  try {
    const file = join(directory, 'original'), backup = join(directory, 'backup');
    await writeFile(file, 'test-only-authority', { mode: 0o600 });
    await rename(file, backup);
    const expected = await lstat(backup);
    assert.equal(await readUnchangedFile(backup, expected), 'test-only-authority');
    await writeFile(backup, 'edited-in-place-before-reading');
    await assert.rejects(readUnchangedFile(backup, expected), /changed during setup/);
    await writeFile(file, 'different-file');
    await assert.rejects(readUnchangedFile(file, expected), /changed during setup/);
    await link(backup, join(directory, 'hardlink'));
    await assert.rejects(readUnchangedFile(backup, expected), /Unsafe .dev.vars/);
    await symlink(file, join(directory, 'symlink'));
    await assert.rejects(readUnchangedFile(join(directory, 'symlink'), expected));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

contract('OPER-001', 'authority custody detects same-inode same-size edits even when mtime is restored', async () => {
  const root = scratchDirectory('local-contact-authority'); await mkdir(root, { recursive: true });
  const directory = await mkdtemp(join(root, 'ctime-'));
  try {
    const file = join(directory, 'authority');
    await writeFile(file, 'original-test-authority', { mode: 0o600 });
    const date = new Date('2026-01-01T00:00:00Z'); await utimes(file, date, date);
    const expected = await lstat(file);
    await new Promise(resolve => setTimeout(resolve, 10));
    await writeFile(file, 'modified-test-authority'); await utimes(file, date, date);
    const changed = await lstat(file);
    assert.equal(changed.ino, expected.ino); assert.equal(changed.size, expected.size); assert.equal(changed.mtimeMs, expected.mtimeMs);
    assert.notEqual(changed.ctimeMs, expected.ctimeMs);
    await assert.rejects(readUnchangedFile(file, expected), /changed during setup/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
