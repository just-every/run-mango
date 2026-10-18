-- Anonymous attempt counters survive restart and retain no recipient identity.
CREATE TABLE test_send_allowances (day TEXT PRIMARY KEY, used INTEGER NOT NULL CHECK(used >= 0));
