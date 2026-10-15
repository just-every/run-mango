-- Existing hosted forms remain available; outside framing requires an operator allowlist.
ALTER TABLE signup_settings ADD COLUMN embed_origins TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(embed_origins) AND json_type(embed_origins) = 'array');
