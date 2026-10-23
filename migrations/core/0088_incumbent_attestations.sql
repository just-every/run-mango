CREATE TABLE consent_attestations (
 id TEXT PRIMARY KEY, archive_id TEXT NOT NULL, source_identifier TEXT NOT NULL,
 source_key TEXT NOT NULL, source_name TEXT NOT NULL, source_created_at INTEGER, operator_id TEXT NOT NULL,
 operator_role TEXT NOT NULL, session_ip TEXT NOT NULL, user_agent TEXT NOT NULL,
 wording_version TEXT NOT NULL, wording_json TEXT NOT NULL, wording_hash TEXT NOT NULL,
 answers_json TEXT NOT NULL, scope_json TEXT NOT NULL, covered_rows INTEGER NOT NULL,
 created_at INTEGER NOT NULL, revoked_at INTEGER, revoked_by TEXT, retain_until INTEGER
);
CREATE TABLE incumbent_consent_links (
 id TEXT PRIMARY KEY, contact_id TEXT NOT NULL, attestation_id TEXT NOT NULL,
 evidence_at INTEGER NOT NULL, time_quality TEXT NOT NULL, source_facts_json TEXT NOT NULL
);
CREATE INDEX incumbent_consent_attestation ON incumbent_consent_links(attestation_id,contact_id);
ALTER TABLE move_in_archives ADD COLUMN attestations_json TEXT NOT NULL DEFAULT '[]';
CREATE TRIGGER consent_attestation_audience_generation AFTER UPDATE OF revoked_at ON consent_attestations BEGIN
 UPDATE audience_source_authority SET generation=generation+1 WHERE id=1;
END;
-- A reviewed import cannot restore subscription from authority revoked while
-- its native stream was paused. Historical evidence may remain non-subscribed.
CREATE TRIGGER incumbent_consent_active_write BEFORE INSERT ON incumbent_consent_links
WHEN NOT EXISTS(SELECT 1 FROM consent_attestations a WHERE a.id=NEW.attestation_id AND a.revoked_at IS NULL)
 AND EXISTS(SELECT 1 FROM contacts c WHERE c.id=NEW.contact_id AND c.email_status='subscribed')
 AND NOT EXISTS(SELECT 1 FROM consent_evidence e WHERE e.contact_id=NEW.contact_id AND e.channel='email' AND e.confirmed_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'incumbent attestation is revoked or missing'); END;
CREATE TRIGGER incumbent_consent_growth AFTER INSERT ON incumbent_consent_links BEGIN
 UPDATE list_growth_events SET kind='incumbent-held' WHERE kind='capture'
 AND id IN (SELECT event_id FROM list_growth_attribution WHERE evidence_id=NEW.id);
 UPDATE list_growth_attribution SET evidence_id=NEW.id WHERE contact_id=NEW.contact_id AND evidence_id IS NULL
 AND event_id=(SELECT max(a.event_id) FROM list_growth_attribution a JOIN list_growth_events e ON e.id=a.event_id WHERE a.contact_id=NEW.contact_id AND e.channel='email' AND e.delta=1);
END;
