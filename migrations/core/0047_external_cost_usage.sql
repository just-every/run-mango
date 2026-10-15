-- Unknown usage is explicit; the legacy NOT NULL units column is ignored when units_known=0.
ALTER TABLE external_cost_facts ADD COLUMN units_known integer NOT NULL DEFAULT 1;
ALTER TABLE external_cost_facts ADD COLUMN unit_kind text NOT NULL DEFAULT 'provider units';
ALTER TABLE external_cost_facts ADD COLUMN outcome text NOT NULL DEFAULT 'reported';
UPDATE external_cost_facts SET unit_kind = CASE
 WHEN operation LIKE 'ai-%' THEN 'tokens'
 WHEN operation = 'design-draft' THEN 'images'
 WHEN operation = 'design-layout' THEN 'layouts'
 ELSE 'provider units' END;
CREATE INDEX external_cost_facts_day_idx ON external_cost_facts(occurred_at);
