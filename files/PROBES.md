# Runtime probes

Head: 49b620633c5e78e271f694af073bc87429db3e8f.

PROBE CONT-006 acceptance-2: signed POST to /webhooks/mail/sendgrid with independently chosen event identities and original times, then authenticated GET of the contact and its built operator page -> HTTP 204 for each fact; three original bounce history entries and the later fresh entry reconcile with persisted facts, exact original times and rendered timeline counts; existing suppression progression and recipient opt-out survive. Assertions execute at 1440; the same screen is captured at 1440 and 390.

PROBE CONT-006 acceptance-3: persisted nonzero count immediately before an issued-message-correlated signed delivery -> 3 before delivery, 0 afterward; a new later signed soft bounce -> 1; reordered replay of all bounce and delivery facts -> still 1, identical history and timeline, five unchanged persisted bounce and delivery facts, and the independent recipient opt-out retained. Final approved work is skipped for both opted-out recipients with no further marketing handoff.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0.

Generated views were restored whole from origin/main before the commit, as required. Checking those restored views returns exit 1 for ACCEPTANCE.md freshness only. The source lock check passes on the committed candidate.
