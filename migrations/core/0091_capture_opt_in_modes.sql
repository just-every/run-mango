CREATE TABLE opt_in_modes (
 point TEXT PRIMARY KEY CHECK(point IN ('hosted','kiosk','manual')),
 mode TEXT NOT NULL CHECK(mode IN ('double','single')),
 version INTEGER NOT NULL,
 operator_id TEXT NOT NULL,
 updated_at INTEGER NOT NULL
);
