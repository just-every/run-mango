ALTER TABLE link_host_settings ADD COLUMN auto_sources INTEGER NOT NULL DEFAULT 0 CHECK(auto_sources IN (0,1));
CREATE TABLE link_host_exclusions(host TEXT PRIMARY KEY,removed_by TEXT NOT NULL,removed_at INTEGER NOT NULL);
CREATE TABLE link_host_sources(host TEXT NOT NULL,source_id TEXT NOT NULL,source TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(host,source_id));
CREATE TABLE link_host_source_versions(source_id TEXT PRIMARY KEY,version TEXT NOT NULL,hosts_json TEXT NOT NULL);
