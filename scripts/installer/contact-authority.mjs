import { localContactHashSalt } from '../../src/core/platform/local-contact-authority.ts';
import { readdir } from 'node:fs/promises';
import { localVariables } from './environment.mjs';
import { refuse } from '../base-cli/cli/errors.mjs';

// A versionless configuration does not establish whether this database used the
// historical session key or the briefly shipped independent contact salt.
export function retainedContactHashSalt(previous, legacyAuthority) {
  if (Object.hasOwn(previous, 'MANGO_LOCAL_HASH_AUTHORITY')) {
    const salt = localContactHashSalt(previous);
    if (legacyAuthority) throw new Error('Legacy authority selection is only valid for an unversioned local configuration.');
    return salt;
  }
  if (!['session', 'contact'].includes(legacyAuthority)) {
    throw new Error('Unversioned local contact authority. Follow the local authority upgrade in OPERATIONS.md; do not guess which secret hashed this database.');
  }
  const key = legacyAuthority === 'session' ? 'SESSION_SIGNING_KEY' : 'CONTACT_HASH_SALT';
  if (!previous[key]?.trim()) {
    throw new Error(`${key} is missing or empty in the legacy configuration. Restore the matching backup before upgrading; contact hashes cannot be recovered from the database.`);
  }
  return previous[key];
}

export function contactSaltAssignment(value) {
  for (const literal of [`'${value}'`, `"${value}"`, `\`${value}\``, value]) {
    const assignment = `CONTACT_HASH_SALT=${literal}\n`;
    const parsed = localVariables(assignment);
    if (Object.keys(parsed).length === 1 && parsed.CONTACT_HASH_SALT === value) return assignment;
  }
  throw new Error('The retained contact authority cannot be represented safely in .dev.vars. Restore the original configuration before continuing.');
}

export async function assertFreshContactStore(state) {
  const files = await readdir(state, { recursive: true });
  if (files.some(file => file.endsWith('.sqlite'))) {
    throw refuse('Local database state exists without .dev.vars. Restore its local credentials before setup, or run reset if this data is not needed; new secrets would lose suppression and opt-out authority.');
  }
}
