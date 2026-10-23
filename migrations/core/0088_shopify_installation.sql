-- Private installation authority is never exported or restored as a live connection.
CREATE TABLE shopify_installation (
 id INTEGER PRIMARY KEY CHECK(id=1), shop TEXT NOT NULL, token_cipher TEXT NOT NULL,
 scopes_json TEXT NOT NULL, connected_by TEXT NOT NULL, connected_at INTEGER NOT NULL,
 expires_at INTEGER, channel_id TEXT NOT NULL, proxy_path TEXT NOT NULL, pixel_id TEXT, subscriptions_json TEXT NOT NULL DEFAULT '[]', checked_at INTEGER, last_error TEXT
);
CREATE TABLE shopify_oauth_states (
 id TEXT PRIMARY KEY, shop TEXT NOT NULL, operator_id TEXT NOT NULL, origin TEXT NOT NULL,
 scopes_json TEXT NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER
);
