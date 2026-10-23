import { sha256, PortabilityError, type ArchivePolicy } from '../../../vendor/base/portability/index.mjs';
import type { Platform } from '@/core/shared/platform';

/** Product inventory and private-key binding for the locally adapted Base engine. */
export function portabilityPolicy(config: Pick<Platform['config'], 'contactHashSalt' | 'sessionSigningKey'>): ArchivePolicy {
  const identity = async () => new TextEncoder().encode(await sha256(JSON.stringify([
    'mango-private-authority-v1', config.contactHashSalt, config.sessionSigningKey,
  ])));
  return {
    product: 'just-every/mango',
    excludeTables: ['link_host_sources','link_host_source_versions','woocommerce_connection','stripe_connection','operator_product_roles','operator_role_settings','audience_source_authority','scheduler_observation','audience_erasures','audience_erasure_blobs','audience_erasure_guard','oc_owner_claims', 'operator_sessions', 'operator_magic_links', 'operator_bootstraps', 'auth_rate_limits'],
    // Fresh authentication projects its owner here. Historical profiles carry no login authority.
    // Migration 0073 also initializes an empty installation's growth baseline;
    // validateStaged distinguishes those bootstrap rows from real opening counts.
    replaceableTables: ['operators', 'list_growth_baseline'],
    buckets: { ASSETS_BUCKET: {} },
    requiredConfiguration: ['CONTACT_HASH_SALT', 'SESSION_SIGNING_KEY', 'MAIL_PROVIDER', 'MAIL_PROVIDER_API_KEY'],
    extraPayloads: {
      'mango-private-authority': {
        produce: identity,
        async consume(source) {
          if (await sha256(new Uint8Array(await new Response(source).arrayBuffer())) !== await sha256(await identity())) {
            throw new PortabilityError('private_authority_mismatch', 409);
          }
        },
      },
    },
    async validateStaged({ db, manifest }) {
      const binding = manifest.payloads.find(value => value.name === 'mango-private-authority');
      if (binding?.sha256 !== await sha256(await identity())) throw new PortabilityError('private_authority_mismatch', 409);
      const { results: baseline } = await db.prepare('SELECT channel,covered_from,subscribed FROM list_growth_baseline ORDER BY channel')
        .all<{channel: string; covered_from: number; subscribed: number}>();
      // Read the destination, never the staged archive. An opening population is
      // real history even if its contacts have since gone. Contacts, events and
      // attribution retain Base's empty-table guards. Hosted restore mode and
      // the local CLI operation lock fence writes throughout this validation.
      const initializedEmpty = baseline.length === 2 && baseline[0].channel === 'email' && baseline[1].channel === 'sms'
        && baseline.every(row => row.subscribed === 0 && Number.isSafeInteger(row.covered_from) && row.covered_from > 0);
      if (baseline.length && !initializedEmpty) throw new PortabilityError('target_not_empty:list_growth_baseline', 409);
    },
  };
}
