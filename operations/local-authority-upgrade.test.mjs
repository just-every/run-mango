import assert from 'node:assert/strict';
import { contract } from '../tests/contract.js';
import { localContactHashSalt } from '../src/core/platform/local-contact-authority.ts';
import { retainedContactHashSalt } from '../scripts/installer/contact-authority.mjs';

const previous = { SESSION_SIGNING_KEY: 'legacy-effective-test-authority', CONTACT_HASH_SALT: 'legacy-unused-test-value' };
contract('CONT-006', 'an unversioned install cannot silently select the unused contact salt on upgrade', () => {
  assert.throws(() => localContactHashSalt(previous), /unversioned/i);
  assert.throws(() => retainedContactHashSalt(previous), /unversioned/i);
});
contract('CONT-004', 'explicit legacy session conversion retains the real prior authority through two credential rotations', () => {
  const salt = retainedContactHashSalt(previous, 'session');
  assert.equal(salt === previous.SESSION_SIGNING_KEY, true);
  let current = { MANGO_LOCAL_HASH_AUTHORITY: 'contact-salt-v1', CONTACT_HASH_SALT: salt, SESSION_SIGNING_KEY: 'new-session-test-one' };
  for (const session of ['new-session-test-two', 'new-session-test-three']) {
    current = { ...current, CONTACT_HASH_SALT: retainedContactHashSalt(current), SESSION_SIGNING_KEY: session };
    assert.equal(localContactHashSalt(current) === previous.SESSION_SIGNING_KEY, true);
  }
});
contract('CONT-006', 'unsupported versions and absent legacy credentials fail without inventing authority', () => {
  for (const version of ['', 'future-version']) {
    const invalid = { ...previous, MANGO_LOCAL_HASH_AUTHORITY: version };
    assert.throws(() => localContactHashSalt(invalid), /unsupported/i);
    assert.throws(() => retainedContactHashSalt(invalid, 'session'), /unsupported/i);
  }
  for (const secret of [undefined, '', ' ']) {
    assert.throws(() => retainedContactHashSalt({ ...previous, SESSION_SIGNING_KEY: secret }, 'session'), /SESSION_SIGNING_KEY/);
  }
});

contract('CONT-006', 'explicit independent-contact conversion preserves confirmed unversioned contact authority', () => {
  assert.equal(retainedContactHashSalt(previous, 'contact') === previous.CONTACT_HASH_SALT, true);
  assert.throws(() => retainedContactHashSalt({ ...previous, CONTACT_HASH_SALT: '' }, 'contact'), /CONTACT_HASH_SALT/);
  assert.throws(() => retainedContactHashSalt({ ...previous, MANGO_LOCAL_HASH_AUTHORITY: 'contact-salt-v1' }, 'session'), /only valid/);
});
