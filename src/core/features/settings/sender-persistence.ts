import type { Platform } from '@/core/shared/platform';
import { senderIdentitySchema, type SenderIdentity } from './sender-validation';
import { SenderAuthorityChanged, senderWriteGuard, type SenderWriteAuthority } from './sender-authority';

type SenderPlatform = Pick<Platform, 'database' | 'config'>;

/** Environment identity initializes installations; a saved identity is authoritative. */
export async function loadSenderSettings(platform: SenderPlatform): Promise<SenderIdentity> {
  const saved = await platform.database.$client.prepare(`SELECT display_name AS displayName, from_email AS fromEmail,
    reply_to_email AS replyToEmail, physical_address AS physicalAddress FROM sender_settings WHERE id = 'business'`).first<SenderIdentity>();
  if (saved) Object.assign(platform.config.mailSender, senderIdentitySchema.parse(saved));
  return platform.config.mailSender;
}

export async function saveSenderSettings(platform: SenderPlatform, value: unknown, authority: SenderWriteAuthority) {
  const identity = senderIdentitySchema.parse(value);
  const now = Date.now(), db = platform.database.$client;
  const guardValues = [authority.sessionId, authority.operatorId, authority.version, now];
  // D1 batches are atomic: no reader can observe new identity with old evidence.
  const results = await db.batch([
    db.prepare(`INSERT INTO sender_settings (id,display_name,from_email,reply_to_email,physical_address,updated_by,created_at,updated_at)
      SELECT 'business',?,?,?,?,?,?,? WHERE ${senderWriteGuard} ON CONFLICT(id) DO UPDATE SET display_name=excluded.display_name,
      from_email=excluded.from_email,reply_to_email=excluded.reply_to_email,physical_address=excluded.physical_address,
      updated_by=excluded.updated_by,updated_at=excluded.updated_at
      WHERE display_name <> excluded.display_name OR from_email <> excluded.from_email
        OR reply_to_email <> excluded.reply_to_email OR physical_address <> excluded.physical_address`)
      .bind(identity.displayName, identity.fromEmail, identity.replyToEmail, identity.physicalAddress, authority.operatorId, now, now, ...guardValues),
    db.prepare(`UPDATE sender_verification_state SET generation=generation+1,observation_id=NULL,
      revoked_at=NULL,reason='sender-settings-changed',updated_at=? WHERE changes()=1`).bind(now),
    db.prepare(`SELECT 1 AS authorized WHERE ${senderWriteGuard}`).bind(...guardValues),
  ]);
  if (!results[2].results.length) throw new SenderAuthorityChanged();
  return loadSenderSettings(platform);
}

/** Used inside the atomic provider handoff fence, after all asynchronous checks. */
export function savedSenderRevisionGuard(revisionAlias: string) {
  return `(NOT EXISTS (SELECT 1 FROM sender_settings WHERE id='business') OR EXISTS
    (SELECT 1 FROM sender_settings cfg WHERE cfg.id='business'
      AND cfg.display_name=${revisionAlias}.sender_name
      AND lower(cfg.from_email)=lower(${revisionAlias}.from_email)
      AND lower(cfg.reply_to_email)=lower(${revisionAlias}.reply_to_email)
      AND cfg.physical_address=${revisionAlias}.physical_address))`;
}
