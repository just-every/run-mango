import { expect } from '@playwright/test';
import { authoringRuntime } from '../campaign-authoring/browser-runtime.mjs';
import { providerEdge } from './edge';
import { eventSigner } from './sendgrid-events';

export const publicOrigin = 'https://mango.example.test';
export const sender = { displayName: 'Mango Garden', fromEmail: 'news@example.test', replyToEmail: 'reply@example.test',
  physicalAddress: '12 Market Lane, Brisbane QLD 4000, Australia' };
export const consent = { channel: 'email', brandOrLegalSender: 'Mango Garden', messageCategory: 'newsletter', frequencyDisclosure: 'Monthly',
  destinationJurisdiction: 'AU', captureMethod: 'operator-entry', captureSource: 'Market stall sign-up sheet', consentText: 'Send me the Mango Garden letter.', consentVersion: 'v1' };

type Edge = Awaited<ReturnType<typeof providerEdge>>;
type Signer = ReturnType<typeof eventSigner>;

/** One Mango installation: the Vite/D1 runtime, its owner session and the shared provider edge. */
export async function installation(edge: Edge, signer: Signer, options: { managed?: 'none' | 'connected'; origin?: string; providerKey?: string; token?: string; stateDirectory?: string; restore?: boolean; parallelQueue?: boolean; commerce?: boolean; sms?: boolean | 'missing-retention'; smsPolicyAt?:number; mailProvider?:'sendgrid'|'resend'; resendCoverage?:'complete'|'missing' } = {}) {
  const smsPolicyAt=options.smsPolicyAt??Date.now();
  const runtime = await authoringRuntime({ suite: 'go-live', fixtureWorker: 'tests/go-live/worker.ts', startupTimeout: 180000,
    token: options.token, stateDirectory: options.stateDirectory, parallelQueue: options.parallelQueue, vars: { GO_LIVE_MANAGED: options.managed ?? '', GO_LIVE_SMS_POLICY_AT: String(smsPolicyAt), GO_LIVE_MAIL_PROVIDER: options.mailProvider??'sendgrid', GO_LIVE_RESEND_COVERAGE: options.resendCoverage??'complete', GO_LIVE_EDGE_ORIGIN: edge.origin, GO_LIVE_WEBHOOK_KEY: signer.publicKey,
      GO_LIVE_PUBLIC_ORIGIN: options.origin ?? publicOrigin, GO_LIVE_PROVIDER_KEY: options.providerKey ?? 'go-live-provider-key',
      GO_LIVE_COMMERCE: options.commerce ? '1' : '0', GO_LIVE_SMS: options.sms === true ? '1' : options.sms === 'missing-retention' ? 'missing-retention' : '0', GO_LIVE_DKIM_KEY: edge.dkimKey, MANGO_RESTORE_MODE: options.restore ? '1' : '0' } });
  const origin = options.origin ?? publicOrigin;
  const control = async (path: string, body: unknown = {}) => {
    const response = await fetch(runtime.url + path, { method: 'POST', headers: { 'X-Test-Token': runtime.token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    expect(response.status, `${path}: ${await response.clone().text()}`).toBe(200);
    return response.json();
  };
  const rows = (sql: string) => control('/_golive/rows', { sql }) as Promise<Array<Record<string, any>>>;
  const count = async (table: string) => Number((await rows(`SELECT count(*) AS n FROM ${table}`))[0].n);
  const open = async (email = 'owner@example.test', id = 'go-live-owner') => `${options.managed ? '__Host-operator_session' : 'operator_session_local'}=${(await control('/_golive/open', { email, id })).token}`;
  const call = async (path: string, init: { method?: string; body?: unknown; cookie?: string; headers?: Record<string, string>; raw?: BodyInit } = {}) => fetch(runtime.url + path, {
    method: init.method ?? 'GET', redirect: 'manual', headers: { Origin: origin, ...(init.cookie ? { Cookie: init.cookie } : {}),
      ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }), ...init.headers },
    body: init.raw ?? (init.body === undefined ? undefined : JSON.stringify(init.body)) });
  return { runtime, control, rows, count, open, call, origin,
    /** The installation's public HTTPS link, reached at this runtime. */
    local: (link: string) => { const url = new URL(link); expect(url.origin).toBe(origin); return runtime.url + url.pathname + url.search; } };
}
export type Installation = Awaited<ReturnType<typeof installation>>;

export async function json(response: Response, status: number) {
  const text = await response.text();
  expect(response.status, text).toBe(status);
  return text ? JSON.parse(text) : null;
}

/** Operator-entered consent, confirmed by the contact through the emailed link (confirmed opt-in). */
export async function confirmedContact(site: Installation, edge: Edge, cookie: string, email: string, displayName: string) {
  await availableTransport(site);
  const clock=await site.control('/_golive/clock');
  await json(await site.call('/api/contacts/consent', { method: 'POST', cookie, body: { ...consent, contact: { email, displayName }, occurredAt: new Date(clock.now).toISOString() } }), 201);
  const message = edge.sends.findLast(send => send.to === email && send.body.subject === 'Confirm your Mango Garden subscription');
  const link = /https:\/\/\S+\/consent\/confirm\/\S+/.exec(message!.body.content.find((part: any) => part.type === 'text/plain').value)![0];
  expect((await fetch(site.local(link), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'confirm=true' })).status).toBe(200);
  return link;
}

