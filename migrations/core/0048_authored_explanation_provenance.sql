-- Legacy linked-campaign explanations have unknown origin, even after full draft saves.
-- Only explicit new operator wording acquires manual provenance.
ALTER TABLE campaign_steps ADD COLUMN timing_origin text;
ALTER TABLE campaign_revisions ADD COLUMN authored_exclusion_reasons_json text NOT NULL DEFAULT '[]';
