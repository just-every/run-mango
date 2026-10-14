-- Service messages are single-attempt. A crashed/uncertain handoff is never retried.
CREATE TABLE sms_service_messages (
 id TEXT PRIMARY KEY, contact_id TEXT NOT NULL, destination_hash TEXT NOT NULL,
 sender TEXT NOT NULL, purpose TEXT NOT NULL CHECK(purpose IN ('consent-confirmation','sms-compliance')),
 consent_id TEXT, policy_digest TEXT NOT NULL, payload_ciphertext TEXT, state TEXT NOT NULL CHECK(state IN ('queued','sending','accepted','uncertain','blocked','expired')),
 reason TEXT, provider_message_id TEXT, expires_at INTEGER NOT NULL, next_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX sms_service_due ON sms_service_messages(state,next_at);
CREATE TABLE sms_inbound_receipts (
 id TEXT PRIMARY KEY, contact_id TEXT NOT NULL, destination_hash TEXT NOT NULL,
 action TEXT NOT NULL, occurred_at INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE consent_handoff_claims (id TEXT PRIMARY KEY, contact_id TEXT NOT NULL, created_at INTEGER NOT NULL);

-- The exact structured SMS programme is frozen atomically with campaign approval.
CREATE TABLE sms_approval_policies (revision_id TEXT PRIMARY KEY, policy_digest TEXT NOT NULL, sender TEXT NOT NULL, policy_json TEXT NOT NULL);

-- Atomic destination-wide marketing frequency ownership. Ambiguous attempts keep it.
CREATE TABLE sms_frequency_claims (destination_hash TEXT PRIMARY KEY, contact_id TEXT NOT NULL, recipient_step_id TEXT NOT NULL, claim_token TEXT NOT NULL, next_at INTEGER NOT NULL);
