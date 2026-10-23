-- Withdrawal authority is per installation surface and retained until erasure.
-- It has no address or provider credential and survives the shorter outbox.
CREATE TABLE woocommerce_privacy_controls (
  connection_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  revoked_at INTEGER NOT NULL,
  PRIMARY KEY(connection_id,contact_id)
);
