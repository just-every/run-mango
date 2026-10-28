import {integrationTools} from './integration-tools';
import {mangoCredentials} from './credentials';
import type {createIntegrationService} from '../integrations/service';
import {workerTools} from './worker-tools';
import type {LifecycleRuntime} from '../lifecycle/types';
import { createAgentDoor, type Trust } from '@/vendor/base/agent-door/index.ts';
import { createBusinessSettings } from '@/vendor/base/business-settings/index.ts';
import type { AppBindings, Platform } from '@/core/shared/platform';
import type { createAuthService } from '../auth/service';
import type { Hono } from 'hono';
import { mangoPeople } from './people';
import { nativeGateway } from './native';
import { mangoTools } from './tools';
import { mangoResources } from './resources';

export function installationTrust(environment: AppBindings, origin: string): Trust | null {
  const issuer = environment.RER_OWNER_CLAIM_ISSUER;
  const installationId = environment.RER_INSTALLATION_ID ?? environment.RER_OWNER_CLAIM_INSTALLATION_ID;
  const publicKeys = environment.RER_OWNER_CLAIM_PUBLIC_KEYS;
  if (![issuer, installationId, publicKeys, environment.RER_OWNER_CLAIM_APP_ORIGIN].some(Boolean)) return null;
  if (!issuer || !installationId || !publicKeys || environment.RER_OWNER_CLAIM_APP_ORIGIN && environment.RER_OWNER_CLAIM_APP_ORIGIN !== origin)
    throw new Error('Incomplete or inconsistent agent door trust configuration');
  return {issuer, installationId, appOrigin: origin, publicKeys: JSON.parse(publicKeys)};
}

export function mangoAgentDoor(environment: AppBindings, platform: Platform, auth: ReturnType<typeof createAuthService>, native: Hono<any>, runtime: LifecycleRuntime, integrations: ReturnType<typeof createIntegrationService>) {
  const origin = platform.config.publicBaseUrl.origin, db = platform.database.$client;
  const people = mangoPeople(platform, auth);
  const tools = [...mangoTools(platform, nativeGateway(platform, native),integrations,runtime),...workerTools(runtime),...integrationTools(platform,integrations)];
  const door = createAgentDoor({seed: 'mango', name: 'Mango', specialist: 'marketer', origin, db,
    trust: installationTrust(environment, origin), people, ...mangoCredentials(integrations), tools, resources: mangoResources(platform),
    notTools: [
      {clauses: ['DATA-001', 'MOVE-001'], reason: 'import-door'},
      {clauses: ['OPER-001'], reason: 'screen'},
      {clauses: ['DATA-001'], reason: 'installation'},
    ],
    prompts: [{name: 'newsletter', title: 'Prepare a newsletter', description: 'Read sender and audience evidence, prepare an exact newsletter revision, then use company policy for authorization. Consent and current sender checks still apply.',
      clauses: ['CAMP-004','AUD-005','SEND-001'], messages: () => [{role: 'user', content: {type: 'text',
        text: 'Read mango.store.read, mango.sender.read and mango.audience.read. Create a private newsletter draft; save its canonical content and structured audience. Refresh checks. Authorize only that exact revision under company policy. Read results and distinguish provider acceptance, delivery and imported history. Generic flow drafts never send; design purchases do not schedule mail. Spend caps are not enforced.'}}]}],
  });
  platform.agentDoor = door;
  const settings = {async handle(request: Request) {
    if (!['/api/rer/business-settings', '/rer-business-logo', '/rer-business.css'].includes(new URL(request.url).pathname)) return null;
    return createBusinessSettings({db, trust: environment.RER_BUSINESS_TRUST,
      business: {settings: 1, values: ['display_name'], team: {roles: {admin: 'admin', member: 'member'}}},
      team: auth.businessTeam(request)}).handle(request);
  }};
  return {door, settings};
}
