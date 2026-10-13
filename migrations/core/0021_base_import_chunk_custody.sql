-- Additive Base import custody. Existing inline plans/originals remain readable;
-- preserve the already-applied 0019 and 0020 migrations and all retained rows.
CREATE TABLE IF NOT EXISTS ik_d1_plan_chunks (
 job_id TEXT NOT NULL REFERENCES ik_jobs(id),
 ordinal INTEGER NOT NULL,
 body TEXT NOT NULL,
 PRIMARY KEY(job_id,ordinal)
);
CREATE TABLE IF NOT EXISTS ik_d1_original_chunks (
 job_id TEXT NOT NULL REFERENCES ik_jobs(id),
 kind TEXT NOT NULL,
 original_key TEXT NOT NULL,
 ordinal INTEGER NOT NULL,
 bytes BLOB NOT NULL,
 PRIMARY KEY(job_id,kind,original_key,ordinal)
);
