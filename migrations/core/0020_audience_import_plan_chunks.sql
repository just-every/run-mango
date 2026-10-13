-- Preview plans retain complete consent ledgers and originals without exceeding
-- D1's 2 MB string/row bound. Identity indexes preserve erasure discovery.
CREATE TABLE audience_import_plan_chunks (
 fingerprint TEXT NOT NULL REFERENCES audience_import_plans(fingerprint) ON DELETE CASCADE,
 ordinal INTEGER NOT NULL,
 content TEXT NOT NULL,
 PRIMARY KEY(fingerprint,ordinal)
);
CREATE TABLE audience_import_plan_contacts (
 fingerprint TEXT NOT NULL REFERENCES audience_import_plans(fingerprint) ON DELETE CASCADE,
 contact_id TEXT NOT NULL,
 email TEXT NOT NULL,
 PRIMARY KEY(fingerprint,contact_id,email)
);
CREATE INDEX audience_import_plan_contacts_contact ON audience_import_plan_contacts(contact_id);
CREATE INDEX audience_import_plan_contacts_email ON audience_import_plan_contacts(email);
