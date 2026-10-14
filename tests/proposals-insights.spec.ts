import { sqlStatements } from '../operations/sql-statements.mjs';
import { expect, test } from '@playwright/test';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
const root = process.cwd();

let workerSource: string;

async function buildWorker() {
  const source = `
    import { createDatabase } from './src/core/platform/db/client';
    import { createInsightsRepository } from './src/core/features/insights/repository';
    import { createProposalRepository } from './src/core/features/proposals/repository';
    export default {
      async fetch(request, env) {
        const repository = createInsightsRepository(createDatabase(env.DB));
        const proposals = createProposalRepository(createDatabase(env.DB));
        const url = new URL(request.url);
        if (url.pathname === '/seed') {
          await env.DB.batch([
            env.DB.prepare('INSERT INTO campaign_revisions (id, campaign_id, version, state, name, email_subject, email_body, email_text, sms_body, sender_name, from_email, created_at, updated_at) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
              .bind('revision-1', 'campaign-1', 'approved', 'Campaign', 'subject', '<p>body</p>', 'body', '', 'Mango', 'offers@example.test', 1, 1),
            env.DB.prepare('INSERT INTO recipient_steps (id, campaign_id, revision_id, step_id, contact_id, contact_identity_key, channel, destination, idempotency_key, transport_disposition, handed_off_at, send_by_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
              .bind('recipient-new', 'campaign-1', 'revision-1', 'step-1', 'contact-new', 'identity-new', 'email', 'new@example.test', 'new-key', 'delivered', 2000, 4000, 1, 1),
            env.DB.prepare('INSERT INTO recipient_steps (id, campaign_id, revision_id, step_id, contact_id, contact_identity_key, channel, destination, idempotency_key, transport_disposition, handed_off_at, send_by_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
              .bind('recipient-old', 'campaign-1', 'revision-1', 'step-2', 'contact-old', 'identity-old', 'email', 'old@example.test', 'old-key', 'delivered', 100, 4000, 1, 1),
            env.DB.prepare('INSERT INTO delivery_facts (id, identity_key, recipient_step_id, provider, provider_message_id, kind, provider_occurred_at, payload_digest, detail_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
              .bind('fact-new', 'fact-new', 'recipient-new', 'resend', 'message-new', 'delivered', 2001, 'digest-new', '{}', 2001),
            env.DB.prepare('INSERT INTO recipient_steps (id, campaign_id, revision_id, step_id, contact_id, contact_identity_key, channel, destination, idempotency_key, transport_disposition, handed_off_at, send_by_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
              .bind('recipient-failed-old', 'campaign-1', 'revision-1', 'step-3', 'contact-failed-old', 'identity-failed-old', 'email', 'failed-old@example.test', 'failed-old-key', 'failed', 100, 4000, 1, 100),
            env.DB.prepare('INSERT INTO delivery_facts (id, identity_key, recipient_step_id, provider, provider_message_id, kind, provider_occurred_at, payload_digest, detail_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
              .bind('fact-old', 'fact-old', 'recipient-old', 'resend', 'message-old', 'delivered', 101, 'digest-old', '{}', 2001),
            env.DB.prepare('INSERT INTO attribution_facts (id, order_source_record_id, campaign_id, recipient_step_id, click_fact_id, attribution_window_days, gross_amount_minor, refund_amount_minor, currency, attributed_at, updated_at, created_at) VALUES (?, ?, ?, ?, ?, 7, ?, 0, ?, ?, ?, ?)')
              .bind('attribution-usd', 'order-usd', 'campaign-1', 'recipient-new', 'click-usd', 1_000, 'USD', 2000, 2000, 2000),
            env.DB.prepare('INSERT INTO attribution_facts (id, order_source_record_id, campaign_id, recipient_step_id, click_fact_id, attribution_window_days, gross_amount_minor, refund_amount_minor, currency, attributed_at, updated_at, created_at) VALUES (?, ?, ?, ?, ?, 7, ?, 0, ?, ?, ?, ?)')
              .bind('attribution-aud', 'order-aud', 'campaign-1', 'recipient-new', 'click-aud', 2_000, 'AUD', 2000, 2000, 2000),
            env.DB.prepare('INSERT INTO external_cost_facts (id, campaign_id, provider, operation, model_or_channel, billable_units, reported_cost_micros, currency, occurred_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
              .bind('cost-usd', 'campaign-1', 'resend', 'handoff', 'email', 1, 10, 'USD', 2000, 2000),
            env.DB.prepare('INSERT INTO external_cost_facts (id, campaign_id, provider, operation, model_or_channel, billable_units, reported_cost_micros, currency, occurred_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
              .bind('cost-gbp', 'campaign-1', 'resend', 'handoff', 'email', 2, 20, 'GBP', 2000, 2000),
            env.DB.prepare('INSERT INTO proposals (id, state, title, summary, evidence, audience_rule, source_data_as_of, send_by_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
              .bind('proposal-due', 'proposed', 'Due proposal', '', '[]', '', 1, 2000, 1, 1),
          ]);
          return new Response(null, { status: 204 });
        }
        if (url.pathname === '/failed-generation') {
          await proposals.saveFailure({
            proposalId: 'proposal-failed', evidence: [{ key: 'order-1', sourceRecordId: 'source-order-1', sourceType: 'order', observedValue: { totalMinor: 1_000 }, occurredAt: new Date(2000) }],
            error: 'invalid_ai_output', now: new Date(3000), sendByAt: new Date(4000),
            generation: { provider: 'openai', model: 'model-test', billableUnits: 42, reportedCostMicros: 12, currency: 'USD' },
          });
          return new Response(null, { status: 204 });
        }
        if (url.pathname === '/expire') return Response.json({ expired: await proposals.expireDue(new Date(3000)) });
        if (url.pathname === '/proposal-transition') return Response.json(await env.DB.prepare('SELECT proposal_id, from_state, to_state, actor_id, occurred_at FROM proposal_transitions WHERE proposal_id = ?').bind('proposal-due').first());
        if (url.pathname === '/failed-generation-cost') return Response.json(await env.DB.prepare('SELECT proposal_id, provider, operation, model_or_channel, billable_units, reported_cost_micros, currency FROM external_cost_facts WHERE proposal_id = ?').bind('proposal-failed').first());
        if (url.pathname === '/invalid-cost') {
          try {
            await repository.recordExternalCost({ provider: 'resend', operation: 'handoff', modelOrChannel: 'email', billableUnits: -1, reportedCostMicros: 1, currency: 'usd', occurredAt: new Date(3000) });
          } catch (error) {
            return Response.json({ error: error instanceof Error ? error.message : 'unknown' }, { status: 400 });
          }
          return new Response('accepted invalid cost', { status: 500 });
        }
        if (url.pathname === '/campaign') return Response.json(await repository.campaignResult('campaign-1'));
        if (url.pathname === '/late-bounce') {
          await env.DB.batch([
            env.DB.prepare('INSERT INTO delivery_facts (id, identity_key, recipient_step_id, provider, provider_message_id, kind, provider_occurred_at, payload_digest, detail_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
              .bind('fact-late-bounce', 'fact-late-bounce', 'recipient-old', 'resend', 'message-old', 'bounced', 2002, 'digest-late-bounce', '{"hard":1}', 3000),
            env.DB.prepare("UPDATE recipient_steps SET transport_disposition='bounced', bounced_at=2002, updated_at=3000 WHERE id='recipient-old'"),
          ]);
          return new Response(null, {status:204});
        }
        if (url.pathname === '/deliverability') return Response.json(await repository.deliverability(new Date(Number(url.searchParams.get('since')??1500))));
        return new Response('not found', { status: 404 });
      },
    };
  `;
  const result = await build({
    stdin: { contents: source, resolveDir: root, sourcefile: 'proposal-insights-worker.ts', loader: 'ts' },
    alias: { '@': path.join(root, 'src') }, external: ['node:*'], bundle: true, format: 'esm', platform: 'browser', write: false, logLevel: 'silent',
  });
  return result.outputFiles[0].text;
}

