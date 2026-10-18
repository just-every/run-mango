-- Product permissions extend Base's native identity without changing its
-- credential, session-version or final native-owner protections.
CREATE TABLE operator_role_settings (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1), owner_id TEXT NOT NULL
);
-- Freeze the original native owner once. Older equal-operator installations
-- may lack the optional initial-profile marker; their first native owner wins.
INSERT INTO operator_role_settings(singleton,owner_id)
 SELECT 1,n.id FROM oa_operators n LEFT JOIN operators p ON p.id=n.id
 WHERE n.role='owner' AND n.status='active' ORDER BY COALESCE(p.is_initial,0) DESC,n.created_at,n.id LIMIT 1;

-- New installations establish ownership as part of native identity creation,
-- never as a side effect of an authenticated read or a refused operation.
CREATE TRIGGER operator_role_owner_created AFTER INSERT ON oa_operators
WHEN NEW.role='owner' AND NEW.status='active'
BEGIN INSERT OR IGNORE INTO operator_role_settings(singleton,owner_id) VALUES(1,NEW.id); END;
CREATE TRIGGER operator_role_owner_activated AFTER UPDATE OF status,role ON oa_operators
WHEN NEW.role='owner' AND NEW.status='active'
BEGIN INSERT OR IGNORE INTO operator_role_settings(singleton,owner_id) VALUES(1,NEW.id); END;

CREATE TABLE operator_product_roles (
  operator_id TEXT PRIMARY KEY REFERENCES oa_operators(id),
  role TEXT NOT NULL CHECK(role IN ('owner','admin','manager','author','analyst','support')),
  unmasked_contacts INTEGER NOT NULL DEFAULT 0 CHECK(unmasked_contacts IN (0,1)),
  updated_by TEXT NOT NULL REFERENCES oa_operators(id),
  updated_at INTEGER NOT NULL
);

CREATE TABLE operator_privacy_requests (
  id TEXT PRIMARY KEY,
  contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK(kind IN ('erasure')),
  actor_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TRIGGER operator_role_final_owner BEFORE UPDATE OF role ON operator_product_roles
WHEN OLD.role='owner' AND NEW.role!='owner'
AND NOT EXISTS (
  SELECT 1 FROM oa_operators n JOIN operators p ON p.id=n.id
  LEFT JOIN operator_product_roles r ON r.operator_id=n.id
  WHERE n.status='active' AND n.id!=OLD.operator_id
    AND COALESCE(r.role,CASE WHEN n.role='member' THEN 'author' WHEN n.id=(SELECT owner_id FROM operator_role_settings WHERE singleton=1) THEN 'owner' ELSE 'admin' END)='owner'
)
BEGIN SELECT RAISE(ABORT,'last_product_owner'); END;

CREATE TRIGGER operator_role_initial_owner BEFORE INSERT ON operator_product_roles
WHEN NEW.role!='owner' AND EXISTS(SELECT 1 FROM operators p JOIN oa_operators n ON n.id=p.id
 WHERE p.id=NEW.operator_id AND p.id=(SELECT owner_id FROM operator_role_settings WHERE singleton=1) AND n.role!='member' AND n.status='active')
AND NOT EXISTS(SELECT 1 FROM oa_operators n JOIN operators p ON p.id=n.id
 LEFT JOIN operator_product_roles r ON r.operator_id=n.id WHERE n.status='active' AND n.id!=NEW.operator_id
 AND COALESCE(r.role,CASE WHEN n.role='member' THEN 'author' WHEN n.id=(SELECT owner_id FROM operator_role_settings WHERE singleton=1) THEN 'owner' ELSE 'admin' END)='owner')
BEGIN SELECT RAISE(ABORT,'last_product_owner'); END;

CREATE TRIGGER operator_product_owner_removal BEFORE UPDATE OF status ON oa_operators
WHEN OLD.status='active' AND NEW.status!='active'
 AND EXISTS(SELECT 1 FROM operators p LEFT JOIN operator_product_roles r ON r.operator_id=p.id WHERE p.id=OLD.id
 AND COALESCE(r.role,CASE WHEN OLD.role='member' THEN 'author' WHEN OLD.id=(SELECT owner_id FROM operator_role_settings WHERE singleton=1) THEN 'owner' ELSE 'admin' END)='owner')
 AND NOT EXISTS(SELECT 1 FROM oa_operators n JOIN operators p ON p.id=n.id LEFT JOIN operator_product_roles r ON r.operator_id=n.id
 WHERE n.id!=OLD.id AND n.status='active' AND COALESCE(r.role,CASE WHEN n.role='member' THEN 'author' WHEN n.id=(SELECT owner_id FROM operator_role_settings WHERE singleton=1) THEN 'owner' ELSE 'admin' END)='owner')
BEGIN SELECT RAISE(ABORT,'last_product_owner'); END;
