-- Mango's additive setup-completion storage, adapted from Base
-- modules/operator-auth/accounts/schema/provider-control.sql at
-- 79e70e60eae6277b2f35be58258d0e9d2ffa4dc0. Only the settings and bootstrap
-- trigger used by the pinned package's completeLocalSetup are adopted here;
-- existing accounts, sessions, email-link auth and copied Base files stay intact.
CREATE TABLE IF NOT EXISTS oa_auth_settings (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),
 idp_sign_in INTEGER NOT NULL CHECK(idp_sign_in IN (0,1)),
 generation INTEGER NOT NULL DEFAULT 0,
 first_setup INTEGER NOT NULL DEFAULT 0
);
CREATE TRIGGER IF NOT EXISTS oa_first_setup_provider_setting AFTER INSERT ON oa_bootstrap BEGIN
 INSERT INTO oa_auth_settings(singleton,idp_sign_in,generation,first_setup)
 VALUES(1,0,0,1) ON CONFLICT DO NOTHING;
END;
-- Previously claimed installations have already finished the original setup.
INSERT INTO oa_auth_settings(singleton,idp_sign_in,generation,first_setup)
 SELECT 1,0,0,0 FROM oa_bootstrap WHERE singleton=1 ON CONFLICT DO NOTHING;
