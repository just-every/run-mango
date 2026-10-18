import seed from '../../../../seed.json' with {type:'json'};
import { canonicalEmail, canonicalPhone } from '@/core/features/audience/identity';
import { sha256 } from './digest';
import { boundPolicy } from './transport-policy';
import type { LifecycleRuntime, Channel } from './types';

/** Typed email tests require sending authority; configured destinations retain CAMP-008. */
export async function testDestinationBlock(runtime: LifecycleRuntime, channel: Channel, to: string, operatorId: string, configured: boolean, typed = false) {
  const db = runtime.platform.database.$client;
  if (typed || !configured) {
    const actor = await db.prepare("SELECT role FROM oa_operators WHERE id=? AND status='active'").bind(operatorId).first<{role:string}>();
    if (!actor || !['owner','admin','manager'].includes(actor.role)) return 'test-send-forbidden: Approval rights are required for a typed destination.';
    // The SMS transport still requires its configured test allowlist and location authority.
    if (!configured && channel === 'sms') return 'Typed SMS tests are unavailable. Use a configured SMS test destination.';
  }
  const hash = await sha256(`${runtime.platform.config.contactHashSalt}:${to}`);
  const restriction = await db.prepare(`SELECT reason FROM surviving_opt_outs o WHERE destination_hash=? AND channel=?
    AND NOT EXISTS(SELECT 1 FROM consent_evidence e WHERE e.destination=? AND e.channel=o.channel
      AND e.confirmed_at IS NOT NULL AND e.occurred_at>o.occurred_at)
    UNION ALL SELECT cause FROM contact_suppressions WHERE destination_hash=? AND channel=? LIMIT 1`).bind(hash,channel,to,hash,channel).first<{reason:string}>();
  if (restriction) return `${to}: unsubscribed or suppressed (${restriction.reason}).`;
  const identity = channel === 'email'
    ? await db.prepare(`SELECT channel_status AS status FROM contact_email_addresses WHERE email=?
      UNION ALL SELECT email_status FROM contacts WHERE email=?`).bind(to,to).all<{status:string}>()
    : await db.prepare('SELECT channel_status AS status FROM contact_phones WHERE phone_e164=?').bind(to).all<{status:string}>();
  if (identity.results.some(row => ['unsubscribed','suppressed'].includes(row.status))) return `${to}: unsubscribed or suppressed.`;
  return undefined;
}

export function testDestination(channel: Channel, value: string) {
  try { return channel === 'email' ? canonicalEmail(value) : canonicalPhone(value); } catch { return undefined; }
}

/** Atomic, installation-wide UTC-day allowance. A reservation covers a provider attempt, including uncertainty. */
export async function reserveTestSend(runtime: LifecycleRuntime, now: Date) {
  const day=now.toISOString().slice(0,10), limit=seed.limits.maxTestSendsPerDay;
  const row=await runtime.platform.database.$client.prepare(`INSERT INTO test_send_allowances(day,used) VALUES(?,1)
    ON CONFLICT(day) DO UPDATE SET used=used+1 WHERE used<? RETURNING used`).bind(day,limit).first();
  return Boolean(row);
}

/** Wait once for a near pacing slot before attempting a batch recipient. A longer hold stays a visible refusal. */
export async function waitForTestSlot(runtime: LifecycleRuntime, channel: Channel) {
  const config=runtime.platform.config;
  const provider=channel==='email'?config.mailProvider??'resend':'mobile-message';
  const credential=channel==='email'?config.mailProviderApiKey:config.modules.sms.enabled?config.modules.sms.config.providerApiKey:'';
  const policy=await boundPolicy(config.deliveryPolicies?.[provider],credential);
  const row=await runtime.platform.database.$client.prepare('SELECT next_at FROM provider_pacing WHERE scope=?')
    .bind(`${provider}:${policy?.account??'installation'}`).first<{next_at:number}>();
  const delay=Math.ceil((row?.next_at??0)-Date.now());
  if(delay>0&&delay<=5000)await new Promise(resolve=>setTimeout(resolve,delay+10));
}
