// Explicit versioning prevents an upgrade from silently changing the authority
// used by irreversible suppression and surviving opt-out hashes.
export const localContactAuthorityVersion = 'contact-salt-v1';
type LocalAuthority = { MANGO_LOCAL_HASH_AUTHORITY?: string; CONTACT_HASH_SALT?: string };
export function localContactHashSalt(environment: LocalAuthority): string {
  if (!Object.hasOwn(environment, 'MANGO_LOCAL_HASH_AUTHORITY')) {
    throw new Error('Unversioned local contact authority. Stop development and follow the local authority upgrade in OPERATIONS.md before refreshing credentials.');
  }
  if (environment.MANGO_LOCAL_HASH_AUTHORITY !== localContactAuthorityVersion) {
    throw new Error('MANGO_LOCAL_HASH_AUTHORITY is unsupported. Restore the matching supported local configuration.');
  }
  if (!environment.CONTACT_HASH_SALT?.trim()) {
    throw new Error('CONTACT_HASH_SALT is missing or empty. Restore the local contact authority in .dev.vars before starting Mango.');
  }
  return environment.CONTACT_HASH_SALT;
}
