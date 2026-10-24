-- Historical reviews do not assert a count that was never calculated.
ALTER TABLE campaign_audiences ADD COLUMN incumbent_held_count INTEGER;
