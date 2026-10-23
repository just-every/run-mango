-- Installation authority never travels in an audience export or restored archive.
CREATE TABLE sending_proposals (
 id TEXT PRIMARY KEY, operator_id TEXT NOT NULL, secret_cipher TEXT NOT NULL,
 account_id TEXT NOT NULL, account_name TEXT NOT NULL, broader INTEGER NOT NULL,
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE sending_connection (
 id INTEGER PRIMARY KEY CHECK(id=1), generation TEXT NOT NULL,
 state TEXT NOT NULL, account_id TEXT NOT NULL, account_name TEXT NOT NULL,
 secret_cipher TEXT NOT NULL, last_four TEXT NOT NULL, broader INTEGER NOT NULL,
 connected_by TEXT NOT NULL, connected_at INTEGER NOT NULL,
 webhook_id TEXT, delivery_proved_at INTEGER, last_error TEXT
);
