import { sqlStatements } from '../operations/sql-statements.mjs';
// The test uses real D1 statements because cancellation is a single atomic batch.
import { expect, test } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

import { createDatabase } from '../src/core/platform/db/client';
import { createLifecycleRepository } from '../src/core/features/lifecycle/repository';
import { contract } from './contract.js';

const projectRequire = createRequire(import.meta.url);
const { Miniflare } = createRequire(projectRequire.resolve('wrangler/package.json'))('miniflare') as {
  Miniflare: new (options: Record<string, unknown>) => {
    getD1Database(name: string): Promise<D1Database>;
    dispose(): Promise<void>;
  };
};

async function applyMigrations(database: D1Database) {
  for (const migration of (await readdir(path.resolve('migrations/core'))).filter((name) => name.endsWith('.sql')).sort()) {
    for (const statement of sqlStatements((await readFile(path.resolve('migrations/core', migration), 'utf8')))) {
      await database.prepare(statement).run();
    }
  }
}

contract('CAMP-009', 'cancellation atomically stops queued recipients while preserving uncertain handoffs for reconciliation', async () => {
  const miniflare = new Miniflare({
    host: '127.0.0.1',
    cf: false,
    telemetry: { enabled: false },
    workers: [{
      config: {
        name: 'cancellation-proof', type: 'worker', compatibilityDate: '2026-08-31',
        manifest: { mainModule: 'worker.js', modules: { 'worker.js': { type: 'esm', contents: 'export default { fetch() { return new Response("ok") } }' } } },
        env: { DB: { type: 'd1', id: `cancellation-${crypto.randomUUID()}` } },
      },
    }],
  });
  try {
    const binding = await miniflare.getD1Database('DB');
    await applyMigrations(binding);
    const now = Date.now();
    await binding.prepare(`INSERT INTO campaigns (id, state, active_revision_id, created_at, updated_at)
      VALUES ('campaign-cancel', 'scheduled', 'revision-cancel', ?, ?)`).bind(now, now).run();
    for (const [id, disposition, handoffStartedAt, leaseToken] of [
      ['queued-recipient', 'queued', null, null],
      ['unknown-recipient', 'handoff-unknown', now - 1_000, 'lease-in-flight'],
    ]) {
      await binding.prepare(`INSERT INTO recipient_steps
        (id, campaign_id, revision_id, step_id, contact_id, contact_identity_key, channel, destination,
         idempotency_key, transport_disposition, attempt_count, handoff_started_at, lease_token, lease_expires_at,
         send_by_at, created_at, updated_at)
        VALUES (?, 'campaign-cancel', 'revision-cancel', 'step-cancel', ?, ?, 'email', ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
      ).bind(id, `contact-${id}`, `identity-${id}`, `${id}@example.test`, `key-${id}`, disposition,
        handoffStartedAt, leaseToken, leaseToken ? now + 60_000 : null, now + 3_600_000, now, now).run();
    }

    const repository = createLifecycleRepository(createDatabase(binding));
    await expect(repository.cancelCampaign('campaign-cancel', 'operator-cancel', new Date(now))).resolves.toBe(true);
    const campaign = await binding.prepare('SELECT state, cancelled_at FROM campaigns WHERE id = ?').bind('campaign-cancel').first<Record<string, unknown>>();
    const recipients = await binding.prepare(
      'SELECT id, transport_disposition, skip_reason, terminal_at, lease_token FROM recipient_steps ORDER BY id',
    ).all<Record<string, unknown>>();

    expect(campaign).toEqual({ state: 'cancelled', cancelled_at: now });
    expect(recipients.results).toEqual([
      { id: 'queued-recipient', transport_disposition: 'skipped', skip_reason: 'campaign-cancelled', terminal_at: now, lease_token: null },
      { id: 'unknown-recipient', transport_disposition: 'handoff-unknown', skip_reason: null, terminal_at: null, lease_token: 'lease-in-flight' },
    ]);
  } finally {
    await miniflare.dispose();
  }
});
