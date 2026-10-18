-- Count installation membership from this migration onward, never reconstruct history
-- from original opt-in dates. Restore swaps tables with triggers suspended.
CREATE TABLE list_growth_baseline (
 channel TEXT PRIMARY KEY CHECK(channel IN ('email','sms')),
 covered_from INTEGER NOT NULL, subscribed INTEGER NOT NULL
);
INSERT INTO list_growth_baseline SELECT 'email', unixepoch('now')*1000, count(*) FROM contacts WHERE email_status='subscribed';
INSERT INTO list_growth_baseline SELECT 'sms', unixepoch('now')*1000, count(*) FROM contacts WHERE sms_status='subscribed';
-- Anonymous facts contain no contact/evidence keys, source prose or addresses.
CREATE TABLE list_growth_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT, observed_at INTEGER NOT NULL,
 channel TEXT NOT NULL CHECK(channel IN ('email','sms')),
 kind TEXT NOT NULL, delta INTEGER NOT NULL CHECK(delta IN (-1,0,1))
);
CREATE INDEX list_growth_events_period ON list_growth_events(observed_at,channel);
-- Removable links resolve consent disclosures without copying personal data.
CREATE TABLE list_growth_attribution (
 event_id INTEGER PRIMARY KEY, contact_id TEXT NOT NULL, evidence_id TEXT
);
CREATE INDEX list_growth_attribution_contact ON list_growth_attribution(contact_id,event_id);
CREATE INDEX list_growth_attribution_evidence ON list_growth_attribution(evidence_id);
CREATE TRIGGER list_growth_email_insert AFTER INSERT ON contacts WHEN NEW.email_status='subscribed' BEGIN
 INSERT INTO list_growth_events(observed_at,channel,kind,delta) SELECT unixepoch('now')*1000,'email','subscription',1 WHERE 1;
 INSERT INTO list_growth_attribution(event_id,contact_id,evidence_id)
 SELECT last_insert_rowid(),NEW.id,(SELECT id FROM consent_evidence WHERE contact_id=NEW.id AND channel='email' ORDER BY occurred_at DESC,id DESC LIMIT 1) WHERE 1;
END;
CREATE TRIGGER list_growth_email_update AFTER UPDATE OF email_status ON contacts WHEN (OLD.email_status='subscribed')<>(NEW.email_status='subscribed') BEGIN
 INSERT INTO list_growth_events(observed_at,channel,kind,delta) SELECT unixepoch('now')*1000,'email', CASE WHEN NEW.merge_lock IS NOT NULL THEN 'merge-correction' WHEN NEW.email_status='subscribed' AND OLD.email_status='unsubscribed' THEN 'resubscribe' WHEN NEW.email_status='subscribed' THEN 'subscription' WHEN NEW.email_status='unsubscribed' THEN 'unsubscribe' WHEN NEW.email_status='suppressed' THEN 'suppression' ELSE 'status-correction' END , CASE WHEN NEW.email_status='subscribed' THEN 1 ELSE -1 END WHERE 1;
 INSERT INTO list_growth_attribution(event_id,contact_id,evidence_id)
 SELECT last_insert_rowid(),NEW.id,(SELECT id FROM consent_evidence WHERE contact_id=NEW.id AND channel='email' ORDER BY occurred_at DESC,id DESC LIMIT 1) WHERE 1;
END;
CREATE TRIGGER list_growth_email_delete BEFORE DELETE ON contacts WHEN OLD.email_status='subscribed' BEGIN
 INSERT INTO list_growth_events(observed_at,channel,kind,delta) VALUES(unixepoch('now')*1000,'email', CASE WHEN EXISTS(SELECT 1 FROM contact_merges WHERE merged_contact_id=OLD.id) THEN 'merge-correction' WHEN EXISTS(SELECT 1 FROM audience_erasure_guard WHERE value=1) THEN 'erasure' ELSE 'removal' END ,-1);
END;
CREATE TRIGGER list_growth_sms_insert AFTER INSERT ON contacts WHEN NEW.sms_status='subscribed' BEGIN
 INSERT INTO list_growth_events(observed_at,channel,kind,delta) SELECT unixepoch('now')*1000,'sms','subscription',1 WHERE 1;
 INSERT INTO list_growth_attribution(event_id,contact_id,evidence_id)
 SELECT last_insert_rowid(),NEW.id,(SELECT id FROM consent_evidence WHERE contact_id=NEW.id AND channel='sms' ORDER BY occurred_at DESC,id DESC LIMIT 1) WHERE 1;
END;
CREATE TRIGGER list_growth_sms_update AFTER UPDATE OF sms_status ON contacts WHEN (OLD.sms_status='subscribed')<>(NEW.sms_status='subscribed') BEGIN
 INSERT INTO list_growth_events(observed_at,channel,kind,delta) SELECT unixepoch('now')*1000,'sms', CASE WHEN NEW.merge_lock IS NOT NULL THEN 'merge-correction' WHEN NEW.sms_status='subscribed' AND OLD.sms_status='unsubscribed' THEN 'resubscribe' WHEN NEW.sms_status='subscribed' THEN 'subscription' WHEN NEW.sms_status='unsubscribed' THEN 'unsubscribe' WHEN NEW.sms_status='suppressed' THEN 'suppression' ELSE 'status-correction' END , CASE WHEN NEW.sms_status='subscribed' THEN 1 ELSE -1 END WHERE 1;
 INSERT INTO list_growth_attribution(event_id,contact_id,evidence_id)
 SELECT last_insert_rowid(),NEW.id,(SELECT id FROM consent_evidence WHERE contact_id=NEW.id AND channel='sms' ORDER BY occurred_at DESC,id DESC LIMIT 1) WHERE 1;
