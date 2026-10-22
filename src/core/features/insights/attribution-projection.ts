import type { AttributionPolicy } from './attribution-policy';

/** The winner is chosen across every campaign/channel before a caller applies
 * report filters. Read-only projection: policy changes never rewrite source facts
 * or the historical seven-day ledger used by frozen forecasts.
 * A retained ledger identity keeps later financial reversals visible if a store
 * update unlinks the order. Historical rows without raw clicks can establish only
 * their recorded window, so narrowing below it excludes them. */
export function attributionProjection(policy: AttributionPolicy) {
  return {bindings: [policy.metric, policy.clickWindowDays.email, policy.clickWindowDays.sms], sql: `
    report_policy AS (SELECT ? metric,? email_days,? sms_days),
    report_conversions AS (
      SELECT o.source_record_id order_source_record_id,o.provider_order_id,o.contact_id,pr.contact_id prior_contact_id,
        a.click_fact_id prior_click_id,a.recipient_step_id prior_recipient_step_id,a.campaign_id prior_campaign_id,
        a.attribution_window_days prior_window_days,o.purchased_at attributed_at,m.gross_amount_minor,m.reversed_minor refund_amount_minor,
        m.currency,m.updated_at,0 legacy
      FROM commerce_orders o JOIN commerce_order_amounts m ON m.provider_order_id=o.provider_order_id
        LEFT JOIN attribution_facts a ON a.order_source_record_id=o.source_record_id
        LEFT JOIN recipient_steps pr ON pr.id=a.recipient_step_id
      WHERE (SELECT metric FROM report_policy)='placed-order' AND (o.was_qualifying=1 OR o.qualifying=1 OR a.id IS NOT NULL)
      UNION ALL
      SELECT a.order_source_record_id,NULL,s.contact_id,r.contact_id,a.click_fact_id,a.recipient_step_id,a.campaign_id,
        a.attribution_window_days,a.attributed_at,a.gross_amount_minor,a.refund_amount_minor,a.currency,a.updated_at,1
      FROM attribution_facts a LEFT JOIN source_records s ON s.id=a.order_source_record_id
        LEFT JOIN recipient_steps r ON r.id=a.recipient_step_id
      WHERE (SELECT metric FROM report_policy)='placed-order'
        AND NOT EXISTS(SELECT 1 FROM commerce_orders o WHERE o.source_record_id=a.order_source_record_id)
      UNION ALL
      SELECT s.id,NULL,s.contact_id,NULL,NULL,NULL,NULL,NULL,s.occurred_at,json_extract(s.payload,'$.valueMinor'),
        CASE WHEN EXISTS(SELECT 1 FROM source_records reversal WHERE reversal.source_type='conversion-event'
          AND reversal.provider=s.provider AND json_extract(reversal.payload,'$.conversionSourceRecordId')=s.id
          AND json_extract(reversal.payload,'$.kind')='cancellation') THEN json_extract(s.payload,'$.valueMinor')
        ELSE COALESCE((WITH RECURSIVE refunds AS (
          SELECT json_extract(reversal.payload,'$.valueMinor') amount,ROW_NUMBER() OVER(ORDER BY reversal.id) n
          FROM source_records reversal WHERE reversal.source_type='conversion-event' AND reversal.provider=s.provider
            AND json_extract(reversal.payload,'$.conversionSourceRecordId')=s.id AND json_extract(reversal.payload,'$.kind')='refund'
        ), sums(n,amount) AS (
          SELECT 0,0 UNION ALL SELECT f.n,sums.amount+MIN(f.amount,json_extract(s.payload,'$.valueMinor')-sums.amount)
          FROM sums JOIN refunds f ON f.n=sums.n+1
        ) SELECT MAX(amount) FROM sums),0) END,
        json_extract(s.payload,'$.currency'),s.updated_at,0
      FROM source_records s WHERE s.source_type='conversion-event' AND json_extract(s.payload,'$.schema')='native-conversion-v1'
        AND json_extract(s.payload,'$.kind')='conversion' AND 'custom:'||json_extract(s.payload,'$.metric')=(SELECT metric FROM report_policy)
    ),
    report_winners AS (
      SELECT e.*,(SELECT c.id FROM link_click_facts c JOIN recipient_steps r ON r.id=c.recipient_step_id
        CROSS JOIN report_policy p
        WHERE (r.contact_id=e.contact_id OR r.contact_id=e.prior_contact_id)
          AND r.channel IN ('email','sms') AND r.handoff_started_at IS NOT NULL
          AND c.automated=0 AND c.occurred_at>=r.handoff_started_at AND c.occurred_at<e.attributed_at
          AND c.occurred_at>=e.attributed_at-86400000*(CASE r.channel WHEN 'sms' THEN p.sms_days ELSE p.email_days END)
        ORDER BY c.occurred_at DESC,c.id DESC LIMIT 1) winner_id
      FROM report_conversions e
    ),
    attribution_projection AS (
      SELECT e.order_source_record_id,e.provider_order_id,r.campaign_id,r.id recipient_step_id,c.id click_fact_id,
        CASE r.channel WHEN 'sms' THEN p.sms_days ELSE p.email_days END attribution_window_days,
        e.attributed_at,e.gross_amount_minor,e.refund_amount_minor,e.currency,e.updated_at,0 historical_evidence_only
      FROM report_winners e JOIN link_click_facts c ON c.id=e.winner_id JOIN recipient_steps r ON r.id=c.recipient_step_id CROSS JOIN report_policy p
      UNION ALL
      SELECT e.order_source_record_id,e.provider_order_id,e.prior_campaign_id,e.prior_recipient_step_id,e.prior_click_id,
        CASE r.channel WHEN 'sms' THEN p.sms_days ELSE p.email_days END,
        e.attributed_at,e.gross_amount_minor,e.refund_amount_minor,e.currency,e.updated_at,1
      FROM report_winners e JOIN recipient_steps r ON r.id=e.prior_recipient_step_id CROSS JOIN report_policy p
      WHERE e.legacy=1 AND e.winner_id IS NULL AND r.channel IN ('email','sms')
        AND NOT EXISTS(SELECT 1 FROM link_click_facts c WHERE c.id=e.prior_click_id)
        AND e.prior_window_days<=CASE r.channel WHEN 'sms' THEN p.sms_days ELSE p.email_days END
    )`};
}
