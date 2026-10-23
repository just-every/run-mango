-- Existing subscriptions retain their state; the first fresh read supersedes
-- event-second ordering. No payment or consent record is recreated.
ALTER TABLE paid_subscriptions ADD COLUMN read_started_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE commerce_receipts ADD COLUMN stripe_applied_at INTEGER;
-- The hand-off claim fences every paid-state write, including replay/restore.
CREATE TRIGGER paid_subscriptions_audience_generation_insert AFTER INSERT ON paid_subscriptions BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER paid_subscriptions_audience_generation_update AFTER UPDATE ON paid_subscriptions BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER paid_subscriptions_audience_generation_delete AFTER DELETE ON paid_subscriptions BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
