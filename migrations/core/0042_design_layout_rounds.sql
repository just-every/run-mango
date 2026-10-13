-- Design runs keep their designs on offer after a failed layout step (DESIGN-002): the operator may try the layout
-- again or choose another design from the same run. Each such try is a new paid layout with its own idempotency key
-- (DESIGN-003), so the run counts its layout rounds. Existing rows start at round 0, whose keys are unchanged.
ALTER TABLE design_jobs ADD COLUMN layout_round INTEGER NOT NULL DEFAULT 0 CHECK(layout_round >= 0);
