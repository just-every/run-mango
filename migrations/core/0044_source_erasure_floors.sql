-- Retire dictionary-testable row journals without admitting any archive that
-- was accepted under their former authority. Never rewrite applied migrations.
-- A source may survive only in a journal or a completed/pending job manifest.
INSERT INTO rer_portability_epochs(source,epoch)
SELECT source,MAX(epoch)+1 FROM (
 SELECT source,epoch FROM rer_portability_epochs
 UNION ALL SELECT source_identity,epoch FROM rer_portability_state
 UNION ALL SELECT source,0 FROM rer_portability_journal
 UNION ALL SELECT json_extract(metadata,'$.manifest.sourceIdentity'),json_extract(metadata,'$.manifest.epoch')
 FROM rer_portability_jobs
 WHERE json_valid(metadata)
 AND json_type(metadata,'$.manifest.sourceIdentity')='text'
 AND json_type(metadata,'$.manifest.epoch')='integer'
 AND json_extract(metadata,'$.manifest.epoch')>=0
) WHERE source IS NOT NULL GROUP BY source
ON CONFLICT(source) DO UPDATE SET epoch=excluded.epoch;
UPDATE rer_portability_state SET epoch=(SELECT epoch FROM rer_portability_epochs WHERE source=source_identity),import_job=NULL,applying=0;
DELETE FROM rer_portability_journal;

-- SQLite migrations cannot interpolate dynamic snapshot table names. Keep only
-- the names and pending object ownership for idempotent runtime retirement;
-- retireTransfers runs before HTTP work and native transfers. No manifests or
-- parts survive SQL upgrade, and no old transfer can resume.
CREATE TABLE rer_portability_retired_copies(name TEXT PRIMARY KEY);
INSERT INTO rer_portability_retired_copies SELECT name FROM sqlite_master
 WHERE type='table' AND (name GLOB 'rer_portability_snap_*' OR name GLOB 'rer_portability_stage_*');
CREATE TABLE rer_portability_retired_objects(bucket TEXT NOT NULL,key TEXT NOT NULL,PRIMARY KEY(bucket,key));
INSERT INTO rer_portability_retired_objects SELECT DISTINCT o.bucket,o.key FROM rer_portability_owned o
 JOIN rer_portability_jobs j ON j.id=o.job WHERE j.phase<>'complete';
DELETE FROM rer_portability_segments;
DELETE FROM rer_portability_parts;
DELETE FROM rer_portability_owned;
DELETE FROM rer_portability_jobs;
