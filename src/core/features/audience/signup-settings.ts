import { z } from 'zod';
import { ulid } from '@/core/shared/ids';
import type { Platform } from '@/core/shared/platform';
import { senderWriteAuthority, senderWriteGuard, SenderAuthorityChanged } from '@/core/features/settings/sender-authority';
const embedOrigin = z.string().max(300).refine(value => {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && url.origin === value && !value.includes('*'); }
  catch { return false; }
}, 'Use an exact HTTP or HTTPS origin without a path, wildcard or credentials.');
export const signupSettingsSchema = z.object({frequencyDisclosure: z.string().trim().min(3, 'Describe how often subscribers will receive the newsletter.').max(200, 'Use at most 200 characters.').refine(value => !/[<>\u0000-\u001f\u007f]/u.test(value), 'Use plain text without markup or control characters.'),embedOrigins: z.array(embedOrigin).max(30).default([]),kioskEnabled:z.boolean().default(false),kioskDeviceLabel:z.string().trim().max(100).refine(value=>!/[<>\u0000-\u001f\u007f]/u.test(value),'Use a plain-text device label.').default('')}).strict().refine(value=>!value.kioskEnabled||value.kioskDeviceLabel.length>0,{path:['kioskDeviceLabel'],message:'Name the shared device or event.'});
export async function loadSignupSettings(platform: Pick<Platform, 'database'>) {
  const saved = await platform.database.$client.prepare("SELECT frequency_disclosure AS frequencyDisclosure, embed_origins AS embedOrigins,kiosk_enabled AS kioskEnabled,kiosk_device_label AS kioskDeviceLabel FROM signup_settings WHERE id='newsletter'").first<{frequencyDisclosure:string;embedOrigins:string;kioskEnabled:number;kioskDeviceLabel:string}>();
  return saved ? signupSettingsSchema.parse({...saved,kioskEnabled:Boolean(saved.kioskEnabled),embedOrigins:JSON.parse(saved.embedOrigins)}) : {frequencyDisclosure:'Occasional newsletters',embedOrigins:[] as string[],kioskEnabled:false,kioskDeviceLabel:''};
}
export async function saveSignupSettings(platform: Platform, value: unknown, operatorId: string, request: Request) {
  const settings = signupSettingsSchema.parse(value), authority = await senderWriteAuthority(platform, request, operatorId), now = Date.now();
  const db=platform.database.$client, id=ulid(now);
  const guard=[authority.sessionId,authority.operatorId,authority.version,now];
  const result = await db.batch([
    db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at)
      SELECT ?,?,'signup-form','newsletter','signup.kiosk.changed','operator',?,?,?,? WHERE ${senderWriteGuard}
      AND (COALESCE((SELECT kiosk_enabled FROM signup_settings WHERE id='newsletter'),0)<>?
        OR COALESCE((SELECT kiosk_device_label FROM signup_settings WHERE id='newsletter'),'')<>?)`)
      .bind(id,id,operatorId,JSON.stringify({kioskEnabled:settings.kioskEnabled,deviceLabel:settings.kioskDeviceLabel}),now,now,...guard,Number(settings.kioskEnabled),settings.kioskDeviceLabel),
    db.prepare(`INSERT INTO signup_settings(id,frequency_disclosure,embed_origins,kiosk_enabled,kiosk_device_label,updated_by,updated_at)
      SELECT 'newsletter',?,?,?,?,?,? WHERE (${senderWriteGuard}) OR EXISTS(SELECT 1 FROM lifecycle_audit_entries WHERE id=?)
      ON CONFLICT(id) DO UPDATE SET frequency_disclosure=excluded.frequency_disclosure,embed_origins=excluded.embed_origins,
        kiosk_enabled=excluded.kiosk_enabled,kiosk_device_label=excluded.kiosk_device_label,updated_by=excluded.updated_by,updated_at=excluded.updated_at RETURNING id`)
      .bind(settings.frequencyDisclosure,JSON.stringify([...new Set(settings.embedOrigins)]),Number(settings.kioskEnabled),settings.kioskDeviceLabel,operatorId,now,...guard,id),
  ]);
  if (!result[1].results.length) throw new SenderAuthorityChanged();
  return settings;
}
