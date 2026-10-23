-- Methods: 1 visible link, 2 RFC 8058 one-click, 3 authenticated SMS reply. Numeric outcomes contain no personal text.
ALTER TABLE public_action_tokens ADD COLUMN used_method INTEGER CHECK(used_method IN (1,2,3));
ALTER TABLE recipient_steps ADD COLUMN message_unsubscribed_at INTEGER;
ALTER TABLE recipient_steps ADD COLUMN unsubscribe_method INTEGER CHECK(unsubscribe_method IN (1,2,3));
UPDATE recipient_steps SET message_unsubscribed_at=(SELECT MIN(at) FROM (
 SELECT used_at at FROM public_action_tokens WHERE recipient_step_id=recipient_steps.id AND purpose='unsubscribe' AND used_at IS NOT NULL
 UNION ALL SELECT provider_occurred_at FROM delivery_facts WHERE recipient_step_id=recipient_steps.id AND kind='unsubscribed'));
CREATE TRIGGER recipient_token_unsubscribe_insert AFTER INSERT ON public_action_tokens WHEN NEW.purpose='unsubscribe' AND NEW.used_at IS NOT NULL BEGIN
 UPDATE recipient_steps SET message_unsubscribed_at=NEW.used_at,unsubscribe_method=NEW.used_method WHERE id=NEW.recipient_step_id AND (message_unsubscribed_at IS NULL OR NEW.used_at<message_unsubscribed_at OR (NEW.used_at=message_unsubscribed_at AND unsubscribe_method IS NULL));
END;
CREATE TRIGGER recipient_token_unsubscribe_use AFTER UPDATE OF used_at ON public_action_tokens WHEN NEW.purpose='unsubscribe' AND OLD.used_at IS NULL AND NEW.used_at IS NOT NULL BEGIN
 UPDATE recipient_steps SET message_unsubscribed_at=NEW.used_at,unsubscribe_method=NEW.used_method WHERE id=NEW.recipient_step_id AND (message_unsubscribed_at IS NULL OR NEW.used_at<message_unsubscribed_at OR (NEW.used_at=message_unsubscribed_at AND unsubscribe_method IS NULL));
END;
CREATE TRIGGER recipient_provider_unsubscribe AFTER INSERT ON delivery_facts WHEN NEW.kind='unsubscribed' BEGIN
 UPDATE recipient_steps SET message_unsubscribed_at=NEW.provider_occurred_at,unsubscribe_method=NULL WHERE id=NEW.recipient_step_id AND (message_unsubscribed_at IS NULL OR NEW.provider_occurred_at<message_unsubscribed_at);
END;
