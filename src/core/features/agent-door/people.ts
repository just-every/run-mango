import { operatorAuthPeople, type PeopleAdapter, type Person } from '@/vendor/base/agent-door/index.ts';
import { productAuthority } from '../auth/product-roles';
import type { createAuthService } from '../auth/service';
import type { Platform } from '@/core/shared/platform';

/** OA is the identity store; retained profiles only display past attribution. */
export function mangoPeople(platform: Platform, auth: ReturnType<typeof createAuthService>): PeopleAdapter {
  const native = operatorAuthPeople({db: platform.database.$client, session: async request => {
    const operator = await auth.authenticate(request);
    return operator ? {operator: {id: operator.id, email: operator.email, displayName: operator.displayName,
      role: operator.role, status: 'active'}} : null;
  }});
  async function current(person: Person | null): Promise<Person | null> {
    if (!person?.active) return null;
    const authority = await productAuthority(platform.database.$client, person.id);
    return authority ? {...person, role: authority.role} : null;
  }
  return {...native,
    person: async id => current(await native.person(id)),
    sponsor: async claims => current(await native.sponsor(claims)),
    session: async request => current(await native.session(request)),
    businessRole: person => person.role === 'owner' ? 'owner' : person.role === 'admin' ? 'editor' : null,
  };
}
