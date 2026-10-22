-- STORE-004: a verified webhook the commerce adapter cannot read and proposal
-- generation refused by a failed source record a failed operation on the same
-- record as a failed sync, carrying the adapter's error. A provider delivery
-- records at most one row; its retry after recovery completes that row.
ALTER TABLE source_sync_runs ADD COLUMN operation TEXT NOT NULL DEFAULT 'sync' CHECK (operation IN ('sync', 'webhook', 'generation'));
ALTER TABLE source_sync_runs ADD COLUMN delivery_key TEXT;
CREATE UNIQUE INDEX source_sync_runs_delivery ON source_sync_runs(delivery_key);
