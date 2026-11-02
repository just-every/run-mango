// Shared SQL must initialize independently of sender admission and role writes.
export const effectiveRole = "COALESCE(r.role,CASE WHEN n.role='member' THEN 'author' WHEN n.id=(SELECT owner_id FROM operator_role_settings WHERE singleton=1) THEN 'owner' ELSE 'admin' END)";
