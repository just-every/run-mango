import type {Platform} from '@/core/shared/platform';
import type {createAudienceService} from '@/core/features/audience/service';
import {loadSignupDescription} from '@/core/features/audience/signup-routes';
import {signupNetwork, reserveSignupAllowance, verifySignupChallenge} from '@/core/features/audience/signup-security';
import {signupCapacity} from '@/core/features/audience/signup-capacity';
import {admitSignup, refundSignup, signupCapacityRefusal} from '@/core/features/audience/signup-admission';
import {countSignupRefusal, type SignupRefusalReason} from '@/core/features/audience/signup-refusals';
import {senderIdentitySchema} from '@/core/features/settings/sender-validation';
import {sha256} from '@/core/shared/ids';
import type {PaidTier} from './paid-tier';

export class PaidSignupCapacityError extends Error {
  constructor(readonly reason: SignupRefusalReason, readonly retryAfter: number) {
    super('Signup allowance exhausted. Try later.');
  }
}

export type PaidSignupInput = {email: string; consent?: true; disclosure?: string; requestId?: string; website?: string; 'cf-turnstile-response'?: string};
export type PaidSignupInfo = {sender: string; consentText: string; frequencyDisclosure: string; disclosure: string; privacyNote: string; turnstileSiteKey?: string; paidTopic: string; price: string};

export async function paidSignupInfo(platform: Platform, tier: PaidTier, price: Record<string, any>): Promise<PaidSignupInfo> {
  if (!senderIdentitySchema.safeParse(platform.config.mailSender).success) throw new Error('Paid signup needs a configured sender.');
  if (price.active !== true || price.type !== 'recurring' || !Number.isSafeInteger(price.unit_amount) || price.unit_amount < 0
      || typeof price.currency !== 'string' || !['day','week','month','year'].includes(price.recurring?.interval)) throw new Error('Paid signup price is unavailable.');
  const count=price.recurring.interval_count ?? 1;
  if (!Number.isSafeInteger(count) || count < 1) throw new Error('Paid signup interval is unavailable.');
  const money=new Intl.NumberFormat('en-US',{style:'currency',currency:price.currency.toUpperCase()});
  const digits=money.resolvedOptions().maximumFractionDigits;
  if(digits===undefined)throw new Error('Paid signup currency is unavailable.');
  const amount=money.format(price.unit_amount/10**digits);
  const description=await loadSignupDescription(platform);
  return {sender:description.sender,consentText:description.consentText,frequencyDisclosure:description.frequencyDisclosure,disclosure:JSON.stringify({newsletter:description.disclosure,priceId:tier.priceId,paidTopic:tier.paidTopic}),
    privacyNote:description.privacyNote,turnstileSiteKey:description.turnstileSiteKey,paidTopic:tier.paidTopic,
    price:`${amount} every ${count===1?'':count+' '}${price.recurring.interval}${count===1?'':'s'}`};
}

/** The reader's affirmative form authorizes this evidence. A payment event can
 * never create it. Standard capture preserves recipient opt-outs/suppression. */
