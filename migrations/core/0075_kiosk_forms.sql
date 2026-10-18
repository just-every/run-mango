ALTER TABLE signup_settings ADD COLUMN kiosk_enabled INTEGER NOT NULL DEFAULT 0 CHECK (kiosk_enabled IN (0,1));
ALTER TABLE signup_settings ADD COLUMN kiosk_device_label TEXT NOT NULL DEFAULT '';

