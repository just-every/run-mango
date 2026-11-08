# Public-door observations

PROBE FORM-012 4: authenticated Admin PUT of the native globalHour floor plus one -> 403 signup_allowance_owner_required; active and pending readback, complete signup_allowance_levels rows and allowance-change audit rows unchanged.
PROBE FORM-012 4: authenticated Owner PUT of the native globalHour floor minus one -> 400 signup_allowance_below_floor; active and pending readback, complete signup_allowance_levels rows and allowance-change audit rows unchanged.
PROBE FORM-012 4: authenticated Owner PUT of the native globalHour ceiling plus one -> 400 signup_allowance_above_handoff_ceiling; active and pending readback, complete signup_allowance_levels rows and allowance-change audit rows unchanged.
PROBE FORM-012 retained control: Owner PUT of the current globalHour value plus one, repeated -> 200 twice, current allowance retained until the fixture advances the native allowance row into the active hour, then the raised value is active, pending state is empty and exactly one Owner activity entry names the change and original effective time.

Each observation is an assertion in capacityJourney, invoked by the existing shared-kiosk registration. Requests pass through the native Worker, authentication, authority and D1. The test-only fixture supplies identities and reads persisted rows; all allowance writes use the product route. Confirmation mail and challenge verification remain existing network-edge fixtures.
