import {fixtureVerification} from './support/sender-verification';
import { sqlStatements } from '../operations/sql-statements.mjs';
import { expect, test } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

import { createDatabase } from '../src/core/platform/db/client';
import { createApprovalService } from '../src/core/features/lifecycle/approval';
import { createDeliveryService } from '../src/core/features/lifecycle/delivery';
import { createLifecycleRepository } from '../src/core/features/lifecycle/repository';
import type { DeliveryRequest, FrozenCandidate, LifecycleRuntime, ProviderFact } from '../src/core/features/lifecycle/types';
import { contract } from './contract.js';

const projectRequire = createRequire(import.meta.url);
const { Miniflare } = createRequire(projectRequire.resolve('wrangler/package.json'))('miniflare') as {
  Miniflare: new (options: Record<string, unknown>) => {
    getD1Database(name: string): Promise<D1Database>;
    dispose(): Promise<void>;
  };
};

async function applyMigrations(database: D1Database) {
  const directory = path.resolve('migrations/core');
  const migrations = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort();
  for (const migration of migrations) {
    const sql = await readFile(path.join(directory, migration), 'utf8');
    for (const statement of sqlStatements(sql)) {
      await database.prepare(statement).run();
    }
  }
}

async function seedDraft(database: D1Database, suffix: string, now: number, campaignState = 'draft', activeRevisionId?: string) {
  const campaignId = `campaign-${suffix}`;
  const revisionId = `revision-${suffix}`;
  const stepId = `step-${suffix}`;
  await database.prepare(
    `INSERT INTO campaigns (id, state, active_revision_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).bind(campaignId, campaignState, activeRevisionId ?? null, now, now).run();
  await database.prepare(
    `INSERT INTO campaign_revisions
     (id, campaign_id, version, state, name, email_subject, email_body, email_text, sms_body,
      sender_name, from_email, created_at, updated_at)
     VALUES (?, ?, 1, 'draft', 'Race proof', 'Subject', '<p>Body</p>', 'Body', '', 'Mango',
             'sender@example.test', ?, ?)`,
  ).bind(revisionId, campaignId, now, now).run();
  await database.prepare(
    `INSERT INTO campaign_steps
     (id, revision_id, sequence, channel, timezone, scheduled_at, send_by_at, created_at, updated_at)
     VALUES (?, ?, 1, 'email', 'UTC', ?, ?, ?, ?)`,
  ).bind(stepId, revisionId, now + 60_000, now + 3_600_000, now, now).run();
  return { campaignId, revisionId, stepId };
}

function candidate(id: string): FrozenCandidate {
  return {
    contactId: id,
    contactIdentityKey: id,
    channels: {
      email: {
        destination: `${id.toLowerCase()}@example.test`,
        consents: [],
      },
    },
  };
}

function createD1Miniflare(name: string) {
  return new Miniflare({
    host: '127.0.0.1',
    cf: false,
    telemetry: { enabled: false },
    workers: [{
      config: {
        name,
        type: 'worker',
        compatibilityDate: '2026-08-31',
        manifest: {
          mainModule: 'worker.js',
          modules: { 'worker.js': { type: 'esm', contents: 'export default { fetch() { return new Response("ok") } }' } },
        },
        env: { DB: { type: 'd1', id: `${name}-${crypto.randomUUID()}` } },
      },
    }],
  });
}

contract('CAMP-005', 'a losing or repeated approval cannot mutate the winning frozen audience', async () => {
  const miniflare = createD1Miniflare('approval-race');
  try {
    const binding = await miniflare.getD1Database('DB') as D1Database;
    await applyMigrations(binding);
    const repository = createLifecycleRepository(createDatabase(binding));
    const now = Date.now();

    const race = await seedDraft(binding, 'different-key', now);
    const firstSnapshot = await repository.readRevisionSnapshot(race.campaignId, race.revisionId);
    const losingSnapshot = await repository.readRevisionSnapshot(race.campaignId, race.revisionId);
    if (!firstSnapshot || !losingSnapshot) throw new Error('Expected seeded revision snapshots.');
    const evidence = fixtureVerification(binding, {mailSender:{displayName:'Mango',fromEmail:'sender@example.test',replyToEmail:'reply@example.test',physicalAddress:'1 Test Street'}});
    const senderLease = (await evidence.inspect('Mango <sender@example.test>')).lease!;
    const shared = { senderLease, operatorId: 'operator', now: new Date(), reconciliationWindowMs: { email: 60_000 } };
    const first = await repository.approve({
      ...shared, snapshot: firstSnapshot, revisionDigest: 'digest-a', idempotencyKey: 'request-a', candidates: [candidate('X')], audienceSummary: {candidateCount: 3, exclusions: {'opt-out': 2}},
    });
    const loser = await repository.approve({
      ...shared, snapshot: losingSnapshot, revisionDigest: 'digest-b', idempotencyKey: 'request-b', candidates: [candidate('X'), candidate('Y')], audienceSummary: {candidateCount: 8, exclusions: {'opt-out': 6}},
    });
    expect(first.kind).toBe('approved');
    expect(loser.kind).toBe('conflict');

    const repeated = await repository.approve({
      ...shared, snapshot: firstSnapshot, revisionDigest: 'digest-a', idempotencyKey: 'request-a', candidates: [candidate('X'), candidate('Z')], audienceSummary: {candidateCount: 9, exclusions: {'opt-out': 7}},
    });
    expect(repeated.kind).toBe('approved');
    const frozen = await binding.prepare(
      'SELECT contact_id FROM recipient_steps WHERE revision_id = ? ORDER BY contact_id',
    ).bind(race.revisionId).all<{ contact_id: string }>();
    expect(frozen.results.map((row) => row.contact_id)).toEqual(['X']);
    expect(await repository.saveDraftReview({snapshot: losingSnapshot, checks: [], now: new Date(now + 1), audience: {candidateCount: 99, eligibleCount: 99, exclusions: [], channelCounts: [{channel: 'email', recipientStepCount: 99}]}})).toBe(false);
    expect(await binding.prepare('SELECT candidate_count, excluded_count, eligible_count FROM campaign_audiences WHERE revision_id = ?').bind(race.revisionId).first()).toEqual({candidate_count: 3, excluded_count: 2, eligible_count: 1});
    expect(await binding.prepare('SELECT recipient_step_count FROM campaign_audience_channel_counts').first()).toEqual({recipient_step_count: 1});

    const edit = await seedDraft(binding, 'saved-edit', now + 10);
    const editSnapshot = await repository.readRevisionSnapshot(edit.campaignId, edit.revisionId);
    if (!editSnapshot) throw new Error('Expected edit-race snapshot.');
    await binding.prepare(
      'UPDATE campaign_revisions SET email_subject = ?, updated_at = ? WHERE id = ?',
    ).bind('Edited after checks', now + 11, edit.revisionId).run();
    const editRace = await repository.approve({
      ...shared, snapshot: editSnapshot, revisionDigest: 'stale-digest', idempotencyKey: 'request-edit', candidates: [candidate('E')],
    });
    expect(editRace.kind).toBe('conflict');

    const replacement = await seedDraft(binding, 'replacement', now + 20, 'scheduled', 'old-revision-a');
    const replacementSnapshot = await repository.readRevisionSnapshot(replacement.campaignId, replacement.revisionId);
    if (!replacementSnapshot) throw new Error('Expected replacement-race snapshot.');
    await binding.prepare(
      'UPDATE campaigns SET active_revision_id = ?, updated_at = ? WHERE id = ?',
    ).bind('old-revision-b', now + 21, replacement.campaignId).run();
    const replacementRace = await repository.approve({
      ...shared, snapshot: replacementSnapshot, revisionDigest: 'replacement-digest', idempotencyKey: 'request-replacement', candidates: [candidate('R')],
    });
    expect(replacementRace.kind).toBe('conflict');

    const residue = await binding.prepare(
      `SELECT
        (SELECT COUNT(*) FROM campaign_approval_requests WHERE idempotency_key IN ('request-edit', 'request-replacement')) approvals,
        (SELECT COUNT(*) FROM recipient_steps WHERE revision_id IN (?, ?)) recipients`,
    ).bind(edit.revisionId, replacement.revisionId).first<{ approvals: number; recipients: number }>();
    expect(residue).toEqual({ approvals: 0, recipients: 0 });
  } finally {
    await miniflare.dispose();
  }
});

test('test sends replay only an unchanged saved revision and retain separate audit facts after an edit', async () => {
  const miniflare = createD1Miniflare('test-send-revision-key');
  try {
    const binding = await miniflare.getD1Database('DB') as D1Database;
    await applyMigrations(binding);
    const now = Date.now();
    const seeded = await seedDraft(binding, 'test-send', now);
    // Sender setup is a prerequisite; this test exercises revision-bound replay.
    const mailSender = { displayName: 'Mango', fromEmail: 'sender@example.test', replyToEmail: 'reply@example.test', physicalAddress: '1 Test Street' };
    await binding.prepare('UPDATE campaign_revisions SET reply_to_email = ?, physical_address = ? WHERE id = ?')
      .bind(mailSender.replyToEmail, mailSender.physicalAddress, seeded.revisionId).run();
    const requests: DeliveryRequest[] = [];
    const sender = {
      channel: 'email' as const,
      async capabilities() {
        return {
          configured: true, canSendMarketing: true, effectiveDeduplication: true, effectiveReconciliation: true,
          deduplicationWindowMs: 86_400_000, reconciliationWindowMs: 86_400_000, detail: 'configured',
        };
      },
      async validateSender() { return { ready: true, detail: 'registered' }; },
      async send(request: DeliveryRequest) {
        requests.push(request);
        return { providerMessageId: `provider-${requests.length}`, disposition: 'accepted' as const, providerAcceptedAt: new Date(now) };
      },
      async reconcile() { return { facts: [], exhausted: true }; },
      async verifyWebhook() { throw new Error('unused'); },
    };
    const runtime = {
      platform: {
        database: createDatabase(binding),
        config: {
          publicBaseUrl: new URL('https://mango.example.test'),
          testEmailAllowlist: ['operator@example.test'],
          testSmsAllowlist: [],
          mailSender,
        },
        mailer: sender,
        sms: sender,
      },
      audience: {},
    } as unknown as LifecycleRuntime;
    const service = createApprovalService(runtime, createLifecycleRepository(runtime.platform.database));
    const input = {
      campaignId: seeded.campaignId,
      revisionId: seeded.revisionId,
      operatorId: 'operator-test',
      channel: 'email' as const,
      to: 'operator@example.test',
    };

    await expect(service.sendTest({ ...input, now: new Date(now) })).resolves.toMatchObject({ kind: 'sent' });
    await expect(service.sendTest({ ...input, now: new Date(now + 1) })).resolves.toMatchObject({ kind: 'sent' });
    expect(requests).toHaveLength(2);
    expect(requests[1].idempotencyKey).toBe(requests[0].idempotencyKey);

    await binding.prepare('UPDATE campaign_revisions SET email_body = ?, updated_at = ? WHERE id = ?')
      .bind('<p>Edited test body</p>', now + 2, seeded.revisionId).run();
    await expect(service.sendTest({ ...input, now: new Date(now + 3) })).resolves.toMatchObject({ kind: 'sent' });
    expect(requests[2].idempotencyKey).not.toBe(requests[0].idempotencyKey);

    const audit = await binding.prepare(
      "SELECT operation_key, detail_json FROM lifecycle_audit_entries WHERE action = 'test-send' ORDER BY occurred_at, operation_key",
    ).all<{ operation_key: string; detail_json: string }>();
    expect(audit.results).toHaveLength(2);
    expect(new Set(audit.results.map((row) => JSON.parse(row.detail_json).revisionDigest)).size).toBe(2);
  } finally {
    await miniflare.dispose();
  }
});

contract('SEND-001', 'persists the exact hand-off before importing replay-safe provider truth', async () => {
  const miniflare = createD1Miniflare('delivery-truth');
  try {
    const binding = await miniflare.getD1Database('DB') as D1Database;
    await applyMigrations(binding);
    const database = createDatabase(binding);
    const repository = createLifecycleRepository(database);
    const now = Date.now();
    await binding.prepare(
      `INSERT INTO campaigns (id, state, active_revision_id, created_at, updated_at)
       VALUES ('campaign-delivery', 'scheduled', 'revision-delivery', ?, ?)`,
    ).bind(now, now).run();
    await binding.prepare(
      `INSERT INTO campaign_revisions
       (id, campaign_id, version, state, name, email_subject, email_body, email_text, preheader,
        sms_body, sender_name, from_email, reply_to_email, physical_address, source_types_json,
        tracking_enabled, created_at, updated_at)
       VALUES ('revision-delivery', 'campaign-delivery', 1, 'approved', 'Delivery proof',
        'Hello {{first_name | fallback: friend}}', '<p>Offer</p><a href="{{unsubscribe_url}}">Unsubscribe</a><p>{{physical_address}}</p>',
        'Offer: {{unsubscribe_url}} — {{physical_address}}', 'A reviewed preview', '', 'Mango Store', 'sender@example.test',
        'reply@example.test', '1 Mango Way', '["cart"]', 0, ?, ?)`,
    ).bind(now, now).run();
    await binding.prepare(
      `INSERT INTO campaign_steps
       (id, revision_id, sequence, channel, timezone, scheduled_at, send_by_at, created_at, updated_at)
       VALUES ('step-delivery', 'revision-delivery', 1, 'email', 'UTC', ?, ?, ?, ?)`,
    ).bind(now - 1_000, now + 3_600_000, now, now).run();
    await binding.prepare(
      `INSERT INTO recipient_steps
       (id, campaign_id, revision_id, step_id, contact_id, contact_identity_key, channel, destination,
        idempotency_key, transport_disposition, send_by_at, created_at, updated_at)
       VALUES ('recipient-delivery', 'campaign-delivery', 'revision-delivery', 'step-delivery', 'contact-delivery',
        'identity-delivery', 'email', 'buyer@example.test', 'campaign:revision:step:identity', 'queued', ?, ?, ?)`,
    ).bind(now + 3_600_000, now, now).run();

    const evidence = fixtureVerification(binding, {mailSender:{displayName:'Mango Store',fromEmail:'sender@example.test',replyToEmail:'reply@example.test',physicalAddress:'1 Mango Way'}});
    const senderLease = (await evidence.inspect('Mango Store <sender@example.test>')).lease!;
    await binding.prepare("UPDATE campaigns SET state='draft' WHERE id='campaign-delivery'").run();
    await binding.prepare("UPDATE campaign_revisions SET state='draft' WHERE id='revision-delivery'").run();
    const approvalSnapshot = await repository.readRevisionSnapshot('campaign-delivery','revision-delivery');
    const authorization = await repository.approve({snapshot:approvalSnapshot!,senderLease,revisionDigest:'delivery-authority',operatorId:'operator',idempotencyKey:'delivery-authority',candidates:[{contactId:'contact-delivery',contactIdentityKey:'identity-delivery',channels:{email:{destination:'buyer@example.test',consents:[]}}}],now:new Date(),reconciliationWindowMs:{email:3600000}});
    expect(authorization.kind).toBe('approved');
    // Keep the original recipient row for the exact-handoff/replay assertions.
    await binding.prepare("DELETE FROM recipient_steps WHERE id<>'recipient-delivery' AND campaign_id='campaign-delivery'").run();
    const requests: DeliveryRequest[] = [];
    const unsubscribeExpiries: Date[] = [];
    const eligibilityChecks: Date[] = [];
    const retryCommands: unknown[] = [];
    const suppressions: unknown[] = [];
    const sender = {
      channel: 'email' as const,
      async capabilities() {
        return {
          configured: true, canSendMarketing: true, effectiveDeduplication: true, effectiveReconciliation: true,
          deduplicationWindowMs: 7_200_000, reconciliationWindowMs: 3_600_000, detail: 'ready', provider: 'test-provider',
        };
      },
      inspectSender: sender => evidence.inspect(sender),
      async validateSender() { return { ready: true, detail: 'registered' }; },
      async send(request: DeliveryRequest) {
        requests.push(request);
        return { providerMessageId: 'provider-message-1', disposition: 'accepted' as const, providerAcceptedAt: new Date(now + 10) };
      },
      async reconcile() { return { facts: [], exhausted: true }; },
      async verifyWebhook() { throw new Error('unused'); },
    };
    const runtime = {
      platform: {
        database,
        config: {
          publicBaseUrl: new URL('https://mango.example.test'),
          providerReconciliationIntervalMinutes: 5,
          emailHandoffsPerMinute: 100,
          smsHandoffsPerMinute: 20,
          // Use the same configured identity that supplied the sender evidence.
          mailSender: evidence.config.mailSender,
        },
        mailer: sender,
        sms: sender,
        jobs: {
          async enqueue(command: unknown) { retryCommands.push(command); },
          async retry(command: unknown) { retryCommands.push(command); },
        },
        publicTokens: {
          async issue() { return 'opaque-link-token'; },
          async digest(value: string) { return `digest:${value}`; },
          async verify() { return { id: 'token', purpose: 'link', expiresAt: new Date(now + 1_000) }; },
        },
      },
      audience: {
        async recheckHandoffEligibility(input: { now: Date }) {
          eligibilityChecks.push(input.now);
          return { eligible: true as const, contact: { contactId: 'contact-delivery', destination: 'buyer@example.test', personalisation: { first_name: 'Ari' } } };
        },
        async issueMarketingUnsubscribe(input: { expiresAt: Date }) {
          unsubscribeExpiries.push(input.expiresAt);
          return { token: 'opaque-unsubscribe-token' };
        },
        async recordProviderSuppression(input: unknown) { suppressions.push(input); },
        async recordChannelOptOut() {},
        async recordSoftBounce() {},
        async recordProviderDelivery() {},
      },
    } as unknown as LifecycleRuntime;

    const service = createDeliveryService(runtime, repository);
    await service.dispatchStep({ stepId: 'step-delivery', revisionId: 'revision-delivery', channel: 'email' });
    expect(eligibilityChecks).toHaveLength(3);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      recipientStepId: 'recipient-delivery',
      idempotencyKey: 'campaign:revision:step:identity',
      to: 'buyer@example.test',
      sender: 'Mango Store <sender@example.test>',
      content: {
        subject: 'Hello Ari',
        preheader: 'A reviewed preview',
        replyTo: 'reply@example.test',
        headers: {
          'List-Unsubscribe': '<https://mango.example.test/unsubscribe/one-click/opaque-unsubscribe-token>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      },
    });
    expect(requests[0].content.html).toContain('aria-hidden="true"');
    expect(requests[0].content.text).toContain('https://mango.example.test/unsubscribe/opaque-unsubscribe-token');
    expect(requests[0].content.text).toContain('1 Mango Way');
    expect(unsubscribeExpiries[0].getTime() - now).toBeGreaterThan(360 * 86_400_000);
    const accepted = await binding.prepare(
      'SELECT transport_disposition, provider_message_id, terminal_at, outbound_request_json FROM recipient_steps WHERE id = ?',
    ).bind('recipient-delivery').first<Record<string, unknown>>();
    expect(accepted?.transport_disposition).toBe('accepted');
    expect(accepted?.provider_message_id).toBe('provider-message-1');
    expect(accepted?.terminal_at).toBeNull();
    expect(String(accepted?.outbound_request_json)).toContain('Mango Store <sender@example.test>');
    expect(retryCommands).toHaveLength(1);

    const delivered: ProviderFact = {
      identity: 'fact-delivered', providerMessageId: 'provider-message-1', kind: 'delivered',
      occurredAt: new Date(now + 200), payloadDigest: 'digest-delivered', detail: {},
    };
    await service.importFacts('test-provider', [delivered, {
      identity: 'fact-accepted-late', providerMessageId: 'provider-message-1', kind: 'accepted',
      occurredAt: new Date(now + 300), payloadDigest: 'digest-accepted', detail: {},
    }, {
      identity: 'fact-complaint', providerMessageId: 'provider-message-1', kind: 'complained',
      occurredAt: new Date(now + 400), payloadDigest: 'digest-complaint', detail: {},
    }]);
    await service.importFacts('test-provider', [delivered]);
    const outcome = await binding.prepare(
      `SELECT transport_disposition, delivered_at, complained_at,
        (SELECT COUNT(*) FROM delivery_facts WHERE recipient_step_id = recipient_steps.id) fact_count
       FROM recipient_steps WHERE id = ?`,
    ).bind('recipient-delivery').first<Record<string, unknown>>();
    expect(outcome).toMatchObject({ transport_disposition: 'delivered', fact_count: 3 });
    expect(outcome?.delivered_at).toBe(now + 200);
    expect(outcome?.complained_at).toBe(now + 400);
    expect(suppressions).toHaveLength(1);
  } finally {
    await miniflare.dispose();
  }
});
