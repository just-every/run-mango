-- Cloudflare D1 bills rows read, so scheduled and polled work must cost the same on day 300 as on day 3.
-- Campaign completion and reconciliation look recipients up by campaign and by unresolved state.
CREATE INDEX recipient_steps_campaign_idx ON recipient_steps(campaign_id, transport_disposition);
-- Sender reputation windows start from first handoff time.
CREATE INDEX recipient_steps_first_attempt_idx ON recipient_steps(first_attempt_at);
-- The minute sweep queues each unresolved recipient's provider lookup once per reconciliation interval.
ALTER TABLE recipient_steps ADD COLUMN reconcile_queued_at INTEGER NOT NULL DEFAULT 0;
CREATE INDEX recipient_steps_unresolved_idx ON recipient_steps(reconcile_queued_at, updated_at)
  WHERE transport_disposition IN ('handoff-unknown', 'handed-off', 'accepted');
-- The compliance report lists each sender address once, by skipping through this index.
CREATE INDEX campaign_revisions_from_idx ON campaign_revisions(from_email);
-- Unsubscribe processing measurements read tokens by when they were used.
CREATE INDEX public_action_tokens_used_idx ON public_action_tokens(purpose, used_at);
-- Which From domains have ever had signed provider outcomes, kept as facts arrive instead of rediscovered by scanning them.
CREATE TABLE delivery_outcome_providers (
  domain TEXT NOT NULL,
  provider TEXT NOT NULL,
  PRIMARY KEY (domain, provider)
) WITHOUT ROWID;
INSERT OR IGNORE INTO delivery_outcome_providers (domain, provider)
  SELECT DISTINCT lower(substr(v.from_email, instr(v.from_email, '@') + 1)), f.provider
  FROM delivery_facts f JOIN recipient_steps r ON r.id = f.recipient_step_id JOIN campaign_revisions v ON v.id = r.revision_id
  WHERE r.channel = 'email' AND f.kind IN ('delivered', 'bounced', 'complained', 'failed');
CREATE TRIGGER delivery_outcome_provider_seen AFTER INSERT ON delivery_facts WHEN NEW.kind IN ('delivered', 'bounced', 'complained', 'failed') BEGIN
  INSERT OR IGNORE INTO delivery_outcome_providers (domain, provider)
    SELECT lower(substr(v.from_email, instr(v.from_email, '@') + 1)), NEW.provider
    FROM recipient_steps r JOIN campaign_revisions v ON v.id = r.revision_id
    WHERE r.id = NEW.recipient_step_id AND r.channel = 'email';
END;