async function insightsWorker() {
  const worker = new Miniflare({
    workers: [{
      config: {
        name: 'proposal-insights', type: 'worker', compatibilityDate: '2026-08-31', compatibilityFlags: ['nodejs_compat'],
        manifest: { mainModule: 'worker.js', modules: { 'worker.js': { type: 'esm', contents: workerSource } } },
        env: { DB: { type: 'd1', id: `proposal-insights-${crypto.randomUUID()}` } },
      },
    }],
  });
  const database = await worker.getD1Database('DB');
  const migrations = (await fs.readdir(path.join(root, 'migrations/core'))).filter((file) => file.endsWith('.sql')).sort();
  for (const migration of migrations) {
    const sql = await fs.readFile(path.join(root, 'migrations/core', migration), 'utf8');
    for (const statement of sqlStatements(sql)) await database.prepare(statement).run();
  }
  return worker;
}

async function request(worker: InstanceType<typeof Miniflare>, pathname: string) {
  const response = await worker.dispatchFetch(`http://insights.test${pathname}`);
  return { response, body: response.status === 204 ? undefined : await response.json() };
}

test.describe('insights facts on Worker D1', () => {
  test.beforeAll(async () => { workerSource = await buildWorker(); });

  test('keeps historical reporting currencies and provider windows separate', async () => {
    const worker = await insightsWorker();
    try {
      expect((await request(worker, '/seed')).response.status).toBe(204);

      const result = await request(worker, '/campaign');
      expect(result.body.attribution).toMatchObject({
        orders: 2,
        revenueByCurrency: [
          { currency: 'AUD', orders: 1, amountMinor: 2_000 },
          { currency: 'USD', orders: 1, amountMinor: 1_000 },
        ],
      });
      expect(result.body.costs).toEqual(expect.arrayContaining([
        expect.objectContaining({ provider: 'resend', modelOrChannel: 'email', currency: 'GBP', billableUnits: 2, reportedCostMicros: 20 }),
        expect.objectContaining({ provider: 'resend', modelOrChannel: 'email', currency: 'USD', billableUnits: 1, reportedCostMicros: 10 }),
      ]));

      const deliverability = await request(worker, '/deliverability');
      expect(deliverability.body).toEqual([
        expect.objectContaining({ channel: 'email', sender: 'example.test', delivered: 1, bounced: 0, failed: 0, attempted: 1 }),
      ]);
      expect((await request(worker, '/deliverability?since=0')).body).toEqual([
        expect.objectContaining({delivered:2,bounced:0,failed:1,attempted:3}),
      ]);
      // Provider occurrence defines the outcome window, independently of the
      // older handoff and later ingestion. Historical failures stay outside it.
      expect((await request(worker, '/late-bounce')).response.status).toBe(204);
      expect((await request(worker, '/deliverability')).body).toEqual([
        expect.objectContaining({ channel:'email',sender:'example.test',delivered:1,bounced:1,hardBounced:1,failed:0,attempted:1 }),
      ]);
      // Both provider outcomes remain observable after their attempts leave
      // the window. An absent denominator cannot turn a real bounce into 0%.
      expect((await request(worker, '/deliverability?since=2001')).body).toEqual([
        expect.objectContaining({delivered:1,bounced:1,hardBounced:1,complained:0,failed:0,attempted:0,hardBounceRate:null,complaintRate:0}),
      ]);
      expect((await request(worker, '/deliverability?since=2500')).body).toEqual([]);

      expect((await request(worker, '/expire')).body).toEqual({ expired: 1 });
      expect((await request(worker, '/proposal-transition')).body).toEqual({
        proposal_id: 'proposal-due', from_state: 'proposed', to_state: 'expired',
        actor_id: 'system:send-by-deadline', occurred_at: 3000,
      });

      expect((await request(worker, '/failed-generation')).response.status).toBe(204);
      expect((await request(worker, '/failed-generation-cost')).body).toEqual({
        proposal_id: 'proposal-failed', provider: 'openai', operation: 'ai-proposal-generation',
        model_or_channel: 'model-test', billable_units: 42, reported_cost_micros: 12, currency: 'USD',
      });
      const invalidCost = await request(worker, '/invalid-cost');
      expect(invalidCost.response.status).toBe(400);
      expect(invalidCost.body).toEqual({ error: 'External cost billable units must be a non-negative safe integer.' });
    } finally {
      await worker.dispose();
    }
  });
});
