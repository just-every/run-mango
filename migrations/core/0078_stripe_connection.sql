-- Private provider authority is destination-owned and excluded from exports.
CREATE TABLE stripe_connection (
  id INTEGER PRIMARY KEY CHECK(id=1),
  key_cipher TEXT NOT NULL,
  signing_cipher TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('test','live')),
  last_four TEXT NOT NULL,
  connected_by TEXT NOT NULL,
  connected_at INTEGER NOT NULL
);