END;
CREATE TRIGGER list_growth_sms_delete BEFORE DELETE ON contacts WHEN OLD.sms_status='subscribed' BEGIN
 INSERT INTO list_growth_events(observed_at,channel,kind,delta) VALUES(unixepoch('now')*1000,'sms', CASE WHEN EXISTS(SELECT 1 FROM contact_merges WHERE merged_contact_id=OLD.id) THEN 'merge-correction' WHEN EXISTS(SELECT 1 FROM audience_erasure_guard WHERE value=1) THEN 'erasure' ELSE 'removal' END ,-1);
END;
CREATE TRIGGER list_growth_contact_erasure AFTER DELETE ON contacts BEGIN
 DELETE FROM list_growth_attribution WHERE contact_id=OLD.id;
END;
CREATE TRIGGER list_growth_evidence_erasure AFTER DELETE ON consent_evidence BEGIN
 DELETE FROM list_growth_attribution WHERE evidence_id=OLD.id;
END;
CREATE TRIGGER list_growth_evidence_merge AFTER UPDATE OF contact_id ON consent_evidence BEGIN
 UPDATE list_growth_attribution SET contact_id=NEW.contact_id WHERE evidence_id=NEW.id;
END;
CREATE TRIGGER list_growth_evidence_insert AFTER INSERT ON consent_evidence BEGIN
 INSERT INTO list_growth_events(observed_at,channel,kind,delta) SELECT unixepoch('now')*1000,NEW.channel,'capture',0 WHERE 1;
 INSERT INTO list_growth_attribution(event_id,contact_id,evidence_id) SELECT last_insert_rowid(),NEW.contact_id,NEW.id WHERE 1;
 INSERT INTO list_growth_events(observed_at,channel,kind,delta) SELECT unixepoch('now')*1000,NEW.channel,'confirmation',0 WHERE NEW.confirmed_at IS NOT NULL;
 INSERT INTO list_growth_attribution(event_id,contact_id,evidence_id) SELECT last_insert_rowid(),NEW.contact_id,NEW.id WHERE NEW.confirmed_at IS NOT NULL;
 UPDATE list_growth_attribution SET evidence_id=NEW.id
 WHERE event_id=(SELECT max(a.event_id) FROM list_growth_attribution a
 JOIN list_growth_events e ON e.id=a.event_id
 WHERE a.contact_id=NEW.contact_id AND e.channel=NEW.channel AND e.delta=1)
 AND evidence_id IS NULL AND NEW.confirmed_at IS NOT NULL
 AND EXISTS(SELECT 1 FROM contacts c WHERE c.id=NEW.contact_id
 AND CASE NEW.channel WHEN 'email' THEN c.email_status ELSE c.sms_status END ='subscribed');
END;
CREATE TRIGGER list_growth_evidence_confirm AFTER UPDATE OF confirmed_at ON consent_evidence WHEN OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL BEGIN
 INSERT INTO list_growth_events(observed_at,channel,kind,delta) SELECT unixepoch('now')*1000,NEW.channel,'confirmation',0 WHERE NEW.confirmed_at IS NOT NULL;
 INSERT INTO list_growth_attribution(event_id,contact_id,evidence_id) SELECT last_insert_rowid(),NEW.contact_id,NEW.id WHERE NEW.confirmed_at IS NOT NULL;
 UPDATE list_growth_attribution SET evidence_id=NEW.id
 WHERE event_id=(SELECT max(a.event_id) FROM list_growth_attribution a
 JOIN list_growth_events e ON e.id=a.event_id
 WHERE a.contact_id=NEW.contact_id AND e.channel=NEW.channel AND e.delta=1)
 AND evidence_id IS NULL AND NEW.confirmed_at IS NOT NULL
 AND EXISTS(SELECT 1 FROM contacts c WHERE c.id=NEW.contact_id
 AND CASE NEW.channel WHEN 'email' THEN c.email_status ELSE c.sms_status END ='subscribed');
END;
-- Respect the same pending-erasure write fence as existing contact sidecars.
CREATE TRIGGER list_growth_attribution_insert_fence BEFORE INSERT ON list_growth_attribution
WHEN EXISTS(SELECT 1 FROM audience_erasures WHERE state='pending') AND NOT EXISTS(SELECT 1 FROM audience_erasure_guard WHERE value=1)
BEGIN SELECT RAISE(ABORT,'CONTACT_ERASURE_PENDING'); END;
CREATE TRIGGER list_growth_attribution_update_fence BEFORE UPDATE ON list_growth_attribution
WHEN EXISTS(SELECT 1 FROM audience_erasures WHERE state='pending') AND NOT EXISTS(SELECT 1 FROM audience_erasure_guard WHERE value=1)
BEGIN SELECT RAISE(ABORT,'CONTACT_ERASURE_PENDING'); END;
