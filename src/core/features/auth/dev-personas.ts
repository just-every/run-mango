import type { DevPersona } from '@/vendor/base/operator-auth/dev/index.mjs';
// Local dev personas: real operators at <as>@dev.localhost, created only by local dev sign-in and suspended
// in exports. Mango's operators hold equal authority (an invitation always grants the owner role), so the
// persona is a second operator beside the owner; Mango's own record of it is made on first authenticated use.
export function devPersonas(): DevPersona[] {
  return [{ as: 'teammate', role: 'owner', displayName: 'Dev teammate' }];
}
