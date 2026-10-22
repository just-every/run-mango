-- Connection authority is private installation state, excluded from archives.
CREATE TABLE woocommerce_connection (
  slot INTEGER PRIMARY KEY CHECK(slot=1),
  id TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  credentials TEXT NOT NULL,
  generation TEXT NOT NULL,
  connected_by TEXT NOT NULL,
  connected_at INTEGER NOT NULL
);
