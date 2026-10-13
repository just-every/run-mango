import { sha256, PortabilityError, type ArchivePolicy } from '../../../vendor/base/portability/index.mjs';
import type { Platform } from '@/core/shared/platform';

/** Product inventory and private-key binding; Base owns the archive and restore engine. */
export function portabilityPolicy(config: Pick<Platform['config'], 'contactHashSalt' | 'sessionSigningKey'>): ArchivePolicy {
  const identity = async () => new TextEncoder().encode(await sha256(JSON.stringify([
    'mango-private-authority-v1', config.contactHashSalt, config.sessionSigningKey,
  ])));
  return {
    product: 'just-every/mango',
    excludeTables: ['audience_erasures','audience_erasure_blobs','audience_erasure_guard','oc_owner_claims', 'operator_sessions', 'operator_magic_links', 'operator_bootstraps', 'auth_rate_limits'],
    // Fresh authentication projects its owner here. Historical profiles carry no login authority.
    replaceableTables: ['operators'],
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
    async validateStaged({ manifest }) {
      const binding = manifest.payloads.find(value => value.name === 'mango-private-authority');
      if (binding?.sha256 !== await sha256(await identity())) throw new PortabilityError('private_authority_mismatch', 409);
    },
  };
}
