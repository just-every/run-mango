-- Report policy is independent of immutable clicks, sources and the historical
-- seven-day financial ledger. A read projects the selected policy over facts.
CREATE TABLE campaign_attribution_policy (
 id INTEGER PRIMARY KEY CHECK(id=1), metric TEXT NOT NULL,
 email_window_days INTEGER NOT NULL CHECK(email_window_days BETWEEN 1 AND 365),
 sms_window_days INTEGER NOT NULL CHECK(sms_window_days BETWEEN 1 AND 365),
 operator_id TEXT NOT NULL, updated_at INTEGER NOT NULL
);

-- Remember a received order even when a later update voids it. The legacy ledger
-- may never have attributed it: the operator can now choose a longer window.
ALTER TABLE commerce_orders ADD COLUMN was_qualifying INTEGER NOT NULL DEFAULT 0 CHECK(was_qualifying IN (0,1));
UPDATE commerce_orders SET was_qualifying=1 WHERE qualifying=1
 OR EXISTS(SELECT 1 FROM attribution_facts a WHERE a.order_source_record_id=commerce_orders.source_record_id);
