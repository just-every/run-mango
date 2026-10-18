-- Bound the mailbox report to its requested event window without scanning all history.
CREATE INDEX delivery_facts_reporting_window ON delivery_facts(provider_occurred_at,recipient_step_id);
CREATE INDEX link_click_facts_human_window ON link_click_facts(automated,occurred_at,recipient_step_id);