export function paidSignupConsent(platform: Platform, audience: ReturnType<typeof createAudienceService>) {
  const db=platform.database.$client;
  return {
    async admit(input: PaidSignupInput, request: Request, tier: PaidTier) {
      if (!input.consent) return undefined;
      if (!input.requestId || !input.disclosure || !senderIdentitySchema.safeParse(platform.config.mailSender).success) throw new Error('Review the paid signup form before continuing.');
      const description=await loadSignupDescription(platform);
      if (input.disclosure !== JSON.stringify({newsletter:description.disclosure,priceId:tier.priceId,paidTopic:tier.paidTopic})) throw new Error('Newsletter details changed. Reload and review your consent.');
      const ip=request.headers.get('CF-Connecting-IP')??'', network=signupNetwork(ip);
      if (!network) throw new Error('Complete signup verification before continuing.');
      const networkKey=await sha256(`${platform.config.contactHashSalt}:signup:${network}`);
      const capacity=await signupCapacity(db), challenged=Boolean(description.turnstileSiteKey);
      const badAttempt=async()=>{await reserveSignupAllowance(db,`signup-refused:${networkKey}`,'hour',capacity.levels.networkRefused);};
      const refused=async(reason:SignupRefusalReason,retryAfter:number)=>{
        await badAttempt();await countSignupRefusal(db,'hosted',reason);
        throw new PaidSignupCapacityError(reason,retryAfter);
      };
      if (!challenged) {
        const failed=await db.prepare("SELECT count FROM oa_limits WHERE key=? AND window=CAST(strftime('%s','now') AS INTEGER)/3600").bind(`signup-refused:${networkKey}`).first<{count:number}>();
        if(failed&&failed.count>=capacity.levels.networkRefused)return refused('network-rate-limit',3600-Math.floor(capacity.now/1000)%3600);
      }
      if (challenged&&!await verifySignupChallenge(platform,input['cf-turnstile-response'],ip,db)) {
        await badAttempt();throw new Error('Complete signup verification before continuing.');
      }
      if (input.website) {await badAttempt();throw new Error('Signup refused.');}
      const blocked=await signupCapacityRefusal(db,{id:'',destinationHash:'',networkKey,kiosk:false,challenged,confirmation:false,levels:capacity.levels});
      if(blocked)return refused(blocked.reason,blocked.retryAfter);
      return {description,ip,networkKey,challenged};
    },
    async capture(input: PaidSignupInput, sessionId: string, admitted: {description: Awaited<ReturnType<typeof loadSignupDescription>>; ip: string; networkKey: string; challenged: boolean} | undefined) {
      if (!admitted) return;
      const email=input.email.trim().toLowerCase();
      if (await audience.publicSignupState(email)==='refused') return;
      const destinationHash=await sha256(`${platform.config.contactHashSalt}:signup-email:${email}`);
      const evidenceId='paid-checkout_'+await sha256(`${sessionId}:${email}`);
      if (await db.prepare('SELECT id FROM audience_signup_requests WHERE id=?').bind(evidenceId).first()) return;
      const capacity=await signupCapacity(db);
      const reservation=await admitSignup(db,{id:evidenceId,destinationHash,networkKey:admitted.networkKey,kiosk:false,challenged:admitted.challenged,confirmation:true,levels:capacity.levels});
      if(reservation.kind==='duplicate')return;
      if(reservation.kind==='refused'){
        await reserveSignupAllowance(db,`signup-refused:${admitted.networkKey}`,'hour',capacity.levels.networkRefused);
        await countSignupRefusal(db,'hosted',reservation.reason);
        if(reservation.reason==='daily-allowance'){
          await audience.recordPublicSignupRefusal(email,'Daily confirmation allowance exhausted.');return;
        }
        throw new PaidSignupCapacityError(reservation.reason,reservation.retryAfter);
      }
      const now=reservation.now;
      // Admission windows belong to D1. Consent keeps the current application
      // event clock, as do recipient opt-outs and confirmation expiry.
      const capturedAt=new Date();
      try {
        const {description,ip}=admitted;
        const captured = await audience.capturePublicSignup({contact:{email},channel:'email',brandOrLegalSender:description.sender,messageCategory:'newsletter',
          frequencyDisclosure:description.frequencyDisclosure,destinationJurisdiction:'Not provided',captureMethod:'paid-checkout',
          captureSource:new URL('/subscribe?paid=1',platform.config.publicBaseUrl).toString(),captureIp:ip,consentText:description.consentText,
          consentVersion:'newsletter-signup-v1',occurredAt:capturedAt,confirmationRequired:true,idempotencyKey:evidenceId},capturedAt);
        if(!captured){await refundSignup(db,evidenceId,now,reservation.counters);return;}
        await db.prepare("UPDATE audience_signup_requests SET status=? WHERE id=?").bind(captured?.confirmation?'sent':'failed',evidenceId).run();
      } catch {
        // An uncertain confirmation is never retried automatically.
        await db.prepare("UPDATE audience_signup_requests SET status='failed' WHERE id=?").bind(evidenceId).run();
        await audience.recordPublicSignupRefusal(email,'Paid checkout confirmation could not be established; no automatic retry.');
      }
    },
  };
}
