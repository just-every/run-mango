import { z } from 'zod';
import type { Platform } from '@/core/shared/platform';
import { senderWriteAuthority, senderWriteGuard, SenderAuthorityChanged } from '@/core/features/settings/sender-authority';
export const signupSettingsSchema = z.object({frequencyDisclosure: z.string().trim().min(3, 'Describe how often subscribers will receive the newsletter.').max(200, 'Use at most 200 characters.').refine(value => !/[<>\u0000-\u001f\u007f]/u.test(value), 'Use plain text without markup or control characters.')}).strict();
export async function loadSignupSettings(platform: Pick<Platform, 'database'>) {
  const saved = await platform.database.$client.prepare("SELECT frequency_disclosure AS frequencyDisclosure FROM signup_settings WHERE id='newsletter'").first<{frequencyDisclosure:string}>();
  return saved ? signupSettingsSchema.parse(saved) : {frequencyDisclosure:'Occasional newsletters'};
}
export async function saveSignupSettings(platform: Platform, value: unknown, operatorId: string, request: Request) {
  const settings = signupSettingsSchema.parse(value), authority = await senderWriteAuthority(platform, request, operatorId), now = Date.now();
  const result = await platform.database.$client.prepare(`INSERT INTO signup_settings(id,frequency_disclosure,updated_by,updated_at)
    SELECT 'newsletter',?,?,? WHERE ${senderWriteGuard}
    ON CONFLICT(id) DO UPDATE SET frequency_disclosure=excluded.frequency_disclosure,updated_by=excluded.updated_by,updated_at=excluded.updated_at RETURNING id`)
    .bind(settings.frequencyDisclosure, operatorId, now, authority.sessionId, authority.operatorId, authority.version, now).first();
  if (!result) throw new SenderAuthorityChanged();
  return settings;
}
