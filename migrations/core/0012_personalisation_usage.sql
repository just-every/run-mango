ALTER TABLE campaign_audience_channel_counts ADD COLUMN eligible_contact_count INTEGER
  CHECK (eligible_contact_count IS NULL OR eligible_contact_count >= 0);
ALTER TABLE campaign_audience_channel_counts ADD COLUMN fallback_contact_count INTEGER
  CHECK (fallback_contact_count IS NULL OR (eligible_contact_count IS NOT NULL AND fallback_contact_count >= 0 AND fallback_contact_count <= eligible_contact_count));
