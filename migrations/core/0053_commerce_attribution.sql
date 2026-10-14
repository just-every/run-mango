CREATE TABLE commerce_orders (
 source_record_id TEXT NOT NULL UNIQUE, provider_order_id TEXT PRIMARY KEY NOT NULL,
 contact_id TEXT, purchased_at INTEGER NOT NULL, gross_amount_minor INTEGER NOT NULL CHECK(gross_amount_minor BETWEEN 0 AND 9007199254740991),
 reported_refund_minor INTEGER NOT NULL CHECK(reported_refund_minor BETWEEN 0 AND 9007199254740991), currency TEXT NOT NULL,
 qualifying INTEGER NOT NULL, financial_status TEXT NOT NULL, cancelled_at INTEGER, cancellation_reason TEXT, updated_at INTEGER NOT NULL
);
CREATE INDEX commerce_orders_contact ON commerce_orders(contact_id,purchased_at);
CREATE TABLE commerce_refunds (
 provider_refund_id TEXT PRIMARY KEY NOT NULL, provider_order_id TEXT NOT NULL, source_record_id TEXT NOT NULL,
 contact_id TEXT, financial_state TEXT NOT NULL, original_amount_minor INTEGER NOT NULL CHECK(original_amount_minor BETWEEN 0 AND 9007199254740991), amount_minor INTEGER NOT NULL CHECK(amount_minor BETWEEN 0 AND 9007199254740991), currency TEXT NOT NULL,
 occurred_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX commerce_refunds_order ON commerce_refunds(provider_order_id);
CREATE VIEW commerce_attribution_current AS
 SELECT o.*, c.id click_id, c.recipient_step_id, r.campaign_id,
 CASE WHEN o.cancelled_at IS NOT NULL OR o.financial_status='VOIDED' OR o.qualifying=0 THEN o.gross_amount_minor
 ELSE MIN(o.gross_amount_minor, MAX(o.reported_refund_minor,
 COALESCE((WITH RECURSIVE ordered_refunds AS (
 SELECT amount_minor,ROW_NUMBER() OVER(ORDER BY provider_refund_id) n FROM commerce_refunds
 WHERE provider_order_id=o.provider_order_id
 ), sums(n,amount) AS (
 SELECT 0,0 UNION ALL SELECT f.n,sums.amount+MIN(f.amount_minor,o.gross_amount_minor-sums.amount)
 FROM sums JOIN ordered_refunds f ON f.n=sums.n+1
 ) SELECT MAX(amount) FROM sums),0))) END reversed_minor
 FROM commerce_orders o JOIN link_click_facts c ON c.id=(
 SELECT c2.id FROM link_click_facts c2 JOIN recipient_steps r2 ON r2.id=c2.recipient_step_id
 WHERE r2.contact_id=o.contact_id AND r2.handoff_started_at IS NOT NULL AND c2.occurred_at>=r2.handoff_started_at AND c2.automated=0 AND c2.occurred_at<o.purchased_at AND c2.occurred_at>=o.purchased_at-604800000
 ORDER BY c2.occurred_at DESC,c2.id DESC LIMIT 1)
 JOIN recipient_steps r ON r.id=c.recipient_step_id;
CREATE TRIGGER commerce_orders_attribute_insert AFTER INSERT ON commerce_orders BEGIN
INSERT INTO attribution_facts (id,order_source_record_id,campaign_id,recipient_step_id,click_fact_id,attribution_window_days,gross_amount_minor,refund_amount_minor,currency,attributed_at,updated_at,created_at)
 SELECT 'commerce:'||source_record_id,source_record_id,campaign_id,recipient_step_id,click_id,7,gross_amount_minor,reversed_minor,currency,purchased_at,updated_at,purchased_at FROM commerce_attribution_current
 WHERE provider_order_id=NEW.provider_order_id AND (qualifying=1 OR EXISTS(SELECT 1 FROM attribution_facts a WHERE a.order_source_record_id=commerce_attribution_current.source_record_id))
 ON CONFLICT(order_source_record_id) DO UPDATE SET campaign_id=excluded.campaign_id,recipient_step_id=excluded.recipient_step_id,click_fact_id=excluded.click_fact_id,gross_amount_minor=excluded.gross_amount_minor,refund_amount_minor=excluded.refund_amount_minor,currency=excluded.currency,attributed_at=excluded.attributed_at,updated_at=excluded.updated_at;
END;
CREATE TRIGGER commerce_orders_attribute_update AFTER UPDATE ON commerce_orders BEGIN
INSERT INTO attribution_facts (id,order_source_record_id,campaign_id,recipient_step_id,click_fact_id,attribution_window_days,gross_amount_minor,refund_amount_minor,currency,attributed_at,updated_at,created_at)
 SELECT 'commerce:'||source_record_id,source_record_id,campaign_id,recipient_step_id,click_id,7,gross_amount_minor,reversed_minor,currency,purchased_at,updated_at,purchased_at FROM commerce_attribution_current
 WHERE provider_order_id=NEW.provider_order_id AND (qualifying=1 OR EXISTS(SELECT 1 FROM attribution_facts a WHERE a.order_source_record_id=commerce_attribution_current.source_record_id))
 ON CONFLICT(order_source_record_id) DO UPDATE SET campaign_id=excluded.campaign_id,recipient_step_id=excluded.recipient_step_id,click_fact_id=excluded.click_fact_id,gross_amount_minor=excluded.gross_amount_minor,refund_amount_minor=excluded.refund_amount_minor,currency=excluded.currency,attributed_at=excluded.attributed_at,updated_at=excluded.updated_at;
END;
CREATE TRIGGER commerce_refunds_attribute_insert AFTER INSERT ON commerce_refunds BEGIN
INSERT INTO attribution_facts (id,order_source_record_id,campaign_id,recipient_step_id,click_fact_id,attribution_window_days,gross_amount_minor,refund_amount_minor,currency,attributed_at,updated_at,created_at)
 SELECT 'commerce:'||source_record_id,source_record_id,campaign_id,recipient_step_id,click_id,7,gross_amount_minor,reversed_minor,currency,purchased_at,updated_at,purchased_at FROM commerce_attribution_current
 WHERE provider_order_id=NEW.provider_order_id AND (qualifying=1 OR EXISTS(SELECT 1 FROM attribution_facts a WHERE a.order_source_record_id=commerce_attribution_current.source_record_id))
 ON CONFLICT(order_source_record_id) DO UPDATE SET campaign_id=excluded.campaign_id,recipient_step_id=excluded.recipient_step_id,click_fact_id=excluded.click_fact_id,gross_amount_minor=excluded.gross_amount_minor,refund_amount_minor=excluded.refund_amount_minor,currency=excluded.currency,attributed_at=excluded.attributed_at,updated_at=excluded.updated_at;
END;
CREATE TRIGGER commerce_refunds_attribute_update AFTER UPDATE ON commerce_refunds BEGIN
INSERT INTO attribution_facts (id,order_source_record_id,campaign_id,recipient_step_id,click_fact_id,attribution_window_days,gross_amount_minor,refund_amount_minor,currency,attributed_at,updated_at,created_at)
 SELECT 'commerce:'||source_record_id,source_record_id,campaign_id,recipient_step_id,click_id,7,gross_amount_minor,reversed_minor,currency,purchased_at,updated_at,purchased_at FROM commerce_attribution_current
 WHERE provider_order_id=NEW.provider_order_id AND (qualifying=1 OR EXISTS(SELECT 1 FROM attribution_facts a WHERE a.order_source_record_id=commerce_attribution_current.source_record_id))
 ON CONFLICT(order_source_record_id) DO UPDATE SET campaign_id=excluded.campaign_id,recipient_step_id=excluded.recipient_step_id,click_fact_id=excluded.click_fact_id,gross_amount_minor=excluded.gross_amount_minor,refund_amount_minor=excluded.refund_amount_minor,currency=excluded.currency,attributed_at=excluded.attributed_at,updated_at=excluded.updated_at;
END;
CREATE TRIGGER link_click_facts_attribute_insert AFTER INSERT ON link_click_facts BEGIN
INSERT INTO attribution_facts (id,order_source_record_id,campaign_id,recipient_step_id,click_fact_id,attribution_window_days,gross_amount_minor,refund_amount_minor,currency,attributed_at,updated_at,created_at)
 SELECT 'commerce:'||source_record_id,source_record_id,campaign_id,recipient_step_id,click_id,7,gross_amount_minor,reversed_minor,currency,purchased_at,updated_at,purchased_at FROM commerce_attribution_current
 WHERE contact_id=(SELECT contact_id FROM recipient_steps WHERE id=NEW.recipient_step_id) AND (qualifying=1 OR EXISTS(SELECT 1 FROM attribution_facts a WHERE a.order_source_record_id=commerce_attribution_current.source_record_id))
 ON CONFLICT(order_source_record_id) DO UPDATE SET campaign_id=excluded.campaign_id,recipient_step_id=excluded.recipient_step_id,click_fact_id=excluded.click_fact_id,gross_amount_minor=excluded.gross_amount_minor,refund_amount_minor=excluded.refund_amount_minor,currency=excluded.currency,attributed_at=excluded.attributed_at,updated_at=excluded.updated_at;
END;
CREATE TRIGGER link_click_facts_attribute_update AFTER UPDATE ON link_click_facts BEGIN
INSERT INTO attribution_facts (id,order_source_record_id,campaign_id,recipient_step_id,click_fact_id,attribution_window_days,gross_amount_minor,refund_amount_minor,currency,attributed_at,updated_at,created_at)
 SELECT 'commerce:'||source_record_id,source_record_id,campaign_id,recipient_step_id,click_id,7,gross_amount_minor,reversed_minor,currency,purchased_at,updated_at,purchased_at FROM commerce_attribution_current
 WHERE contact_id=(SELECT contact_id FROM recipient_steps WHERE id=NEW.recipient_step_id) AND (qualifying=1 OR EXISTS(SELECT 1 FROM attribution_facts a WHERE a.order_source_record_id=commerce_attribution_current.source_record_id))
 ON CONFLICT(order_source_record_id) DO UPDATE SET campaign_id=excluded.campaign_id,recipient_step_id=excluded.recipient_step_id,click_fact_id=excluded.click_fact_id,gross_amount_minor=excluded.gross_amount_minor,refund_amount_minor=excluded.refund_amount_minor,currency=excluded.currency,attributed_at=excluded.attributed_at,updated_at=excluded.updated_at;
END;
CREATE TRIGGER audience_erasure_commerce_orders_insert BEFORE INSERT ON commerce_orders WHEN EXISTS(SELECT 1 FROM audience_erasures WHERE state='pending') AND NOT EXISTS(SELECT 1 FROM audience_erasure_guard WHERE value=1) BEGIN SELECT RAISE(ABORT,'CONTACT_ERASURE_PENDING'); END;
CREATE TRIGGER audience_erasure_commerce_orders_update BEFORE UPDATE ON commerce_orders WHEN EXISTS(SELECT 1 FROM audience_erasures WHERE state='pending') AND NOT EXISTS(SELECT 1 FROM audience_erasure_guard WHERE value=1) BEGIN SELECT RAISE(ABORT,'CONTACT_ERASURE_PENDING'); END;
CREATE TRIGGER audience_erasure_commerce_refunds_insert BEFORE INSERT ON commerce_refunds WHEN EXISTS(SELECT 1 FROM audience_erasures WHERE state='pending') AND NOT EXISTS(SELECT 1 FROM audience_erasure_guard WHERE value=1) BEGIN SELECT RAISE(ABORT,'CONTACT_ERASURE_PENDING'); END;
CREATE TRIGGER audience_erasure_commerce_refunds_update BEFORE UPDATE ON commerce_refunds WHEN EXISTS(SELECT 1 FROM audience_erasures WHERE state='pending') AND NOT EXISTS(SELECT 1 FROM audience_erasure_guard WHERE value=1) BEGIN SELECT RAISE(ABORT,'CONTACT_ERASURE_PENDING'); END;

-- Native contact merges move source ownership after lifecycle history. Keep the
-- financial ledger attached to that same verified identity in the transaction.
CREATE TRIGGER source_records_commerce_contact_update AFTER UPDATE OF contact_id ON source_records
WHEN NEW.contact_id IS NOT OLD.contact_id BEGIN
 UPDATE commerce_orders SET contact_id=NEW.contact_id WHERE source_record_id=NEW.id;
 UPDATE commerce_refunds SET contact_id=NEW.contact_id WHERE source_record_id=NEW.id;
END;

-- A monotonic transaction generation closes asynchronous check-to-handoff races.
CREATE TABLE audience_source_authority(id INTEGER PRIMARY KEY CHECK(id=1), generation INTEGER NOT NULL);
INSERT INTO audience_source_authority(id,generation) VALUES(1,0);
CREATE TRIGGER source_records_audience_generation_insert AFTER INSERT ON source_records BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER source_records_audience_generation_update AFTER UPDATE ON source_records BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER source_records_audience_generation_delete AFTER DELETE ON source_records BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER source_activities_audience_generation_insert AFTER INSERT ON source_activities BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER source_activities_audience_generation_update AFTER UPDATE ON source_activities BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER source_activities_audience_generation_delete AFTER DELETE ON source_activities BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER source_syncs_audience_generation_insert AFTER INSERT ON source_syncs BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER source_syncs_audience_generation_update AFTER UPDATE ON source_syncs BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER source_syncs_audience_generation_delete AFTER DELETE ON source_syncs BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER commerce_source_capabilities_audience_generation_insert AFTER INSERT ON commerce_source_capabilities BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER commerce_source_capabilities_audience_generation_update AFTER UPDATE ON commerce_source_capabilities BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER commerce_source_capabilities_audience_generation_delete AFTER DELETE ON commerce_source_capabilities BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER commerce_source_coverage_audience_generation_insert AFTER INSERT ON commerce_source_coverage BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER commerce_source_coverage_audience_generation_update AFTER UPDATE ON commerce_source_coverage BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER commerce_source_coverage_audience_generation_delete AFTER DELETE ON commerce_source_coverage BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER commerce_channels_audience_generation_insert AFTER INSERT ON commerce_channels BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER commerce_channels_audience_generation_update AFTER UPDATE ON commerce_channels BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER commerce_channels_audience_generation_delete AFTER DELETE ON commerce_channels BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER commerce_privacy_controls_audience_generation_insert AFTER INSERT ON commerce_privacy_controls BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER commerce_privacy_controls_audience_generation_update AFTER UPDATE ON commerce_privacy_controls BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER commerce_privacy_controls_audience_generation_delete AFTER DELETE ON commerce_privacy_controls BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
