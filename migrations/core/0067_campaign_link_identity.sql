-- Existing click facts have no trustworthy link identity. Do not backfill them
-- from a recipient's several tokens or from a campaign's current links.
ALTER TABLE tracked_links ADD COLUMN revision_link_id TEXT;
ALTER TABLE link_click_facts ADD COLUMN revision_link_id TEXT;
ALTER TABLE link_click_facts ADD COLUMN destination_url TEXT;
CREATE INDEX link_click_facts_link_idx ON link_click_facts(revision_link_id, automated, recipient_step_id);
CREATE INDEX link_click_facts_destination_idx ON link_click_facts(destination_url, recipient_step_id, automated);
