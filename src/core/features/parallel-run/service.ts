import {IncumbentError, mailchimp, serverPrefix} from './mailchimp';
import {activityStatement} from '@/core/features/auth/activity-record';
import {openSendingSecret, sealSendingSecret} from '../sending/secrets';
import {sha256} from '@/core/shared/ids';
import type {Platform} from '@/core/shared/platform';

type Link = {provider: string; server_prefix: string; list_id: string; secret_cipher: string; last_four: string; webhook_secret_digest: string;
  webhook_id: string | null; connected_by: string; connected_at: number; last_event_at: number | null};

/** The owner's parallel-run link to a Mailchimp audience: one key, one audience, one secret webhook. */
export function parallelRunService(platform: Platform) {
  const db = platform.database.$client, key = platform.config.sessionSigningKey, origin = platform.config.publicBaseUrl.origin;
  const read = () => db.prepare('SELECT * FROM parallel_run_links WHERE id=1').first<Link>();
  return {
    read,
    async status() {
      const link = await read();
      if (!link) return {connected: false as const};
      const counts = Object.fromEntries((await db.prepare('SELECT state,count(*) AS n FROM parallel_run_writebacks GROUP BY state').all<{state: string; n: number}>()).results.map(row => [row.state, row.n]));
      const failing = await db.prepare("SELECT last_error FROM parallel_run_writebacks WHERE state='failed' ORDER BY next_attempt_at DESC LIMIT 1").first<{last_error: string}>();
      return {connected: true as const, provider: 'mailchimp', listId: link.list_id, lastFour: link.last_four, connectedBy: link.connected_by, connectedAt: link.connected_at,
        lastEventAt: link.last_event_at, writebacks: {pending: counts.pending ?? 0, done: counts.done ?? 0, failed: counts.failed ?? 0, lastError: failing?.last_error ?? null}};
    },
    async connect(input: {apiKey: string; listId: string}, operator: {id: string; email: string}) {
      if (await read()) throw new IncumbentError('Disconnect the existing parallel run before connecting another audience.');
      const prefix = serverPrefix(input.apiKey), api = mailchimp(input.apiKey, prefix);
      const audience = await api.audience(input.listId);
      if (audience?.id !== input.listId) throw new IncumbentError('Mailchimp did not confirm that audience.');
      const secret = Array.from(crypto.getRandomValues(new Uint8Array(24)), byte => byte.toString(16).padStart(2, '0')).join('');
      const url = new URL(`/webhooks/incumbent/mailchimp/${secret}`, origin).href;
      const hook = await api.createWebhook(input.listId, url);
      if (typeof hook?.id !== 'string' || !hook.id) throw new IncumbentError('Mailchimp did not identify the webhook it created.');
      const now = Date.now();
      try {
        await db.batch([
          db.prepare('INSERT INTO parallel_run_links(id,provider,server_prefix,list_id,secret_cipher,last_four,webhook_secret_digest,webhook_id,connected_by,connected_at) VALUES(1,?,?,?,?,?,?,?,?,?)')
            .bind('mailchimp', prefix, input.listId, await sealSendingSecret({apiKey: input.apiKey}, key), input.apiKey.slice(-4), await sha256(secret), hook.id, operator.email, now),
          activityStatement(db, {key: `parallel-run-connected:${hook.id}`, action: 'parallel-run-connected', entityType: 'integration', entityId: 'mailchimp', actorId: operator.id,
            detail: {provider: 'mailchimp', audience: audience.name ?? input.listId, lastFour: input.apiKey.slice(-4), webhookId: hook.id}, at: now}),
        ]);
      } catch (error) {
        await api.deleteWebhook(input.listId, hook.id).catch(() => undefined);
        throw error;
      }
      return this.status();
    },
    async disconnect(operator: {id: string}) {
      const link = await read();
      if (!link) return {disconnected: true};
      if (link.webhook_id) {
        const api = mailchimp((await openSendingSecret(link.secret_cipher, key)).apiKey, link.server_prefix);
        try { await api.deleteWebhook(link.list_id, link.webhook_id); } catch (error) { if (!(error instanceof IncumbentError && error.status === 404)) throw error; }
      }
      await db.batch([db.prepare('DELETE FROM parallel_run_links WHERE id=1'), db.prepare('DELETE FROM parallel_run_writebacks'),
        activityStatement(db, {key: crypto.randomUUID(), action: 'parallel-run-disconnected', entityType: 'integration', entityId: 'mailchimp', actorId: operator.id})]);
      return {disconnected: true};
    },
    /** Failed writebacks start their five attempts again. */
    async retryFailed(now = Date.now()) {
      const changed = await db.prepare("UPDATE parallel_run_writebacks SET state='pending',attempts=0,next_attempt_at=?,last_error=NULL WHERE state='failed'").bind(now).run();
      return {retried: changed.meta.changes ?? 0};
    },
  };
}
