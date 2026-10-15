-- One-time owner sign-in links minted by `rer signin` with the deployment's own
-- Cloudflare credentials (Base operator-auth accounts/schema/owner-signin.sql).
-- Additive only. token_hash is the SHA-256 of the link token; the token is never stored.
CREATE TABLE IF NOT EXISTS oa_owner_signins (
 id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE,
 operator_id TEXT NOT NULL REFERENCES oa_operators(id), operator_version INTEGER NOT NULL,
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, consumed_at INTEGER
);
