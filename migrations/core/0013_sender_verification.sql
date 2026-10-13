CREATE TABLE sender_verification_state (
 id TEXT PRIMARY KEY NOT NULL,
 generation INTEGER NOT NULL DEFAULT 0,
 binding_digest TEXT NOT NULL,
 configuration_digest TEXT,
 observation_id TEXT,
 revoked_at INTEGER,
 reason TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE TABLE sender_verification_challenges (
 id TEXT PRIMARY KEY NOT NULL,
 state_id TEXT NOT NULL,
 binding_digest TEXT NOT NULL,
 configuration_digest TEXT NOT NULL,
 generation INTEGER NOT NULL,
 recipient TEXT NOT NULL,
 connector_id TEXT NOT NULL,
 nonce TEXT NOT NULL,
 request_json TEXT NOT NULL,
 request_digest TEXT NOT NULL,
 provider_message_id TEXT,
 sent_at INTEGER,
 expires_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE TABLE sender_verification_observations (
 id TEXT PRIMARY KEY NOT NULL,
 challenge_id TEXT NOT NULL UNIQUE,
 receipt_key TEXT NOT NULL UNIQUE,
 receipt_digest TEXT NOT NULL,
 binding_digest TEXT NOT NULL,
 configuration_digest TEXT NOT NULL,
 result_json TEXT NOT NULL,
 observed_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE TABLE sender_verification_inspections (
 id TEXT PRIMARY KEY NOT NULL,
 state_id TEXT NOT NULL,
 generation INTEGER NOT NULL,
 binding_digest TEXT NOT NULL,
 configuration_digest TEXT NOT NULL,
 observation_id TEXT,
 ready INTEGER NOT NULL,
 checked_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 result_json TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE TABLE sender_verification_associations (
 id TEXT PRIMARY KEY NOT NULL,
 inspection_id TEXT NOT NULL REFERENCES sender_verification_inspections(id),
 kind TEXT NOT NULL CHECK(kind IN ('approval','handoff')),
 entity_id TEXT NOT NULL,
 attempt_key TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 UNIQUE(kind,entity_id,attempt_key)
);
