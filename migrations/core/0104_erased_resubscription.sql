-- Recreated contacts expire unless new recipient evidence is confirmed.
CREATE TABLE audience_resubscriptions (
  contact_id TEXT PRIMARY KEY NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX audience_resubscriptions_expiry ON audience_resubscriptions(expires_at);

-- Link the retained restriction to the new evidence without rewriting its reason or time.
CREATE TABLE audience_opt_out_supersessions (
  opt_out_id TEXT PRIMARY KEY NOT NULL,
  contact_id TEXT NOT NULL,
  evidence_id TEXT NOT NULL,
  confirmed_at INTEGER NOT NULL
);
CREATE INDEX audience_opt_out_supersessions_contact ON audience_opt_out_supersessions(contact_id);

CREATE TRIGGER audience_resubscriptions_insert BEFORE INSERT ON audience_resubscriptions
WHEN EXISTS(SELECT 1 FROM audience_erasures WHERE state='pending') AND NOT EXISTS(SELECT 1 FROM audience_erasure_guard WHERE value=1)
BEGIN SELECT RAISE(ABORT,'CONTACT_ERASURE_PENDING'); END;
CREATE TRIGGER audience_resubscriptions_update BEFORE UPDATE ON audience_resubscriptions
WHEN EXISTS(SELECT 1 FROM audience_erasures WHERE state='pending') AND NOT EXISTS(SELECT 1 FROM audience_erasure_guard WHERE value=1)
BEGIN SELECT RAISE(ABORT,'CONTACT_ERASURE_PENDING'); END;
CREATE TRIGGER audience_opt_out_supersessions_insert BEFORE INSERT ON audience_opt_out_supersessions
WHEN EXISTS(SELECT 1 FROM audience_erasures WHERE state='pending') AND NOT EXISTS(SELECT 1 FROM audience_erasure_guard WHERE value=1)
BEGIN SELECT RAISE(ABORT,'CONTACT_ERASURE_PENDING'); END;
CREATE TRIGGER audience_opt_out_supersessions_update BEFORE UPDATE ON audience_opt_out_supersessions
WHEN EXISTS(SELECT 1 FROM audience_erasures WHERE state='pending') AND NOT EXISTS(SELECT 1 FROM audience_erasure_guard WHERE value=1)
BEGIN SELECT RAISE(ABORT,'CONTACT_ERASURE_PENDING'); END;

-- A later restriction invalidates its previous supersession, even when written by an import.
CREATE TRIGGER audience_opt_out_supersession_reset AFTER UPDATE OF occurred_at ON surviving_opt_outs
WHEN NEW.occurred_at > OLD.occurred_at
BEGIN DELETE FROM audience_opt_out_supersessions WHERE opt_out_id=NEW.id; END;
CREATE TRIGGER audience_opt_out_supersession_delete AFTER DELETE ON surviving_opt_outs
BEGIN DELETE FROM audience_opt_out_supersessions WHERE opt_out_id=OLD.id; END;
