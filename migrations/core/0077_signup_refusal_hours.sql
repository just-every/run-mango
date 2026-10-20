-- FORM-010: refusals are counted by hour, form and reason, never by address. Each closed hour with
-- refusals becomes one append-only activity entry (OPER-007).
CREATE TABLE signup_refusal_hours (
  hour INTEGER NOT NULL,
  form TEXT NOT NULL CHECK(form IN ('hosted','kiosk')),
  reason TEXT NOT NULL,
  refusals INTEGER NOT NULL CHECK(refusals>0),
  PRIMARY KEY(hour,form,reason)
);
