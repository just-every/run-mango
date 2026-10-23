import { z } from 'zod';
import {effectiveRole,productAuthority} from '@/core/features/auth/product-roles';
import { ulid } from '@/core/shared/ids';
import type { Platform } from '@/core/shared/platform';
import { senderWriteAuthority, senderWriteGuard, SenderAuthorityChanged } from '@/core/features/settings/sender-authority';
const embedOrigin = z.string().max(300).refine(value => {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && url.origin === value && !value.includes('*'); }
  catch { return false; }
}, 'Use an exact HTTP or HTTPS origin without a path, wildcard or credentials.');
export const signupSettingsSchema = z.object({frequencyDisclosure: z.string().trim().min(3, 'Describe how often subscribers will receive the newsletter.').max(200, 'Use at most 200 characters.').refine(value => !/[<>\u0000-\u001f\u007f]/u.test(value), 'Use plain text without markup or control characters.'),embedOrigins: z.array(embedOrigin).max(30).default([]),challengeEnabled:z.boolean().default(true),kioskEnabled:z.boolean().default(false),kioskDeviceLabel:z.string().trim().max(100).refine(value=>!/[<>\u0000-\u001f\u007f]/u.test(value),'Use a plain-text device label.').default('')}).strict().refine(value=>!value.kioskEnabled||value.kioskDeviceLabel.length>0,{path:['kioskDeviceLabel'],message:'Name the shared device or event.'});
export async function loadSignupSettings(platform: Pick<Platform, 'database'>) {
  const saved = await platform.database.$client.prepare("SELECT frequency_disclosure AS frequencyDisclosure, embed_origins AS embedOrigins,kiosk_enabled AS kioskEnabled,kiosk_device_label AS kioskDeviceLabel,challenge_enabled AS challengeEnabled FROM signup_settings WHERE id='newsletter'").first<{frequencyDisclosure:string;embedOrigins:string;kioskEnabled:number;kioskDeviceLabel:string;challengeEnabled:number}>();
  return saved ? signupSettingsSchema.parse({...saved,challengeEnabled:Boolean(saved.challengeEnabled),kioskEnabled:Boolean(saved.kioskEnabled),embedOrigins:JSON.parse(saved.embedOrigins)}) : {frequencyDisclosure:'Occasional newsletters',embedOrigins:[] as string[],kioskEnabled:false,kioskDeviceLabel:'',challengeEnabled:true};
}
export async function saveSignupSettings(platform: Platform, value: unknown, operatorId: string, request: Request) {
  const settings = signupSettingsSchema.parse(value);
  if(settings.kioskEnabled&&!settings.challengeEnabled)throw new Error('kiosk_challenge_required');
  const old=await loadSignupSettings(platform);
  if(old.challengeEnabled!==settings.challengeEnabled&&!['owner','admin'].includes((await productAuthority(platform.database.$client,operatorId))?.role??''))throw new SenderAuthorityChanged();
  const authority = await senderWriteAuthority(platform, request, operatorId), now = Date.now();
  const db=platform.database.$client, id=ulid(now), settingsChange=ulid(now+1), origins=[...new Set(settings.embedOrigins)];
  const guard=[authority.sessionId,authority.operatorId,authority.version,now];
  const challengeChange=ulid(now+2);
  const challengeGuard=`EXISTS(SELECT 1 FROM oa_operators n JOIN operators p ON p.id=n.id LEFT JOIN operator_product_roles r ON r.operator_id=n.id WHERE n.id=? AND n.status='active' AND ${effectiveRole} IN ('owner','admin'))`;
  const result = await db.batch([
    db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at)
      SELECT ?,?,'signup-form','newsletter','signup.challenge.changed','operator',?,?,?,? WHERE ${senderWriteGuard} AND ${challengeGuard}
      AND COALESCE((SELECT challenge_enabled FROM signup_settings WHERE id='newsletter'),1)<>?`)
      .bind(challengeChange,challengeChange,operatorId,JSON.stringify({challengeEnabled:settings.challengeEnabled}),now,now,...guard,operatorId,Number(settings.challengeEnabled)),
    db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at)
      SELECT ?,?,'signup-form','newsletter','signup.kiosk.changed','operator',?,?,?,? WHERE ${senderWriteGuard}
      AND (COALESCE((SELECT kiosk_enabled FROM signup_settings WHERE id='newsletter'),0)<>?
        OR COALESCE((SELECT kiosk_device_label FROM signup_settings WHERE id='newsletter'),'')<>?)`)
      .bind(id,id,operatorId,JSON.stringify({kioskEnabled:settings.kioskEnabled,deviceLabel:settings.kioskDeviceLabel}),now,now,...guard,Number(settings.kioskEnabled),settings.kioskDeviceLabel),
    db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at)
      SELECT ?,?,'signup-form','newsletter','signup.settings.changed','operator',?,?,?,? WHERE ${senderWriteGuard}
      AND (COALESCE((SELECT frequency_disclosure FROM signup_settings WHERE id='newsletter'),'Occasional newsletters')<>?
        OR COALESCE((SELECT embed_origins FROM signup_settings WHERE id='newsletter'),'[]')<>?)`)
      .bind(settingsChange,settingsChange,operatorId,JSON.stringify({frequencyDisclosure:settings.frequencyDisclosure,embedOrigins:origins}),now,now,...guard,settings.frequencyDisclosure,JSON.stringify(origins)),
    db.prepare(`INSERT INTO signup_settings(id,frequency_disclosure,embed_origins,kiosk_enabled,kiosk_device_label,challenge_enabled,updated_by,updated_at)
      SELECT 'newsletter',?,?,?,?,?,?,? WHERE ((${senderWriteGuard}) OR EXISTS(SELECT 1 FROM lifecycle_audit_entries WHERE id=?)) AND (COALESCE((SELECT challenge_enabled FROM signup_settings WHERE id='newsletter'),1)=? OR EXISTS(SELECT 1 FROM lifecycle_audit_entries WHERE id=?))
      ON CONFLICT(id) DO UPDATE SET frequency_disclosure=excluded.frequency_disclosure,embed_origins=excluded.embed_origins,
        kiosk_enabled=excluded.kiosk_enabled,kiosk_device_label=excluded.kiosk_device_label,challenge_enabled=excluded.challenge_enabled,updated_by=excluded.updated_by,updated_at=excluded.updated_at RETURNING id`)
      .bind(settings.frequencyDisclosure,JSON.stringify(origins),Number(settings.kioskEnabled),settings.kioskDeviceLabel,Number(settings.challengeEnabled),operatorId,now,...guard,id,Number(settings.challengeEnabled),challengeChange),
  ]);
  if (!result[3].results.length) throw new SenderAuthorityChanged();
  return settings;
}
