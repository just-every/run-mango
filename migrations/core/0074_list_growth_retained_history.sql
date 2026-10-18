-- Recover only retained consent facts predating membership recording. Prior
-- membership transitions, deleted evidence and erased contacts are unknowable;
-- these facts therefore never change the 0073 opening membership or its deltas.
ALTER TABLE list_growth_events ADD COLUMN recording TEXT NOT NULL DEFAULT 'live'
 CHECK(recording IN ('live','retained-evidence'));

-- A transient map assigns anonymous event IDs without retaining an identity in
-- the count table. Attribution follows the existing erasure and merge triggers.
CREATE TABLE list_growth_history_staging (
 event_id INTEGER PRIMARY KEY, evidence_id TEXT NOT NULL, contact_id TEXT NOT NULL,
 channel TEXT NOT NULL, observed_at INTEGER NOT NULL, kind TEXT NOT NULL
);
INSERT INTO list_growth_history_staging
SELECT coalesce((SELECT max(id) FROM list_growth_events),0)
 + row_number() OVER (ORDER BY c.id,k.kind),c.id,c.contact_id,c.channel,
 CASE k.kind WHEN 'capture' THEN c.created_at ELSE max(c.created_at,c.confirmed_at) END,k.kind
FROM consent_evidence c JOIN contacts contact ON contact.id=c.contact_id
JOIN list_growth_baseline b ON b.channel=c.channel
CROSS JOIN (SELECT 'capture' kind UNION ALL SELECT 'confirmation') k
WHERE (k.kind='capture' AND c.created_at<b.covered_from)
 OR (k.kind='confirmation' AND c.confirmed_at IS NOT NULL
 AND max(c.created_at,c.confirmed_at)<b.covered_from);
INSERT INTO list_growth_events(id,observed_at,channel,kind,delta,recording)
SELECT event_id,observed_at,channel,kind,0,'retained-evidence' FROM list_growth_history_staging;
INSERT INTO list_growth_attribution(event_id,contact_id,evidence_id)
SELECT event_id,contact_id,evidence_id FROM list_growth_history_staging;
DROP TABLE list_growth_history_staging;
