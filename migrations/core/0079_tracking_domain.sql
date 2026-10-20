CREATE TABLE tracking_domain (
 id INTEGER PRIMARY KEY CHECK(id=1),
 host TEXT NOT NULL,
 updated_at INTEGER NOT NULL,
 operator_id TEXT NOT NULL
);
