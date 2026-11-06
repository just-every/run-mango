-- Connection generations separate current signed marketing traffic from old keys,
-- sender diagnostics and provider lookup facts. No destination is copied here.
ALTER TABLE recipient_steps ADD COLUMN sending_generation TEXT;
ALTER TABLE recipient_steps ADD COLUMN sending_accepted_at INTEGER;
ALTER TABLE recipient_steps ADD COLUMN sending_signed_event_at INTEGER;
CREATE INDEX recipient_steps_sending_watch_idx ON recipient_steps(sending_generation, sending_accepted_at);
