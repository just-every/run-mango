-- Additive: legacy profile JSON is retained byte-for-byte. Typed changes use the
-- existing contact ledger, so import undo, portability and erasure share custody.
CREATE TABLE contact_property_definitions (
  key TEXT PRIMARY KEY NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('text','number','money','date','boolean','list')),
  options_json TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX contact_property_history ON contact_history(contact_id,kind,occurred_at,id);
-- Property reads participate in Mango's existing audience-authority fence.
CREATE TRIGGER property_definitions_generation_insert AFTER INSERT ON contact_property_definitions BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER property_definitions_generation_update AFTER UPDATE ON contact_property_definitions BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER property_definitions_generation_delete AFTER DELETE ON contact_property_definitions BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER property_values_generation_insert AFTER INSERT ON contact_history WHEN NEW.kind='property-change' BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER property_values_generation_update AFTER UPDATE ON contact_history WHEN OLD.kind='property-change' OR NEW.kind='property-change' BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER property_values_generation_delete AFTER DELETE ON contact_history WHEN OLD.kind='property-change' BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER property_profiles_generation_insert AFTER INSERT ON integration_contact_profiles BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER property_profiles_generation_update AFTER UPDATE ON integration_contact_profiles BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER property_profiles_generation_delete AFTER DELETE ON integration_contact_profiles BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