export function rule(emails: string[]) {
  return JSON.stringify({ version: 1, operator: 'any', predicates: emails.map(value => ({ sourceType: 'contact', field: 'email', comparator: 'eq', value })) });
}

export async function draftCampaign(site: Installation, cookie: string, name: string, emails: string[], scheduledAt: Date) {
  const { campaignId, revisionId } = await json(await site.call('/api/campaigns', { method: 'POST', cookie, body: {} }), 201);
  await json(await site.call(`/api/campaign-revisions/${revisionId}`, { method: 'PATCH', cookie, body: {
    name, emailSubject: `${name}: what is growing this month`, preheader: 'Seeds, beds and a spring market',
    emailBody: '<p>The spring beds are in. Come and see us at the market.</p>', audienceRule: 'Named contacts',
    inclusionRuleJson: rule(emails), exclusionRulesJson: '[]', messageCategory: 'newsletter',
    steps: [{ channel: 'email', timezone: 'Australia/Brisbane', scheduledAt: scheduledAt.toISOString(),
      sendByAt: new Date(scheduledAt.getTime() + 2 * 3600_000).toISOString(), whyThisTime: 'Owner chose this time' }] } }), 200);
  return { campaignId, revisionId };
}

export async function approve(site: Installation, cookie: string, campaign: { campaignId: string; revisionId: string }) {
  return json(await site.call(`/api/campaigns/${campaign.campaignId}/approve`, { method: 'POST', cookie,
    body: { revisionId: campaign.revisionId, idempotencyKey: `approve-${campaign.revisionId}` } }), 200);
}

/** Runs the scheduled handler once the step is due, then waits for the queue consumer to settle every recipient. */
export async function dispatch(site: Installation, campaignId: string, due: Date, stepId?:string) {
  const step=stepId ? ` AND step_id='${stepId}'` : '';
  while ((await site.control('/_golive/clock')).now <= due.getTime()) await new Promise(resolve => setTimeout(resolve, 250));
  await site.control('/_golive/cron');
  let deliveryState:unknown;
  try {
    await expect.poll(async () => {
      const rows=await site.rows(`SELECT id,transport_disposition,skip_reason,last_error_code,last_error_detail,next_attempt_at,lease_expires_at FROM recipient_steps WHERE campaign_id='${campaignId}'${step}`);
      deliveryState=rows;
      return rows.filter(row=>row.transport_disposition==='queued').length;
    },{ timeout: 60000, intervals: [250] }).toBe(0);
  } catch(error) {throw new Error(`Native delivery did not settle: ${JSON.stringify(deliveryState)}`,{cause:error});}
  return site.rows(`SELECT id, destination AS email, transport_disposition, skip_reason, provider_message_id FROM recipient_steps
    WHERE campaign_id='${campaignId}'${step} ORDER BY destination`);
}

export async function signedPost(site: Installation, path: string, body: Buffer, headers: Record<string, string>) {
  return (await fetch(site.runtime.url + path, { method: 'POST', headers, body })).status;
}

/** Wait for the actual persisted account budget, never grant a test bypass. */
export async function availableTransport(site:Installation) {
  const [rows,clock]=await Promise.all([site.rows('SELECT MAX(next_at) AS due FROM provider_pacing'),site.control('/_golive/clock')]);
  const delay=Number(rows[0]?.due??0)-clock.now;
  if(delay>0)await new Promise(resolve=>setTimeout(resolve,Math.ceil(delay)+20));
}
