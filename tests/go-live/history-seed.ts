/** Thirty days of settled email history in one statement per table: `recipients` delivered recipients, one campaign
 * a day, and one campaign still dispatching whose only recipient is already delivered (a flow waiting for its next
 * step), which the Cron checks every minute. It stands for a small business's stored sends. */
export async function seedSendHistory(database: D1Database, recipients: number, now: number) {
  const days = 30, day = 86_400_000;
  const series = `WITH RECURSIVE n(i) AS (SELECT 0 UNION ALL SELECT i+1 FROM n WHERE i<${recipients - 1})`;
  await database.batch([
    database.prepare(`${series} INSERT INTO campaigns (id, state, created_at, updated_at)
      SELECT 'hist-c'||(i%${days}), 'completed', ${now}-(i%${days})*${day}, ${now}-(i%${days})*${day} FROM n WHERE i<${days}`),
    database.prepare(`${series} INSERT INTO campaign_revisions (id, campaign_id, version, state, name, email_subject, email_body, email_text, sms_body, sender_name, from_email, created_at, updated_at)
      SELECT 'hist-v'||(i%${days}), 'hist-c'||(i%${days}), 1, 'approved', 'History '||(i%${days}), 's', 'b', 't', '', 'Mango Garden', 'news@example.test', ${now}-(i%${days})*${day}, ${now}-(i%${days})*${day} FROM n WHERE i<${days}`),
    database.prepare(`${series} INSERT INTO recipient_steps (id, campaign_id, revision_id, step_id, contact_id, contact_identity_key, channel, destination, idempotency_key,
        transport_disposition, provider, send_by_at, first_attempt_at, delivered_at, created_at, updated_at)
      SELECT 'hist-r'||i, 'hist-c'||(i%${days}), 'hist-v'||(i%${days}), 'hist-s'||(i%${days}), 'hist-x'||i, 'hist-k'||i, 'email', 'u'||i||'@gmail.com', 'hist-i'||i,
        'delivered', 'sendgrid', ${now}-(i%${days})*${day}, ${now}-(i%${days})*${day}, ${now}-(i%${days})*${day}+60000, ${now}-(i%${days})*${day}, ${now}-(i%${days})*${day}+60000 FROM n`),
    database.prepare(`INSERT INTO campaigns (id, state, created_at, updated_at) VALUES ('hist-wait', 'dispatching', ${now}, ${now})`),
    database.prepare(`INSERT INTO recipient_steps (id, campaign_id, revision_id, step_id, contact_id, contact_identity_key, channel, destination, idempotency_key,
        transport_disposition, provider, send_by_at, first_attempt_at, delivered_at, created_at, updated_at)
      VALUES ('hist-wait-r', 'hist-wait', 'hist-v0', 'hist-s0', 'hist-wait-x', 'hist-wait-k', 'email', 'wait@gmail.com', 'hist-wait-i', 'delivered', 'sendgrid', ${now}, ${now}, ${now}, ${now}, ${now})`),
    database.prepare(`${series} INSERT INTO delivery_facts (id, identity_key, recipient_step_id, provider, provider_message_id, kind, provider_occurred_at, payload_digest, detail_json, created_at)
      SELECT 'hist-f'||i, 'hist-fk'||i, 'hist-r'||i, 'sendgrid', 'hist-m'||i, 'delivered', ${now}-(i%${days})*${day}+60000, 'p', '{}', ${now}-(i%${days})*${day}+60000 FROM n`),
  ]);
}
