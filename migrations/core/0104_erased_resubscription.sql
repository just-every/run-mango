-- New requests own only their freshly recreated person until confirmation.
CREATE TABLE audience_reconsent_contacts (
 contact_id TEXT PRIMARY KEY NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX audience_reconsent_expiry ON audience_reconsent_contacts(expires_at);
-- The retained restriction stays byte-for-byte; its replacement authority is separate.
CREATE TABLE audience_opt_out_supersessions (
 opt_out_id TEXT PRIMARY KEY NOT NULL,
 evidence_id TEXT NOT NULL,
 confirmed_at INTEGER NOT NULL
);
CREATE TRIGGER audience_reconsent_pending_insert BEFORE INSERT ON audience_reconsent_contacts
WHEN EXISTS(SELECT 1 FROM audience_erasures WHERE state='pending') AND NOT EXISTS(SELECT 1 FROM audience_erasure_guard WHERE value=1)
BEGIN SELECT RAISE(ABORT,'CONTACT_ERASURE_PENDING'); END;
CREATE TRIGGER audience_reconsent_pending_update BEFORE UPDATE ON audience_reconsent_contacts
WHEN EXISTS(SELECT 1 FROM audience_erasures WHERE state='pending') AND NOT EXISTS(SELECT 1 FROM audience_erasure_guard WHERE value=1)
BEGIN SELECT RAISE(ABORT,'CONTACT_ERASURE_PENDING'); END;
CREATE TRIGGER audience_supersessions_pending_insert BEFORE INSERT ON audience_opt_out_supersessions
WHEN EXISTS(SELECT 1 FROM audience_erasures WHERE state='pending') AND NOT EXISTS(SELECT 1 FROM audience_erasure_guard WHERE value=1)
BEGIN SELECT RAISE(ABORT,'CONTACT_ERASURE_PENDING'); END;
CREATE TRIGGER audience_supersessions_pending_update BEFORE UPDATE ON audience_opt_out_supersessions
WHEN EXISTS(SELECT 1 FROM audience_erasures WHERE state='pending') AND NOT EXISTS(SELECT 1 FROM audience_erasure_guard WHERE value=1)
BEGIN SELECT RAISE(ABORT,'CONTACT_ERASURE_PENDING'); END;
