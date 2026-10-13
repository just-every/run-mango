-- The export's portable identity for each address an opt-out or suppression names, recorded when
-- the address is known, so an export carries every opt-out by that identity after its contact has
-- gone. A restored opt-out whose address this installation has not seen yet keeps the portable
-- identity as its destination_hash (mapped to itself) until that address arrives.
CREATE TABLE audience_portable_hashes (destination_hash TEXT PRIMARY KEY, portable_hash TEXT NOT NULL);
CREATE INDEX audience_portable_hashes_portable_idx ON audience_portable_hashes(portable_hash);
