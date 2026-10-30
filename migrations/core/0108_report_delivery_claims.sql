-- Keep native report claims recoverable before provider invocation.
CREATE TABLE insight_report_deliveries_claims (
 id TEXT PRIMARY KEY NOT NULL, schedule_id TEXT NOT NULL REFERENCES insight_report_schedules(id), due_at INTEGER NOT NULL,
 recipient_id TEXT NOT NULL, report_json TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('prepared','claimed','sending','accepted','deferred','refused','uncertain')),
 claim_token TEXT, reason TEXT, next_at INTEGER, provider_message_id TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 UNIQUE(schedule_id,due_at,recipient_id)
);
INSERT INTO insight_report_deliveries_claims(id,schedule_id,due_at,recipient_id,report_json,state,reason,next_at,provider_message_id,created_at,updated_at) SELECT id,schedule_id,due_at,recipient_id,report_json,state,reason,next_at,provider_message_id,created_at,updated_at FROM insight_report_deliveries;
DROP TABLE insight_report_deliveries;
ALTER TABLE insight_report_deliveries_claims RENAME TO insight_report_deliveries;
CREATE TRIGGER insight_report_deliveries_erasure_insert BEFORE INSERT ON insight_report_deliveries
WHEN EXISTS(SELECT 1 FROM audience_erasures WHERE state='pending') AND NOT EXISTS(SELECT 1 FROM audience_erasure_guard WHERE value=1)
BEGIN SELECT RAISE(ABORT,'CONTACT_ERASURE_PENDING'); END;
