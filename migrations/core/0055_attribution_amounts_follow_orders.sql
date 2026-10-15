-- An order that already has an attribution fact keeps its reversed and gross
-- amounts current when later refunds or cancellations arrive, even after a
-- Shopify sync nulls or changes the order's customer link and the click join in
-- commerce_attribution_current no longer matches.
CREATE VIEW commerce_order_amounts AS
 SELECT o.provider_order_id, o.source_record_id, o.gross_amount_minor, o.currency, o.updated_at,
 CASE WHEN o.cancelled_at IS NOT NULL OR o.financial_status='VOIDED' OR o.qualifying=0 THEN o.gross_amount_minor
 ELSE MIN(o.gross_amount_minor, MAX(o.reported_refund_minor,
 COALESCE((WITH RECURSIVE ordered_refunds AS (
 SELECT amount_minor,ROW_NUMBER() OVER(ORDER BY provider_refund_id) n FROM commerce_refunds
 WHERE provider_order_id=o.provider_order_id
 ), sums(n,amount) AS (
 SELECT 0,0 UNION ALL SELECT f.n,sums.amount+MIN(f.amount_minor,o.gross_amount_minor-sums.amount)
 FROM sums JOIN ordered_refunds f ON f.n=sums.n+1
 ) SELECT MAX(amount) FROM sums),0))) END reversed_minor
 FROM commerce_orders o;
DROP VIEW commerce_attribution_current;
CREATE VIEW commerce_attribution_current AS
 SELECT o.*, c.id click_id, c.recipient_step_id, r.campaign_id, a.reversed_minor
 FROM commerce_orders o JOIN commerce_order_amounts a ON a.provider_order_id=o.provider_order_id
 JOIN link_click_facts c ON c.id=(
 SELECT c2.id FROM link_click_facts c2 JOIN recipient_steps r2 ON r2.id=c2.recipient_step_id
 WHERE r2.contact_id=o.contact_id AND r2.handoff_started_at IS NOT NULL AND c2.occurred_at>=r2.handoff_started_at AND c2.automated=0 AND c2.occurred_at<o.purchased_at AND c2.occurred_at>=o.purchased_at-604800000
 ORDER BY c2.occurred_at DESC,c2.id DESC LIMIT 1)
 JOIN recipient_steps r ON r.id=c.recipient_step_id;
CREATE TRIGGER commerce_orders_amounts_insert AFTER INSERT ON commerce_orders BEGIN
 UPDATE attribution_facts SET gross_amount_minor=a.gross_amount_minor,refund_amount_minor=a.reversed_minor,currency=a.currency,updated_at=a.updated_at
 FROM commerce_order_amounts a WHERE a.provider_order_id=NEW.provider_order_id AND attribution_facts.order_source_record_id=a.source_record_id;
END;
CREATE TRIGGER commerce_orders_amounts_update AFTER UPDATE ON commerce_orders BEGIN
 UPDATE attribution_facts SET gross_amount_minor=a.gross_amount_minor,refund_amount_minor=a.reversed_minor,currency=a.currency,updated_at=a.updated_at
 FROM commerce_order_amounts a WHERE a.provider_order_id=NEW.provider_order_id AND attribution_facts.order_source_record_id=a.source_record_id;
END;
CREATE TRIGGER commerce_refunds_amounts_insert AFTER INSERT ON commerce_refunds BEGIN
 UPDATE attribution_facts SET gross_amount_minor=a.gross_amount_minor,refund_amount_minor=a.reversed_minor,currency=a.currency,updated_at=a.updated_at
 FROM commerce_order_amounts a WHERE a.provider_order_id=NEW.provider_order_id AND attribution_facts.order_source_record_id=a.source_record_id;
END;
CREATE TRIGGER commerce_refunds_amounts_update AFTER UPDATE ON commerce_refunds BEGIN
 UPDATE attribution_facts SET gross_amount_minor=a.gross_amount_minor,refund_amount_minor=a.reversed_minor,currency=a.currency,updated_at=a.updated_at
 FROM commerce_order_amounts a WHERE a.provider_order_id=NEW.provider_order_id AND attribution_facts.order_source_record_id=a.source_record_id;
END;
