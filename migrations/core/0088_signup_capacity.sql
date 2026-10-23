-- Capacity revisions activate at a UTC window boundary. No contact data is held.
CREATE TABLE signup_allowance_levels (
  name TEXT NOT NULL,
  effective_at INTEGER NOT NULL,
  value INTEGER NOT NULL CHECK(value>0),
  operator_id TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(name,effective_at)
);
ALTER TABLE signup_settings ADD COLUMN challenge_enabled INTEGER NOT NULL DEFAULT 1 CHECK(challenge_enabled IN (0,1));
