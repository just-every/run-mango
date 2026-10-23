-- Encrypted inbound-only connection authority is excluded from account exports.
-- Receipt identifiers/digests contain no address, payload or contact link.
CREATE TABLE review_loyalty_connections (
 app TEXT PRIMARY KEY NOT NULL CHECK(app IN ('judgeme','okendo','smile')),
 account_id TEXT NOT NULL, secret_cipher TEXT NOT NULL,
 credential_id TEXT NOT NULL REFERENCES integration_credentials(id),
 connected_by TEXT NOT NULL, connected_at INTEGER NOT NULL,
 unmatched_count INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE review_loyalty_receipts (
 id TEXT PRIMARY KEY NOT NULL, app TEXT NOT NULL, attempt_id TEXT NOT NULL,
 payload_digest TEXT NOT NULL, received_at INTEGER NOT NULL
);
CREATE TRIGGER review_loyalty_connections_erasure_insert BEFORE INSERT ON review_loyalty_connections
WHEN EXISTS(SELECT 1 FROM audience_erasures WHERE state='pending') AND NOT EXISTS(SELECT 1 FROM audience_erasure_guard WHERE value=1)
BEGIN SELECT RAISE(ABORT,'CONTACT_ERASURE_PENDING'); END;
CREATE TRIGGER review_loyalty_receipts_erasure_insert BEFORE INSERT ON review_loyalty_receipts
WHEN EXISTS(SELECT 1 FROM audience_erasures WHERE state='pending') AND NOT EXISTS(SELECT 1 FROM audience_erasure_guard WHERE value=1)
BEGIN SELECT RAISE(ABORT,'CONTACT_ERASURE_PENDING'); END;
