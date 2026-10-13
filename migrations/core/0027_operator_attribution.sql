-- Historical profiles may share an email with a newly bootstrapped Base owner.
-- Base's separate operator ledger still enforces identity uniqueness and authority.
DROP INDEX operators_email_idx;
CREATE INDEX operators_email_idx ON operators(email);
