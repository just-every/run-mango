import {signupCapacity} from './signup-capacity';
import {admitSignup,refundSignup,signupCapacityRefusal} from './signup-admission';
import { ProviderDeferredError } from '@/core/shared/provider-deferred-error';
import { smsSignupDescription } from '@/core/features/sms/signup';
import { loadSignupSettings } from './signup-settings';
import { countSignupRefusal, type SignupRefusalReason } from './signup-refusals';
import { Hono } from 'hono';
import { z } from 'zod';
import { sha256 } from '@/core/shared/ids';
import type { Platform } from '@/core/shared/platform';
import type { createAudienceService } from './service';
import { senderIdentitySchema } from '@/core/features/settings/sender-validation';
import { signupNetwork, reserveSignupAllowance, verifySignupChallenge } from './signup-security';

const signup = z.object({ email: z.string().email(), displayName: z.string().max(200).optional(), consent: z.union([z.literal(true), z.literal('true')]), website: z.string().max(500).optional(), disclosure: z.string().optional() });
export function signupDescription(platform: Platform, frequencyDisclosure = 'Occasional newsletters') {
  const sender = platform.config.mailSender.displayName;
  const consentText=`I agree to receive email newsletters from ${sender}. I can unsubscribe at any time.`;
  const disclosure=JSON.stringify({sender,consentText,frequencyDisclosure,version:'newsletter-signup-v1'});
  return {sms:smsSignupDescription(platform),sender,consentText,frequencyDisclosure,disclosure,...(platform.config.signupTurnstile ? {turnstileSiteKey:platform.config.signupTurnstile.siteKey}:{}),privacyNote:'Your email address and consent evidence are stored by this newsletter operator.'};
}
export async function loadSignupDescription(platform: Platform) {
  const settings=await loadSignupSettings(platform);
  const description=signupDescription(platform,settings.frequencyDisclosure);
  if(!settings.challengeEnabled)delete description.turnstileSiteKey;
  return {...description,challengeEnabled:settings.challengeEnabled,kioskEnabled:settings.kioskEnabled,kioskDeviceLabel:settings.kioskDeviceLabel,disclosure:settings.kioskEnabled?JSON.stringify({disclosure:description.disclosure,kiosk:true,deviceLabel:settings.kioskDeviceLabel}):description.disclosure};
}
export async function limitedBody(request: Request) {
  if (Number(request.headers.get('content-length') ?? 0)>8192) throw new Error('too_large');
  const reader=request.body?.getReader(); if(!reader)return '';
  const chunks:Uint8Array[]=[];let bytes=0;
  try {for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>8192){await reader.cancel();throw new Error('too_large');}chunks.push(part.value);}}
  finally{reader.releaseLock();}
  const all=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length;}return new TextDecoder().decode(all);
}
export function createSignupRoutes(service: ReturnType<typeof createAudienceService>, platform: Platform, db: D1Database) {
  const routes = new Hono();
  routes.get('/subscribe/info', async context => context.json(await loadSignupDescription(platform)));
  routes.post('/subscribe', async context => {
    const isJson = (context.req.header('content-type') ?? '').includes('application/json');
    const success = () => isJson ? context.json({ status: 'confirmation-required' }, 202) : context.redirect('/subscribe?submitted=1', 303);
    if (!senderIdentitySchema.safeParse(platform.config.mailSender).success) return context.json({error:'sender_not_configured'},503);
    const description = await loadSignupDescription(platform);
    const refuse = (reason: SignupRefusalReason) => countSignupRefusal(db, description.kioskEnabled ? 'kiosk' : 'hosted', reason);
    const rateLimited = async (reason: SignupRefusalReason,retryAfter?:number) => {
      await badAttempt();await refuse(reason);
      const clock=await db.prepare("SELECT 3600-CAST(strftime('%s','now') AS INTEGER)%3600 AS remaining").first<{remaining:number}>();
      context.header('Retry-After',String(retryAfter??clock!.remaining));
      return context.json({error:'rate_limited',detail:'Too many signups right now. Please try again in a few minutes.'},429);
    };
    if(description.kioskEnabled&&!platform.config.signupTurnstile)return context.json({error:'kiosk_verification_unavailable',detail:'This kiosk needs verification configured before it can accept signups.'},503);
    const ip = context.req.header('CF-Connecting-IP') ?? '';
    const network = signupNetwork(ip);
    if (!network) return context.json({ error: 'client_ip_required' }, 400);
    const key = await sha256(`${platform.config.contactHashSalt}:signup:${network}`);
    const capacity=await signupCapacity(db);
    const badAttempt=async()=>{await reserveSignupAllowance(db,`signup-refused:${key}`,'hour',capacity.levels.networkRefused);};
    let body:unknown;
    try {const text=await limitedBody(context.req.raw);body=isJson?JSON.parse(text):Object.fromEntries(new URLSearchParams(text));}
    catch{await badAttempt();return context.json({error:'invalid_signup_body'},400);}
    const challenge = body && typeof body === 'object' && 'cf-turnstile-response' in body ? body['cf-turnstile-response'] : undefined;
    const challenged=Boolean(description.turnstileSiteKey);
    if (!challenged) {
      const failed=await db.prepare("SELECT count FROM oa_limits WHERE key=? AND window=CAST(strftime('%s','now') AS INTEGER)/3600").bind(`signup-refused:${key}`).first<{count:number}>();
      if(failed&&failed.count>=capacity.levels.networkRefused)return rateLimited('network-rate-limit');
    }
    if(challenged&&!await verifySignupChallenge(platform,challenge,ip,db)){await badAttempt();return context.json({error:'verification_failed',detail:'Complete the verification and try again.'},400);}
    if (body && typeof body === 'object' && 'website' in body && body.website) {await badAttempt();return success();}
    const parsed = signup.safeParse(body);
    if (!parsed.success) {await badAttempt();return context.json({ error: 'invalid_signup', detail: 'A valid email and affirmative consent are required.', fields: parsed.error.flatten().fieldErrors }, 400);}
    if(parsed.data.disclosure!==description.disclosure){await badAttempt();return context.json({error:'signup_disclosure_changed',detail:'The newsletter details changed. Reload the form and review your consent before subscribing.'},409);}
    const blocked=await signupCapacityRefusal(db,{id:'',destinationHash:'',networkKey:key,kiosk:description.kioskEnabled,challenged,confirmation:false,levels:capacity.levels});
    if(blocked)return rateLimited(blocked.reason,blocked.retryAfter);
    const email=parsed.data.email.trim().toLowerCase();
    const state=await service.publicSignupState(email);
    if (state==='refused') {await refuse('existing-restriction');await service.recordPublicSignupRefusal(email,'Existing restriction prevents public confirmation.');return success();}
    const destinationHash=await sha256(`${platform.config.contactHashSalt}:signup-email:${email}`);
    const networkWindow=(await db.prepare("SELECT CAST(strftime('%s','now') AS INTEGER)/3600 AS window").first<{window:number}>())!.window;
    const lookupId=`signup_${await sha256(`${destinationHash}:${networkWindow}`)}`;
    const prior=await db.prepare(`SELECT status FROM audience_signup_requests r WHERE destination_hash=? AND
      (id=? OR EXISTS(SELECT 1 FROM consent_confirmations c WHERE c.consent_evidence_id=r.id AND c.confirmed_at IS NULL AND c.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000)) LIMIT 1`).bind(destinationHash,lookupId).first<{status:string}>();
    if(prior&&state!=='resubscribe')return success();
    const evidenceId=state==='resubscribe'?`resubscribe_${crypto.randomUUID()}`:lookupId;
    const reservation=await admitSignup(db,{id:evidenceId,destinationHash,networkKey:key,kiosk:description.kioskEnabled,challenged,confirmation:true,levels:capacity.levels});
    if(reservation.kind==='duplicate')return success();
    if(reservation.kind==='refused'){
      if(reservation.reason==='daily-allowance'){await badAttempt();await refuse('daily-allowance');await service.recordPublicSignupRefusal(email,'Daily confirmation allowance exhausted.');return success();}
      return rateLimited(reservation.reason,reservation.retryAfter);
    }
    const now=reservation.now;
    try {
      const captured=await service.capturePublicSignup({ contact: { email, displayName: parsed.data.displayName }, channel: 'email',
        brandOrLegalSender: description.sender, messageCategory: 'newsletter', frequencyDisclosure: description.frequencyDisclosure,
        destinationJurisdiction: 'Not provided', captureMethod: description.kioskEnabled?'kiosk':'hosted-signup-form', captureSource: description.kioskEnabled?`Kiosk: ${description.kioskDeviceLabel}`:new URL('/subscribe', platform.config.local===true?new URL(context.req.url).origin:platform.config.publicBaseUrl).toString(),
        captureIp: ip, consentText: description.consentText, consentVersion: 'newsletter-signup-v1', occurredAt: new Date(now),
        confirmationRequired: true, idempotencyKey: evidenceId }, new Date(now));
      if(!captured){await refundSignup(db,evidenceId,now,reservation.counters);return success();}
      await db.prepare("UPDATE audience_signup_requests SET status='sent' WHERE id=?").bind(evidenceId).run();
    } catch (error) {
      await db.prepare("UPDATE audience_signup_requests SET status='failed' WHERE id=?").bind(evidenceId).run();
      await refuse(error instanceof ProviderDeferredError?'delivery-deferred':'delivery-failed');await service.recordPublicSignupRefusal(email,error instanceof ProviderDeferredError?'Confirmation deferred before provider handoff.':'Confirmation delivery could not be established; no automatic retry.');
      return success();
    }
    return success();
  });
  return routes;
}
