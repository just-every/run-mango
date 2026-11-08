-- Native identity and consent changes invalidate asynchronous audience checks.
-- The existing generation is checked again inside the approval transaction.

CREATE TRIGGER contacts_audience_generation_insert AFTER INSERT ON contacts BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER contacts_audience_generation_update AFTER UPDATE ON contacts BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER contacts_audience_generation_delete AFTER DELETE ON contacts BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER contact_email_addresses_audience_generation_insert AFTER INSERT ON contact_email_addresses BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER contact_email_addresses_audience_generation_update AFTER UPDATE ON contact_email_addresses BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER contact_email_addresses_audience_generation_delete AFTER DELETE ON contact_email_addresses BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER contact_phones_audience_generation_insert AFTER INSERT ON contact_phones BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER contact_phones_audience_generation_update AFTER UPDATE ON contact_phones BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER contact_phones_audience_generation_delete AFTER DELETE ON contact_phones BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER consent_evidence_audience_generation_insert AFTER INSERT ON consent_evidence BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER consent_evidence_audience_generation_update AFTER UPDATE ON consent_evidence BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER consent_evidence_audience_generation_delete AFTER DELETE ON consent_evidence BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER contact_suppressions_audience_generation_insert AFTER INSERT ON contact_suppressions BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER contact_suppressions_audience_generation_update AFTER UPDATE ON contact_suppressions BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER contact_suppressions_audience_generation_delete AFTER DELETE ON contact_suppressions BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER surviving_opt_outs_audience_generation_insert AFTER INSERT ON surviving_opt_outs BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER surviving_opt_outs_audience_generation_update AFTER UPDATE ON surviving_opt_outs BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER surviving_opt_outs_audience_generation_delete AFTER DELETE ON surviving_opt_outs BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
