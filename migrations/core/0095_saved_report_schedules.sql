-- Reports contain aggregate figures and native operator IDs, never contact rows.
CREATE TABLE insight_saved_reports (
 id TEXT PRIMARY KEY NOT NULL, metric TEXT NOT NULL, dimension TEXT NOT NULL,
 created_by TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE insight_report_schedules (
 id TEXT PRIMARY KEY NOT NULL, report_id TEXT NOT NULL, cadence TEXT NOT NULL CHECK(cadence IN ('weekly','monthly')),
 recipients_json TEXT NOT NULL, next_at INTEGER NOT NULL, enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),
 authority_binding TEXT NOT NULL, created_by TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX insight_report_schedule_due ON insight_report_schedules(enabled,next_at);
CREATE TABLE insight_report_deliveries (
 id TEXT PRIMARY KEY NOT NULL, schedule_id TEXT NOT NULL REFERENCES insight_report_schedules(id), due_at INTEGER NOT NULL,
 recipient_id TEXT NOT NULL, report_json TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('prepared','accepted','deferred','refused','uncertain')),
 reason TEXT, next_at INTEGER, provider_message_id TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 UNIQUE(schedule_id,due_at,recipient_id)
);
CREATE TRIGGER insight_saved_reports_erasure_insert BEFORE INSERT ON insight_saved_reports
WHEN EXISTS(SELECT 1 FROM audience_erasures WHERE state='pending') AND NOT EXISTS(SELECT 1 FROM audience_erasure_guard WHERE value=1)
BEGIN SELECT RAISE(ABORT,'CONTACT_ERASURE_PENDING'); END;
CREATE TRIGGER insight_report_schedules_erasure_insert BEFORE INSERT ON insight_report_schedules
WHEN EXISTS(SELECT 1 FROM audience_erasures WHERE state='pending') AND NOT EXISTS(SELECT 1 FROM audience_erasure_guard WHERE value=1)
BEGIN SELECT RAISE(ABORT,'CONTACT_ERASURE_PENDING'); END;
CREATE TRIGGER insight_report_deliveries_erasure_insert BEFORE INSERT ON insight_report_deliveries
WHEN EXISTS(SELECT 1 FROM audience_erasures WHERE state='pending') AND NOT EXISTS(SELECT 1 FROM audience_erasure_guard WHERE value=1)
BEGIN SELECT RAISE(ABORT,'CONTACT_ERASURE_PENDING'); END;
