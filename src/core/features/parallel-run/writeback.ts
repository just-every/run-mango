import {IncumbentError, mailchimp} from './mailchimp';
import {openSendingSecret} from '../sending/secrets';
import type {Platform} from '@/core/shared/platform';

/** Transient failures retry five times over an hour; the fifth failure stays visible as failed. */
export const retryDelaysMs = [60_000, 300_000, 600_000, 900_000, 1_740_000];
export const echoWindowMs = 600_000;

type Link = {list_id: string; server_prefix: string; secret_cipher: string; connected_at: number};
type Due = {contact_id: string; attempts: number};

/**
 * Mango's own restrictions reach the incumbent audience. Every contact whose email channel is unsubscribed
 * or suppressed since the link began is queued once per status change, whatever recorded it (link,
 * one-click, preference, operator, import, merge, suppression). A change the incumbent itself reported is
 * queued already done, so nothing echoes back.
 */
export async function runWriteback(platform: Platform, now = Date.now()) {
  const db = platform.database.$client;
  const link = await db.prepare('SELECT list_id,server_prefix,secret_cipher,connected_at FROM parallel_run_links WHERE id=1').first<Link>();
  if (!link) return {written: 0, failed: 0};
  await db.prepare(`INSERT INTO parallel_run_writebacks(contact_id,status_at,origin,state,attempts,next_attempt_at)
    SELECT id,email_status_at,'mango','pending',0,? FROM contacts WHERE email_status IN ('unsubscribed','suppressed') AND email_status_at>=?
    ON CONFLICT(contact_id) DO UPDATE SET status_at=excluded.status_at,origin='mango',state='pending',attempts=0,next_attempt_at=excluded.next_attempt_at,
      written_at=NULL,echoed_at=NULL,last_error=NULL WHERE parallel_run_writebacks.status_at<excluded.status_at`).bind(now, link.connected_at).run();
  const due = (await db.prepare("SELECT contact_id,attempts FROM parallel_run_writebacks WHERE state='pending' AND next_attempt_at<=? ORDER BY next_attempt_at LIMIT 50").bind(now).all<Due>()).results;
  if (!due.length) return {written: 0, failed: 0};
  const api = mailchimp((await openSendingSecret(link.secret_cipher, platform.config.sessionSigningKey)).apiKey, link.server_prefix);
  let written = 0, failed = 0;
  for (const item of due) {
    const addresses = (await db.prepare(`SELECT email FROM contact_email_addresses WHERE contact_id=? AND channel_status IN ('unsubscribed','suppressed')`)
      .bind(item.contact_id).all<{email: string}>()).results;
    try {
      for (const {email} of addresses) {
        try { await api.unsubscribeMember(link.list_id, email); }
        catch (error) { if (!(error instanceof IncumbentError && error.status === 404)) throw error; } // The audience does not hold this address.
      }
      await db.prepare("UPDATE parallel_run_writebacks SET state='done',written_at=?,last_error=NULL WHERE contact_id=? AND state='pending'").bind(now, item.contact_id).run();
      written++;
    } catch (error) {
      const reason = error instanceof IncumbentError ? error.reason : 'The writeback could not complete.';
      const retry = error instanceof IncumbentError && error.transient && item.attempts < retryDelaysMs.length;
      await db.prepare('UPDATE parallel_run_writebacks SET state=?,attempts=attempts+1,next_attempt_at=?,last_error=? WHERE contact_id=?')
        .bind(retry ? 'pending' : 'failed', now + (retryDelaysMs[item.attempts] ?? 0), reason, item.contact_id).run();
      if (!retry) failed++;
    }
  }
  return {written, failed};
}
