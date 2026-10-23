-- Operator-only reminder claims survive replay. No contact identities or mail bodies.
CREATE TABLE sender_renewal_deliveries (
 id TEXT PRIMARY KEY NOT NULL, period_key TEXT NOT NULL, stage TEXT NOT NULL,
 operator_id TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('reminder','diagnostic','connector')),
 state TEXT NOT NULL CHECK(state IN ('prepared','accepted','uncertain','refused','deferred')),
 reason TEXT, next_at INTEGER, provider_message_id TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 UNIQUE(period_key,stage,operator_id,kind)
);
CREATE TRIGGER sender_renewal_erasure_insert BEFORE INSERT ON sender_renewal_deliveries
WHEN EXISTS(SELECT 1 FROM audience_erasures WHERE state='pending') AND NOT EXISTS(SELECT 1 FROM audience_erasure_guard WHERE value=1)
BEGIN SELECT RAISE(ABORT,'CONTACT_ERASURE_PENDING'); END;
