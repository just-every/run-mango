import {fixtureVerification} from '../support/sender-verification';
// Task-owned synthetic adapters. This module is never selected by production.
import { createFixturePlatform } from '../support/local-platform';
import type { LocalAppBindings } from '../support/fixture-app';
import type { SenderAdapter } from '../../src/core/shared/platform';

// `origin` is the running review's own origin. The Worker takes it from
// MANGO_REVIEW_BASE_URL, which scripts/start-synthetic-review.mjs writes and a
// developer's .dev.vars never defines: that file (from `rer setup`) sets
// AUTH_ORIGIN for `rer dev`, overrides wrangler [vars], and local format 2
// derives the public origin from RER_DEV_ORIGIN before AUTH_ORIGIN.
export function syntheticReviewPlatform(bindings: LocalAppBindings, origin?: string) {
  const platform = createFixturePlatform(origin ? {...bindings, MANGO_PUBLIC_BASE_URL: origin, RER_DEV_ORIGIN: origin} : bindings, bindings.LOCAL_BOOTSTRAP_TOKEN);
  platform.config.mailSender = {displayName: 'Synthetic Mango', fromEmail: 'offers@example.test', replyToEmail: 'support@example.test', physicalAddress: '1 Synthetic Street'};
  platform.config.allowedLinkHosts = ['example.test'];
  platform.commerce = {
    capabilities: () => ({provider: 'task-synthetic', sourceTypes: ['customer'], detail: 'Task-owned synthetic customer pages; no real commerce connection.'}),
    async synchronize(type, cursor) {
      await bindings.DB.prepare('CREATE TABLE IF NOT EXISTS task_review_sync_control (id INTEGER PRIMARY KEY, fail_second INTEGER NOT NULL)').run();
      await bindings.DB.prepare('CREATE TABLE IF NOT EXISTS task_review_sync_calls (id INTEGER PRIMARY KEY AUTOINCREMENT, cursor TEXT, created_at INTEGER NOT NULL)').run();
      await bindings.DB.prepare('INSERT INTO task_review_sync_calls (cursor, created_at) VALUES (?, ?)').bind(cursor ?? null, Date.now()).run();
      const control = await bindings.DB.prepare('SELECT fail_second FROM task_review_sync_control WHERE id = 1').first<{fail_second: number}>();
      if (cursor && control?.fail_second) throw new Error('Synthetic second page unavailable. Saved progress is retained; resume after recovery.');
      const names = cursor ? ['opted-out', 'no-consent'] : ['subscribed'];
      return {records: names.map(name => ({sourceType: type, sourceId: `review-${name}`, occurredAt: new Date(), payload: {email: `${name}@example.test`, segment: 'synthetic-review', state: 'observed'}})), nextCursor: cursor ? undefined : 'second-page'};
    },
    async verifyWebhook() {throw new Error('Synthetic review has no commerce webhooks.');},
  };
  const evidence = fixtureVerification(bindings.DB, platform.config);
  function sender(channel: 'email' | 'sms'): SenderAdapter {
    return {
      channel,
      async capabilities() {return {configured: true, canSendMarketing: true, effectiveDeduplication: true, effectiveReconciliation: true, deduplicationWindowMs: 7 * 86400000, reconciliationWindowMs: 7 * 86400000, authentication: {spf: true, dkim: true, dmarc: true, aligned: true}, detail: 'Synthetic approval checks only. Sending is disabled.'};},
      inspectSender: sender => evidence.inspect(sender),
      async validateSender() {return {ready: true, detail: 'Synthetic sender validation only; no DNS or registration claim.'};},
      async send() {throw new Error('Marketing sends are disabled in the task-owned synthetic review.');},
      async reconcile() {return {facts: [], exhausted: true};},
      async verifyWebhook() {throw new Error('Synthetic review has no provider webhooks.');},
    };
  }
  platform.mailer = sender('email');
  platform.sms = sender('sms');
  platform.linkInspector = {async inspect(url) {return {ok: url.startsWith('https://example.test/'), finalUrl: url, detail: 'Synthetic URL fixture; no network request.'};}};
  // An approval may freeze and schedule local recipients, but no dispatch job
  // is handed to a provider or reported delivered.
  platform.jobs = {async enqueue() {}, async retry() {throw new Error('Synthetic review does not dispatch jobs.');}};
  return platform;
}
