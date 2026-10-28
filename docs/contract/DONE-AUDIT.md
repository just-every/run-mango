Old reference: `e794f78264dedbe6da9fd22d076100c11a711ddb`.

# Carried-done journey audit

One decision per part of an old-reference DONE clause. “covered” names complete carried acceptance; “none” means no complete covering journey, even where the named old-evidence journeys show delivered subsets. No partial part is promoted. Journey names and files match the Status Evidence cells. Widths describe the cited browser legs, not a new execution receipt.

| Clause | Journey | Door | What it shows | Covered or none |
| --- | --- | --- | --- | --- |
| HOME-001 | “[OPER-001] fresh install completes sender setup after one-click owner sign-in at 1440 and 390” (`tests/local-start/local.journey.ts:11`) | Browser 390/1440; authenticated HTTP | Partial evidence: Finish setup points to setup before claim; Sign in points to native sign-in after claim; Unclaimed state before setup; Claimed state after setup Missing journey: “Installation Lobby — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| HOME-002 | none | Public browser/API journey not covered | No asserting journey for this part in the old Evidence set. Missing journey: “Newsletter landing — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| DOCS-001 | “[DOCS-001] the docs home answers at /docs and /docs/; unknown, miscased, nested and index slugs are a 404 in the shared frame” (`tests/docs.spec.ts:68`); “[DOCS-001] every manifest page renders with one h1, section navigation, previous and next, and no cookie or foreign request” (`tests/docs.spec.ts:21`); “[DOCS-001] lists the page sections under On this page and links the header to the app” (`tests/docs.spec.ts:52`); “[DOCS-001] the docs fit the screen at desktop and phone widths and the phone shows a Contents disclosure” (`tests/docs.spec.ts:93`) | Browser 390/1440; authenticated HTTP | Partial evidence: Public docs home and trailing-slash home; Manifest navigation order; Exactly one page title; Current page; Page-section navigation; Previous and next links; Phone Contents disclosure; Docs is current; Sign in destination; Reserved and unknown slug responses; Shared not-found header; Shared not-found footer; Link to docs home; Link to landing Missing journey: “Public documentation — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| OPER-001 | “[OPER-001] fresh install completes sender setup after one-click owner sign-in at 1440 and 390” (`tests/local-start/local.journey.ts:11`) | Browser 390/1440; authenticated HTTP | Partial evidence: Server navigation remains at setup; Client navigation remains at setup; Invalid sender data does not write; Saved identity opens app documents Missing journey: “Operators and the default role — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| OPER-002 | none | Public browser/API journey not covered | No asserting journey for this part in the old Evidence set. Missing journey: “Management — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| OPER-003 | “[PUB-005][FORM-008][FORM-010][INT-004][OPER-003][OPER-004] roles govern native requests and removal retains authors, approvers and history” (`tests/go-live/roles.journeys.ts:11`) | Browser 390/1440; authenticated HTTP | Partial evidence: Campaign author; Revision approver; Approval request; Author and approver activity; Campaign, revision, request, transition and audit records unchanged after removal; Review author; Review approver; Review approval-request author; Campaign detail author; Campaign detail approver; Activity attribution unchanged Missing journey: “Removal does not rewrite history — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| STORE-002 | “[STORE-004] native authenticated sync imports complete Shopify records and retains original purchase time through nested-page failures and retry” (`tests/shopify/connection.spec.ts:33`); “signed carts preserve string identity, multiple lines and ordering; conflicting delivery, tenant and topics cannot mutate source facts” (`tests/shopify/connection.spec.ts:117`); “signed pixel collector binds actual proxy customer, rejects forged identity/catalog/purposes/replays and keeps quiet replay and withdrawal truthful” (`tests/shopify/connection.spec.ts:154`) | Browser (viewport not claimed); authenticated HTTP | Partial evidence: One record after repeated order sync and webhook; One cart’s payload retained under replay; Browsing-event replay has one observation for its id Missing journey: “Source identity — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| STORE-003 | “[STORE-003] [STORE-004] Decision Desk retains each completed sync through a later failed page and recovery” (`tests/go-live/source-freshness.journeys.ts:11`) | Browser 390/1440; authenticated HTTP | Complete carried acceptance: Last-success time and later error; Failed source retains completion; Unaffected source unchanged; Unstarted sources have no completed time; Unstarted source visible in desk; Completion time advances; Error clears; Recovered desk no longer shows failure; Safe failure cause; Retained completion time visible; Provider-private diagnostics absent | covered |
| STORE-004 | “[STORE-003] [STORE-004] Decision Desk retains each completed sync through a later failed page and recovery” (`tests/go-live/source-freshness.journeys.ts:11`); “[PUB-005][FORM-008][FORM-010][INT-004][OPER-003][OPER-004] roles govern native requests and removal retains authors, approvers and history” (`tests/go-live/roles.journeys.ts:11`) | Browser 390/1440; authenticated HTTP | Complete carried acceptance: Generation failure and safe source error; Signed webhook failure and replay one record; Forged delivery records none; Recovery completes existing webhook operation; Stripe signed failure and recovery; Failure text excludes diagnostics, secret, token and product record payload; Saved draft readable after edit; Recorded history equality; Scheduled campaign retains state; No added provider handoff; Generation and webhook failure visibility; Signed outage webhook retains failed response; Recovery webhook is accepted | covered |
| STORE-005 | “[STORE-005] [STORE-006][AUD-003] sources recover only after completed sync and review counts commerce and dormancy exclusions” (`tests/go-live/stale-sources.journeys.ts:29`) | Browser 390/1440; authenticated HTTP | Complete carried acceptance: Stale status and safe cause; Refused approval blocker; Counts unavailable; No approval authority; No recipients; Safe cause visible; Approval disabled; Recheck enables approval; Approval proceeds to saved schedule | covered |
| STORE-006 | none | Public browser/API journey not covered | No asserting journey for this part in the old Evidence set. Missing journey: “Declared adapter capability — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CONT-001 | “[MOVE-009][CONT-001][CONT-002][CONT-003][CONT-010][CAMP-002][CAMP-004][SEND-006][DATA-001] an account export moves in by status, keeps consent, carries no authority and undoes safely” (`tests/move-in/archive.journeys.ts:34`) | Browser 390/1440; authenticated HTTP | Partial evidence: Archive duplicate email identities reconcile Missing journey: “Contact identity — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CONT-002 | “[MOVE-009][CONT-001][CONT-002][CONT-003][CONT-010][CAMP-002][CAMP-004][SEND-006][DATA-001] an account export moves in by status, keeps consent, carries no authority and undoes safely” (`tests/move-in/archive.journeys.ts:34`); “[CONT-002][CONT-004][CONT-010] an export's unsubscribe or cleaned status reaches a contact an earlier import holds, and keeps their own edits” (`tests/move-in/held.journeys.ts:44`) | Browser 390/1440; authenticated HTTP | Partial evidence: Imported subscribed, non-subscribed, unsubscribed and suppressed email states; Only eligible unsubscribed and suppressed exclusions leave the recipient set Missing journey: “Channel status — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CONT-003 | “[CONT-003][CONT-010][CAMP-004] imported category choices match the saved draft and explain approval mismatches” (`tests/campaign-authoring/import-category.spec.ts:5`); “CONT-003 a stale or missing rendered disclosure cannot capture changed sender consent” (`tests/audience-import/signup.spec.ts:49`); “CONT-003/009 public signup remains pending until single-use expiring confirmation and records source time method IP” (`tests/audience-import/signup.spec.ts:5`) | Browser 390/1440; authenticated HTTP | Partial evidence: Category/sender mismatch blocks approval; Stale and missing disclosure create no evidence; Retained capture source record; Retained capture method; Retained capture occurrence time Missing journey: “Consent evidence — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CONT-004 | “[MSG-003][CONT-004][CONT-009][CAMP-008] the List-Unsubscribe one-click works as a mail client sends it and nothing else unsubscribes” (`tests/go-live/go-live.journeys.ts:192`); “[CONT-004][CONT-013] erasure removes signed unmatched SMS facts with canonical and historical formatted destinations” (`tests/provider-suppression-ingress.spec.ts:201`); “[CONT-004][CONT-010] undoing a CSV unsubscribe or cleaned list, or an archive, never lifts an opt-out” (`tests/move-in/held.journeys.ts:151`) | Browser 390/1440; authenticated HTTP | Partial evidence: One-click state committed when response completes; Review excludes opted-out contact; Queued dispatch skips opted-out recipient; SMS opt-out committed at response; Import and undo retain restriction Missing journey: “Opt-out precedence — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CONT-005 | “[CONT-006][CONT-005][CONT-013] suppression preceding contact creation blocks fresh capture and erasure removes raw unmatched ingress” (`tests/provider-suppression-ingress.spec.ts:87`) | Authenticated HTTP | Partial evidence: Suppression blocks fresh capture and handoff Missing journey: “Resubscription — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CONT-006 | “[CONT-006][SEND-006] signed unmatched destination suppression is durable before acknowledgement and replay creates no delivery” (`tests/provider-suppression-ingress.spec.ts:66`); “[SEND-005][SEND-006][SEND-007][SEND-008][CONT-006] signed SendGrid facts replayed through the public webhook keep delivery truth separate” (`tests/go-live/go-live.journeys.ts:37`) | Browser 390/1440; authenticated HTTP | Partial evidence: Provider suppression retained before handoff eligibility; Hard bounce and complaint both suppress; Signed ingress rejects invalid identity without changing accepted state Missing journey: “Email suppression — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CONT-008 | “[CONT-008] [CONT-017] a contact profile combines identities, properties, segments and original source, consent, suppression, eligibility, delivery and operator facts with masked role views” (`tests/audience-controls/contact-history.spec.ts:10`) | Browser 390/1440; authenticated HTTP | Partial evidence: All required fact kinds present; Occurrence order; Form source record; Conversion source record; SMS source record; Click source record; Original order time and source record; Original delivery time and provider; Dispatch exclusion cause; Operator attribution; Older events remain reachable; Visible times equal full ordered timeline; No other-contact or private-payload markers in timeline; No other-contact marker in detail Missing journey: “Contact history — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CONT-009 | “CONT-003/009 public signup remains pending until single-use expiring confirmation and records source time method IP” (`tests/audience-import/signup.spec.ts:5`); “CONT-007/009 signed SMS signup confirms once; linked STOP is durable and HELP/START cannot subscribe or duplicate replies” (`tests/audience-import/signup.spec.ts:57`); “[MSG-003][CONT-004][CONT-009][CAMP-008] the List-Unsubscribe one-click works as a mail client sends it and nothing else unsubscribes” (`tests/go-live/go-live.journeys.ts:192`); “CONT-004/006/009 later optout blocks confirmation and uncertain confirmation delivery is never automatically repeated” (`tests/audience-import/signup.spec.ts:31`) | Browser 390/1440; authenticated HTTP | Partial evidence: Email pending state and one confirmation; SMS pending state and one message; Email becomes subscribed after confirmation; Repeated confirmation cannot reconfirm; Expired link invalid; Expiry leaves channel pending; Email confirmation GET leaves state unchanged; SMS confirmation GET leaves pending state unchanged; Explicit affirmative confirmation POST; Later opt-out prevents confirmation Missing journey: “Confirmation — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CONT-010 | “[MOVE-009][CONT-001][CONT-002][CONT-003][CONT-010][CAMP-002][CAMP-004][SEND-006][DATA-001] an account export moves in by status, keeps consent, carries no authority and undoes safely” (`tests/move-in/archive.journeys.ts:34`) | Browser 390/1440; authenticated HTTP | Partial evidence: Archive per-file rejected and duplicate counts; Archive rerun repeated marker; Rerun leaves full table counts unchanged; Canonical identity update; All row outcomes reconcile; Opted-out identity retained after rerun; Owner affirmatively attests incumbent source record; Undo retains later restrictions Missing journey: “Import — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CONT-011 | “CONT-011 CONT-004 CONT-009 AUD-005 merge preserves restrictions, links and immutable recipients through authenticated public routes” (`tests/audience-controls/merge.spec.ts:7`) | Authenticated HTTP | Partial evidence: Exact union of consent, source activity, suppressions and campaign history; Restrictive merge in both directions; Restricted aliases remain ineligible; Old unsubscribe reaches surviving aliases Missing journey: “Merge — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CONT-012 | “[STORE-005] [STORE-006][AUD-003] sources recover only after completed sync and review counts commerce and dormancy exclusions” (`tests/go-live/stale-sources.journeys.ts:29`); “[CONT-012][AUD-008][MOVE-009] imported engagement governs review and immutable dispatch policy without changing consent” (`tests/move-in/archive.journeys.ts:370`) | Browser 390/1440; authenticated HTTP | Partial evidence: Native aged order causes dormant exclusion; Dormancy never removes current eligible order; Imported click retains original time; Imported opens cannot prevent dormancy; No-history grace label and inclusion; Grace ends only after a full window; Open-only label visible; Inactivity leaves all existing contacts and their consent/suppression states unchanged Missing journey: “Dormancy without deletion — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CONT-013 | “[CONT-030] current erasure authority refuses an old archive on an empty restore target” (`tests/portability.spec.ts:213`) | Authenticated HTTP | Partial evidence: Restricted opt-out survives erase and archive restore; Readable address and name absent after erasure archive Missing journey: “Erasure and surviving opt-out — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CONT-029 | “[CONT-030] current erasure authority refuses an old archive on an empty restore target” (`tests/portability.spec.ts:213`) | Authenticated HTTP | Partial evidence: Surviving restrictions round-trip archive restore; Address and name absent in current archive Missing journey: “Portable surviving restrictions — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CONT-030 | “[CONT-030] current erasure authority refuses an old archive on an empty restore target” (`tests/portability.spec.ts:213`) | Authenticated HTTP | Partial evidence: Old archive rejected with no restored contacts; No contacts after rejection; Locally known current authority rejects old manifest before staging Missing journey: “Erasure-safe restore authority — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CONT-028 | none | Public browser/API journey not covered | No asserting journey for this part in the old Evidence set. Missing journey: “Guarded consent capture — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| PROP-001 | “[PROP-001] Decision Desk returns only proposed suggestions in revenue then deadline order” (`tests/proposals-decision/decision-routes.spec.ts:290`) | Authenticated HTTP Decision Desk | Complete carried acceptance: Only proposed proposals appear; Revenue ordering, deadline tiebreak and insufficient-history last | covered |
| PROP-002 | “[PROP-002] proposal route and detail show observed values, event IDs, lookback, rules, as-of, timing and methods” (`tests/proposals-decision/decision-routes.spec.ts:161`); “[PROP-004][BUILD-001][BUILD-002] accepted content and sender are previewable and editable as a saved draft” (`tests/proposals-decision/decision-routes.spec.ts:228`) | Browser (viewport not claimed); authenticated HTTP | Partial evidence: Triggering source events; Lookback window; Source-data as-of; Inclusion rule; Exclusion rule; Send-by instant and scheduled instant relationship; Proposed channels; Forecast method displayed Missing journey: “Evidence — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| PROP-003 | “[PROP-003] generated audience counts apply real consent exclusions and count each eligible channel step” (`tests/proposals-decision/decision-routes.spec.ts:212`) | Browser (viewport not claimed); authenticated HTTP | Partial evidence: Candidate count; Excluded contact count; Eligible contact count; Per-channel recipient-step count Missing journey: “Counts — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| PROP-004 | “[PROP-004][BUILD-001][BUILD-002] accepted content and sender are previewable and editable as a saved draft” (`tests/proposals-decision/decision-routes.spec.ts:228`) | Browser (viewport not claimed); authenticated HTTP | Partial evidence: Editable campaign name; Editable email subject; Saved email preview; Saved SMS preview Missing journey: “Content — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| PROP-005 | “[PROP-004][BUILD-001][BUILD-002] accepted content and sender are previewable and editable as a saved draft” (`tests/proposals-decision/decision-routes.spec.ts:228`) | Browser (viewport not claimed); authenticated HTTP | Partial evidence: Adoption retains draft state; Generation and adoption enqueue nothing Missing journey: “Owner control — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| PROP-006 | none | Public browser/API journey not covered | No asserting journey for this part in the old Evidence set. Missing journey: “Grounded generation — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| PROP-007 | “[PROP-007] provider rejection produces an auditable failed proposal, unknown cost and no substitute draft” (`tests/proposals-decision/proposal-states.spec.ts:57`) | Authenticated HTTP | Partial evidence: Provider error recorded; No substitute campaign Missing journey: “Generation failure — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| PROP-008 | “[PROP-008] forecasts use owned mature history including failed and zero-revenue recipients, and refuse thin or mixed-currency history” (`tests/proposals-decision/decision-routes.spec.ts:275`) | Browser (viewport not claimed); authenticated HTTP | Partial evidence: Own campaign identifiers; Own event identifiers; Campaign count; Event count; Thin history has no range Missing journey: “Forecast provenance — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| PROP-009 | “[PROP-009] authenticated decisions record actor/time once and all request paths fence expiry and competing decisions” (`tests/proposals-decision/proposal-states.spec.ts:5`); “[PROP-007] provider rejection produces an auditable failed proposal, unknown cost and no substitute draft” (`tests/proposals-decision/proposal-states.spec.ts:57`) | Authenticated HTTP | Partial evidence: Approved state with linked campaign; Dismissed state; Dismissal reason read back; Expired state; Failed state; Dismissed or expired proposal refuses approval; Approved proposal refuses dismissal; Actor; Single transition under competing decisions Missing journey: “Proposal states — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| AUD-001 | “[SEG-001] AUD-001 AUD-002 AUD-007 CAMP-004 nested saved segments select exact contacts by count, event value, window and state at 1440/390; copied rules remain immutable” (`tests/audience-controls/segments.spec.ts:7`) | Browser 390/1440; authenticated HTTP | Partial evidence: Candidate count; Eligible contact count; Every exclusion reason and count Missing journey: “Review snapshot — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| AUD-002 | none | Public browser/API journey not covered | No asserting journey for this part in the old Evidence set. Missing journey: “Consent and suppression — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| AUD-003 | “[STORE-005] [STORE-006][AUD-003] sources recover only after completed sync and review counts commerce and dormancy exclusions” (`tests/go-live/stale-sources.journeys.ts:29`) | Browser 390/1440; authenticated HTTP | Complete carried acceptance: Reason and count in review; Recent product purchase; Unresolved refund; Unresolved return; Twelve-month dormancy; Resolved commerce remains eligible; Eleven-month activity remains eligible; Thirteen-month activity is excluded | covered |
| AUD-004 | none | Public browser/API journey not covered | No asserting journey for this part in the old Evidence set. Missing journey: “Frequency protection — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| AUD-005 | “[SEND-004] a signed restriction committed while dispatch waits at its real D1 fence prevents the provider request” (`tests/go-live/delivery.journeys.ts:67`); “CONT-011 CONT-004 CONT-009 AUD-005 merge preserves restrictions, links and immutable recipients through authenticated public routes” (`tests/audience-controls/merge.spec.ts:7`) | Browser 390; authenticated HTTP | Partial evidence: Immediate hand-off eligibility recheck; Complaint after approval prevents hand-off; Merge after approval prevents hand-off; Merge skip reason is recorded Missing journey: “Dispatch recheck — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| AUD-006 | “[AUD-006] later steps reapply ordinary inclusion, custom exclusions and consent without adding new candidates” (`tests/go-live/multistep.journeys.ts:10`) | Browser 390/1440; authenticated HTTP | Partial evidence: Changed eligibility prevents later step; Changed inclusion yields named skip; Custom exclusion yields named skip; Consent change yields named skip; Only eligible control receives second step; Newly matching contact never added Missing journey: “Multi-step exit — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| AUD-007 | “[SEG-001] AUD-001 AUD-002 AUD-007 CAMP-004 nested saved segments select exact contacts by count, event value, window and state at 1440/390; copied rules remain immutable” (`tests/audience-controls/segments.spec.ts:7`) | Browser 390/1440; authenticated HTTP | Partial evidence: Frozen candidate set survives segment changes Missing journey: “Frozen candidate set — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CAMP-001 | “[CAMP-001] [CAMP-009][CAMP-010][SEND-006][SEND-007][RESULT-001][RESULT-007][RESULT-008][SEG-003][REPORT-004] stored step results and deadline/DST truth at 1440” (`tests/campaign-results/results.journeys.ts:42`) | Browser 390/1440; authenticated HTTP | Partial evidence: Scheduled state; Dispatching state; Completed state; Canceled state Missing journey: “States — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CAMP-002 | “[CAMP-002][CAMP-003][CAMP-004][CAMP-005][CAMP-006][CAMP-018][BUILD-002] fresh authoring through actual Worker and D1 at 1440px” (`tests/campaign-authoring/browser.spec.ts:14`) | Browser 1440; authenticated HTTP | Partial evidence: Persisted Campaign name; Persisted Message content; Persisted Links; Persisted Schedule Missing journey: “Draft editing — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CAMP-003 | “[CAMP-002][CAMP-003][CAMP-004][CAMP-005][CAMP-006][CAMP-018][BUILD-002] fresh authoring through actual Worker and D1 at 1440px” (`tests/campaign-authoring/browser.spec.ts:14`) | Browser 1440; authenticated HTTP | Partial evidence: Desktop saved preview Missing journey: “Revision preview — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CAMP-004 | “[CAMP-002][CAMP-003][CAMP-004][CAMP-005][CAMP-006][CAMP-018][BUILD-002] fresh authoring through actual Worker and D1 at 1440px” (`tests/campaign-authoring/browser.spec.ts:14`) | Browser 1440; authenticated HTTP | Partial evidence: Refusal leaves campaign in draft; Every blocking check named; Missing subject named; Missing body named; Missing preheader named; Optional AI or commerce absence permits manual mail-only draft; Required source dependency blocks Missing journey: “Approval checks — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CAMP-005 | “[CAMP-002][CAMP-003][CAMP-004][CAMP-005][CAMP-006][CAMP-018][BUILD-002] fresh authoring through actual Worker and D1 at 1440px” (`tests/campaign-authoring/browser.spec.ts:14`) | Browser 1440; authenticated HTTP | Partial evidence: One scheduled campaign; One recipient-step set; One approval after repeat Missing journey: “Idempotent approval — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CAMP-006 | “[CAMP-002][CAMP-003][CAMP-004][CAMP-005][CAMP-006][CAMP-018][BUILD-002] fresh authoring through actual Worker and D1 at 1440px” (`tests/campaign-authoring/browser.spec.ts:14`) | Browser 1440; authenticated HTTP | Partial evidence: IANA zone retained; Resolved UTC retained; Ambiguous local time refused; Nonexistent local time refused; Store-zone default; Store zone independent of browser zone; Read-only resolved UTC; 23:59 local deadline; UI daylight-saving refusal; API non-hour DST refusal Missing journey: “Schedule — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CAMP-007 | “[CAMP-007] replacement and dispatch each win a forced real D1 ordering without mixing revisions” (`tests/go-live/delivery.journeys.ts:29`) | Browser 390; authenticated HTTP | Partial evidence: Editing produces draft replacement; Only replacement schedule hands off; Prior pending recipients canceled; Replacement atomic with dispatch race; Post-dispatch edit creates another campaign Missing journey: “Scheduled edits — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CAMP-008 | “[SEND-005][SEND-006][SEND-007][SEND-008][CONT-006] signed SendGrid facts replayed through the public webhook keep delivery truth separate” (`tests/go-live/go-live.journeys.ts:37`) | Browser 390/1440; authenticated HTTP | Partial evidence: Test content is marked; No contact activity change; No reporting change Missing journey: “Test send — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CAMP-009 | “[CAMP-009] cancel dialog contains focus, Escape cancels and returns focus; confirmed cancel retains uncertain handoffs” (`tests/campaign-results/results.journeys.ts:126`); “[CAMP-001] [CAMP-009][CAMP-010][SEND-006][SEND-007][RESULT-001][RESULT-007][RESULT-008][SEG-003][REPORT-004] stored step results and deadline/DST truth at 1440” (`tests/campaign-results/results.journeys.ts:42`) | Browser 390/1440; authenticated HTTP | Partial evidence: Accepted hand-offs remain separate; In-flight uncertainty retained; Countdown to next dispatch Missing journey: “Cancellation — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CAMP-010 | none | Public browser/API journey not covered | No asserting journey for this part in the old Evidence set. Missing journey: “Step deadline — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CAMP-011 | “[CAMP-010][CAMP-011][SEND-006] scheduler entries survive restart and preserve provider delivery truth” (`tests/go-live/scheduler.journeys.ts:12`) | Browser 390; authenticated HTTP | Complete carried acceptance: Dispatch within 60 seconds; Duplicate scheduler runs dispatch once | covered |
| CAMP-012 | “[CAMP-012] an uploaded image is stored once by content hash and served publicly, immutable and cookie-free” (`tests/campaign-assets.spec.ts:29`); “[CAMP-012] uploads without a session, from another origin, of the wrong type, oversize or out of bounds store nothing” (`tests/campaign-assets.spec.ts:66`); “[CAMP-012] an image past its per-minute allowance answers 429 without affecting other images” (`tests/campaign-assets.spec.ts:87`) | Authenticated HTTP | Partial evidence: Signed-in image upload; PNG accepted; Header type overrides declared type; Truncated upload refused; Byte limit; Pixel limit; Refusals store nothing; Store once by hash; Image bytes immutable; Exact image type; No-sniff; Immutable public cache; Unknown image not found; Per-image refusal; Other image unaffected Missing journey: “Campaign images — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CAMP-014 | “[CAMP-014] operator pause fences queued handoffs and resumes two steps with current consent at 1440” (`tests/go-live/pause.journeys.ts:8`) | Browser 1440; authenticated HTTP | Partial evidence at 1440: Pause stops new hand-offs within 30 seconds; Already handed-off dispositions retained; Resume only remaining recipients; Current consent rechecked; Expired deadline after pause skips; No sends while paused; Each eligible step handed once; Pause actor retained; Resume actor retained Missing journey: “Pause and resume — complete acceptance at 390”; the cited registration loops over [1440] only. | none |
| CAMP-016 | “[CAMP-016] non-clicker follow-up keeps scanner-only readers, current exclusions and independent approval at 1440” (`tests/campaign-results/followup.journeys.ts:5`) | Browser 1440; authenticated HTTP | Partial evidence: Linked follow-up and selected delay; New subject; Non-opener estimate label; 48-hour non-clicker candidates; Current exclusions including frequency; Independent approval; Independent frequency check Missing journey: “Follow-up to non-engaged recipients — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CAMP-018 | none | Public browser/API journey not covered | No asserting journey for this part in the old Evidence set. Missing journey: “Duplicate a campaign — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| DESIGN-001 | “[DESIGN-001] without the design module the editor offers no generation and the API refuses to start one” (`tests/campaign-authoring/design-generation.spec.ts:45`); “[DESIGN-003 DESIGN-007 DESIGN-008 DESIGN-010] a run sends only the brief, never buys twice, records its costs, waits out 12ui and fails visibly without changing the draft” (`tests/campaign-authoring/design-generation.spec.ts:178`) | Browser 1440; authenticated HTTP | Partial evidence: Default-off when both inputs absent; No generation control; Unavailable run refusal names input; Configured owner key used Missing journey: “Optional design module — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| DESIGN-002 | “[DESIGN-002 DESIGN-008 DESIGN-009 DESIGN-010] Design with 12ui turns a brief into an unsaved body through the import path, and only Save uses the run” (`tests/campaign-authoring/design-generation.spec.ts:65`); “[DESIGN-003 DESIGN-007 DESIGN-008 DESIGN-010] a run sends only the brief, never buys twice, records its costs, waits out 12ui and fails visibly without changing the draft” (`tests/campaign-authoring/design-generation.spec.ts:178`) | Browser 1440; authenticated HTTP | Partial evidence: Subject in brief; Current text in brief; Brief editable; Candidate-drawing spend estimate; Draft-owned run survives reload; Candidates appear progressively; Later candidate appears Missing journey: “Draft-only design generation — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| DESIGN-003 | “[DESIGN-003 DESIGN-007 DESIGN-008 DESIGN-010] a run sends only the brief, never buys twice, records its costs, waits out 12ui and fails visibly without changing the draft” (`tests/campaign-authoring/design-generation.spec.ts:178`) | Browser 1440; authenticated HTTP | Partial evidence: Only layout description and brief; All personalization tokens removed; Only chosen candidate sent for layout; No contact or audience values; Each purchase has idempotency key; Retried purchase buys once; Candidate outcomes; Candidate SHA-256; Chosen candidate; Safe failure code; Cost fact for every paid request Missing journey: “Design data and records — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| DESIGN-004 | “[DESIGN-004 DESIGN-012 DESIGN-013 DESIGN-014] a 12ui LayerDoc imports as an unsaved draft body that passes every approval check at 1440/390px” (`tests/campaign-authoring/design-import.spec.ts:22`) | Browser 390/1440; authenticated HTTP | Partial evidence: Version-2 LayerDoc and PNG imported; Hosted photos; Operator HTTPS button; Managed unsubscribe footer; Saved postal-address footer; Unsupported layer text listed; Novel design line highlighted; Brief line not falsely highlighted; Unsupported version visibly refused; Non-HTTPS button visibly refused; Saved body unchanged after refusal; Unsaved edit leaves saved revision intact; No import save; Ordinary exact-revision approval succeeds; Measured HTML-part size refusal; No request to 12ui Missing journey: “Design import — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| DESIGN-010 | “[DESIGN-002 DESIGN-008 DESIGN-009 DESIGN-010] Design with 12ui turns a brief into an unsaved body through the import path, and only Save uses the run” (`tests/campaign-authoring/design-generation.spec.ts:65`); “[DESIGN-003 DESIGN-007 DESIGN-008 DESIGN-010] a run sends only the brief, never buys twice, records its costs, waits out 12ui and fails visibly without changing the draft” (`tests/campaign-authoring/design-generation.spec.ts:178`) | Browser 1440; authenticated HTTP | Partial evidence: Discarding edit retains paid design; Reload retains candidates; Failed layout retains candidates; New run retains paid design; Save or discard ends offer; Prepared design reuse has no further purchase; Failed layout step shown; Wallet or allowance reason; New paid layout retry; Choose another design; Earlier designs reachable; Hold reason visible; Hold cleared only after answer Missing journey: “Keep paid design candidates — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| DESIGN-009 | “[DESIGN-003 DESIGN-007 DESIGN-008 DESIGN-010] a run sends only the brief, never buys twice, records its costs, waits out 12ui and fails visibly without changing the draft” (`tests/campaign-authoring/design-generation.spec.ts:178`); “[DESIGN-002 DESIGN-008 DESIGN-009 DESIGN-010] Design with 12ui turns a brief into an unsaved body through the import path, and only Save uses the run” (`tests/campaign-authoring/design-generation.spec.ts:65`) | Browser 1440; authenticated HTTP | Partial evidence: Choose beside candidate image; Chosen layout enters import; Untouched choice opens import; Unrelated typing prevents automatic opening; Focus remains in body; Ready notice offers explicit opening; Operator destination retained; Non-brief lines highlighted; Unsaved edit Missing journey: “Apply a chosen design without stealing focus — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| DESIGN-008 | “[DESIGN-002 DESIGN-008 DESIGN-009 DESIGN-010] Design with 12ui turns a brief into an unsaved body through the import path, and only Save uses the run” (`tests/campaign-authoring/design-generation.spec.ts:65`); “[DESIGN-003 DESIGN-007 DESIGN-008 DESIGN-010] a run sends only the brief, never buys twice, records its costs, waits out 12ui and fails visibly without changing the draft” (`tests/campaign-authoring/design-generation.spec.ts:178`) | Browser 1440; authenticated HTTP | Partial evidence: Generated body canonical; No implicit save; No approval; No schedule; No delivery; Save uses ordinary draft path; Failed run safe reason; Timeout reason; Failure leaves draft unchanged; No semantic content substitute Missing journey: “Save generated design through ordinary authoring — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CAMP-021 | “[CAMP-002][CAMP-003][CAMP-004][CAMP-005][CAMP-006][CAMP-018][BUILD-002] fresh authoring through actual Worker and D1 at 1440px” (`tests/campaign-authoring/browser.spec.ts:14`) | Browser 1440; authenticated HTTP | Partial evidence: Blank newsletter without AI or commerce; Real source starter; Same editable Review; Linked proposal reused; Concurrent adoption creates one campaign; Create has no authority; Select and save enqueue nothing; Incomplete draft saves; Approval names missing content; Rich text initial editor; Optional HTML mode preserves authored markup; Styled and image content stays in HTML mode; No image fetch while authoring Missing journey: “Start and adopt newsletters — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CAMP-022 | “[CAMP-002][CAMP-003][CAMP-004][CAMP-005][CAMP-006][CAMP-018][BUILD-002] fresh authoring through actual Worker and D1 at 1440px” (`tests/campaign-authoring/browser.spec.ts:14`); “[BUILD-010][CAMP-022][MSG-009][MSG-012] saving stores the body as mail clients parse it, and approval judges that tree” (`tests/campaign-authoring/canonical-save.spec.ts:14`); “[CAMP-022][MSG-009] a saved body saves to the same bytes, whether saved as stored or as the editor shows it” (`tests/campaign-authoring/canonical-save.spec.ts:76`) | Browser 1440; authenticated HTTP | Partial evidence: One managed unsubscribe footer; Derived text contains destination URL; Stored body resaves byte-identically; Editor body resaves byte-identically; First duplicate attribute kept; Ignored misplaced tags absent; Checker judges stored tree Missing journey: “Canonical saved email bytes — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CAMP-020 | “[CAMP-002][CAMP-003][CAMP-004][CAMP-005][CAMP-006][CAMP-018][BUILD-002] fresh authoring through actual Worker and D1 at 1440px” (`tests/campaign-authoring/browser.spec.ts:14`) | Browser 1440; authenticated HTTP | Partial evidence: Structured inclusion updates; Real source counts; Unavailable missing source counts; Unavailable stale counts; Late old request cannot replace new count Missing journey: “Live audience authoring counts — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| AUD-010 | none | Public browser/API journey not covered | No asserting journey for this part in the old Evidence set. Missing journey: “Derived audience rule summaries — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CAMP-023 | “[CAMP-023] on a local copy, Insert image adds an own-origin image that saves, previews after opt-in and blocks only approval” (`tests/campaign-authoring/local-images.spec.ts:11`); “[CAMP-012] an uploaded image is stored once by content hash and served publicly, immutable and cookie-free” (`tests/campaign-assets.spec.ts:29`); “[CAMP-012] approval verifies this deployment's own images in storage, never through a network inspection” (`tests/campaign-assets.spec.ts:98`) | Browser (viewport not claimed); authenticated HTTP | Partial evidence: Insert image uploads and inserts header-derived dimensions; At most 600-pixel width; Public address in response; Stored-type extension serves same bytes; Wrong extension not found; Local own HTTP image saves; Styled local preview loads after opt-in; Local HTTP image approval refusal; HTTPS deployment unaffected Missing journey: “Insert and preview campaign images — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| DESIGN-014 | none | Public browser/API journey not covered | No asserting journey for this part in the old Evidence set. Missing journey: “Bounded local design input — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| DESIGN-013 | “[DESIGN-004 DESIGN-012 DESIGN-013 DESIGN-014] a 12ui LayerDoc imports as an unsaved draft body that passes every approval check at 1440/390px” (`tests/campaign-authoring/design-import.spec.ts:22`) | Browser 390/1440; authenticated HTTP | Partial evidence: Hosted image thumbnail; Text novel-line highlighting; Unsaved state shown; Discard removes summary Missing journey: “Review imported design content — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| DESIGN-012 | none | Public browser/API journey not covered | No asserting journey for this part in the old Evidence set. Missing journey: “Compile the imported layout — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| DESIGN-007 | “[DESIGN-003 DESIGN-007 DESIGN-008 DESIGN-010] a run sends only the brief, never buys twice, records its costs, waits out 12ui and fails visibly without changing the draft” (`tests/campaign-authoring/design-generation.spec.ts:178`) | Browser 1440; authenticated HTTP | Partial evidence: Same key on rate retry; Notice stays until answer; Untimed refusal fails quota; Wallet refusal fails quota; Failed design reason; Read deadline settlement Missing journey: “Design provider retries and deadlines — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| DESIGN-011 | “[DESIGN-003 DESIGN-007 DESIGN-008 DESIGN-010] a run sends only the brief, never buys twice, records its costs, waits out 12ui and fails visibly without changing the draft” (`tests/campaign-authoring/design-generation.spec.ts:178`) | Browser 1440; authenticated HTTP | Partial evidence: Provider error text never shown; Separate old-run choice controls Missing journey: “Design provider custody — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| DESIGN-006 | none | Public browser/API journey not covered | No asserting journey for this part in the old Evidence set. Missing journey: “Optional design deployment credentials — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| DESIGN-005 | none | Public browser/API journey not covered | No asserting journey for this part in the old Evidence set. Missing journey: “Owner-selected design provider — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| DATA-001 | “[DATA-001][CONT-004][SEND-005] an installation with real history restores into an empty one without its sending authority” (`tests/go-live/go-live.journeys.ts:250`); “[DATA-001] complete native records and uploaded assets round-trip without restoring login authority” (`tests/portability.spec.ts:44`) | Browser 390/1440; authenticated HTTP | Partial evidence: Archive includes consent; Archive includes contacts; Archive includes recipient-step outcomes; Archive includes suppressions; Archive includes surviving opt-outs; Original uploaded campaign-asset bytes Missing journey: “Export contents — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| DATA-002 | “[CONT-030] current erasure authority refuses an old archive on an empty restore target” (`tests/portability.spec.ts:213`); “[DATA-001] rer commands restore complete local D1 and R2 with matching authority, then reset to one empty native owner” (`tests/local-start/command-data.journey.ts:8`) | Authenticated HTTP | Partial evidence: Every older archive refused by current erasure floor; Nonempty legacy journal refused before staging; Current post-erasure export restores; Surviving opt-outs preserved Missing journey: “Marketing restore custody — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| MGMT-002 | “[MGMT-002] native owner editor mounts at 1440 and 390, refuses visitors and loses its grant on sign-out” (`tests/local-start/editor.journey.ts:8`) | Browser 390/1440; authenticated HTTP | Partial evidence: Anonymous no widget; Owner editor present; Logout removes widget Missing journey: “Native owner editor — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| MSG-002 | “native Worker production services approve, hand off, reload protected evidence and renew sender reminders once per period with populated adapter upgrade [MSG-003][DELIV-007][INT-014]” (`tests/sender-verification/worker.spec.ts:9`) | Browser (viewport not claimed); authenticated HTTP | Partial evidence: Passing sender schedules Missing journey: “Email authentication — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| MSG-003 | “native Worker production services approve, hand off, reload protected evidence and renew sender reminders once per period with populated adapter upgrade [MSG-003][DELIV-007][INT-014]” (`tests/sender-verification/worker.spec.ts:9`); “[MSG-003][CONT-004][CONT-009][CAMP-008] the List-Unsubscribe one-click works as a mail client sends it and nothing else unsubscribes” (`tests/go-live/go-live.journeys.ts:192`) | Browser 390/1440; authenticated HTTP | Partial evidence: One-click declaration; Visible link; Context-free one-click body; Opt-out ledger is changed before success; Scanner and prefetch do not unsubscribe; One-click repeats have one effect; No session or cookie required Missing journey: “Email unsubscribe — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| MSG-005 | none | Public browser/API journey not covered | No asserting journey for this part in the old Evidence set. Missing journey: “SMS opt-out — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| MSG-006 | “[MSG-014][MSG-015][MSG-006][MSG-007][MSG-005][MOVE-014] review names blocked hosts and links, allows an approver to trust them, keeps advisory safety and shows each SMS with its opt-out” (`tests/go-live/content-checks.journeys.ts:13`) | Browser 390/1440; authenticated HTTP | Partial evidence: Campaign approval Missing journey: “Links — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| MSG-007 | “[MSG-014][MSG-015][MSG-006][MSG-007][MSG-005][MOVE-014] review names blocked hosts and links, allows an approver to trust them, keeps advisory safety and shows each SMS with its opt-out” (`tests/go-live/content-checks.journeys.ts:13`) | Browser 390/1440; authenticated HTTP | Partial evidence: Advisory findings shown; Blocking findings shown; Acknowledgment survives reload; Actor; Replay produces one audit entry; Time; Edit invalidates old finding; Safety findings cannot be acknowledged; Blocking findings prevent approval and effects Missing journey: “Content checks — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| MSG-008 | “[MSG-008] saved review counts fallback recipients and delivery uses the same escaped personalisation” (`tests/go-live/personalisation.journeys.ts:8`) | Browser 390/1440; authenticated HTTP | Partial evidence: Approval refusal leaves no recipient steps; Bare token blocks checks; Saved fallback rendered; Approval preserves counts; Eligible person counts exclude pending people and token occurrences; Destination-only label uses fallback; HTML escaping; Plain-text name; Illustrative display name; Unavailable property fallback in delivery; Unavailable property fallback in preview; Editor saved; Preview at desktop and phone; Review at desktop and phone Missing journey: “Personalization — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| MSG-009 | “[CAMP-022][MSG-009] a saved body saves to the same bytes, whether saved as stored or as the editor shows it” (`tests/campaign-authoring/canonical-save.spec.ts:76`); “[BUILD-010][CAMP-022][MSG-009][MSG-012] saving stores the body as mail clients parse it, and approval judges that tree” (`tests/campaign-authoring/canonical-save.spec.ts:14`) | Browser (viewport not claimed); authenticated HTTP | Partial evidence: Save stability; Stored parser structure Missing journey: “Email body — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| MSG-010 | “[MSG-010][CONT-005][CONT-006] fast, token-isolated one-click opt-outs survive three signed soft bounces and a signed delivery” (`tests/go-live/opt-out-reasons.journeys.ts:11`) | Browser 390/1440; authenticated HTTP | Partial evidence: Complete response below two seconds; Shared GET allowance excess; Shared POST allowance excess; Another token at the same client address actually opts out; Confirmation at both widths; Success at both widths; One-click opt-out prevents the approved send; Opt-out survives reconciliation Missing journey: “Unsubscribe availability — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| MSG-011 | none | Public browser/API journey not covered | No asserting journey for this part in the old Evidence set. Missing journey: “Sending reputation — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| MSG-012 | “[BUILD-010][CAMP-022][MSG-009][MSG-012] saving stores the body as mail clients parse it, and approval judges that tree” (`tests/campaign-authoring/canonical-save.spec.ts:14`) | Browser (viewport not claimed); authenticated HTTP | Partial evidence: Parser tree controls approval; Low-contrast text blocked; Misparsed styled markup blocks Missing journey: “Hidden or deceptive presentation — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| MSG-013 | “[DELIV-002][MSG-013][RESULT-005] contact links survive authoring, exact approval and delivery without tracking” (`tests/go-live/contact-links.journeys.ts:11`) | Browser 390/1440; authenticated HTTP | Partial evidence: Disallowed parameters blocked; Email subject/body form saved; Multiple addresses blocked; E.164 phone and SMS body saved; Invalid phone blocked; Authored HTML validation; Email, Phone and Text link kinds; Decoded SMS body; Decoded email address, subject and body; Decoded phone; HTML preserves links; Plain text preserves links; Host allowance unnecessary; Malformed links block; No click fact; No rewrite; No tracked-link record Missing journey: “Contact links (mailto:, tel:, sms:) — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| MSG-015 | none | Public browser/API journey not covered | No asserting journey for this part in the old Evidence set. Missing journey: “Allow a blocked host from review — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| MSG-016 | none | Public browser/API journey not covered | No asserting journey for this part in the old Evidence set. Missing journey: “Legacy approved email and draft compatibility — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| RESULT-001 | “[RESULT-001] every combined campaign state/channel filter, counts, history and empty state at 1440” (`tests/campaign-results/results.journeys.ts:92`); “[CAMP-009] cancel dialog contains focus, Escape cancels and returns focus; confirmed cancel retains uncertain handoffs” (`tests/campaign-results/results.journeys.ts:126`); “[CAMP-001] [CAMP-009][CAMP-010][SEND-006][SEND-007][RESULT-001][RESULT-007][RESULT-008][SEG-003][REPORT-004] stored step results and deadline/DST truth at 1440” (`tests/campaign-results/results.journeys.ts:42`) | Browser 390/1440; authenticated HTTP | Partial evidence: State and channel filters; Cancellation outcome; Delivery schedule/timeline; Per-channel disposition totals Missing journey: “Campaign history — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| RESULT-002 | “[RESULT-002][CONT-013] explicit open estimates are isolated, revocable, replay safe and erased” (`tests/go-live/open-estimates.journeys.ts:9`) | Browser (viewport not claimed); authenticated HTTP | Partial evidence: Default off and explicit enablement; Privacy-sensitive estimate label; Other result fields unchanged after pixel fetch Missing journey: “Engagement — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| RESULT-003 | “[REPORT-002] [RESULT-008][INT-013][RESULT-005][RESULT-003][REPORT-003] campaign filters, exact CSV rows and optional open estimates at 1440; native commerce and cross-channel attribution at 1440 and 390” (`tests/campaign-results/performance.journeys.ts:9`) | Browser 390/1440; authenticated HTTP | Complete carried acceptance: Separated from forecasts; Source order identified; Window identified; No duplicate or moved order attribution after replay/sync; Latest non-automated click wins inside seven-day window; Cancellation subtraction; Full refund subtraction; Partial refund subtraction | covered |
| RESULT-004 | “[RESULT-004][REPORT-007] Settings consent counts, currency-separated projection and rejected AI spend, distinct handoffs and replayed purchases retain truthful campaign and UTC-day totals” (`tests/campaign-results/costs.journeys.ts:11`) | Browser 390/1440; authenticated HTTP | Partial evidence: AI billable units; Provider units, currency and cost; Campaign totals; Day/currency/unknown-price groups; UTC day boundary; One candidate purchase fact Missing journey: “Cost — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| RESULT-005 | “[REPORT-002] [RESULT-008][INT-013][RESULT-005][RESULT-003][REPORT-003] campaign filters, exact CSV rows and optional open estimates at 1440; native commerce and cross-channel attribution at 1440 and 390” (`tests/campaign-results/performance.journeys.ts:9`) | Browser 390/1440; authenticated HTTP | Partial evidence: Distinct recipient-step redirect; Opaque first-party redirect; Original destination forwarding; No contact identity in redirect destination; No cookie; No loaded body; Scanner retained and excluded from engagement; No clicks when off; Original URLs when off; Contact links unchanged; No contact clicks; Forwards after window closes; No new person or scanner facts Missing journey: “Link tracking — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| RESULT-009 | “[RESULT-002][CONT-013] explicit open estimates are isolated, revocable, replay safe and erased” (`tests/go-live/open-estimates.journeys.ts:9`) | Browser (viewport not claimed); authenticated HTTP | Partial evidence: Unique first-party pixels after opt-in; Pixel changes only estimate results; Disable revokes issued pixels; Reenable does not readmit old pixels; No cookie; One estimate after repeated requests; Erasure removes facts; Erasure removes that contact tokens Missing journey: “Open-estimate lifecycle — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| RESULT-010 | none | Public browser/API journey not covered | No asserting journey for this part in the old Evidence set. Missing journey: “Ordinary campaign images are untracked — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| SEND-001 | “[SEND-001][OPER-001][DELIV-007][REPORT-006] Managed relay confirms access and consent while the owner connection sends approved newsletters” (`tests/go-live/managed-mail.journeys.ts:13`); “[SEND-001][SEND-008][SEND-006] native Resend reconciliation resumes exact paged lookup, distinguishes event payloads and closes expired uncertainty” (`tests/go-live/resend-delivery.journeys.ts:9`) | Browser 390/1440; authenticated HTTP | Partial evidence: Email adapter hand-off; Reconciliation-window coverage; Resumed dispatch does not duplicate Missing journey: “Provider hand-off — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| SEND-003 | “[SEND-003][SEND-006] concurrent campaigns and HTTP confirmation share the durable budget across restart; the open screen refreshes” (`tests/go-live/delivery.journeys.ts:88`) | Browser 390; authenticated HTTP | Partial evidence: Provider pacing; Estimated completion; Accepted count refresh within 30 seconds Missing journey: “Throttling and progress — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| SEND-004 | “[SEND-004] definite provider refusals use increasing retries within the original hour and expose the terminal reason” (`tests/go-live/delivery-recovery.journeys.ts:9`) | Browser (viewport not claimed); authenticated HTTP | Partial evidence: Five retries then failure; Increasing delays; Within original hour; Error visible in detail; Exhaustion failed state Missing journey: “Transport failure — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| SEND-005 | “[SEND-005][SEND-006][SEND-007][SEND-008][CONT-006] signed SendGrid facts replayed through the public webhook keep delivery truth separate” (`tests/go-live/go-live.journeys.ts:37`) | Browser 390/1440; authenticated HTTP | Partial evidence: Signed event accepted; Replay and reorder preserve recipient disposition; Older fact does not downgrade delivery Missing journey: “Provider-event identity — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| SEND-006 | “[SEND-005][SEND-006][SEND-007][SEND-008][CONT-006] signed SendGrid facts replayed through the public webhook keep delivery truth separate” (`tests/go-live/go-live.journeys.ts:37`) | Browser 390/1440; authenticated HTTP | Partial evidence: Accepted and uncertain states; Independent complaint; Delivery retained after complaint Missing journey: “Delivery truth — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| SEND-007 | “[CAMP-001] [CAMP-009][CAMP-010][SEND-006][SEND-007][RESULT-001][RESULT-007][RESULT-008][SEG-003][REPORT-004] stored step results and deadline/DST truth at 1440” (`tests/campaign-results/results.journeys.ts:42`); “[SEND-005][SEND-006][SEND-007][SEND-008][CONT-006] signed SendGrid facts replayed through the public webhook keep delivery truth separate” (`tests/go-live/go-live.journeys.ts:37`) | Browser 390/1440; authenticated HTTP | Partial evidence: Per-disposition visible counts; Late complaint updates campaign summary; Late complaint updates ledger Missing journey: “Partial completion — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| SEND-008 | “[SEND-001][SEND-008][SEND-006] native Resend reconciliation resumes exact paged lookup, distinguishes event payloads and closes expired uncertainty” (`tests/go-live/resend-delivery.journeys.ts:9`) | Browser (viewport not claimed); authenticated HTTP | Partial evidence: No duplicate send; Restart resumes; Missed provider facts imported; Provider lookup reconciles uncertainty; Activity unavailable retains uncertainty; No resubmission; No blind retry; Other-provider expiry has unconfirmed failure; No campaign dispatching without work or reconciliation Missing journey: “Resumable dispatch and reconciliation — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| SEND-009 | “[SEND-005] authenticated probes pause without recipients, obey durable cadence and recover without duplicate uncertain notices” (`tests/go-live/delivery-recovery.journeys.ts:45`) | Browser (viewport not claimed); authenticated HTTP | Partial evidence: Adapter unavailable pauses channel; No recipient hand-off while paused; Bounded non-recipient probe; Probe cadence survives restart; Automatic probe recovery; Deadline still applies; Pause visible; One email per operator; Uncertain notice never resent Missing journey: “Provider outage — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| FORM-001 | “CONT-003/009 public signup remains pending until single-use expiring confirmation and records source time method IP” (`tests/audience-import/signup.spec.ts:5`); “CONT-007/009 signed SMS signup confirms once; linked STOP is durable and HELP/START cannot subscribe or duplicate replies” (`tests/audience-import/signup.spec.ts:57`) | Authenticated HTTP | Partial evidence: Hosted capture records explicit evidence before confirmation; Hosted identity becomes pending rather than subscribed; Optional SMS capture remains pending; One valid confirmation subscribes the email; Consumed confirmation returns already-confirmed; Expired link leaves pending state Missing journey: “Hosted and embedded signup — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| FORM-007 | “CONT-009 durable signup limits, body bounds, honeypot and concurrent destination claim prevent extra provider calls” (`tests/audience-import/signup.spec.ts:21`); “CONT-003 a stale or missing rendered disclosure cannot capture changed sender consent” (`tests/audience-import/signup.spec.ts:49`) | Authenticated HTTP | Partial evidence: Malformed and oversized identity input is rejected; Honeypot sends no confirmation; Missing disclosure leaves no consent or mail; Concurrent destinations cause one confirmation; Network allowance eventually refuses Missing journey: “Abuse resistance — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| FORM-009 | “[CONT-025][FORM-008][FORM-009][FORM-010] shared kiosk clears every visitor, requires fresh verification and retains device consent source” (`tests/go-live/shared-kiosk.journeys.ts:8`) | Browser 390/1440; authenticated HTTP | Partial evidence: Email resets blank within five seconds; Next visitor name is blank; Next visitor consent is not checked; No visitor cookies remain; No local/session storage remains; No-challenge submission is refused; No-challenge submission creates no contact; Each browser submission requires new enabled verification; Thirty browser captures receive accepted responses; Same-network three hundred captures yield three hundred confirmations; Confirmed kiosk/device source appears in growth report; Consent evidence records kiosk and device label; Marking records actor, time and device once Missing journey: “Kiosk and event forms — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| SEG-001 | “[SEG-001] AUD-001 AUD-002 AUD-007 CAMP-004 nested saved segments select exact contacts by count, event value, window and state at 1440/390; copied rules remain immutable” (`tests/audience-controls/segments.spec.ts:7`); “[REPORT-002] [RESULT-008][INT-013][RESULT-005][RESULT-003][REPORT-003] campaign filters, exact CSV rows and optional open estimates at 1440; native commerce and cross-channel attribution at 1440 and 390” (`tests/campaign-results/performance.journeys.ts:9`) | Browser 390/1440; authenticated HTTP | Partial evidence: Nested any/all groups persist in the saved segment; typed properties selects expected audience; channel consent selects expected audience; topic consent selects expected audience; tags selects expected audience; Count, event-value and currency filters persist; Event-window changes recompute selection; US state selects expected contacts; ZIP selects expected contacts; ZIP distance selects expected contacts; Purchased product membership; Purchased collection membership; Purchased category membership; Human email/SMS click audience within original-time window; RFM/lifecycle selection; Unavailable catalog is distinct from empty matching membership; Builder live exact estimate; Summary names every fixture condition; Review intersects every fixture contact; Saved count/value/time/state exact matching membership; Nested operator change narrows audience; Time-window change narrows audience Missing journey: “Segment builder — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| SEG-003 | “[CAMP-001] [CAMP-009][CAMP-010][SEND-006][SEND-007][RESULT-001][RESULT-007][RESULT-008][SEG-003][REPORT-004] stored step results and deadline/DST truth at 1440” (`tests/campaign-results/results.journeys.ts:42`) | Browser 390/1440; authenticated HTTP | Partial evidence: One customer recency score; One customer frequency score; One customer monetary score; Five lifecycle stages match fixture distribution; Method and thresholds visible; Fixture stage distribution; Fixture recency/frequency/monetary customer scores Missing journey: “RFM and lifecycle stages — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| BUILD-008 | “[BUILD-008] saved contact previews and located advisories remain separate from contrast blockers” (`tests/go-live/presend-checks.journeys.ts:10`); “[BUILD-012] large newsletters save by transmitted bytes, retain refused edits and recheck expansion at handoff” (`tests/go-live/email-size.journeys.ts:10`) | Browser 390/1440; authenticated HTTP | Partial evidence: chosen-contact HTML preview; HTML preview escapes the contact name; chosen-contact plain-text preview; chosen-contact preheader preview; mobile preview mode; dark approximation; desktop preview; fallback HTML preview; fallback plain-text preview; missing-alt located advisory; heading-order located advisory; link-text located advisory; spam-wording located advisory; advisories are nonblocking; 95 KB measured body; size advisory names measured size and limit; size advisory identifies the three largest blocks; contrast remains a blocking finding; failed approval creates no recipient steps; corrected revision has no blocking findings; over-limit HTML save reports the named oversized error; oversize is measured above the byte limit Missing journey: “Previews and pre-send checks — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| DELIV-005 | “[DELIV-005] signed mailbox outcomes and diagnostic categories survive replay without multiplying clicks” (`tests/go-live/mailbox-provider.journeys.ts:7`) | Browser 390/1440; authenticated HTTP | Complete carried acceptance: delivered count by mailbox; bounced count by mailbox; complaint count by mailbox; unique click count by mailbox; total click count by mailbox; browser table carries the same Gmail outcome counts; Gmail provider attribution; Outlook and Hotmail provider attribution; Yahoo and AOL provider attribution; Apple iCloud provider attribution; Other provider attribution; invalid-address bounce category; mailbox-full bounce category; policy-block bounce category; reputation bounce category; content bounce category; other bounce category; reason totals reconcile to bounced count for every provider; Gmail and Outlook signed bounce categories | covered |
| INT-002 | “[INT-002] WooCommerce owner connection syncs store facts and signed replay preserves identity, consent and failed-operation recovery” (`tests/go-live/woocommerce.journeys.ts:10`); “CONT-003/009 public signup remains pending until single-use expiring confirmation and records source time method IP” (`tests/audience-import/signup.spec.ts:5`) | Browser 390/1440; authenticated HTTP | Partial evidence: Owner Settings connection succeeds; customer sync stored; paginated product sync stored; order sync stored; refund sync stored; replay retains complete source records; one receipt after replay; conflicting webhook content refuses; forged provider signature refuses; foreign store origin refuses; exact activated revision and event exit once; one contact tag; one completion history row; draft does not enroll; stale event does not add enrollment; purchased contact does not add enrollment; opted-out contact does not add enrollment; default collection denied; explicit consent emits declared observations; GPC withdrawal recorded; observation sends no customer id or email; plugin event cannot widen existing Mango subscription evidence; public signup remains pending before confirmation; affirmative confirmation subscribes; confirmation replay does not subscribe twice; expired confirmation remains pending Missing journey: “WooCommerce — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| INT-007 | “[CONT-026][CONT-025] [INT-007][INT-014][INT-011][OPER-007][CONT-004][CONT-006] scoped custom events and client sync, replayable refusals and last-moment send suppression” (`tests/go-live/sync-integrations.journeys.ts:12`) | Browser 390/1440; authenticated HTTP | Partial evidence: one identified contact retained across replay; updated custom contact property retained; concurrent client event replay returns one identity; one stored custom event; conflicting client event content refuses; profile lists rule-derived membership; membership client lists matching member state; missing subscription evidence names the required error; key exhausts into 429 while allowed requests remain valid; rate-limit refusal code and retry guidance; other key remains usable; custom-event write retains key attribution and occurrence time; public description declares the event-write scope Missing journey: “Events and profiles API — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| REPORT-003 | “[REPORT-002] [RESULT-008][INT-013][RESULT-005][RESULT-003][REPORT-003] campaign filters, exact CSV rows and optional open estimates at 1440; native commerce and cross-channel attribution at 1440 and 390” (`tests/campaign-results/performance.journeys.ts:9`) | Browser 390/1440; authenticated HTTP | Partial evidence: Default order conversion metric; Custom conversion metric; Independent default seven-day channel windows; Most recent eligible SMS click wins once; Automated click excluded from the winner; Refunds subtract; Cancellations subtract; Revenue shows conversion metric and channel window; One-day recalculation; Stored events unchanged Missing journey: “Attribution for campaigns, flows and SMS — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| REPORT-004 | “[CAMP-001] [CAMP-009][CAMP-010][SEND-006][SEND-007][RESULT-001][RESULT-007][RESULT-008][SEG-003][REPORT-004] stored step results and deadline/DST truth at 1440” (`tests/campaign-results/results.journeys.ts:42`) | Browser 390/1440; authenticated HTTP | Partial evidence: Independent repeat purchase rate; Independent first-order cohort retention; Median days between orders; Customer value by form; Products bought together Missing journey: “Customer and retention analytics — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| MOVE-009 | “[MOVE-009][CONT-001][CONT-002][CONT-003][CONT-010][CAMP-002][CAMP-004][SEND-006][DATA-001] an account export moves in by status, keeps consent, carries no authority and undoes safely” (`tests/move-in/archive.journeys.ts:34`); “[CONT-012][AUD-008][MOVE-009] imported engagement governs review and immutable dispatch policy without changing consent” (`tests/move-in/archive.journeys.ts:370`) | Browser 390/1440; authenticated HTTP | Partial evidence: One historical click or open per accepted known-contact row; Original occurrence time; Imported campaign-history link; Original clicked link; Timeline imported label and source record; Imported and dropped counts including unknown address; Imported clicks participate in dormancy; Imported opens remain open-only estimates; Open-only and no-history are distinct; No native send facts or attribution are created; Populated campaign result remains unchanged Missing journey: “Incumbent engagement history — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| PUB-001 | “[PUB-001] publish, read and withdraw a neutral sent newsletter at 1440” (`tests/campaign-results/archive.journeys.ts:5`) | Browser 1440; authenticated HTTP | Partial evidence: Sent issue public page; Archive index entry; RSS item; Search metadata; Neutral personalization; No recipient token or personal value; No private tracking link Missing journey: “Web archive — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| PUB-005 | “[PUB-005][FORM-008][FORM-010][INT-004][OPER-003][OPER-004] roles govern native requests and removal retains authors, approvers and history” (`tests/go-live/roles.journeys.ts:11`) | Browser 390/1440; authenticated HTTP | Partial evidence: Exact price and frequency; Tax notice; Consent wording; Consent is separate initially unchecked choice; Mango has no card fields; Provider checkout screen reached; Return explanation; Permission timestamp; Permission source record; Wording version; One confirmation per payer per checkout session Missing journey: “Paid signup page and payer consent — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| PUB-006 | “[PUB-005][FORM-008][FORM-010][INT-004][OPER-003][OPER-004] roles govern native requests and removal retains authors, approvers and history” (`tests/go-live/roles.journeys.ts:11`) | Browser 390/1440; authenticated HTTP | Partial evidence: Paid but consent missing; Paid-checkout evidence remains unconfirmed; One confirmation; No eligible paid-only recipients before confirmation; Paid-only send after confirmation; Unsubscribed until affirmative confirmation; Subscribed after affirmative confirmation; Suppressed payer no confirmation or mail; Confirmed subscriber needs no second confirmation; Payment alone does not widen permission; Erasure removes signup address; Erasure removes consent evidence Missing journey: “Paid-reader consent and restrictions — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |

## Outcome references

The clause-level decisions above are supported by these unchanged point/outcome references, retained to satisfy contract standard section 7. An asserted outcome alone is not a complete journey decision.

| Clause | Point | Outcome | Asserting test | Result |
| --- | --- | --- | --- | --- |
| HOME-001 | 1 | Mango’s mark, name and one newsletter description identify the installation. | none | none |
| HOME-001 | 2 | Finish setup points to setup before claim | `tests/local-start/local.journey.ts:36` | asserted |
| HOME-001 | 2 | Sign in points to native sign-in after claim | `tests/local-start/local.journey.ts:69` | asserted |
| HOME-001 | 2 | The Lobby has only one action | none | none |
| HOME-001 | 3 | Unclaimed state before setup | `tests/local-start/local.journey.ts:35` | asserted |
| HOME-001 | 3 | Claimed state after setup | `tests/local-start/local.journey.ts:67` | asserted |
| HOME-002 | 1 | The primary action opens the Run page; the run-site landing has no sign-in link. | none | none |
| HOME-002 | 3 | The hero is the only top-level heading; the alternative sentence also ends the metadata description and names both replacement products. | none | none |
| HOME-002 | 4 | The sections explain collection, writing, exact-letter approval, scheduling, delivery reporting and ownership, followed by a closing action. | none | none |
| HOME-002 | 5 | The optional product credit appears only when the owner enables it; illustrative addresses, names, counts and dates are never records. | none | none |
| HOME-002 | 7 | The static landing reads no operator, contact, campaign or session data and is written once by the site build. | none | none |
| DOCS-001 | 1 | Public docs home and trailing-slash home | `tests/docs.spec.ts:72` | asserted |
| DOCS-001 | 1 | Manifest navigation order | `tests/docs.spec.ts:36` | asserted |
| DOCS-001 | 2 | Exactly one page title | `tests/docs.spec.ts:33` | asserted |
| DOCS-001 | 2 | Current page | `tests/docs.spec.ts:37` | asserted |
| DOCS-001 | 2 | Page-section navigation | `tests/docs.spec.ts:57` | asserted |
| DOCS-001 | 2 | Previous and next links | `tests/docs.spec.ts:44` | asserted |
| DOCS-001 | 2 | Phone Contents disclosure | `tests/docs.spec.ts:103` | asserted |
| DOCS-001 | 3 | Docs is current | `tests/docs.spec.ts:41` | asserted |
| DOCS-001 | 3 | Sign in destination | `tests/docs.spec.ts:58` | asserted |
| DOCS-001 | 3 | Sole Sign in link | none | none |
| DOCS-001 | 3 | Shared footer, palette, faces and drawings | none | none |
| DOCS-001 | 4 | Every root, docs and top-level readme Markdown file is published or explicitly excluded with a reason; undeclared files, broken links or anchors, links to unpublished pages, raw HTML, forbidden images and absolute build-machine paths fail validation. | none | none |
| DOCS-001 | 5 | Published pages describe the default newsletter profile, expose no maintainer material and have no source-repository or edit link. | none | none |
| DOCS-001 | 6 | No documentation request reads workspace, session or database records. | none | none |
| DOCS-001 | 7 | Reserved and unknown slug responses | `tests/docs.spec.ts:78` | asserted |
| DOCS-001 | 7 | Shared not-found header | `tests/docs.spec.ts:85` | asserted |
| DOCS-001 | 7 | Shared not-found footer | `tests/docs.spec.ts:86` | asserted |
| DOCS-001 | 7 | Link to docs home | `tests/docs.spec.ts:88` | asserted |
| DOCS-001 | 7 | Link to landing | `tests/docs.spec.ts:89` | asserted |
| DOCS-001 | 7 | Other-host behavior | none | none |
| DOCS-001 | 8 | Documentation is compiled before serving; Worker and browser outputs contain no Markdown or highlighter code, and individual page chunks are loaded lazily. | none | none |
| OPER-001 | 1 | Before role assignment, an operator can see and act on proposals, campaigns, flows, contacts and settings as Admin. | none | none |
| OPER-001 | 2 | Server navigation remains at setup | `tests/local-start/local.journey.ts:22` | asserted |
| OPER-001 | 2 | Client navigation remains at setup | `tests/local-start/local.journey.ts:28` | asserted |
| OPER-001 | 2 | Invalid sender data does not write | `tests/local-start/local.journey.ts:63` | asserted |
| OPER-001 | 2 | Saved identity opens app documents | `tests/local-start/local.journey.ts:71` | asserted |
| OPER-001 | 3 | Valid identity already configured for the installation also completes setup. | none | none |
| OPER-001 | 4 | Authenticated configuration APIs remain usable during setup, and completing setup does not claim provider readiness. | none | none |
| OPER-002 | 1 | Settings can invite an operator and remove an operator. | none | none |
| OPER-002 | 2 | A session without fresh email proof cannot grant another operator access. | none | none |
| OPER-002 | 3 | Settings can request a confirmation link bound to the current session; completing it permits an invitation retry. | none | none |
| OPER-002 | 4 | Reading or inspecting the confirmation link has no effect; only its affirmative submission supplies proof. | none | none |
| OPER-002 | 5 | Only the operator established at setup may remove that operator. | none | none |
| OPER-003 | 1 | Every proposal remains attributed to the removed operator. | none | none |
| OPER-003 | 2 | Campaign author | `tests/go-live/roles.journeys.ts:185` | asserted |
| OPER-003 | 2 | Revision approver | `tests/go-live/roles.journeys.ts:186` | asserted |
| OPER-003 | 2 | Approval request | `tests/go-live/roles.journeys.ts:187` | asserted |
| OPER-003 | 2 | Author and approver activity | `tests/go-live/roles.journeys.ts:188` | asserted |
| OPER-003 | 2 | Campaign, revision, request, transition and audit records unchanged after removal | `tests/go-live/roles.journeys.ts:206` | asserted |
| OPER-003 | 3 | Review author | `tests/go-live/roles.journeys.ts:210` | asserted |
| OPER-003 | 3 | Review approver | `tests/go-live/roles.journeys.ts:211` | asserted |
| OPER-003 | 3 | Review approval-request author | `tests/go-live/roles.journeys.ts:212` | asserted |
| OPER-003 | 3 | Campaign detail author | `tests/go-live/roles.journeys.ts:215` | asserted |
| OPER-003 | 3 | Campaign detail approver | `tests/go-live/roles.journeys.ts:216` | asserted |
| OPER-003 | 3 | Activity attribution unchanged | `tests/go-live/roles.journeys.ts:206` | asserted |
| STORE-002 | 1 | One record after repeated order sync and webhook | `tests/shopify/connection.spec.ts:68` | asserted |
| STORE-002 | 1 | One cart’s payload retained under replay | `tests/shopify/connection.spec.ts:130` | asserted |
| STORE-002 | 1 | Browsing-event replay has one observation for its id | `tests/shopify/connection.spec.ts:168` | asserted |
| STORE-002 | 1 | Customer and refund replay update existing contents without duplicates | none | none |
| STORE-003 | 1 | Last-success time and later error | `tests/go-live/source-freshness.journeys.ts:76` | asserted |
| STORE-003 | 2 | Failed source retains completion | `tests/go-live/source-freshness.journeys.ts:80` | asserted |
| STORE-003 | 2 | Unaffected source unchanged | `tests/go-live/source-freshness.journeys.ts:77` | asserted |
| STORE-003 | 3 | Unstarted sources have no completed time | `tests/go-live/source-freshness.journeys.ts:25` | asserted |
| STORE-003 | 3 | Unstarted source visible in desk | `tests/go-live/source-freshness.journeys.ts:91` | asserted |
| STORE-003 | 4 | Completion time advances | `tests/go-live/source-freshness.journeys.ts:121` | asserted |
| STORE-003 | 4 | Error clears | `tests/go-live/source-freshness.journeys.ts:122` | asserted |
| STORE-003 | 4 | Recovered desk no longer shows failure | `tests/go-live/source-freshness.journeys.ts:128` | asserted |
| STORE-003 | 5 | Safe failure cause | `tests/go-live/source-freshness.journeys.ts:88` | asserted |
| STORE-003 | 5 | Retained completion time visible | `tests/go-live/source-freshness.journeys.ts:89` | asserted |
| STORE-003 | 5 | Provider-private diagnostics absent | `tests/go-live/source-freshness.journeys.ts:78` | asserted |
| STORE-004 | 1 | Generation failure and safe source error | `tests/go-live/source-freshness.journeys.ts:59` | asserted |
| STORE-004 | 1 | Signed webhook failure and replay one record | `tests/go-live/source-freshness.journeys.ts:66` | asserted |
| STORE-004 | 1 | Forged delivery records none | `tests/go-live/source-freshness.journeys.ts:64` | asserted |
| STORE-004 | 1 | Recovery completes existing webhook operation | `tests/go-live/source-freshness.journeys.ts:117` | asserted |
| STORE-004 | 1 | Stripe signed failure and recovery | `tests/go-live/stripe-journey.ts:72` | asserted |
| STORE-004 | 2 | Failure text excludes diagnostics, secret, token and product record payload | `tests/go-live/source-freshness.journeys.ts:69` | asserted |
| STORE-004 | 3 | Saved draft readable after edit | `tests/go-live/source-freshness.journeys.ts:71` | asserted |
| STORE-004 | 3 | Recorded history equality | `tests/go-live/source-freshness.journeys.ts:72` | asserted |
| STORE-004 | 3 | Scheduled campaign retains state | `tests/go-live/source-freshness.journeys.ts:73` | asserted |
| STORE-004 | 3 | No added provider handoff | `tests/go-live/source-freshness.journeys.ts:74` | asserted |
| STORE-004 | 4 | Generation and webhook failure visibility | `tests/go-live/source-freshness.journeys.ts:99` | asserted |
| STORE-004 | 5 | Signed outage webhook retains failed response | `tests/go-live/source-freshness.journeys.ts:65` | asserted |
| STORE-004 | 5 | Recovery webhook is accepted | `tests/go-live/source-freshness.journeys.ts:115` | asserted |
| STORE-005 | 1 | Stale status and safe cause | `tests/go-live/stale-sources.journeys.ts:54` | asserted |
| STORE-005 | 1 | Refused approval blocker | `tests/go-live/stale-sources.journeys.ts:59` | asserted |
| STORE-005 | 2 | Counts unavailable | `tests/go-live/stale-sources.journeys.ts:65` | asserted |
| STORE-005 | 2 | No approval authority | `tests/go-live/stale-sources.journeys.ts:85` | asserted |
| STORE-005 | 2 | No recipients | `tests/go-live/stale-sources.journeys.ts:86` | asserted |
| STORE-005 | 3 | Safe cause visible | `tests/go-live/stale-sources.journeys.ts:72` | asserted |
| STORE-005 | 3 | Approval disabled | `tests/go-live/stale-sources.journeys.ts:73` | asserted |
| STORE-005 | 4 | Recheck enables approval | `tests/go-live/stale-sources.journeys.ts:92` | asserted |
| STORE-005 | 4 | Approval proceeds to saved schedule | `tests/go-live/stale-sources.journeys.ts:102` | asserted |
| STORE-006 | 1 | Source capability declared unavailable | none | none |
| STORE-006 | 2 | Unsupported requirement refused | none | none |
| STORE-006 | 3 | Reviews name missing source and leave no snapshots | none | none |
| STORE-006 | 4 | Generation source refusal without campaign or audience | none | none |
| CONT-001 | 1 | Case and whitespace canonicalization | none | none |
| CONT-001 | 2 | Phone canonicalization | none | none |
| CONT-001 | 3 | Archive duplicate email identities reconcile | `tests/move-in/archive.journeys.ts:145` | asserted |
| CONT-001 | 3 | Phone identity uniqueness on capture and import | none | none |
| CONT-002 | 1 | Imported subscribed, non-subscribed, unsubscribed and suppressed email states | `tests/move-in/archive.journeys.ts:167` | asserted |
| CONT-002 | 1 | Independent pending and SMS states | none | none |
| CONT-002 | 2 | Only eligible unsubscribed and suppressed exclusions leave the recipient set | `tests/move-in/held.journeys.ts:97` | asserted |
| CONT-002 | 3 | Cross-channel independence under store activity and consent | none | none |
| CONT-003 | 2 | Category/sender mismatch blocks approval | `tests/campaign-authoring/import-category.spec.ts:71` | asserted |
| CONT-003 | 2 | Recipient scope maintained | none | none |
| CONT-003 | 3 | Missing evidence creates a non-subscribed contact, except for the incumbent-held evidence CONT-024 defines. | none | none |
| CONT-003 | 4 | A reassigned phone or one no longer belonging to the recipient becomes non-subscribed until fresh evidence is captured. | none | none |
| CONT-003 | 5 | Stale and missing disclosure create no evidence | `tests/audience-import/signup.spec.ts:54` | asserted |
| CONT-004 | 1 | One-click state committed when response completes | `tests/go-live/go-live.journeys.ts:224` | asserted |
| CONT-004 | 1 | Review excludes opted-out contact | `tests/go-live/go-live.journeys.ts:232` | asserted |
| CONT-004 | 1 | Queued dispatch skips opted-out recipient | `tests/go-live/go-live.journeys.ts:234` | asserted |
| CONT-004 | 1 | SMS opt-out committed at response | `tests/provider-suppression-ingress.spec.ts:216` | asserted |
| CONT-004 | 2 | Import and undo retain restriction | `tests/move-in/held.journeys.ts:175` | asserted |
| CONT-004 | 2 | Sync, store events, merge and operator edits retain the restriction | none | none |
| CONT-004 | 3 | Parallel-run incumbent writeback | none | none |
| CONT-005 | 1 | Fresh affirmative evidence is later than the opt-out and is confirmed under CONT-009 before resubscription. | none | none |
| CONT-005 | 2 | An operator edit alone never resubscribes an unsubscribed or suppressed channel. | none | none |
| CONT-005 | 3 | Suppression blocks fresh capture and handoff | `tests/provider-suppression-ingress.spec.ts:93` | asserted |
| CONT-005 | Requirement | A recipient’s own public-form resubscribe follows CONT-027. | moved | moved |
| CONT-005 | 4 | During parallel run, a confirmed resubscribe writes subscribed state back where the incumbent API allows; otherwise the cutover report lists it. | none | none |
| CONT-006 | 1 | Provider suppression retained before handoff eligibility | `tests/provider-suppression-ingress.spec.ts:83` | asserted |
| CONT-006 | 1 | Hard bounce and complaint both suppress | `tests/go-live/go-live.journeys.ts:142` | asserted |
| CONT-006 | 2 | Soft-bounce recorded and visible | none | none |
| CONT-006 | 2 | Consecutive soft-bounce policy suppresses | none | none |
| CONT-006 | 3 | Confirmed delivery resets consecutive soft-bounce count | none | none |
| CONT-006 | 4 | Signed ingress rejects invalid identity without changing accepted state | `tests/go-live/go-live.journeys.ts:135` | asserted |
| CONT-006 | 4 | Incomplete provider webhook setup blocks approval | none | none |
| CONT-006 | 5 | Refreshing local authentication/setup credentials preserves existing contact-hash restrictions, including restrictions without a remaining contact row. | none | none |
| CONT-006 | 6 | Legacy local authority conversion preserves the original verified contact authority before credential rotation; unknown or missing authority refuses work rather than selecting an unused secret. | none | none |
| CONT-008 | 1 | All required fact kinds present | `tests/audience-controls/contact-history.spec.ts:35` | asserted |
| CONT-008 | 2 | Occurrence order | `tests/audience-controls/contact-history.spec.ts:36` | asserted |
| CONT-008 | 2 | Form source record | `tests/audience-controls/contact-history.spec.ts:38` | asserted |
| CONT-008 | 2 | Conversion source record | `tests/audience-controls/contact-history.spec.ts:39` | asserted |
| CONT-008 | 2 | SMS source record | `tests/audience-controls/contact-history.spec.ts:40` | asserted |
| CONT-008 | 2 | Click source record | `tests/audience-controls/contact-history.spec.ts:41` | asserted |
| CONT-008 | 2 | Original order time and source record | `tests/audience-controls/contact-history.spec.ts:42` | asserted |
| CONT-008 | 2 | Original delivery time and provider | `tests/audience-controls/contact-history.spec.ts:43` | asserted |
| CONT-008 | 2 | Dispatch exclusion cause | `tests/audience-controls/contact-history.spec.ts:44` | asserted |
| CONT-008 | 2 | Operator attribution | `tests/audience-controls/contact-history.spec.ts:45` | asserted |
| CONT-008 | 2 | Every other event retains its source record | none | none |
| CONT-008 | 3 | Older events remain reachable | `tests/audience-controls/contact-history.spec.ts:62` | asserted |
| CONT-008 | 3 | Visible times equal full ordered timeline | `tests/audience-controls/contact-history.spec.ts:63` | asserted |
| CONT-008 | 4 | No other-contact or private-payload markers in timeline | `tests/audience-controls/contact-history.spec.ts:46` | asserted |
| CONT-008 | 4 | No other-contact marker in detail | `tests/audience-controls/contact-history.spec.ts:47` | asserted |
| CONT-009 | 1 | Email pending state and one confirmation | `tests/audience-import/signup.spec.ts:7` | asserted |
| CONT-009 | 1 | SMS pending state and one message | `tests/audience-import/signup.spec.ts:79` | asserted |
| CONT-009 | 2 | Email becomes subscribed after confirmation | `tests/audience-import/signup.spec.ts:13` | asserted |
| CONT-009 | 2 | Confirming request time read back | none | none |
| CONT-009 | 3 | Pending channel cannot receive marketing | none | none |
| CONT-009 | 4 | Repeated confirmation cannot reconfirm | `tests/audience-import/signup.spec.ts:12` | asserted |
| CONT-009 | 4 | Expired link invalid | `tests/audience-import/signup.spec.ts:17` | asserted |
| CONT-009 | 4 | Expiry leaves channel pending | `tests/audience-import/signup.spec.ts:18` | asserted |
| CONT-009 | 5 | When confirmation is not required, recorded consent under CONT-003 subscribes the channel directly. | none | none |
| CONT-010 | 1 | Archive per-file rejected and duplicate counts | `tests/move-in/archive.journeys.ts:145` | asserted |
| CONT-010 | 1 | Phone-only CSV validated | none | none |
| CONT-010 | 2 | Archive rerun repeated marker | `tests/move-in/archive.journeys.ts:273` | asserted |
| CONT-010 | 2 | Rerun leaves full table counts unchanged | `tests/move-in/archive.journeys.ts:274` | asserted |
| CONT-010 | 2 | Canonical identity update | `tests/move-in/archive.journeys.ts:145` | asserted |
| CONT-010 | 3 | All row outcomes reconcile | `tests/move-in/archive.journeys.ts:149` | asserted |
| CONT-010 | 3 | Each rejected row reason read back | none | none |
| CONT-010 | 4 | Opted-out identity retained after rerun | `tests/move-in/archive.journeys.ts:269` | asserted |
| CONT-010 | 5 | Owner affirmatively attests incumbent source record | `tests/move-in/archive.journeys.ts:137` | asserted |
| CONT-010 | 5 | Unnamed-file per-row rule | none | none |
| CONT-010 | 6 | Undo retains later restrictions | `tests/move-in/archive.journeys.ts:252` | asserted |
| CONT-010 | 6 | Full review capacity | none | none |
| CONT-011 | 1 | Exact union of consent, source activity, suppressions and campaign history | `tests/audience-controls/merge.spec.ts:57` | asserted |
| CONT-011 | 2 | Restrictive merge in both directions | `tests/audience-controls/merge.spec.ts:20` | asserted |
| CONT-011 | 2 | Every channel preserves the restrictive order | none | none |
| CONT-011 | 3 | Restricted aliases remain ineligible | `tests/audience-controls/merge.spec.ts:23` | asserted |
| CONT-011 | 3 | Old unsubscribe reaches surviving aliases | `tests/audience-controls/merge.spec.ts:41` | asserted |
| CONT-012 | 1 | Native aged order causes dormant exclusion | `tests/go-live/stale-sources.journeys.ts:163` | asserted |
| CONT-012 | 1 | Dormancy never removes current eligible order | `tests/go-live/stale-sources.journeys.ts:161` | asserted |
| CONT-012 | 2 | Imported click retains original time | `tests/move-in/archive.journeys.ts:424` | asserted |
| CONT-012 | 2 | Imported opens cannot prevent dormancy | `tests/move-in/archive.journeys.ts:402` | asserted |
| CONT-012 | 2 | Imported order and consent changes retain original times for dormancy | none | none |
| CONT-012 | 3 | No-history grace label and inclusion | `tests/move-in/archive.journeys.ts:402` | asserted |
| CONT-012 | 3 | Grace ends only after a full window | `tests/move-in/archive.journeys.ts:464` | asserted |
| CONT-012 | 4 | Open-only label visible | `tests/move-in/archive.journeys.ts:406` | asserted |
| CONT-012 | 5 | Inactivity leaves all existing contacts and their consent/suppression states unchanged | `tests/move-in/archive.journeys.ts:442` | asserted |
| CONT-012 | 5 | Inactivity leaves all existing contacts and their consent/suppression states unchanged | `tests/move-in/archive.journeys.ts:442` | asserted |
| CONT-013 | 1 | Restricted opt-out survives erase and archive restore | `tests/portability.spec.ts:264` | asserted |
| CONT-013 | 1 | All listed hash/channel/reason/time fields and opted-out aliases retained | none | none |
| CONT-013 | 2 | Readable address and name absent after erasure archive | `tests/portability.spec.ts:246` | asserted |
| CONT-013 | 2 | Installation-keyed one-way destination hash | none | none |
| CONT-013 | 3 | Subscribed identity has no row tombstone | none | none |
| CONT-013 | 4 | An import, sync or capture matching a retained local or portable identity preserves its restriction; an erasure opt-out means unsubscribed. | none | none |
| CONT-013 | 5 | Only the recipient’s own confirmed public-form resubscribe can clear an unsubscribe or erasure restriction under CONT-027; it cannot clear suppression. | none | none |
| CONT-029 | 1 | Surviving restrictions round-trip archive restore | `tests/portability.spec.ts:264` | asserted |
| CONT-029 | 1 | Local-to-portable mapping retained specifically | none | none |
| CONT-029 | 2 | Audience CSV exports carry surviving restrictions by their portable hash after erasure. | none | none |
| CONT-029 | 3 | Address and name absent in current archive | `tests/portability.spec.ts:246` | asserted |
| CONT-029 | 4 | Documentation explains that a mapping or export holder can test guessed destinations or an address dictionary without the installation secret and can match stable hashes across installations and exports. | none | none |
| CONT-029 | 5 | The retained mappings and exports are handled as sensitive personal data. | none | none |
| CONT-030 | 1 | Old archive rejected with no restored contacts | `tests/portability.spec.ts:253` | asserted |
| CONT-030 | 1 | No contacts after rejection | `tests/portability.spec.ts:254` | asserted |
| CONT-030 | 1 | Locally known current authority rejects old manifest before staging | `tests/portability.spec.ts:267` | asserted |
| CONT-030 | 2 | Nonempty legacy row journals are refused before staging. | none | none |
| CONT-030 | 3 | Upgrade retires legacy journals and transfers only after advancing every known source floor. | none | none |
| CONT-030 | 4 | An offline copy without current authority makes no claim to detect later erasure. | none | none |
| CONT-005 | Requirement | Public-form proof boundary and guarded-capture pointer moved to their owning clauses. | moved | moved |
| CONT-009 | 6 | Email confirmation GET leaves state unchanged | `tests/go-live/go-live.journeys.ts:215` | asserted |
| CONT-009 | 6 | SMS confirmation GET leaves pending state unchanged | `tests/audience-import/signup.spec.ts:79` | asserted |
| CONT-009 | 6 | Explicit affirmative confirmation POST | `tests/audience-import/signup.spec.ts:81` | asserted |
| CONT-009 | 6 | Reading and HEAD do not consume confirmation token | none | none |
| CONT-009 | 7 | Later opt-out prevents confirmation | `tests/audience-import/signup.spec.ts:35` | asserted |
| CONT-009 | 7 | Suppression guard cannot be bypassed | none | none |
| CONT-009 | 7 | Inactive identity cannot be confirmed | none | none |
| CONT-009 | 7 | Operator-recorded SMS exact authenticated reply | none | none |
| CONT-028 | 1 | Public eligibility, profile changes, consent evidence, capture metadata, history and pending status commit together, or a currently barred destination gains none of the new consent records. | none | none |
| CONT-028 | 2 | A surviving unsubscribe or erasure restriction may recreate an unsubscribed profile containing only new post-opt-out request evidence, without restoring history; confirmation mail stays within CONT-027’s shared allowance. | none | none |
| CONT-028 | 3 | Surviving suppression blocks fresh capture eligibility | none | none |
| CONT-028 | 4 | Confirmation preparation finishes before the authoritative handoff check; suppression, a later opt-out or an already committed confirmation prevents handoff when present at that check. | none | none |
| CONT-028 | 5 | The adapter is invoked immediately after the authoritative check; a provider handoff already authorized and in progress cannot be recalled by a later transition. | none | none |
| HOME-002 | 2 | Header Mango identity and links | none | none |
| HOME-002 | 2 | Hero identity and exact alternative sentence | none | none |
| HOME-002 | 2 | Hero actions and destinations | none | none |
| HOME-002 | 2 | Footer deployment-owner name and description | none | none |
| HOME-002 | 2 | Fixed page rather than a buyer page builder | none | none |
| HOME-002 | 6 | No vendor pricing | none | none |
| HOME-002 | 6 | No testimonials | none | none |
| HOME-002 | 6 | No customer logos | none | none |
| HOME-002 | 6 | No ratings | none | none |
| HOME-002 | 6 | No metrics | none | none |
| HOME-002 | 6 | No cross-store claims | none | none |
| HOME-002 | 6 | No third-party brand logos | none | none |
| HOME-002 | 6 | No optional commerce, SMS or AI advertising | none | none |
| HOME-002 | 6 | No per-reader-send-time or provider-neutral-delivery advertising | none | none |
| HOME-002 | 6 | Only specified link destinations | none | none |
| HOME-002 | 8 | Fixed light palette in a dark-themed browser | none | none |
| HOME-002 | 8 | Readable without scripts | none | none |
| HOME-002 | 8 | Readable with reduced motion | none | none |
| HOME-002 | 8 | Licensed self-hosted faces | none | none |
| HOME-002 | 8 | Inline drawings without raster or embedded images | none | none |
| HOME-002 | 8 | CSS-only once-only drawing motion | none | none |
| HOME-002 | 8 | No motion for reduced preference | none | none |
| HOME-002 | 8 | Motion never hides content | none | none |
| CONT-003 | 1 | Retained channel on capture and import | none | none |
| CONT-003 | 1 | Retained brand or legal sender on capture and import | none | none |
| CONT-003 | 1 | Retained SMS sender or program on capture and import | none | none |
| CONT-003 | 1 | Retained message subject or category on capture and import | none | none |
| CONT-003 | 1 | Retained frequency disclosure on capture and import | none | none |
| CONT-003 | 1 | Retained destination jurisdiction on capture and import | none | none |
| CONT-003 | 1 | Retained consent text on capture and import | none | none |
| CONT-003 | 1 | Retained consent version on capture and import | none | none |
| CONT-003 | 1 | Retained confirmation evidence on capture and import | none | none |
| CONT-003 | 1 | Retained capture source record | `tests/audience-import/signup.spec.ts:9` | asserted |
| CONT-003 | 1 | Retained capture method | `tests/audience-import/signup.spec.ts:9` | asserted |
| CONT-003 | 1 | Retained capture occurrence time | `tests/audience-import/signup.spec.ts:9` | asserted |
| PROP-001 | 1 | Only proposed proposals appear | `tests/proposals-decision/decision-routes.spec.ts:305` | asserted |
| PROP-001 | 2 | Revenue ordering, deadline tiebreak and insufficient-history last | `tests/proposals-decision/decision-routes.spec.ts:304` | asserted |
| PROP-002 | 1 | Triggering source events | `tests/proposals-decision/decision-routes.spec.ts:174` | asserted |
| PROP-002 | 1 | Lookback window | `tests/proposals-decision/decision-routes.spec.ts:175` | asserted |
| PROP-002 | 1 | Source-data as-of | `tests/proposals-decision/decision-routes.spec.ts:175` | asserted |
| PROP-002 | 2 | Inclusion rule | `tests/proposals-decision/decision-routes.spec.ts:176` | asserted |
| PROP-002 | 2 | Exclusion rule | `tests/proposals-decision/decision-routes.spec.ts:177` | asserted |
| PROP-002 | 3 | Send-by instant and scheduled instant relationship | `tests/proposals-decision/decision-routes.spec.ts:178` | asserted |
| PROP-002 | 3 | Proposed channels | `tests/proposals-decision/decision-routes.spec.ts:256` | asserted |
| PROP-002 | 4 | Forecast method displayed | `tests/proposals-decision/decision-routes.spec.ts:182` | asserted |
| PROP-002 | 4 | Confidence-label method | none | none |
| PROP-003 | 1 | Candidate count | `tests/proposals-decision/decision-routes.spec.ts:217` | asserted |
| PROP-003 | 1 | Excluded contact count | `tests/proposals-decision/decision-routes.spec.ts:217` | asserted |
| PROP-003 | 1 | Eligible contact count | `tests/proposals-decision/decision-routes.spec.ts:217` | asserted |
| PROP-003 | 2 | Per-channel recipient-step count | `tests/proposals-decision/decision-routes.spec.ts:218` | asserted |
| PROP-003 | 2 | No recipients label before exclusions | none | none |
| PROP-004 | 1 | Editable campaign name | `tests/proposals-decision/decision-routes.spec.ts:244` | asserted |
| PROP-004 | 1 | Editable email subject | `tests/proposals-decision/decision-routes.spec.ts:244` | asserted |
| PROP-004 | 1 | Editable email body | none | none |
| PROP-004 | 2 | Editable proposed SMS body | none | none |
| PROP-004 | 3 | Editable sender identity | none | none |
| PROP-004 | 3 | Editable destination links | none | none |
| PROP-004 | 4 | Saved email preview | `tests/proposals-decision/decision-routes.spec.ts:236` | asserted |
| PROP-004 | 4 | Saved SMS preview | `tests/proposals-decision/decision-routes.spec.ts:260` | asserted |
| PROP-005 | 1 | Adoption retains draft state | `tests/proposals-decision/decision-routes.spec.ts:241` | asserted |
| PROP-005 | 1 | Generation and adoption enqueue nothing | `tests/proposals-decision/decision-routes.spec.ts:266` | asserted |
| PROP-005 | 2 | Held company policy binds the exact saved revision | none | none |
| PROP-006 | 1 | Grounded source observations accepted | none | none |
| PROP-006 | 1 | Own imported data and configured knowledge only | none | none |
| PROP-006 | 2 | Fabricated or malformed claims rejected | none | none |
| PROP-006 | 2 | Rejected proposal failed | none | none |
| PROP-006 | 3 | No substituted composition | none | none |
| PROP-007 | 1 | Invalid AI output fails proposal | none | none |
| PROP-007 | 1 | Provider error recorded | `tests/proposals-decision/proposal-states.spec.ts:64` | asserted |
| PROP-007 | 2 | 60-second timeout fails with provider error | none | none |
| PROP-007 | 3 | No substitute campaign | `tests/proposals-decision/proposal-states.spec.ts:64` | asserted |
| PROP-007 | 3 | Existing proposals preserved | none | none |
| PROP-007 | 3 | Existing campaigns preserved | none | none |
| PROP-008 | 1 | Own campaign identifiers | `tests/proposals-decision/decision-routes.spec.ts:282` | asserted |
| PROP-008 | 1 | Own event identifiers | `tests/proposals-decision/decision-routes.spec.ts:282` | asserted |
| PROP-008 | 1 | Campaign count | `tests/proposals-decision/decision-routes.spec.ts:282` | asserted |
| PROP-008 | 1 | Event count | `tests/proposals-decision/decision-routes.spec.ts:282` | asserted |
| PROP-008 | 1 | Every recovery-rate and confidence figure identifies source history | none | none |
| PROP-008 | 2 | Other-store benchmark rejected | none | none |
| PROP-008 | 3 | Thin history has no range | `tests/proposals-decision/decision-routes.spec.ts:279` | asserted |
| PROP-009 | 1 | Proposed state | none | none |
| PROP-009 | 1 | Approved state with linked campaign | `tests/proposals-decision/proposal-states.spec.ts:50` | asserted |
| PROP-009 | 1 | Dismissed state | `tests/proposals-decision/proposal-states.spec.ts:18` | asserted |
| PROP-009 | 1 | Dismissal reason read back | `tests/proposals-decision/proposal-states.spec.ts:21` | asserted |
| PROP-009 | 1 | Expired state | `tests/proposals-decision/proposal-states.spec.ts:32` | asserted |
| PROP-009 | 1 | Failed state | `tests/proposals-decision/proposal-states.spec.ts:64` | asserted |
| PROP-009 | 2 | Dismissed or expired proposal refuses approval | `tests/proposals-decision/proposal-states.spec.ts:24` | asserted |
| PROP-009 | 2 | Approved proposal refuses dismissal | `tests/proposals-decision/proposal-states.spec.ts:51` | asserted |
| PROP-009 | 3 | Actor | `tests/proposals-decision/proposal-states.spec.ts:21` | asserted |
| PROP-009 | 3 | Time | none | none |
| PROP-009 | 3 | Single transition under competing decisions | `tests/proposals-decision/proposal-states.spec.ts:19` | asserted |
| AUD-001 | 1 | Audience rule | none | none |
| AUD-001 | 1 | Audience as-of time | none | none |
| AUD-001 | 2 | Candidate count | `tests/audience-controls/segments.spec.ts:23` | asserted |
| AUD-001 | 2 | Eligible contact count | `tests/audience-controls/segments.spec.ts:23` | asserted |
| AUD-001 | 2 | Every exclusion reason and count | `tests/audience-controls/segments.spec.ts:23` | asserted |
| AUD-001 | 3 | Per-channel recipient-step count | none | none |
| AUD-002 | 1 | Pending channel exclusion | none | none |
| AUD-002 | 1 | Non-subscribed channel exclusion | none | none |
| AUD-002 | 1 | Unsubscribed channel exclusion | none | none |
| AUD-002 | 1 | Suppressed channel exclusion | none | none |
| AUD-002 | 1 | Segment or explicit inclusion cannot override channel exclusion | none | none |
| AUD-003 | 1 | Reason and count in review | `tests/go-live/stale-sources.journeys.ts:180` | asserted |
| AUD-003 | 2 | Recent product purchase | `tests/go-live/stale-sources.journeys.ts:163` | asserted |
| AUD-003 | 2 | Unresolved refund | `tests/go-live/stale-sources.journeys.ts:163` | asserted |
| AUD-003 | 2 | Unresolved return | `tests/go-live/stale-sources.journeys.ts:163` | asserted |
| AUD-003 | 2 | Twelve-month dormancy | `tests/go-live/stale-sources.journeys.ts:163` | asserted |
| AUD-003 | 3 | Resolved commerce remains eligible | `tests/go-live/stale-sources.journeys.ts:161` | asserted |
| AUD-003 | 3 | Eleven-month activity remains eligible | `tests/go-live/stale-sources.journeys.ts:161` | asserted |
| AUD-003 | 3 | Thirteen-month activity is excluded | `tests/go-live/stale-sources.journeys.ts:163` | asserted |
| AUD-004 | 1 | Frequency-window exclusion | none | none |
| AUD-004 | 1 | Recorded frequency-window reason | none | none |
| AUD-004 | 1 | No silent deferral | none | none |
| AUD-004 | 2 | 24-hour email window | none | none |
| AUD-004 | 2 | 72-hour SMS window | none | none |
| AUD-005 | 1 | Dispatch-start eligibility recheck | none | none |
| AUD-005 | 1 | Immediate hand-off eligibility recheck | `tests/go-live/delivery.journeys.ts:79` | asserted |
| AUD-005 | 2 | Purchase after approval prevents hand-off | none | none |
| AUD-005 | 2 | Purchase skip reason is recorded | none | none |
| AUD-005 | 2 | Refund after approval prevents hand-off | none | none |
| AUD-005 | 2 | Refund skip reason is recorded | none | none |
| AUD-005 | 2 | Opt-out after approval prevents hand-off | none | none |
| AUD-005 | 2 | Opt-out skip reason is recorded | none | none |
| AUD-005 | 2 | Bounce after approval prevents hand-off | none | none |
| AUD-005 | 2 | Bounce skip reason is recorded | none | none |
| AUD-005 | 2 | Complaint after approval prevents hand-off | `tests/go-live/delivery.journeys.ts:83` | asserted |
| AUD-005 | 2 | Complaint skip reason is recorded | none | none |
| AUD-005 | 2 | Consent change after approval prevents hand-off | none | none |
| AUD-005 | 2 | Consent change skip reason is recorded | none | none |
| AUD-005 | 2 | Merge after approval prevents hand-off | `tests/audience-controls/merge.spec.ts:39` | asserted |
| AUD-005 | 2 | Merge skip reason is recorded | `tests/audience-controls/merge.spec.ts:39` | asserted |
| AUD-005 | 2 | Frequency-window change after approval prevents hand-off | none | none |
| AUD-005 | 2 | Frequency-window change skip reason is recorded | none | none |
| AUD-005 | 3 | Source freshness holds at hand-off | none | none |
| AUD-005 | 3 | Failed refresh pauses channel before more hand-offs | none | none |
| AUD-005 | 3 | Stale source pauses channel before more hand-offs | none | none |
| AUD-005 | 3 | Only successful refresh resumes | none | none |
| AUD-006 | 1 | Conversion prevents later step | none | none |
| AUD-006 | 1 | Changed eligibility prevents later step | `tests/go-live/multistep.journeys.ts:70` | asserted |
| AUD-006 | 2 | Changed inclusion yields named skip | `tests/go-live/multistep.journeys.ts:70` | asserted |
| AUD-006 | 2 | Custom exclusion yields named skip | `tests/go-live/multistep.journeys.ts:70` | asserted |
| AUD-006 | 2 | Consent change yields named skip | `tests/go-live/multistep.journeys.ts:70` | asserted |
| AUD-006 | 2 | Only eligible control receives second step | `tests/go-live/multistep.journeys.ts:70` | asserted |
| AUD-006 | 3 | Newly matching contact never added | `tests/go-live/multistep.journeys.ts:78` | asserted |
| AUD-007 | 1 | Frozen candidate set survives segment changes | `tests/audience-controls/segments.spec.ts:31` | asserted |
| AUD-007 | 1 | Newly matching contacts not added | none | none |
| AUD-007 | 2 | At most one recipient-step per contact per channel per step under overlapping matches | none | none |
| CAMP-001 | 1 | Draft state | none | none |
| CAMP-001 | 1 | Scheduled state | `tests/campaign-results/results.journeys.ts:52` | asserted |
| CAMP-001 | 1 | Dispatching state | `tests/campaign-results/results.journeys.ts:52` | asserted |
| CAMP-001 | 1 | Paused state | none | none |
| CAMP-001 | 1 | Completed state | `tests/campaign-results/results.journeys.ts:52` | asserted |
| CAMP-001 | 1 | Canceled state | `tests/campaign-results/results.journeys.ts:52` | asserted |
| CAMP-001 | 1 | Failed after missing first-step deadline | none | none |
| CAMP-001 | 2 | Actor or feature recorded for each transition | none | none |
| CAMP-001 | 2 | Time recorded for each transition | none | none |
| CAMP-001 | 2 | Invalid transition rejected | none | none |
| CAMP-002 | 1 | Persisted Campaign name | `tests/campaign-authoring/browser.spec.ts:146` | asserted |
| CAMP-002 | 1 | Persisted Channels | none | none |
| CAMP-002 | 1 | Persisted Audience rule | none | none |
| CAMP-002 | 1 | Persisted Message content | `tests/campaign-authoring/browser.spec.ts:102` | asserted |
| CAMP-002 | 1 | Persisted Sender identity | none | none |
| CAMP-002 | 1 | Persisted Links | `tests/campaign-authoring/browser.spec.ts:102` | asserted |
| CAMP-002 | 1 | Persisted Schedule | `tests/campaign-authoring/browser.spec.ts:163` | asserted |
| CAMP-002 | 2 | Body within sent-size limit saves | none | none |
| CAMP-002 | 2 | Oversized body refused with measured size | none | none |
| CAMP-002 | 2 | Refusal names limit | none | none |
| CAMP-002 | 2 | Oversized body not truncated | none | none |
| CAMP-003 | 1 | Desktop saved preview | `tests/campaign-authoring/browser.spec.ts:150` | asserted |
| CAMP-003 | 1 | Mobile saved preview | none | none |
| CAMP-003 | 1 | Plain-text saved preview | none | none |
| CAMP-003 | 2 | Resolved personalization examples | none | none |
| CAMP-003 | 2 | Compliance footer | none | none |
| CAMP-003 | 2 | SMS opt-out text | none | none |
| CAMP-003 | 3 | Validated styles in saved preview | none | none |
| CAMP-003 | 3 | Failing body unstyled with warning | none | none |
| CAMP-004 | 1 | Atomic audience validation | none | none |
| CAMP-004 | 1 | Atomic consent validation | none | none |
| CAMP-004 | 1 | Source freshness including parallel incumbent sync | none | none |
| CAMP-004 | 1 | Sender registration | none | none |
| CAMP-004 | 1 | Email authentication | none | none |
| CAMP-004 | 1 | Sending reputation | none | none |
| CAMP-004 | 2 | Compliance content | none | none |
| CAMP-004 | 2 | Personalization | none | none |
| CAMP-004 | 2 | All named link rules | none | none |
| CAMP-004 | 2 | Schedule | none | none |
| CAMP-004 | 2 | Provider configuration | none | none |
| CAMP-004 | 3 | Effective deduplication | none | none |
| CAMP-004 | 3 | Provider reconciliation | none | none |
| CAMP-004 | 4 | Refusal leaves campaign in draft | `tests/campaign-authoring/browser.spec.ts:74` | asserted |
| CAMP-004 | 4 | Every blocking check named | `tests/campaign-authoring/browser.spec.ts:73` | asserted |
| CAMP-004 | 5 | Missing subject named | `tests/campaign-authoring/browser.spec.ts:72` | asserted |
| CAMP-004 | 5 | Missing body named | `tests/campaign-authoring/browser.spec.ts:72` | asserted |
| CAMP-004 | 5 | Missing preheader named | `tests/campaign-authoring/browser.spec.ts:72` | asserted |
| CAMP-004 | 5 | Missing sender named | none | none |
| CAMP-004 | 5 | Optional AI or commerce absence permits manual mail-only draft | `tests/campaign-authoring/browser.spec.ts:160` | asserted |
| CAMP-004 | 5 | Required source dependency blocks | `tests/campaign-authoring/browser.spec.ts:175` | asserted |
| CAMP-005 | 1 | One scheduled campaign | `tests/campaign-authoring/browser.spec.ts:163` | asserted |
| CAMP-005 | 1 | One set of steps | none | none |
| CAMP-005 | 1 | One recipient-step set | `tests/campaign-authoring/browser.spec.ts:166` | asserted |
| CAMP-005 | 1 | One approval after repeat | `tests/campaign-authoring/browser.spec.ts:166` | asserted |
| CAMP-006 | 1 | IANA zone retained | `tests/campaign-authoring/browser.spec.ts:55` | asserted |
| CAMP-006 | 1 | Resolved UTC retained | `tests/campaign-authoring/browser.spec.ts:163` | asserted |
| CAMP-006 | 2 | Ambiguous local time refused | `tests/campaign-authoring/browser.spec.ts:138` | asserted |
| CAMP-006 | 2 | Nonexistent local time refused | `tests/campaign-authoring/browser.spec.ts:140` | asserted |
| CAMP-006 | 3 | Store-zone default | `tests/campaign-authoring/browser.spec.ts:55` | asserted |
| CAMP-007 | 1 | Editing produces draft replacement | `tests/go-live/delivery.journeys.ts:39` | asserted |
| CAMP-007 | 1 | Original remains active before replacement approval | none | none |
| CAMP-007 | 2 | Only replacement schedule hands off | `tests/go-live/delivery.journeys.ts:42` | asserted |
| CAMP-007 | 2 | Prior pending recipients canceled | `tests/go-live/delivery.journeys.ts:43` | asserted |
| CAMP-007 | 2 | Replacement atomic with dispatch race | `tests/go-live/delivery.journeys.ts:57` | asserted |
| CAMP-007 | 3 | Post-dispatch edit creates another campaign | `tests/go-live/delivery.journeys.ts:60` | asserted |
| CAMP-007 | 3 | Original and later steps stay active until cancellation | none | none |
| CAMP-008 | 1 | Configured operator email destination only | none | none |
| CAMP-008 | 1 | Configured operator phone destination only | none | none |
| CAMP-008 | 1 | Only admitted typed destinations | none | none |
| CAMP-008 | 2 | Test content is marked | `tests/go-live/go-live.journeys.ts:78` | asserted |
| CAMP-008 | 2 | Campaign history identifies test | none | none |
| CAMP-008 | 3 | No contact activity change | `tests/go-live/go-live.journeys.ts:80` | asserted |
| CAMP-008 | 3 | No reporting change | `tests/go-live/go-live.journeys.ts:81` | asserted |
| CAMP-008 | 3 | No attribution change | none | none |
| CAMP-008 | 3 | No frequency protection change | none | none |
| CAMP-009 | 1 | Scheduled cancellation stops within 30 seconds | none | none |
| CAMP-009 | 1 | Dispatching cancellation stops within 30 seconds | none | none |
| CAMP-009 | 1 | Paused cancellation stops within 30 seconds | none | none |
| CAMP-009 | 1 | Every unsent step stopped | none | none |
| CAMP-009 | 2 | Accepted hand-offs remain separate | `tests/campaign-results/results.journeys.ts:133` | asserted |
| CAMP-009 | 2 | In-flight uncertainty retained | `tests/campaign-results/results.journeys.ts:133` | asserted |
| CAMP-009 | 2 | Delivered mail is not recalled | none | none |
| CAMP-009 | 3 | Countdown to next dispatch | `tests/campaign-results/results.journeys.ts:68` | asserted |
| CAMP-010 | 1 | Step send-by instant | none | none |
| CAMP-010 | 1 | Default end of local scheduled day | none | none |
| CAMP-010 | 2 | Missed recipient deadline is skipped with named reason | none | none |
| CAMP-010 | 3 | No send when deadline predates dispatch | none | none |
| CAMP-011 | 1 | Dispatch within 60 seconds | `tests/go-live/scheduler.journeys.ts:61` | asserted |
| CAMP-011 | 2 | Duplicate scheduler runs dispatch once | `tests/go-live/scheduler.journeys.ts:86` | asserted |
| CAMP-012 | 1 | Signed-in image upload | `tests/campaign-assets.spec.ts:32` | asserted |
| CAMP-012 | 1 | JPEG accepted | none | none |
| CAMP-012 | 1 | PNG accepted | `tests/campaign-assets.spec.ts:34` | asserted |
| CAMP-012 | 1 | GIF accepted | none | none |
| CAMP-012 | 1 | WebP accepted | none | none |
| CAMP-012 | 1 | Header type overrides declared type | `tests/campaign-assets.spec.ts:73` | asserted |
| CAMP-012 | 1 | Truncated upload refused | `tests/campaign-assets.spec.ts:76` | asserted |
| CAMP-012 | 1 | Byte limit | `tests/campaign-assets.spec.ts:79` | asserted |
| CAMP-012 | 1 | Pixel limit | `tests/campaign-assets.spec.ts:80` | asserted |
| CAMP-012 | 1 | Refusals store nothing | `tests/campaign-assets.spec.ts:83` | asserted |
| CAMP-012 | 2 | Store once by hash | `tests/campaign-assets.spec.ts:38` | asserted |
| CAMP-012 | 2 | Image bytes immutable | `tests/campaign-assets.spec.ts:63` | asserted |
| CAMP-012 | 3 | Erasure removes matching image bytes | none | none |
| CAMP-012 | 3 | Erased image answers gone | none | none |
| CAMP-012 | 3 | Erased image blocks approval | none | none |
| CAMP-012 | 4 | Exact image type | `tests/campaign-assets.spec.ts:43` | asserted |
| CAMP-012 | 4 | No-sniff | `tests/campaign-assets.spec.ts:44` | asserted |
| CAMP-012 | 4 | Immutable public cache | `tests/campaign-assets.spec.ts:45` | asserted |
| CAMP-012 | 4 | Generic no-cookie rule moved to BASE-PUBLIC-001 | none | moved |
| CAMP-012 | 4 | Unknown image not found | `tests/campaign-assets.spec.ts:59` | asserted |
| CAMP-012 | 5 | Per-image refusal | `tests/campaign-assets.spec.ts:94` | asserted |
| CAMP-012 | 5 | Other image unaffected | `tests/campaign-assets.spec.ts:95` | asserted |
| CAMP-012 | 5 | Not keyed by client address | none | none |
| CAMP-012 | 6 | No requester identification is recorded | none | none |
| CAMP-012 | 7 | Original bytes exported | none | none |
| CAMP-012 | 8 | Image fetch is not an open signal | none | none |
| CAMP-012 | 8 | Pending erasure image unavailable | none | none |
| CAMP-012 | 8 | Restore image unavailable | none | none |
| CAMP-012 | 8 | Cross-origin restore retains original absolute URLs | none | none |
| CAMP-014 | 1 | Pause stops new hand-offs within 30 seconds | `tests/go-live/pause.journeys.ts:50` | asserted |
| CAMP-014 | 1 | Already handed-off dispositions retained | `tests/go-live/pause.journeys.ts:84` | asserted |
| CAMP-014 | 2 | Resume only remaining recipients | `tests/go-live/pause.journeys.ts:77` | asserted |
| CAMP-014 | 2 | Current consent rechecked | `tests/go-live/pause.journeys.ts:76` | asserted |
| CAMP-014 | 2 | Expired deadline after pause skips | `tests/go-live/pause.journeys.ts:95` | asserted |
| CAMP-014 | 2 | No sends while paused | `tests/go-live/pause.journeys.ts:50` | asserted |
| CAMP-014 | 2 | Each eligible step handed once | `tests/go-live/pause.journeys.ts:77` | asserted |
| CAMP-014 | 3 | Pause actor retained | `tests/go-live/pause.journeys.ts:78` | asserted |
| CAMP-014 | 3 | Resume actor retained | `tests/go-live/pause.journeys.ts:78` | asserted |
| CAMP-014 | 1 | Phone pause fences new hand-offs at 390 with retained earlier dispositions | none | none |
| CAMP-014 | 2 | Phone resume at 390 retains consent, deadline and once-only delivery outcomes | none | none |
| CAMP-014 | 3 | Phone pause/resume actor history at 390 | none | none |
| CAMP-016 | 1 | Linked follow-up and selected delay | `tests/campaign-results/followup.journeys.ts:16` | asserted |
| CAMP-016 | 1 | New subject | `tests/campaign-results/followup.journeys.ts:18` | asserted |
| CAMP-016 | 1 | Non-opener estimate label | `tests/campaign-results/followup.journeys.ts:32` | asserted |
| CAMP-016 | 2 | 48-hour non-clicker candidates | `tests/campaign-results/followup.journeys.ts:20` | asserted |
| CAMP-016 | 2 | Current exclusions including frequency | `tests/campaign-results/followup.journeys.ts:21` | asserted |
| CAMP-016 | 3 | Independent approval | `tests/campaign-results/followup.journeys.ts:22` | asserted |
| CAMP-016 | 3 | Independent frequency check | `tests/campaign-results/followup.journeys.ts:21` | asserted |
| CAMP-018 | 1 | Duplication from every campaign state | none | none |
| CAMP-018 | 1 | Copy-of name | none | none |
| CAMP-018 | 1 | New independent draft | none | none |
| CAMP-018 | 2 | Copied channels | none | none |
| CAMP-018 | 2 | Copied audience rule | none | none |
| CAMP-018 | 2 | Copied content bytes | none | none |
| CAMP-018 | 2 | Copied sender | none | none |
| CAMP-018 | 2 | Copied preheader | none | none |
| CAMP-018 | 2 | Copied tracking choice | none | none |
| CAMP-018 | 2 | Copied step settings | none | none |
| CAMP-018 | 3 | No copied schedule | none | none |
| CAMP-018 | 3 | No copied approval | none | none |
| CAMP-018 | 3 | No copied snapshot | none | none |
| CAMP-018 | 3 | No copied test | none | none |
| CAMP-018 | 3 | No copied result | none | none |
| CAMP-018 | 4 | Current settings checked | none | none |
| CAMP-018 | 4 | Current consent checked | none | none |
| CAMP-018 | 4 | Current audience checked | none | none |
| CAMP-018 | 4 | Source revision unchanged | none | none |
| CAMP-018 | 4 | Source results unchanged | none | none |
| DESIGN-001 | 1 | Default-off when both inputs absent | `tests/campaign-authoring/design-generation.spec.ts:54` | asserted |
| DESIGN-001 | 1 | Partial configuration requires both | none | none |
| DESIGN-001 | 2 | HTTPS origin without path | none | none |
| DESIGN-001 | 2 | Local-only loopback HTTP exception | none | none |
| DESIGN-001 | 3 | No generation control | `tests/campaign-authoring/design-generation.spec.ts:56` | asserted |
| DESIGN-001 | 3 | No provider construction or contact | none | none |
| DESIGN-001 | 3 | Unavailable run refusal names input | `tests/campaign-authoring/design-generation.spec.ts:59` | asserted |
| DESIGN-001 | 4 | Configured owner key used | `tests/campaign-authoring/design-generation.spec.ts:202` | asserted |
| DESIGN-001 | 4 | Only explicitly started or chosen design work contacts service | none | none |
| DESIGN-002 | 1 | Draft name in brief | none | none |
| DESIGN-002 | 1 | Subject in brief | `tests/campaign-authoring/design-generation.spec.ts:85` | asserted |
| DESIGN-002 | 1 | Preheader in brief | none | none |
| DESIGN-002 | 1 | Sender name in brief | none | none |
| DESIGN-002 | 1 | Current text in brief | `tests/campaign-authoring/design-generation.spec.ts:85` | asserted |
| DESIGN-002 | 1 | Brief editable | `tests/campaign-authoring/design-generation.spec.ts:207` | asserted |
| DESIGN-002 | 1 | Two-to-four design choice | none | none |
| DESIGN-002 | 2 | Candidate-drawing spend estimate | `tests/campaign-authoring/design-generation.spec.ts:86` | asserted |
| DESIGN-002 | 2 | Layout spend estimate | none | none |
| DESIGN-002 | 3 | Draft-owned run survives reload | `tests/campaign-authoring/design-generation.spec.ts:95` | asserted |
| DESIGN-002 | 3 | Candidates appear progressively | `tests/campaign-authoring/design-generation.spec.ts:93` | asserted |
| DESIGN-002 | 3 | Later candidate appears | `tests/campaign-authoring/design-generation.spec.ts:96` | asserted |
| DESIGN-003 | 1 | Only layout description and brief | `tests/campaign-authoring/design-generation.spec.ts:210` | asserted |
| DESIGN-003 | 1 | All personalization tokens removed | `tests/campaign-authoring/design-generation.spec.ts:209` | asserted |
| DESIGN-003 | 1 | Only chosen candidate sent for layout | `tests/campaign-authoring/design-generation.spec.ts:231` | asserted |
| DESIGN-003 | 1 | No contact or audience values | `tests/campaign-authoring/design-generation.spec.ts:210` | asserted |
| DESIGN-003 | 2 | Each purchase has idempotency key | `tests/campaign-authoring/design-generation.spec.ts:203` | asserted |
| DESIGN-003 | 2 | Retried purchase buys once | `tests/campaign-authoring/design-generation.spec.ts:214` | asserted |
| DESIGN-003 | 3 | Brief retained | none | none |
| DESIGN-003 | 3 | Provider run identifier | none | none |
| DESIGN-003 | 3 | Provider layout identifier | none | none |
| DESIGN-003 | 3 | Candidate outcomes | `tests/campaign-authoring/design-generation.spec.ts:216` | asserted |
| DESIGN-003 | 3 | Candidate SHA-256 | `tests/campaign-authoring/design-generation.spec.ts:216` | asserted |
| DESIGN-003 | 3 | Candidate size | none | none |
| DESIGN-003 | 3 | Chosen candidate | `tests/campaign-authoring/design-generation.spec.ts:238` | asserted |
| DESIGN-003 | 3 | Operator | none | none |
| DESIGN-003 | 3 | Times | none | none |
| DESIGN-003 | 3 | Safe failure code | `tests/campaign-authoring/design-generation.spec.ts:238` | asserted |
| DESIGN-003 | 3 | Run never deleted | none | none |
| DESIGN-003 | 4 | Candidate originals retained | none | none |
| DESIGN-003 | 4 | Layout retained | none | none |
| DESIGN-003 | 4 | Candidate and layout export | none | none |
| DESIGN-003 | 5 | Cost fact for every paid request | `tests/campaign-authoring/design-generation.spec.ts:236` | asserted |
| DESIGN-004 | 1 | Version-2 LayerDoc and PNG imported | `tests/campaign-authoring/design-import.spec.ts:94` | asserted |
| DESIGN-004 | 1 | Browser compiles email grammar | none | none |
| DESIGN-004 | 2 | Hosted photos | `tests/campaign-authoring/design-import.spec.ts:164` | asserted |
| DESIGN-004 | 2 | Operator HTTPS button | `tests/campaign-authoring/design-import.spec.ts:126` | asserted |
| DESIGN-004 | 2 | Managed unsubscribe footer | `tests/campaign-authoring/design-import.spec.ts:153` | asserted |
| DESIGN-004 | 2 | Saved postal-address footer | `tests/campaign-authoring/design-import.spec.ts:154` | asserted |
| DESIGN-004 | 3 | Unsupported layer text listed | `tests/campaign-authoring/design-import.spec.ts:114` | asserted |
| DESIGN-004 | 3 | Novel design line highlighted | `tests/campaign-authoring/design-import.spec.ts:112` | asserted |
| DESIGN-004 | 3 | Brief line not falsely highlighted | `tests/campaign-authoring/design-import.spec.ts:113` | asserted |
| DESIGN-004 | 4 | Unsupported version visibly refused | `tests/campaign-authoring/design-import.spec.ts:56` | asserted |
| DESIGN-004 | 4 | Non-HTTPS button visibly refused | `tests/campaign-authoring/design-import.spec.ts:60` | asserted |
| DESIGN-004 | 4 | Unrepresentable grammar refused | none | none |
| DESIGN-004 | 4 | Saved body unchanged after refusal | `tests/campaign-authoring/design-import.spec.ts:80` | asserted |
| DESIGN-004 | 4 | Nothing outside grammar saved | none | none |
| DESIGN-004 | 5 | Unsaved edit leaves saved revision intact | `tests/campaign-authoring/design-import.spec.ts:132` | asserted |
| DESIGN-004 | 5 | No import save | `tests/campaign-authoring/design-import.spec.ts:131` | asserted |
| DESIGN-004 | 5 | No import approval | none | none |
| DESIGN-004 | 5 | No import schedule | none | none |
| DESIGN-004 | 5 | No import send | none | none |
| DESIGN-004 | 5 | Ordinary exact-revision approval succeeds | `tests/campaign-authoring/design-import.spec.ts:175` | asserted |
| DESIGN-004 | 6 | Measured HTML-part size refusal | `tests/campaign-authoring/design-import.spec.ts:75` | asserted |
| DESIGN-004 | 6 | Measured plain-text-part size refusal | none | none |
| DESIGN-004 | 7 | No request to 12ui | `tests/campaign-authoring/design-import.spec.ts:176` | asserted |
| DESIGN-010 | 1 | Discarding edit retains paid design | `tests/campaign-authoring/design-generation.spec.ts:143` | asserted |
| DESIGN-010 | 1 | Reload retains candidates | `tests/campaign-authoring/design-generation.spec.ts:226` | asserted |
| DESIGN-010 | 1 | Failed layout retains candidates | `tests/campaign-authoring/design-generation.spec.ts:227` | asserted |
| DESIGN-010 | 1 | New run retains paid design | `tests/campaign-authoring/design-generation.spec.ts:284` | asserted |
| DESIGN-010 | 1 | Save or discard ends offer | `tests/campaign-authoring/design-generation.spec.ts:170` | asserted |
| DESIGN-010 | 2 | Prepared design reuse has no further purchase | `tests/campaign-authoring/design-generation.spec.ts:145` | asserted |
| DESIGN-010 | 3 | Failed layout step shown | `tests/campaign-authoring/design-generation.spec.ts:222` | asserted |
| DESIGN-010 | 3 | Wallet or allowance reason | `tests/campaign-authoring/design-generation.spec.ts:244` | asserted |
| DESIGN-010 | 3 | New paid layout retry | `tests/campaign-authoring/design-generation.spec.ts:247` | asserted |
| DESIGN-010 | 3 | Choose another design | `tests/campaign-authoring/design-generation.spec.ts:253` | asserted |
| DESIGN-010 | 4 | Earlier designs reachable | `tests/campaign-authoring/design-generation.spec.ts:284` | asserted |
| DESIGN-010 | 5 | Hold reason visible | `tests/campaign-authoring/design-generation.spec.ts:279` | asserted |
| DESIGN-010 | 5 | Next retry time visible | none | none |
| DESIGN-010 | 5 | Hold cleared only after answer | `tests/campaign-authoring/design-generation.spec.ts:282` | asserted |
| DESIGN-009 | 1 | Choose beside candidate image | `tests/campaign-authoring/design-generation.spec.ts:199` | asserted |
| DESIGN-009 | 1 | Chosen layout enters import | `tests/campaign-authoring/design-generation.spec.ts:256` | asserted |
| DESIGN-009 | 2 | Untouched choice opens import | `tests/campaign-authoring/design-generation.spec.ts:256` | asserted |
| DESIGN-009 | 2 | Unrelated typing prevents automatic opening | `tests/campaign-authoring/design-generation.spec.ts:112` | asserted |
| DESIGN-009 | 2 | Focus remains in body | `tests/campaign-authoring/design-generation.spec.ts:113` | asserted |
| DESIGN-009 | 2 | Ready notice offers explicit opening | `tests/campaign-authoring/design-generation.spec.ts:110` | asserted |
| DESIGN-009 | 3 | Hosted photos | none | none |
| DESIGN-009 | 3 | Operator destination retained | `tests/campaign-authoring/design-generation.spec.ts:130` | asserted |
| DESIGN-009 | 3 | Managed footer | none | none |
| DESIGN-009 | 3 | Non-brief lines highlighted | `tests/campaign-authoring/design-generation.spec.ts:126` | asserted |
| DESIGN-009 | 4 | Unsaved edit | `tests/campaign-authoring/design-generation.spec.ts:133` | asserted |
| DESIGN-009 | 4 | Replacement confirmation required | none | none |
| DESIGN-008 | 1 | Generated body canonical | `tests/campaign-authoring/design-generation.spec.ts:163` | asserted |
| DESIGN-008 | 2 | No implicit save | `tests/campaign-authoring/design-generation.spec.ts:132` | asserted |
| DESIGN-008 | 2 | No approval | `tests/campaign-authoring/design-generation.spec.ts:167` | asserted |
| DESIGN-008 | 2 | No schedule | `tests/campaign-authoring/design-generation.spec.ts:168` | asserted |
| DESIGN-008 | 2 | No delivery | `tests/campaign-authoring/design-generation.spec.ts:169` | asserted |
| DESIGN-008 | 2 | Save uses ordinary draft path | `tests/campaign-authoring/design-generation.spec.ts:161` | asserted |
| DESIGN-008 | 2 | All ordinary approval checks | none | none |
| DESIGN-008 | 3 | Failed run safe reason | `tests/campaign-authoring/design-generation.spec.ts:238` | asserted |
| DESIGN-008 | 3 | Timeout reason | `tests/campaign-authoring/design-generation.spec.ts:312` | asserted |
| DESIGN-008 | 3 | Failure leaves draft unchanged | `tests/campaign-authoring/design-generation.spec.ts:318` | asserted |
| DESIGN-008 | 3 | No semantic content substitute | `tests/campaign-authoring/design-generation.spec.ts:318` | asserted |
| CAMP-021 | 1 | Blank newsletter without AI or commerce | `tests/campaign-authoring/browser.spec.ts:29` | asserted |
| CAMP-021 | 1 | Real source starter | `tests/campaign-authoring/browser.spec.ts:171` | asserted |
| CAMP-021 | 1 | Same editable Review | `tests/campaign-authoring/browser.spec.ts:32` | asserted |
| CAMP-021 | 1 | At most three clicks | none | none |
| CAMP-021 | 2 | Linked proposal reused | `tests/campaign-authoring/browser.spec.ts:187` | asserted |
| CAMP-021 | 2 | Concurrent adoption creates one campaign | `tests/campaign-authoring/browser.spec.ts:183` | asserted |
| CAMP-021 | 2 | Expired proposal not adopted | none | none |
| CAMP-021 | 3 | Create has no authority | `tests/campaign-authoring/browser.spec.ts:52` | asserted |
| CAMP-021 | 3 | Select and save enqueue nothing | `tests/campaign-authoring/browser.spec.ts:148` | asserted |
| CAMP-021 | 3 | Incomplete draft saves | `tests/campaign-authoring/browser.spec.ts:66` | asserted |
| CAMP-021 | 3 | Approval names missing content | `tests/campaign-authoring/browser.spec.ts:72` | asserted |
| CAMP-021 | 4 | Rich text initial editor | `tests/campaign-authoring/browser.spec.ts:81` | asserted |
| CAMP-021 | 4 | Optional HTML mode preserves authored markup | `tests/campaign-authoring/browser.spec.ts:89` | asserted |
| CAMP-021 | 4 | Styled and image content stays in HTML mode | `tests/campaign-authoring/browser.spec.ts:92` | asserted |
| CAMP-021 | 4 | No image fetch while authoring | `tests/campaign-authoring/browser.spec.ts:93` | asserted |
| CAMP-022 | 1 | One managed unsubscribe footer | `tests/campaign-authoring/browser.spec.ts:147` | asserted |
| CAMP-022 | 1 | One managed postal footer | none | none |
| CAMP-022 | 1 | Derived text contains destination URL | `tests/campaign-authoring/browser.spec.ts:102` | asserted |
| CAMP-022 | 2 | Stored body resaves byte-identically | `tests/campaign-authoring/canonical-save.spec.ts:41` | asserted |
| CAMP-022 | 2 | Editor body resaves byte-identically | `tests/campaign-authoring/canonical-save.spec.ts:93` | asserted |
| CAMP-022 | 2 | HTML-body parse with scripting off | none | none |
| CAMP-022 | 3 | Kept attribute values preserved | none | none |
| CAMP-022 | 3 | Kept styles preserved | none | none |
| CAMP-022 | 3 | Comments preserved but refused | none | none |
| CAMP-022 | 3 | Personalization tokens preserved | none | none |
| CAMP-022 | 3 | Refused markup not repaired | none | none |
| CAMP-022 | 3 | Noncanonical syntax saves | none | none |
| CAMP-022 | 4 | First duplicate attribute kept | `tests/campaign-authoring/canonical-save.spec.ts:50` | asserted |
| CAMP-022 | 4 | Ignored misplaced tags absent | `tests/campaign-authoring/canonical-save.spec.ts:53` | asserted |
| CAMP-022 | 4 | Closing-tag attributes dropped | none | none |
| CAMP-022 | 4 | Checker judges stored tree | `tests/campaign-authoring/canonical-save.spec.ts:51` | asserted |
| CAMP-022 | 5 | Leading newline stable | none | none |
| CAMP-022 | 5 | Plaintext stable without footer growth | none | none |
| CAMP-022 | 5 | Sixteen-round instability refusal | none | none |
| CAMP-022 | 6 | Older draft canonicalized on any-field save | none | none |
| CAMP-022 | 6 | Plain text comes from same parse | none | none |
| CAMP-020 | 1 | Structured inclusion updates | `tests/campaign-authoring/browser.spec.ts:109` | asserted |
| CAMP-020 | 1 | Structured exclusion updates | none | none |
| CAMP-020 | 1 | Real source counts | `tests/campaign-authoring/browser.spec.ts:130` | asserted |
| CAMP-020 | 2 | Unavailable missing source counts | `tests/campaign-authoring/browser.spec.ts:126` | asserted |
| CAMP-020 | 2 | Unavailable stale counts | `tests/campaign-authoring/browser.spec.ts:175` | asserted |
| CAMP-020 | 3 | Late old request cannot replace new count | `tests/campaign-authoring/browser.spec.ts:123` | asserted |
| AUD-010 | 1 | Review summary | none | none |
| AUD-010 | 1 | Approval checks summary | none | none |
| AUD-010 | 1 | Scheduled page summary | none | none |
| AUD-010 | 1 | Campaign list summary | none | none |
| AUD-010 | 1 | Audience snapshot summary | none | none |
| AUD-010 | 2 | Every condition | none | none |
| AUD-010 | 2 | Comparison | none | none |
| AUD-010 | 2 | Value | none | none |
| AUD-010 | 2 | Lookback | none | none |
| AUD-010 | 2 | Editor labels | none | none |
| AUD-010 | 2 | All-or-any matching | none | none |
| CAMP-002 | 3 | Composer live summary | none | none |
| CAMP-002 | 3 | New saved revision summary | none | none |
| CAMP-002 | 3 | Caller prose not authority | none | none |
| CAMP-002 | 4 | Old summary derives without approval rewrite | none | none |
| CAMP-002 | 4 | Readiness requires structured rules | none | none |
| CAMP-002 | 4 | Approval binds saved rules | none | none |
| CAMP-023 | 1 | Insert image uploads and inserts header-derived dimensions | `tests/campaign-authoring/local-images.spec.ts:36` | asserted |
| CAMP-023 | 1 | At most 600-pixel width | `tests/campaign-authoring/local-images.spec.ts:36` | asserted |
| CAMP-023 | 1 | Description required | none | none |
| CAMP-023 | 2 | Public address in response | `tests/campaign-assets.spec.ts:34` | asserted |
| CAMP-023 | 2 | Stored-type extension serves same bytes | `tests/campaign-assets.spec.ts:55` | asserted |
| CAMP-023 | 2 | Wrong extension not found | `tests/campaign-assets.spec.ts:57` | asserted |
| CAMP-023 | 3 | Local own HTTP image saves | `tests/campaign-authoring/local-images.spec.ts:39` | asserted |
| CAMP-023 | 3 | Styled local preview loads after opt-in | `tests/campaign-authoring/local-images.spec.ts:46` | asserted |
| CAMP-023 | 3 | Other HTTP origins refused | none | none |
| CAMP-023 | 4 | Local HTTP image approval refusal | `tests/campaign-authoring/local-images.spec.ts:50` | asserted |
| CAMP-023 | 4 | Local HTTP image test refusal | none | none |
| CAMP-023 | 4 | Local HTTP image delivery refusal | none | none |
| CAMP-023 | 4 | HTTPS deployment unaffected | `tests/campaign-assets.spec.ts:134` | asserted |
| DESIGN-014 | 1 | 2 MB bound | none | none |
| DESIGN-014 | 1 | 2,000-layer bound | none | none |
| DESIGN-014 | 1 | 64-level nesting bound | none | none |
| DESIGN-014 | 1 | Deep input named refusal without overflow | none | none |
| DESIGN-014 | 1 | Unsupported input not guessed | none | none |
| DESIGN-014 | 2 | PNG canvas shape matched | none | none |
| DESIGN-014 | 3 | Personalization delimiter rejected | none | none |
| DESIGN-014 | 4 | Editable draft-derived brief | none | none |
| DESIGN-014 | 4 | Whole-line whole-word matching | none | none |
| DESIGN-014 | 4 | Case/spacing/typographic-quote matching | none | none |
| DESIGN-014 | 5 | Signed URLs never fetched | none | none |
| DESIGN-014 | 5 | Every value stays within compiler | none | none |
| DESIGN-014 | 5 | Lazy importer load | none | none |
| DESIGN-013 | 1 | Hosted image thumbnail | `tests/campaign-authoring/design-import.spec.ts:117` | asserted |
| DESIGN-013 | 1 | Image description highlighting | none | none |
| DESIGN-013 | 1 | Text novel-line highlighting | `tests/campaign-authoring/design-import.spec.ts:112` | asserted |
| DESIGN-013 | 2 | Icons omitted and listed | none | none |
| DESIGN-013 | 2 | Dividers omitted and listed | none | none |
| DESIGN-013 | 2 | Shapes omitted and listed | none | none |
| DESIGN-013 | 2 | Destinationless links omitted and listed | none | none |
| DESIGN-013 | 2 | Extra buttons omitted and listed | none | none |
| DESIGN-013 | 2 | Footer links omitted and listed | none | none |
| DESIGN-013 | 2 | Digit-bearing footer lines omitted and listed | none | none |
| DESIGN-013 | 3 | Unsaved state shown | `tests/campaign-authoring/design-import.spec.ts:133` | asserted |
| DESIGN-013 | 3 | Edited-since state shown | none | none |
| DESIGN-013 | 3 | Discard removes summary | `tests/campaign-authoring/design-import.spec.ts:97` | asserted |
| DESIGN-013 | 4 | Abandoned uploaded images remain | none | none |
| DESIGN-013 | 4 | Approval does not verify model claims | none | none |
| DESIGN-012 | 1 | Centered 600-pixel layout | none | none |
| DESIGN-012 | 1 | Header emblem and lettering | none | none |
| DESIGN-012 | 1 | Full-width photos | none | none |
| DESIGN-012 | 1 | Two-column vertical alignment | none | none |
| DESIGN-012 | 1 | One button | none | none |
| DESIGN-012 | 1 | Managed footer | none | none |
| DESIGN-012 | 1 | Tightened email grammar | none | none |
| DESIGN-012 | 2 | Only cells paint backgrounds | none | none |
| DESIGN-012 | 2 | Images keep natural inline display | none | none |
| DESIGN-012 | 2 | Button corners within padding | none | none |
| DESIGN-012 | 3 | Escaped text | none | none |
| DESIGN-012 | 3 | Long-word wrapping | none | none |
| DESIGN-012 | 3 | Closed hex colors | none | none |
| DESIGN-012 | 3 | At least 4.5:1 | none | none |
| DESIGN-012 | 3 | Georgia-or-Helvetica stacks | none | none |
| DESIGN-012 | 3 | Mango sizes and spacing | none | none |
| DESIGN-012 | 4 | Full-resolution crop | none | none |
| DESIGN-012 | 4 | At most twice displayed width | none | none |
| DESIGN-012 | 4 | JPEG uploaded | none | none |
| DESIGN-012 | 4 | No server image codec | none | none |
| DESIGN-012 | 5 | Compiler size check | none | none |
| DESIGN-012 | 5 | Save size check | none | none |
| DESIGN-012 | 5 | Approval size check | none | none |
| DESIGN-012 | 5 | Test size check | none | none |
| DESIGN-012 | 5 | Delivery size check | none | none |
| DESIGN-012 | 5 | Oversize recipient skipped | none | none |
| DESIGN-012 | 5 | No truncation | none | none |
| DESIGN-012 | 6 | Phone columns side by side | none | none |
| DESIGN-012 | 6 | Phone columns narrow with email | none | none |
| DESIGN-007 | 1 | Ordinary 30-second request bound | none | none |
| DESIGN-007 | 1 | 60-second download bound | none | none |
| DESIGN-007 | 1 | 150-second purchase bound | none | none |
| DESIGN-007 | 2 | Retry-After honored | none | none |
| DESIGN-007 | 2 | Same key on rate retry | `tests/campaign-authoring/design-generation.spec.ts:288` | asserted |
| DESIGN-007 | 2 | Relative retry time notice | none | none |
| DESIGN-007 | 2 | Notice stays until answer | `tests/campaign-authoring/design-generation.spec.ts:282` | asserted |
| DESIGN-007 | 2 | Beyond-deadline wait fails quota | none | none |
| DESIGN-007 | 3 | Untimed refusal fails quota | `tests/campaign-authoring/design-generation.spec.ts:293` | asserted |
| DESIGN-007 | 3 | Wallet refusal fails quota | `tests/campaign-authoring/design-generation.spec.ts:244` | asserted |
| DESIGN-007 | 3 | Network failure retries | none | none |
| DESIGN-007 | 3 | Server failure retries | none | none |
| DESIGN-007 | 3 | Request timeout retries | none | none |
| DESIGN-007 | 3 | Three-pass bound | none | none |
| DESIGN-007 | 3 | Five- and ten-second spacing | none | none |
| DESIGN-007 | 3 | Unavailable final failure | none | none |
| DESIGN-007 | 4 | Unauthorized reason | none | none |
| DESIGN-007 | 4 | Rejected request reason | none | none |
| DESIGN-007 | 4 | Unreadable reason | none | none |
| DESIGN-007 | 4 | Forbidden redirect reason | none | none |
| DESIGN-007 | 4 | Failed design reason | `tests/campaign-authoring/design-generation.spec.ts:238` | asserted |
| DESIGN-007 | 4 | Expired layout reason | none | none |
| DESIGN-007 | 5 | Cron deadline settlement | none | none |
| DESIGN-007 | 5 | Read deadline settlement | `tests/campaign-authoring/design-generation.spec.ts:312` | asserted |
| DESIGN-007 | 5 | Quiet work resumed after two minutes | none | none |
| DESIGN-007 | 5 | Declared provider wait respected | none | none |
| DESIGN-007 | 6 | New run refused while same draft waits | none | none |
| DESIGN-007 | 6 | Offered design may prepare during wait | none | none |
| DESIGN-011 | 1 | 64 KB JSON stream cap | none | none |
| DESIGN-011 | 1 | 40 MB candidate stream cap | none | none |
| DESIGN-011 | 1 | 4,096-pixel bound | none | none |
| DESIGN-011 | 1 | Declared oversize refused unread | none | none |
| DESIGN-011 | 2 | Published layout digest verified | none | none |
| DESIGN-011 | 2 | Version-2 layout parser | none | none |
| DESIGN-011 | 2 | Same-origin read redirects only | none | none |
| DESIGN-011 | 2 | Purchase redirects refused | none | none |
| DESIGN-011 | 3 | Provider error text never stored | none | none |
| DESIGN-011 | 3 | Provider error text never shown | `tests/campaign-authoring/design-generation.spec.ts:223` | asserted |
| DESIGN-011 | 3 | Safe Mango reason | none | none |
| DESIGN-011 | 4 | Candidate requires session | none | none |
| DESIGN-011 | 4 | Layout requires session | none | none |
| DESIGN-011 | 4 | Only selected crops public | none | none |
| DESIGN-011 | 5 | Full-size candidate link | none | none |
| DESIGN-011 | 5 | Up to ten older offered runs | none | none |
| DESIGN-011 | 5 | Separate old-run choice controls | `tests/campaign-authoring/design-generation.spec.ts:284` | asserted |
| DESIGN-011 | 6 | Queue contains only run identity | none | none |
| DESIGN-011 | 6 | Only still-needed requests | none | none |
| DESIGN-011 | 6 | Erasure write fence | none | none |
| DESIGN-011 | 6 | Restore fence | none | none |
| DESIGN-011 | 6 | Erasure redacts briefs | none | none |
| DESIGN-006 | 1 | Local optional input reading | none | none |
| DESIGN-006 | 1 | First-deploy supplied optional upload | none | none |
| DESIGN-006 | 1 | Later-deploy supplied optional upload | none | none |
| DESIGN-006 | 1 | Never required | none | none |
| DESIGN-006 | 1 | Later deploy preserves secrets | none | none |
| DESIGN-006 | 2 | Verification inputs absent keeps module off | none | none |
| DESIGN-006 | 3 | Local consumer only design work | none | none |
| DESIGN-006 | 3 | Other queue work left for retry | none | none |
| DESIGN-005 | 1 | No 12ui request when absent | none | none |
| DESIGN-005 | 1 | Only operator run requests | none | none |
| DESIGN-005 | 1 | No startup request | none | none |
| DESIGN-005 | 1 | No independent-schedule request | none | none |
| DESIGN-005 | 1 | No unrelated request | none | none |
| DESIGN-005 | 2 | Refusal fails only that run | none | none |
| DESIGN-005 | 2 | Outage fails only that run | none | none |
| DESIGN-005 | 3 | Design-authoring role authority | none | none |
| DESIGN-005 | 3 | Provider wallet and allowance honored | none | none |
| DESIGN-005 | 3 | Per-paid-step estimate | none | none |
| DESIGN-005 | 3 | Request recorded | none | none |
| DESIGN-005 | 3 | Business spend caps moved to BASE-AGENT-011 | none | moved |
| DESIGN-005 | 4 | Subprocessors disclosure | none | none |
| DESIGN-005 | 4 | Evaluation-corpus retention disclosure | none | none |
| DESIGN-005 | 4 | Design-timing disclosure | none | none |
| CAMP-006 | 4 | Store zone independent of browser zone | `tests/campaign-authoring/browser.spec.ts:55` | asserted |
| CAMP-006 | 4 | Read-only resolved UTC | `tests/campaign-authoring/browser.spec.ts:59` | asserted |
| CAMP-006 | 4 | 23:59 local deadline | `tests/campaign-authoring/browser.spec.ts:57` | asserted |
| CAMP-006 | 5 | UI daylight-saving refusal | `tests/campaign-authoring/browser.spec.ts:138` | asserted |
| CAMP-006 | 5 | API non-hour DST refusal | `tests/campaign-authoring/browser.spec.ts:140` | asserted |
| CAMP-006 | 6 | Explicit instant compatibility | none | none |
| CAMP-006 | 6 | Local and UTC disagreement refused | none | none |
| CAMP-012 | 4 | Sandboxed no-content-execution policy | none | none |
| CAMP-016 | 2 | Exact non-clicker recipient identities after current exclusions | none | none |
| DATA-001 | 1 | Archive includes attribution events | none | none |
| DATA-001 | 1 | Archive includes audience decisions | none | none |
| DATA-001 | 1 | Archive includes audit entries | none | none |
| DATA-001 | 1 | Archive includes campaigns | none | none |
| DATA-001 | 1 | Archive includes consent | `tests/go-live/go-live.journeys.ts:304` | asserted |
| DATA-001 | 1 | Archive includes contacts | `tests/go-live/go-live.journeys.ts:304` | asserted |
| DATA-001 | 1 | Archive includes messages | none | none |
| DATA-001 | 1 | Archive includes proposals | none | none |
| DATA-001 | 1 | Archive includes recipient-step outcomes | `tests/go-live/go-live.journeys.ts:304` | asserted |
| DATA-001 | 1 | Archive includes revisions | none | none |
| DATA-001 | 1 | Archive includes settings | none | none |
| DATA-001 | 1 | Archive includes source records | none | none |
| DATA-001 | 1 | Archive includes suppressions | `tests/go-live/go-live.journeys.ts:304` | asserted |
| DATA-001 | 1 | Archive includes surviving opt-outs | `tests/go-live/go-live.journeys.ts:304` | asserted |
| DATA-001 | 2 | Original uploaded campaign-asset bytes | `tests/portability.spec.ts:190` | asserted |
| DATA-001 | 3 | Authentication credentials excluded | none | none |
| DATA-001 | 3 | Operator profiles attribution-only | none | none |
| DATA-001 | 3 | Sessions excluded | none | none |
| DATA-001 | 3 | Signed first-owner authority excluded | none | none |
| DATA-001 | 3 | Transfer bookkeeping excluded | none | none |
| DATA-002 | 1 | Empty maintenance destination | none | none |
| DATA-002 | 1 | Explicit confirmation | none | none |
| DATA-002 | 1 | Fresh destination native authentication | none | none |
| DATA-002 | 2 | Contact keys match before record restore | none | none |
| DATA-002 | 2 | Link keys match before object restore | none | none |
| DATA-002 | 3 | Every older archive refused by current erasure floor | `tests/portability.spec.ts:267` | asserted |
| DATA-002 | 4 | Nonempty legacy journal refused before staging | `tests/local-start/command-data.journey.ts:46` | asserted |
| DATA-002 | 5 | Current post-erasure export restores | `tests/portability.spec.ts:260` | asserted |
| DATA-002 | 5 | Surviving opt-outs preserved | `tests/portability.spec.ts:264` | asserted |
| MGMT-002 | 1 | Anonymous no widget | `tests/local-start/editor.journey.ts:39` | asserted |
| MGMT-002 | 1 | Owner editor present | `tests/local-start/editor.journey.ts:45` | asserted |
| MGMT-002 | 1 | Short-lived grant | none | none |
| MGMT-002 | 2 | Configured management frame origin | none | none |
| MGMT-002 | 2 | Foreign frame/message rejected | none | none |
| MGMT-002 | 3 | Authorization loss removes widget | none | none |
| MGMT-002 | 3 | Grant expiry removes widget | none | none |
| MGMT-002 | 3 | Logout removes widget | `tests/local-start/editor.journey.ts:58` | asserted |
| MGMT-002 | 4 | Compiled edits after route hydration | none | none |
| MGMT-002 | 5 | Six product roles separate from Base roles | none | none |
| MGMT-002 | 6 | Destination-owned restore authority | none | none |
| MGMT-002 | 6 | Last product Owner protected | none | none |
| MGMT-002 | 6 | Owner/Admin CSV restriction | none | none |
| MSG-002 | 1 | Scheduling is refused when the sending domain does not pass SPF. | none | none |
| MSG-002 | 2 | Scheduling is refused when the sending domain does not pass DKIM. | none | none |
| MSG-002 | 3 | Scheduling is refused when the sending domain does not pass DMARC. | none | none |
| MSG-002 | 4 | Scheduling is refused when the visible From domain does not align with an authenticated domain. | none | none |
| MSG-002 | 5 | Passing sender schedules | `tests/sender-verification/worker.spec.ts:20` | asserted |
| MSG-003 | 1 | DKIM covers both headers | none | none |
| MSG-003 | 1 | One-click declaration | `tests/sender-verification/worker.spec.ts:22` | asserted |
| MSG-003 | 1 | Opaque HTTPS mail-client URL | none | none |
| MSG-003 | 1 | Visible link | `tests/go-live/go-live.journeys.ts:245` | asserted |
| MSG-003 | 2 | Context-free one-click body | `tests/go-live/go-live.journeys.ts:224` | asserted |
| MSG-003 | 2 | No redirect | none | none |
| MSG-003 | 2 | Opt-out ledger is changed before success | `tests/sender-verification/worker.spec.ts:35` | asserted |
| MSG-003 | 3 | Scanner and prefetch do not unsubscribe | `tests/go-live/go-live.journeys.ts:215` | asserted |
| MSG-003 | 3 | Visible confirmation action alone opts out | none | none |
| MSG-003 | 4 | One-click repeats have one effect | `tests/go-live/go-live.journeys.ts:227` | asserted |
| MSG-003 | 5 | No session or cookie required | `tests/go-live/go-live.journeys.ts:224` | asserted |
| MSG-003 | 6 | A token changes only its contact | none | none |
| MSG-005 | 1 | Configured program identity | none | none |
| MSG-005 | 1 | STOP or jurisdiction equivalent | none | none |
| MSG-005 | 2 | Frequency disclosure | none | none |
| MSG-005 | 3 | URL never replaces reply opt-out | none | none |
| MSG-005 | 4 | Compliance text | none | none |
| MSG-005 | 4 | Help contact | none | none |
| MSG-005 | 4 | Segment count | none | none |
| MSG-006 | 1 | Malformed links named and blocked | none | none |
| MSG-006 | 2 | Forbidden schemes named and blocked | none | none |
| MSG-006 | 3 | Unlisted link and redirect hosts named and blocked | none | none |
| MSG-006 | 4 | Image scheme and host named and blocked | none | none |
| MSG-006 | 5 | Allow action only for host | none | none |
| MSG-006 | 5 | Contact links need no allowance | none | none |
| MSG-006 | 6 | Campaign approval | `tests/go-live/content-checks.journeys.ts:58` | asserted |
| MSG-006 | 6 | Flow activation | none | none |
| MSG-006 | 6 | Link inspection | none | none |
| MSG-006 | 6 | Tracking | none | none |
| MSG-006 | 7 | Missing own asset blocks and is named | none | none |
| MSG-006 | 7 | Own asset checked without DNS | none | none |
| MSG-006 | 7 | Own asset checked without same-host request | none | none |
| MSG-007 | 1 | Advisory findings shown | `tests/go-live/content-checks.journeys.ts:46` | asserted |
| MSG-007 | 1 | Blocking findings shown | `tests/go-live/content-checks.journeys.ts:45` | asserted |
| MSG-007 | 1 | Every channel | none | none |
| MSG-007 | 2 | Acknowledgment survives reload | `tests/go-live/content-checks.journeys.ts:54` | asserted |
| MSG-007 | 2 | Actor | `tests/go-live/content-checks.journeys.ts:78` | asserted |
| MSG-007 | 2 | Replay produces one audit entry | `tests/go-live/content-checks.journeys.ts:56` | asserted |
| MSG-007 | 2 | Time | `tests/go-live/content-checks.journeys.ts:78` | asserted |
| MSG-007 | 3 | Edit invalidates old finding | `tests/go-live/content-checks.journeys.ts:63` | asserted |
| MSG-007 | 4 | Safety findings cannot be acknowledged | `tests/go-live/content-checks.journeys.ts:36` | asserted |
| MSG-007 | 5 | Blocking findings prevent approval and effects | `tests/go-live/content-checks.journeys.ts:58` | asserted |
| MSG-008 | 1 | Approval refusal leaves no recipient steps | `tests/go-live/personalisation.journeys.ts:28` | asserted |
| MSG-008 | 1 | Bare token blocks checks | `tests/go-live/personalisation.journeys.ts:26` | asserted |
| MSG-008 | 1 | Bare token when every eligible person resolves it | none | none |
| MSG-008 | 1 | Scheduling refusal | none | none |
| MSG-008 | 2 | Saved fallback rendered | `tests/go-live/personalisation.journeys.ts:71` | asserted |
| MSG-008 | 3 | Approval preserves counts | `tests/go-live/personalisation.journeys.ts:76` | asserted |
| MSG-008 | 3 | Eligible person counts exclude pending people and token occurrences | `tests/go-live/personalisation.journeys.ts:40` | asserted |
| MSG-008 | 4 | Destination-only label uses fallback | `tests/go-live/personalisation.journeys.ts:71` | asserted |
| MSG-008 | 4 | HTML escaping | `tests/go-live/personalisation.journeys.ts:71` | asserted |
| MSG-008 | 4 | Plain-text name | `tests/go-live/personalisation.journeys.ts:72` | asserted |
| MSG-008 | 5 | Illustrative display name | `tests/go-live/personalisation.journeys.ts:44` | asserted |
| MSG-008 | 5 | Unavailable property fallback in delivery | `tests/go-live/personalisation.journeys.ts:73` | asserted |
| MSG-008 | 5 | Unavailable property fallback in preview | `tests/go-live/personalisation.journeys.ts:57` | asserted |
| MSG-008 | 6 | Editor saved | `tests/go-live/personalisation.journeys.ts:36` | asserted |
| MSG-008 | 6 | Preview at desktop and phone | `tests/go-live/personalisation.journeys.ts:44` | asserted |
| MSG-008 | 6 | Review at desktop and phone | `tests/go-live/personalisation.journeys.ts:43` | asserted |
| MSG-009 | 1 | Equivalent links in HTML and text | none | none |
| MSG-009 | 1 | Equivalent offer in HTML and text | none | none |
| MSG-009 | 1 | Multipart alternative | none | none |
| MSG-009 | 1 | Saved preheader delivered | none | none |
| MSG-009 | 1 | Unsubscribe link in both parts | none | none |
| MSG-009 | 2 | Save stability | `tests/campaign-authoring/canonical-save.spec.ts:92` | asserted |
| MSG-009 | 2 | Stored parser structure | `tests/campaign-authoring/canonical-save.spec.ts:39` | asserted |
| MSG-009 | 3 | Admitted attribute set | none | none |
| MSG-009 | 3 | Admitted inline-style set | none | none |
| MSG-009 | 3 | Admitted tag set | none | none |
| MSG-009 | 3 | BUILD-012 size bar | none | none |
| MSG-009 | 3 | Only token and tracking substitutions | none | none |
| MSG-009 | 3 | Saved HTML bytes delivered | none | none |
| MSG-009 | 4 | CSS-function refusal | none | none |
| MSG-009 | 4 | Class refusal | none | none |
| MSG-009 | 4 | Form refusal | none | none |
| MSG-009 | 4 | Script refusal | none | none |
| MSG-009 | 4 | Stylesheet refusal | none | none |
| MSG-009 | 5 | Check with responsive block | none | none |
| MSG-009 | 5 | Check without responsive block | none | none |
| MSG-009 | 5 | Responsive block generated only by builder | none | none |
| MSG-009 | 5 | Responsive block regenerated on save | none | none |
| MSG-009 | 6 | Same stored-parse checker for approval | none | none |
| MSG-009 | 6 | Same stored-parse checker for delivery | none | none |
| MSG-009 | 6 | Same stored-parse checker for test send | none | none |
| MSG-009 | 7 | Plain text derives from same parse | none | none |
| MSG-009 | 7 | Preview styles only after checker success | none | none |
| MSG-009 | 7 | Preview uses shared parse | none | none |
| MSG-009 | 8 | Decoded destination checks | none | none |
| MSG-009 | 8 | Literal angle-bracket refusal | none | none |
| MSG-009 | 8 | Literal quote refusal | none | none |
| MSG-009 | 8 | No-break space refusal | none | none |
| MSG-009 | 8 | Normalization does not repair hiding declarations | none | none |
| MSG-010 | 1 | Complete response below two seconds | `tests/go-live/opt-out-reasons.journeys.ts:54` | asserted |
| MSG-010 | 2 | Shared GET allowance excess | `tests/go-live/opt-out-reasons.journeys.ts:106` | asserted |
| MSG-010 | 2 | Shared POST allowance excess | `tests/go-live/opt-out-reasons.journeys.ts:107` | asserted |
| MSG-010 | 3 | Another token at the same client address actually opts out | `tests/go-live/opt-out-reasons.journeys.ts:117` | asserted |
| MSG-010 | 4 | Confirmation at both widths | `tests/go-live/opt-out-reasons.journeys.ts:64` | asserted |
| MSG-010 | 4 | Success at both widths | `tests/go-live/opt-out-reasons.journeys.ts:82` | asserted |
| MSG-010 | 5 | One-click opt-out prevents the approved send | `tests/go-live/opt-out-reasons.journeys.ts:127` | asserted |
| MSG-010 | 5 | Opt-out survives reconciliation | `tests/go-live/opt-out-reasons.journeys.ts:93` | asserted |
| MSG-011 | 1 | At 1,000 or more marketing deliveries in the reporting window, a complaint rate at or above 0.3% blocks scheduling. | none | none |
| MSG-011 | 2 | At that volume, a hard-bounce rate at or above 5% of attempted marketing hand-offs blocks scheduling. | none | none |
| MSG-011 | 3 | Provider hold blocks approval | none | none |
| MSG-011 | 4 | Each block names its numerator, denominator, reporting window and provider rule and cannot be acknowledged away. | none | none |
| MSG-011 | 5 | Late facts recompute the block, which clears only when every applicable threshold is below its limit. | none | none |
| MSG-012 | 1 | Delivery tree | none | none |
| MSG-012 | 1 | Parser tree controls approval | `tests/campaign-authoring/canonical-save.spec.ts:44` | asserted |
| MSG-012 | 1 | Test-send tree | none | none |
| MSG-012 | 2 | Low-contrast text blocked | `tests/campaign-authoring/canonical-save.spec.ts:51` | asserted |
| MSG-012 | 2 | Outer-wrapper contrast | none | none |
| MSG-012 | 2 | Painted-cell contrast | none | none |
| MSG-012 | 2 | Quirks-rendering contrast | none | none |
| MSG-012 | 2 | Standards-rendering contrast | none | none |
| MSG-012 | 2 | White-page contrast | none | none |
| MSG-012 | 3 | Clipped text refused | none | none |
| MSG-012 | 3 | Faded text refused | none | none |
| MSG-012 | 3 | Hidden text refused | none | none |
| MSG-012 | 3 | Moved text refused | none | none |
| MSG-012 | 3 | Overlaid text refused | none | none |
| MSG-012 | 3 | Reason named | none | none |
| MSG-012 | 3 | Reversed text refused | none | none |
| MSG-012 | 3 | Under-10px text refused | none | none |
| MSG-012 | 4 | Background outside painted cells/wrapper refused | none | none |
| MSG-012 | 4 | Constraining dimensions refused | none | none |
| MSG-012 | 4 | Direction outside cell refused | none | none |
| MSG-012 | 4 | Display changes refused | none | none |
| MSG-012 | 4 | Inline borders refused | none | none |
| MSG-012 | 4 | Overlapping styled cells refused | none | none |
| MSG-012 | 4 | Painted rounded corner over text refused | none | none |
| MSG-012 | 5 | Misparsed styled markup blocks | `tests/campaign-authoring/canonical-save.spec.ts:42` | asserted |
| MSG-012 | 6 | Postal-address presentation protected | none | none |
| MSG-012 | 6 | Unsubscribe presentation protected | none | none |
| MSG-013 | 1 | Disallowed parameters blocked | `tests/go-live/contact-links.journeys.ts:35` | asserted |
| MSG-013 | 1 | Email subject/body form saved | `tests/go-live/contact-links.journeys.ts:58` | asserted |
| MSG-013 | 1 | Multiple addresses blocked | `tests/go-live/contact-links.journeys.ts:35` | asserted |
| MSG-013 | 2 | E.164 phone and SMS body saved | `tests/go-live/contact-links.journeys.ts:58` | asserted |
| MSG-013 | 2 | Invalid phone blocked | `tests/go-live/contact-links.journeys.ts:35` | asserted |
| MSG-013 | 2 | Ten-digit US and visual separators | none | none |
| MSG-013 | 3 | Authored HTML validation | `tests/go-live/contact-links.journeys.ts:35` | asserted |
| MSG-013 | 3 | Email, Phone and Text link kinds | `tests/go-live/contact-links.journeys.ts:58` | asserted |
| MSG-013 | 3 | Web kind | none | none |
| MSG-013 | 4 | Decoded SMS body | `tests/go-live/contact-links.journeys.ts:74` | asserted |
| MSG-013 | 4 | Decoded email address, subject and body | `tests/go-live/contact-links.journeys.ts:72` | asserted |
| MSG-013 | 4 | Decoded phone | `tests/go-live/contact-links.journeys.ts:73` | asserted |
| MSG-013 | 5 | HTML preserves links | `tests/go-live/contact-links.journeys.ts:86` | asserted |
| MSG-013 | 5 | Plain text preserves links | `tests/go-live/contact-links.journeys.ts:87` | asserted |
| MSG-013 | 6 | HTTPS-only image sources | none | none |
| MSG-013 | 6 | Host allowance unnecessary | `tests/go-live/contact-links.journeys.ts:81` | asserted |
| MSG-013 | 6 | Malformed links block | `tests/go-live/contact-links.journeys.ts:36` | asserted |
| MSG-013 | 6 | No click fact | `tests/go-live/contact-links.journeys.ts:91` | asserted |
| MSG-013 | 6 | No rewrite | `tests/go-live/contact-links.journeys.ts:89` | asserted |
| MSG-013 | 6 | No tracked-link record | `tests/go-live/contact-links.journeys.ts:90` | asserted |
| MSG-015 | 1 | Campaign blocked-host list | none | none |
| MSG-015 | 1 | Every affected link | none | none |
| MSG-015 | 1 | Flow blocked-host list | none | none |
| MSG-015 | 1 | Redirect host list | none | none |
| MSG-015 | 2 | Admin exact-host allowance | none | none |
| MSG-015 | 2 | Campaign/flow retained | none | none |
| MSG-015 | 2 | Explicit subdomain allowance | none | none |
| MSG-015 | 2 | Immediate recheck | none | none |
| MSG-015 | 2 | Manager exact-host allowance | none | none |
| MSG-015 | 2 | Operator retained | none | none |
| MSG-015 | 2 | Owner exact-host allowance | none | none |
| MSG-015 | 2 | Review source retained | none | none |
| MSG-015 | 3 | Action filter | none | none |
| MSG-015 | 3 | Activity view | none | none |
| MSG-015 | 3 | Append-only activity | none | none |
| MSG-015 | 3 | Campaign/flow field | none | none |
| MSG-015 | 3 | Host field | none | none |
| MSG-015 | 3 | Object filter | none | none |
| MSG-015 | 3 | Operator field | none | none |
| MSG-015 | 3 | Operator filter | none | none |
| MSG-015 | 4 | Author allowance refused | none | none |
| MSG-015 | 4 | Author can request named approval | none | none |
| MSG-015 | 4 | Author sees blocked hosts | none | none |
| MSG-015 | 4 | No Author allow control | none | none |
| MSG-015 | 5 | Contact links need no allowance | none | none |
| MSG-015 | 5 | Remaining safety inspections retained | none | none |
| MSG-015 | 6 | All three imported outside hosts listed | none | none |
| MSG-015 | 6 | Allow action for each imported outside host | none | none |
| MSG-016 | 1 | Legacy parser-stable styled approval remains byte-identical | none | none |
| MSG-016 | 1 | Legacy plain approval remains byte-identical | none | none |
| MSG-016 | 1 | No re-approval of valid legacy body | none | none |
| MSG-016 | 2 | Direction-override legacy refusal | none | none |
| MSG-016 | 2 | Malformed-close legacy refusal | none | none |
| MSG-016 | 2 | New approval needed | none | none |
| MSG-016 | 2 | Out-of-table attribute legacy refusal | none | none |
| MSG-016 | 2 | Reason named | none | none |
| MSG-016 | 2 | Undersized nested-heading legacy refusal | none | none |
| MSG-016 | 3 | Literal-text legacy forms deliver unchanged | none | none |
| MSG-016 | 3 | Tightened placement preserves plain approvals | none | none |
| MSG-016 | 4 | Earlier design re-imported | none | none |
| MSG-016 | 4 | Old prohibited style refused at delivery | none | none |
| MSG-016 | 4 | Old prohibited style refused at test send | none | none |
| MSG-016 | 5 | Markup spelling does not refuse save | none | none |
| MSG-016 | 5 | Older draft canonicalized on any save | none | none |
| RESULT-001 | 1 | State and channel filters | `tests/campaign-results/results.journeys.ts:98` | asserted |
| RESULT-001 | 2 | The opened body is the approved revision | none | none |
| RESULT-001 | 2 | Full audience snapshot is inspectable | none | none |
| RESULT-001 | 3 | Cancellation outcome | `tests/campaign-results/results.journeys.ts:133` | asserted |
| RESULT-001 | 3 | Delivery schedule/timeline | `tests/campaign-results/results.journeys.ts:58` | asserted |
| RESULT-001 | 4 | Per-channel disposition totals | `tests/campaign-results/results.journeys.ts:64` | asserted |
| RESULT-002 | 1 | Observed click labels | none | none |
| RESULT-002 | 1 | Observed conversion labels | none | none |
| RESULT-002 | 2 | Default off and explicit enablement | `tests/go-live/open-estimates.journeys.ts:44` | asserted |
| RESULT-002 | 3 | Privacy-sensitive estimate label | `tests/go-live/open-estimates.journeys.ts:65` | asserted |
| RESULT-002 | 4 | Other result fields unchanged after pixel fetch | `tests/go-live/open-estimates.journeys.ts:66` | asserted |
| RESULT-003 | 1 | Separated from forecasts | `tests/campaign-results/performance-fixture.ts:136` | asserted |
| RESULT-003 | 1 | Source order identified | `tests/campaign-results/performance-fixture.ts:141` | asserted |
| RESULT-003 | 1 | Window identified | `tests/campaign-results/performance-fixture.ts:135` | asserted |
| RESULT-003 | 2 | No duplicate or moved order attribution after replay/sync | `tests/campaign-results/performance-fixture.ts:32` | asserted |
| RESULT-003 | 3 | Latest non-automated click wins inside seven-day window | `tests/campaign-results/performance-fixture.ts:98` | asserted |
| RESULT-003 | 4 | Cancellation subtraction | `tests/campaign-results/performance-fixture.ts:98` | asserted |
| RESULT-003 | 4 | Full refund subtraction | `tests/campaign-results/performance-fixture.ts:94` | asserted |
| RESULT-003 | 4 | Partial refund subtraction | `tests/campaign-results/performance-fixture.ts:92` | asserted |
| RESULT-004 | 1 | AI billable units | `tests/campaign-results/costs.journeys.ts:61` | asserted |
| RESULT-004 | 1 | Model or channel on each fact | none | none |
| RESULT-004 | 1 | Provider units, currency and cost | `tests/campaign-results/costs.journeys.ts:67` | asserted |
| RESULT-004 | 2 | Campaign totals | `tests/campaign-results/costs.journeys.ts:73` | asserted |
| RESULT-004 | 3 | Day/currency/unknown-price groups | `tests/campaign-results/costs.journeys.ts:67` | asserted |
| RESULT-004 | 3 | UTC day boundary | `tests/campaign-results/costs.journeys.ts:65` | asserted |
| RESULT-004 | 4 | Layout unit once | none | none |
| RESULT-004 | 4 | One candidate purchase fact | `tests/campaign-results/costs.journeys.ts:62` | asserted |
| RESULT-004 | 4 | Timed-out purchase proven before counting | none | none |
| RESULT-005 | 1 | Distinct recipient-step redirect | `tests/campaign-results/tracking-journey.ts:64` | asserted |
| RESULT-005 | 1 | Opaque first-party redirect | `tests/campaign-results/tracking-journey.ts:54` | asserted |
| RESULT-005 | 1 | Original destination forwarding | `tests/campaign-results/tracking-journey.ts:74` | asserted |
| RESULT-005 | 2 | No contact identity in redirect destination | `tests/campaign-results/tracking-journey.ts:74` | asserted |
| RESULT-005 | 2 | No cookie | `tests/campaign-results/tracking-journey.ts:75` | asserted |
| RESULT-005 | 2 | No loaded body | `tests/campaign-results/tracking-journey.ts:76` | asserted |
| RESULT-005 | 3 | CONT-018 token not yet built | none | none |
| RESULT-005 | 4 | Scanner excluded from attribution | none | none |
| RESULT-005 | 4 | Scanner retained and excluded from engagement | `tests/campaign-results/tracking-journey.ts:79` | asserted |
| RESULT-005 | 5 | No clicks when off | `tests/campaign-results/tracking-journey.ts:138` | asserted |
| RESULT-005 | 5 | Original URLs when off | `tests/campaign-results/tracking-journey.ts:131` | asserted |
| RESULT-005 | 6 | Contact links unchanged | `tests/campaign-results/tracking-journey.ts:59` | asserted |
| RESULT-005 | 6 | No contact clicks | `tests/campaign-results/tracking-journey.ts:83` | asserted |
| RESULT-005 | 7 | Forwards after window closes | `tests/campaign-results/tracking-journey.ts:74` | asserted |
| RESULT-005 | 7 | No new person or scanner facts | `tests/campaign-results/tracking-journey.ts:179` | asserted |
| RESULT-009 | 1 | Ordinary images remain untracked | none | none |
| RESULT-009 | 1 | Unique first-party pixels after opt-in | `tests/go-live/open-estimates.journeys.ts:55` | asserted |
| RESULT-009 | 2 | Pixel changes only estimate results | `tests/go-live/open-estimates.journeys.ts:66` | asserted |
| RESULT-009 | 3 | Disable revokes issued pixels | `tests/go-live/open-estimates.journeys.ts:90` | asserted |
| RESULT-009 | 3 | Reenable does not readmit old pixels | `tests/go-live/open-estimates.journeys.ts:93` | asserted |
| RESULT-009 | 4 | No IP retained | none | none |
| RESULT-009 | 4 | No cookie | `tests/go-live/open-estimates.journeys.ts:63` | asserted |
| RESULT-009 | 4 | No user agent retained | none | none |
| RESULT-009 | 4 | One estimate after repeated requests | `tests/go-live/open-estimates.journeys.ts:65` | asserted |
| RESULT-009 | 5 | Erasure removes facts | `tests/go-live/open-estimates.journeys.ts:108` | asserted |
| RESULT-009 | 5 | Erasure removes that contact tokens | `tests/go-live/open-estimates.journeys.ts:109` | asserted |
| RESULT-010 | 1 | Every recipient receives the same campaign-image URL. | none | none |
| RESULT-010 | 2 | No address retained | none | none |
| RESULT-010 | 2 | No cookie retained | none | none |
| RESULT-010 | 2 | No recipient retained | none | none |
| RESULT-010 | 2 | No request time retained | none | none |
| RESULT-010 | 2 | No user agent retained | none | none |
| RESULT-010 | 2 | Only current-minute image rate counter retained | none | none |
| RESULT-010 | 3 | Ordinary image not counted as open | none | none |
| RESULT-010 | 3 | Ordinary image not shown as open | none | none |
| SEND-001 | 1 | Campaign/revision/step/contact identity | none | none |
| SEND-001 | 1 | Email adapter hand-off | `tests/go-live/managed-mail.journeys.ts:80` | asserted |
| SEND-001 | 1 | SMS adapter hand-off | none | none |
| SEND-001 | 2 | Deadline coverage | none | none |
| SEND-001 | 2 | Provider-effective deduplication | none | none |
| SEND-001 | 2 | Reconciliation-window coverage | `tests/go-live/resend-delivery.journeys.ts:46` | asserted |
| SEND-001 | 3 | Correlation key is not provider deduplication | none | none |
| SEND-001 | 3 | Durable fence precedes SendGrid request | none | none |
| SEND-001 | 4 | Provider identifier stored before handed-off state | none | none |
| SEND-001 | 5 | Accepted hand-off never retried | none | none |
| SEND-001 | 5 | Definite nonacceptance may retry | none | none |
| SEND-001 | 5 | Uncertain hand-off never retried | none | none |
| SEND-001 | 6 | Eviction after fence remains uncertain | none | none |
| SEND-001 | 6 | Missing message identifier remains uncertain | none | none |
| SEND-001 | 6 | Operator review is named | none | none |
| SEND-001 | 6 | Reset remains uncertain | none | none |
| SEND-001 | 6 | Timeout remains uncertain | none | none |
| SEND-001 | 6 | Uncertain provider response remains uncertain | none | none |
| SEND-001 | 7 | Job retry does not duplicate | none | none |
| SEND-001 | 7 | Queue replay does not duplicate | none | none |
| SEND-001 | 7 | Resumed dispatch does not duplicate | `tests/go-live/resend-delivery.journeys.ts:113` | asserted |
| SEND-003 | 1 | Carrier pacing | none | none |
| SEND-003 | 1 | Provider pacing | `tests/go-live/delivery.journeys.ts:151` | asserted |
| SEND-003 | 2 | Estimated completion | `tests/go-live/delivery.journeys.ts:129` | asserted |
| SEND-003 | 3 | Accepted count refresh within 30 seconds | `tests/go-live/delivery.journeys.ts:137` | asserted |
| SEND-003 | 3 | Delivered count refresh | none | none |
| SEND-003 | 3 | Failed count refresh | none | none |
| SEND-003 | 3 | Skipped count refresh | none | none |
| SEND-004 | 1 | Five retries then failure | `tests/go-live/delivery-recovery.journeys.ts:24` | asserted |
| SEND-004 | 1 | Increasing delays | `tests/go-live/delivery-recovery.journeys.ts:37` | asserted |
| SEND-004 | 1 | Within original hour | `tests/go-live/delivery-recovery.journeys.ts:29` | asserted |
| SEND-004 | 2 | Uncertainty reconciled without retry | none | none |
| SEND-004 | 3 | Error visible in detail | `tests/go-live/delivery-recovery.journeys.ts:40` | asserted |
| SEND-004 | 3 | Exhaustion failed state | `tests/go-live/delivery-recovery.journeys.ts:24` | asserted |
| SEND-004 | 3 | Permanent rejection terminal | none | none |
| SEND-004 | 4 | Atomic provider suppression | none | none |
| SEND-004 | 4 | Atomic suppression for complaint | none | none |
| SEND-004 | 4 | Atomic suppression for hard rejection | none | none |
| SEND-005 | 1 | Signed event accepted | `tests/go-live/go-live.journeys.ts:114` | asserted |
| SEND-005 | 1 | Strongest adapter identity and immutable fact | none | none |
| SEND-005 | 2 | Replay and reorder preserve every contact state | none | none |
| SEND-005 | 2 | Replay and reorder preserve recipient disposition | `tests/go-live/go-live.journeys.ts:125` | asserted |
| SEND-005 | 2 | SMS reply identity | none | none |
| SEND-005 | 3 | Older fact does not downgrade delivery | `tests/go-live/go-live.journeys.ts:125` | asserted |
| SEND-006 | 1 | Accepted and uncertain states | `tests/go-live/go-live.journeys.ts:89` | asserted |
| SEND-006 | 1 | All remaining disposition states | none | none |
| SEND-006 | 2 | Independent complaint | `tests/go-live/go-live.journeys.ts:141` | asserted |
| SEND-006 | 2 | Independent suppression | none | none |
| SEND-006 | 3 | Delivery retained after complaint | `tests/go-live/go-live.journeys.ts:141` | asserted |
| SEND-006 | 4 | Skipped reason retained | none | none |
| SEND-007 | 1 | Every terminal disposition gates completion | none | none |
| SEND-007 | 1 | Uncertainty is not terminal | none | none |
| SEND-007 | 2 | All overlapping complaint/suppression totals separate | none | none |
| SEND-007 | 2 | No combined success figure | none | none |
| SEND-007 | 2 | Per-disposition visible counts | `tests/campaign-results/results.journeys.ts:64` | asserted |
| SEND-007 | 3 | Late complaint updates campaign summary | `tests/go-live/go-live.journeys.ts:169` | asserted |
| SEND-007 | 3 | Late complaint updates ledger | `tests/go-live/go-live.journeys.ts:142` | asserted |
| SEND-007 | 3 | Late suppression updates completed summary | none | none |
| SEND-008 | 1 | Eviction resumes | none | none |
| SEND-008 | 1 | No duplicate send | `tests/go-live/resend-delivery.journeys.ts:113` | asserted |
| SEND-008 | 1 | No operator restart action | none | none |
| SEND-008 | 1 | Queue redelivery preserves fence | none | none |
| SEND-008 | 1 | Redeployment resumes | none | none |
| SEND-008 | 1 | Restart resumes | `tests/go-live/resend-delivery.journeys.ts:67` | asserted |
| SEND-008 | 2 | Missed provider facts imported | `tests/go-live/resend-delivery.journeys.ts:85` | asserted |
| SEND-008 | 2 | Other unresolved lookup | none | none |
| SEND-008 | 2 | Provider lookup reconciles uncertainty | `tests/go-live/resend-delivery.journeys.ts:75` | asserted |
| SEND-008 | 3 | Activity identity correlation | none | none |
| SEND-008 | 3 | Signed SendGrid event correlation | none | none |
| SEND-008 | 4 | Activity unavailable retains uncertainty | `tests/go-live/resend-delivery.journeys.ts:115` | asserted |
| SEND-008 | 4 | Expired SendGrid lookup retains uncertainty | none | none |
| SEND-008 | 4 | No automatic retry control | none | none |
| SEND-008 | 4 | No invented delivery | none | none |
| SEND-008 | 4 | No invented failure | none | none |
| SEND-008 | 4 | No resubmission | `tests/go-live/resend-delivery.journeys.ts:116` | asserted |
| SEND-008 | 5 | Provider identifiers available | none | none |
| SEND-008 | 5 | Receiver evidence available | none | none |
| SEND-008 | 6 | No blind retry | `tests/go-live/resend-delivery.journeys.ts:113` | asserted |
| SEND-008 | 6 | No delivery credit | none | none |
| SEND-008 | 6 | Other-provider expiry has unconfirmed failure | `tests/go-live/resend-delivery.journeys.ts:110` | asserted |
| SEND-008 | 7 | No campaign dispatching without work or reconciliation | `tests/go-live/resend-delivery.journeys.ts:112` | asserted |
| SEND-009 | 1 | Adapter unavailable pauses channel | `tests/go-live/delivery-recovery.journeys.ts:61` | asserted |
| SEND-009 | 1 | Five-minute continuous transient trigger | none | none |
| SEND-009 | 1 | No recipient hand-off while paused | `tests/go-live/delivery-recovery.journeys.ts:114` | asserted |
| SEND-009 | 2 | Bounded non-recipient probe | `tests/go-live/delivery-recovery.journeys.ts:61` | asserted |
| SEND-009 | 2 | Probe cadence survives restart | `tests/go-live/delivery-recovery.journeys.ts:69` | asserted |
| SEND-009 | 3 | Audience recheck after recovery | none | none |
| SEND-009 | 3 | Automatic probe recovery | `tests/go-live/delivery-recovery.journeys.ts:75` | asserted |
| SEND-009 | 3 | Deadline still applies | `tests/go-live/delivery-recovery.journeys.ts:118` | asserted |
| SEND-009 | 4 | Pause visible | `tests/go-live/delivery-recovery.journeys.ts:104` | asserted |
| SEND-009 | 4 | Provider error visible | none | none |
| SEND-009 | 5 | One email per operator | `tests/go-live/delivery-recovery.journeys.ts:78` | asserted |
| SEND-009 | 5 | Uncertain notice never resent | `tests/go-live/delivery-recovery.journeys.ts:83` | asserted |
| MSG-010 | 5 | Visible confirmation alone prevents approved delivery (the cited journey confirms only after its one-click opt-out) | none | none |
| FORM-001 | 1 | Hosted capture records explicit evidence before confirmation | `tests/audience-import/signup.spec.ts:9` | asserted |
| FORM-001 | 1 | Hosted identity becomes pending rather than subscribed | `tests/audience-import/signup.spec.ts:8` | asserted |
| FORM-001 | 1 | Embed captures only allowed-origin requests | none | none |
| FORM-001 | 1 | Optional SMS capture remains pending | `tests/audience-import/signup.spec.ts:79` | asserted |
| FORM-001 | 2 | One valid confirmation subscribes the email | `tests/audience-import/signup.spec.ts:13` | asserted |
| FORM-001 | 2 | Consumed confirmation returns already-confirmed | `tests/audience-import/signup.spec.ts:12` | asserted |
| FORM-001 | 2 | Expired link leaves pending state | `tests/audience-import/signup.spec.ts:18` | asserted |
| FORM-001 | 3 | Embed refuses unconfigured origin | none | none |
| FORM-001 | 4 | Submission provides no campaign or flow sending authority | none | none |
| FORM-007 | 1 | Missing/invalid sender is refused before any allowance, claim or consent write | none | none |
| FORM-007 | 2 | Malformed and oversized identity input is rejected | `tests/audience-import/signup.spec.ts:25` | asserted |
| FORM-007 | 2 | Honeypot sends no confirmation | `tests/audience-import/signup.spec.ts:24` | asserted |
| FORM-007 | 2 | Missing disclosure leaves no consent or mail | `tests/audience-import/signup.spec.ts:54` | asserted |
| FORM-007 | 2 | Configured challenge checks all failure modes before capture | none | none |
| FORM-007 | 3 | Concurrent destinations cause one confirmation | `tests/audience-import/signup.spec.ts:26` | asserted |
| FORM-007 | 3 | Network allowance eventually refuses | `tests/audience-import/signup.spec.ts:27` | asserted |
| FORM-007 | 3 | Destination and global counters persist across restart and clamp at ceiling | none | none |
| FORM-007 | 4 | IPv4/mapped forms and IPv6 /64 normalization share budgets | none | none |
| FORM-007 | 4 | Missing/invalid edge IP refuses with no writes | none | none |
| FORM-007 | 5 | Configured challenge validates action, hostname, expiry, reuse and provider failure | none | none |
| FORM-007 | 6 | Ordinary no-key and kiosk-required challenge behaviors | none | none |
| FORM-007 | 7 | Every protected address state has identical acknowledgment | none | none |
| FORM-009 | 1 | Kiosk opens full-screen geometry | none | none |
| FORM-009 | 1 | Email resets blank within five seconds | `tests/go-live/shared-kiosk.journeys.ts:59` | asserted |
| FORM-009 | 1 | Next visitor name is blank | `tests/go-live/shared-kiosk.journeys.ts:44` | asserted |
| FORM-009 | 1 | Next visitor consent is not checked | `tests/go-live/shared-kiosk.journeys.ts:45` | asserted |
| FORM-009 | 2 | No visitor cookies remain | `tests/go-live/shared-kiosk.journeys.ts:60` | asserted |
| FORM-009 | 2 | No local/session storage remains | `tests/go-live/shared-kiosk.journeys.ts:61` | asserted |
| FORM-009 | 2 | Kiosk facts cannot identify the next onsite visitor | none | none |
| FORM-009 | 3 | No-challenge submission is refused | `tests/go-live/shared-kiosk.journeys.ts:35` | asserted |
| FORM-009 | 3 | No-challenge submission creates no contact | `tests/go-live/shared-kiosk.journeys.ts:36` | asserted |
| FORM-009 | 3 | Each browser submission requires new enabled verification | `tests/go-live/shared-kiosk.journeys.ts:46` | asserted |
| FORM-009 | 4 | Thirty browser captures receive accepted responses | `tests/go-live/shared-kiosk.journeys.ts:55` | asserted |
| FORM-009 | 4 | Same-network three hundred captures yield three hundred confirmations | `tests/go-live/shared-kiosk.journeys.ts:67` | asserted |
| FORM-009 | 5 | Confirmed kiosk/device source appears in growth report | `tests/go-live/shared-kiosk.journeys.ts:72` | asserted |
| FORM-009 | 5 | Consent evidence records kiosk and device label | `tests/go-live/shared-kiosk.journeys.ts:73` | asserted |
| FORM-009 | 6 | Marking records actor, time and device once | `tests/go-live/shared-kiosk.journeys.ts:31` | asserted |
| FORM-009 | 6 | Ordinary consent, confirmation and destination allowances apply across kiosk captures | none | none |
| SEG-001 | 1 | Nested any/all groups persist in the saved segment | `tests/audience-controls/segment-journey.ts:47` | asserted |
| SEG-001 | 1 | typed properties selects expected audience | `tests/audience-controls/segment-journey.ts:103` | asserted |
| SEG-001 | 1 | channel consent selects expected audience | `tests/audience-controls/segment-journey.ts:103` | asserted |
| SEG-001 | 1 | topic consent selects expected audience | `tests/audience-controls/segment-journey.ts:103` | asserted |
| SEG-001 | 1 | tags selects expected audience | `tests/audience-controls/segment-journey.ts:103` | asserted |
| SEG-001 | 2 | Count, event-value and currency filters persist | `tests/audience-controls/segment-journey.ts:48` | asserted |
| SEG-001 | 2 | Event-window changes recompute selection | `tests/audience-controls/segment-journey.ts:84` | asserted |
| SEG-001 | 2 | US state selects expected contacts | `tests/audience-controls/segment-journey.ts:77` | asserted |
| SEG-001 | 2 | ZIP selects expected contacts | `tests/audience-controls/segment-journey.ts:103` | asserted |
| SEG-001 | 2 | ZIP distance selects expected contacts | `tests/audience-controls/segment-journey.ts:103` | asserted |
| SEG-001 | 3 | Purchased product membership | `tests/audience-controls/segment-journey.ts:103` | asserted |
| SEG-001 | 3 | Purchased collection membership | `tests/audience-controls/segment-catalog.ts:68` | asserted |
| SEG-001 | 3 | Purchased category membership | `tests/audience-controls/segment-catalog.ts:68` | asserted |
| SEG-001 | 3 | Viewed product membership | none | none |
| SEG-001 | 3 | Viewed collection membership | none | none |
| SEG-001 | 3 | Viewed category membership | none | none |
| SEG-001 | 4 | Human email/SMS click audience within original-time window | `tests/campaign-results/cross-channel-attribution.ts:92` | asserted |
| SEG-001 | 4 | named campaign membership | none | none |
| SEG-001 | 4 | named link membership | none | none |
| SEG-001 | 4 | flow activity membership | none | none |
| SEG-001 | 5 | RFM/lifecycle selection | `tests/audience-controls/segment-journey.ts:103` | asserted |
| SEG-001 | 5 | Prediction conditions select matches and become unavailable below minimum | none | none |
| SEG-001 | 5 | Unavailable catalog is distinct from empty matching membership | `tests/audience-controls/segment-catalog.ts:20` | asserted |
| SEG-001 | 6 | Builder live exact estimate | `tests/audience-controls/segment-journey.ts:39` | asserted |
| SEG-001 | 6 | Summary names every fixture condition | `tests/audience-controls/segment-journey.ts:41` | asserted |
| SEG-001 | 6 | Review intersects every fixture contact | `tests/audience-controls/segment-journey.ts:77` | asserted |
| SEG-001 | 7 | Saved count/value/time/state exact matching membership | `tests/audience-controls/segment-journey.ts:109` | asserted |
| SEG-001 | 7 | Nested operator change narrows audience | `tests/audience-controls/segment-journey.ts:82` | asserted |
| SEG-001 | 7 | Time-window change narrows audience | `tests/audience-controls/segment-journey.ts:84` | asserted |
| SEG-003 | 1 | One customer recency score | `tests/campaign-results/retention-journey.ts:15` | asserted |
| SEG-003 | 1 | One customer frequency score | `tests/campaign-results/retention-journey.ts:15` | asserted |
| SEG-003 | 1 | One customer monetary score | `tests/campaign-results/retention-journey.ts:15` | asserted |
| SEG-003 | 1 | Every customer quintile boundary matches independent calculation | none | none |
| SEG-003 | 2 | Five lifecycle stages match fixture distribution | `tests/campaign-results/retention-journey.ts:14` | asserted |
| SEG-003 | 2 | Method and thresholds visible | `tests/campaign-results/retention-journey.ts:21` | asserted |
| SEG-003 | 3 | Daily boundary recomputes scores and stages | none | none |
| SEG-003 | 4 | Fixture stage distribution | `tests/campaign-results/retention-journey.ts:14` | asserted |
| SEG-003 | 4 | Fixture recency/frequency/monetary customer scores | `tests/campaign-results/retention-journey.ts:15` | asserted |
| SEG-003 | 4 | Independent recalculation of the full documented method | none | none |
| BUILD-008 | 1 | chosen-contact HTML preview | `tests/go-live/presend-checks.journeys.ts:93` | asserted |
| BUILD-008 | 1 | HTML preview escapes the contact name | `tests/go-live/presend-checks.journeys.ts:94` | asserted |
| BUILD-008 | 1 | chosen-contact plain-text preview | `tests/go-live/presend-checks.journeys.ts:95` | asserted |
| BUILD-008 | 1 | chosen-contact preheader preview | `tests/go-live/presend-checks.journeys.ts:96` | asserted |
| BUILD-008 | 1 | mobile preview mode | `tests/go-live/presend-checks.journeys.ts:98` | asserted |
| BUILD-008 | 1 | dark approximation | `tests/go-live/presend-checks.journeys.ts:100` | asserted |
| BUILD-008 | 1 | desktop preview | `tests/go-live/presend-checks.journeys.ts:104` | asserted |
| BUILD-008 | 1 | fallback HTML preview | `tests/go-live/presend-checks.journeys.ts:110` | asserted |
| BUILD-008 | 1 | fallback plain-text preview | `tests/go-live/presend-checks.journeys.ts:111` | asserted |
| BUILD-008 | 2 | missing-alt located advisory | `tests/go-live/presend-checks.journeys.ts:51` | asserted |
| BUILD-008 | 2 | heading-order located advisory | `tests/go-live/presend-checks.journeys.ts:53` | asserted |
| BUILD-008 | 2 | link-text located advisory | `tests/go-live/presend-checks.journeys.ts:54` | asserted |
| BUILD-008 | 2 | spam-wording located advisory | `tests/go-live/presend-checks.journeys.ts:55` | asserted |
| BUILD-008 | 2 | advisories are nonblocking | `tests/go-live/presend-checks.journeys.ts:47` | asserted |
| BUILD-008 | 3 | 95 KB measured body | `tests/go-live/presend-checks.journeys.ts:42` | asserted |
| BUILD-008 | 3 | size advisory names measured size and limit | `tests/go-live/presend-checks.journeys.ts:57` | asserted |
| BUILD-008 | 3 | size advisory identifies the three largest blocks | `tests/go-live/presend-checks.journeys.ts:58` | asserted |
| BUILD-008 | 4 | contrast remains a blocking finding | `tests/go-live/presend-checks.journeys.ts:60` | asserted |
| BUILD-008 | 4 | failed approval creates no recipient steps | `tests/go-live/presend-checks.journeys.ts:70` | asserted |
| BUILD-008 | 4 | corrected revision has no blocking findings | `tests/go-live/presend-checks.journeys.ts:77` | asserted |
| BUILD-008 | 5 | over-limit HTML save reports the named oversized error | `tests/go-live/email-size.journeys.ts:61` | asserted |
| BUILD-008 | 5 | oversize is measured above the byte limit | `tests/go-live/email-size.journeys.ts:63` | asserted |
| DELIV-005 | 1 | delivered count by mailbox | `tests/go-live/mailbox-provider.journeys.ts:58` | asserted |
| DELIV-005 | 1 | bounced count by mailbox | `tests/go-live/mailbox-provider.journeys.ts:58` | asserted |
| DELIV-005 | 1 | complaint count by mailbox | `tests/go-live/mailbox-provider.journeys.ts:58` | asserted |
| DELIV-005 | 1 | unique click count by mailbox | `tests/go-live/mailbox-provider.journeys.ts:58` | asserted |
| DELIV-005 | 1 | total click count by mailbox | `tests/go-live/mailbox-provider.journeys.ts:58` | asserted |
| DELIV-005 | 1 | browser table carries the same Gmail outcome counts | `tests/go-live/mailbox-provider.journeys.ts:71` | asserted |
| DELIV-005 | 1 | Gmail provider attribution | `tests/go-live/mailbox-provider.journeys.ts:59` | asserted |
| DELIV-005 | 1 | Outlook and Hotmail provider attribution | `tests/go-live/mailbox-provider.journeys.ts:59` | asserted |
| DELIV-005 | 1 | Yahoo and AOL provider attribution | `tests/go-live/mailbox-provider.journeys.ts:59` | asserted |
| DELIV-005 | 1 | Apple iCloud provider attribution | `tests/go-live/mailbox-provider.journeys.ts:59` | asserted |
| DELIV-005 | 1 | Other provider attribution | `tests/go-live/mailbox-provider.journeys.ts:59` | asserted |
| DELIV-005 | 2 | invalid-address bounce category | `tests/go-live/mailbox-provider.journeys.ts:59` | asserted |
| DELIV-005 | 2 | mailbox-full bounce category | `tests/go-live/mailbox-provider.journeys.ts:59` | asserted |
| DELIV-005 | 2 | policy-block bounce category | `tests/go-live/mailbox-provider.journeys.ts:59` | asserted |
| DELIV-005 | 2 | reputation bounce category | `tests/go-live/mailbox-provider.journeys.ts:59` | asserted |
| DELIV-005 | 2 | content bounce category | `tests/go-live/mailbox-provider.journeys.ts:59` | asserted |
| DELIV-005 | 2 | other bounce category | `tests/go-live/mailbox-provider.journeys.ts:59` | asserted |
| DELIV-005 | 2 | reason totals reconcile to bounced count for every provider | `tests/go-live/mailbox-provider.journeys.ts:60` | asserted |
| DELIV-005 | 2 | Gmail and Outlook signed bounce categories | `tests/go-live/mailbox-provider.journeys.ts:59` | asserted |
| INT-002 | 1 | Owner Settings connection succeeds | `tests/go-live/woocommerce.journeys.ts:38` | asserted |
| INT-002 | 1 | customer sync stored | `tests/go-live/woocommerce.journeys.ts:49` | asserted |
| INT-002 | 1 | paginated product sync stored | `tests/go-live/woocommerce.journeys.ts:49` | asserted |
| INT-002 | 1 | order sync stored | `tests/go-live/woocommerce.journeys.ts:49` | asserted |
| INT-002 | 1 | refund sync stored | `tests/go-live/woocommerce.journeys.ts:49` | asserted |
| INT-002 | 2 | replay retains complete source records | `tests/go-live/woocommerce.journeys.ts:64` | asserted |
| INT-002 | 2 | one receipt after replay | `tests/go-live/woocommerce.journeys.ts:65` | asserted |
| INT-002 | 2 | conflicting webhook content refuses | `tests/go-live/woocommerce.journeys.ts:68` | asserted |
| INT-002 | 2 | forged provider signature refuses | `tests/go-live/woocommerce.journeys.ts:69` | asserted |
| INT-002 | 2 | foreign store origin refuses | `tests/go-live/woocommerce.journeys.ts:70` | asserted |
| INT-002 | 3 | exact activated revision and event exit once | `tests/go-live/woocommerce-plugin-journey.ts:36` | asserted |
| INT-002 | 3 | one contact tag | `tests/go-live/woocommerce-plugin-journey.ts:37` | asserted |
| INT-002 | 3 | one completion history row | `tests/go-live/woocommerce-plugin-journey.ts:38` | asserted |
| INT-002 | 3 | draft does not enroll | `tests/go-live/woocommerce-plugin-journey.ts:22` | asserted |
| INT-002 | 3 | stale event does not add enrollment | `tests/go-live/woocommerce-plugin-journey.ts:41` | asserted |
| INT-002 | 3 | purchased contact does not add enrollment | `tests/go-live/woocommerce.journeys.ts:84` | asserted |
| INT-002 | 3 | opted-out contact does not add enrollment | `tests/go-live/woocommerce.journeys.ts:94` | asserted |
| INT-002 | 4 | default collection denied | `tests/go-live/woocommerce-plugin-journey.ts:58` | asserted |
| INT-002 | 4 | explicit consent emits declared observations | `tests/go-live/woocommerce-plugin-journey.ts:61` | asserted |
| INT-002 | 4 | GPC withdrawal recorded | `tests/go-live/woocommerce-plugin-journey.ts:65` | asserted |
| INT-002 | 4 | observation sends no customer id or email | `tests/go-live/woocommerce-plugin-journey.ts:62` | asserted |
| INT-002 | 4 | no cross-site observation throughout the plugin journey | none | none |
| INT-002 | 4 | plugin event cannot widen existing Mango subscription evidence | `tests/go-live/woocommerce.journeys.ts:96` | asserted |
| INT-002 | 5 | public signup remains pending before confirmation | `tests/audience-import/signup.spec.ts:8` | asserted |
| INT-002 | 5 | affirmative confirmation subscribes | `tests/audience-import/signup.spec.ts:13` | asserted |
| INT-002 | 5 | confirmation replay does not subscribe twice | `tests/audience-import/signup.spec.ts:12` | asserted |
| INT-002 | 5 | expired confirmation remains pending | `tests/audience-import/signup.spec.ts:18` | asserted |
| INT-007 | 1 | one identified contact retained across replay | `tests/go-live/sync-integrations.journeys.ts:55` | asserted |
| INT-007 | 1 | updated custom contact property retained | `tests/go-live/sync-integrations.journeys.ts:56` | asserted |
| INT-007 | 2 | concurrent client event replay returns one identity | `tests/go-live/custom-event-journey.ts:18` | asserted |
| INT-007 | 2 | one stored custom event | `tests/go-live/custom-event-journey.ts:20` | asserted |
| INT-007 | 2 | conflicting client event content refuses | `tests/go-live/custom-event-journey.ts:19` | asserted |
| INT-007 | 3 | profile lists rule-derived membership | `tests/go-live/custom-event-journey.ts:23` | asserted |
| INT-007 | 3 | membership client lists matching member state | `tests/go-live/custom-event-journey.ts:24` | asserted |
| INT-007 | 4 | missing subscription evidence names the required error | `tests/go-live/sync-integrations.journeys.ts:65` | asserted |
| INT-007 | 5 | key exhausts into 429 while allowed requests remain valid | `tests/go-live/custom-event-journey.ts:40` | asserted |
| INT-007 | 5 | rate-limit refusal code and retry guidance | `tests/go-live/custom-event-journey.ts:41` | asserted |
| INT-007 | 5 | other key remains usable | `tests/go-live/custom-event-journey.ts:43` | asserted |
| INT-007 | 6 | custom-event write retains key attribution and occurrence time | `tests/go-live/custom-event-journey.ts:22` | asserted |
| INT-007 | 6 | public description declares the event-write scope | `tests/go-live/custom-event-journey.ts:10` | asserted |
| BUILD-008 | 4 | approval persists for the corrected and acknowledged revision | none | none |
| INT-007 | 6 | contact create/update write retains its key attribution | none | none |
| INT-007 | 6 | property write retains its key attribution | none | none |
| INT-007 | 6 | consent/subscription write retains its key attribution | none | none |
| INT-007 | 6 | public description covers all named contact and membership operations | none | none |
| REPORT-003 | 1 | Default order conversion metric | `tests/campaign-results/cross-channel-attribution.ts:146` | asserted |
| REPORT-003 | 1 | Custom conversion metric | `tests/campaign-results/attribution-report-ui.ts:47` | asserted |
| REPORT-003 | 1 | Independent default seven-day channel windows | `tests/campaign-results/cross-channel-attribution.ts:146` | asserted |
| REPORT-003 | 2 | Most recent eligible SMS click wins once | `tests/campaign-results/cross-channel-attribution.ts:120` | asserted |
| REPORT-003 | 2 | Automated click excluded from the winner | `tests/campaign-results/cross-channel-attribution.ts:123` | asserted |
| REPORT-003 | 2 | Refunds subtract | `tests/campaign-results/cross-channel-attribution.ts:132` | asserted |
| REPORT-003 | 2 | Cancellations subtract | `tests/campaign-results/cross-channel-attribution.ts:132` | asserted |
| REPORT-003 | 3 | Revenue shows conversion metric and channel window | `tests/campaign-results/attribution-report-ui.ts:72` | asserted |
| REPORT-003 | 3 | One-day recalculation | `tests/campaign-results/attribution-report-ui.ts:49` | asserted |
| REPORT-003 | 3 | Stored events unchanged | `tests/campaign-results/cross-channel-attribution.ts:162` | asserted |
| REPORT-003 | 4 | Flow attribution and flow revenue reports | none | none |
| REPORT-004 | 1 | Independent repeat purchase rate | `tests/campaign-results/retention-journey.ts:10` | asserted |
| REPORT-004 | 1 | Independent first-order cohort retention | `tests/campaign-results/retention-journey.ts:13` | asserted |
| REPORT-004 | 2 | Median days between orders | `tests/campaign-results/retention-journey.ts:10` | asserted |
| REPORT-004 | 2 | Customer value by form | `tests/campaign-results/retention-journey.ts:16` | asserted |
| REPORT-004 | 2 | Customer value by acquisition source record | none | none |
| REPORT-004 | 3 | Products bought together | `tests/campaign-results/retention-journey.ts:17` | asserted |
| REPORT-004 | 3 | Next product bought | none | none |
| MOVE-009 | 1 | One historical click or open per accepted known-contact row | `tests/move-in/archive.journeys.ts:163` | asserted |
| MOVE-009 | 1 | Original occurrence time | `tests/move-in/archive.journeys.ts:163` | asserted |
| MOVE-009 | 2 | Imported campaign-history link | `tests/move-in/archive.journeys.ts:163` | asserted |
| MOVE-009 | 2 | Original clicked link | `tests/move-in/archive.journeys.ts:165` | asserted |
| MOVE-009 | 2 | Timeline imported label and source record | `tests/move-in/archive.journeys.ts:424` | asserted |
| MOVE-009 | 3 | Imported and dropped counts including unknown address | `tests/move-in/archive.journeys.ts:161` | asserted |
| MOVE-009 | 4 | Imported clicks participate in dormancy | `tests/move-in/archive.journeys.ts:402` | asserted |
| MOVE-009 | 4 | Imported opens remain open-only estimates | `tests/move-in/archive.journeys.ts:402` | asserted |
| MOVE-009 | 4 | Open-only and no-history are distinct | `tests/move-in/archive.journeys.ts:402` | asserted |
| MOVE-009 | 5 | No native send facts or attribution are created | `tests/move-in/archive.journeys.ts:180` | asserted |
| MOVE-009 | 5 | Populated campaign result remains unchanged | `tests/move-in/archive.journeys.ts:399` | asserted |
| MOVE-009 | 5 | Consent unchanged by historical-event import | none | none |
| MOVE-009 | Requirement | Pointer to MOVE-015 owns additional import uses | moved | moved |
| PUB-001 | 1 | Sent issue public page | `tests/campaign-results/archive.journeys.ts:31` | asserted |
| PUB-001 | 1 | Archive index entry | `tests/campaign-results/archive.journeys.ts:31` | asserted |
| PUB-001 | 2 | RSS item | `tests/campaign-results/archive.journeys.ts:39` | asserted |
| PUB-001 | 2 | Search metadata | `tests/campaign-results/archive.journeys.ts:27` | asserted |
| PUB-001 | 3 | Neutral personalization | `tests/campaign-results/archive.journeys.ts:32` | asserted |
| PUB-001 | 3 | No recipient token or personal value | `tests/campaign-results/archive.journeys.ts:28` | asserted |
| PUB-001 | 3 | Unsubscribe link removed from public output | none | none |
| PUB-001 | 3 | No private tracking link | `tests/campaign-results/archive.journeys.ts:34` | asserted |
| PUB-005 | 1 | Only Owner-saved tier can be offered | none | none |
| PUB-005 | 1 | Exact price and frequency | `tests/go-live/paid-signup-journey.ts:35` | asserted |
| PUB-005 | 1 | Tax notice | `tests/go-live/paid-signup-journey.ts:36` | asserted |
| PUB-005 | 1 | Consent wording | `tests/go-live/paid-signup-journey.ts:65` | asserted |
| PUB-005 | 2 | Consent is separate initially unchecked choice | `tests/go-live/paid-signup-journey.ts:37` | asserted |
| PUB-005 | 2 | Mango has no card fields | `tests/go-live/paid-signup-journey.ts:38` | asserted |
| PUB-005 | 2 | Provider checkout screen reached | `tests/go-live/paid-signup-journey.ts:47` | asserted |
| PUB-005 | 3 | Return explanation | `tests/go-live/paid-signup-journey.ts:49` | asserted |
| PUB-005 | 4 | Permission timestamp | `tests/go-live/paid-signup-journey.ts:62` | asserted |
| PUB-005 | 4 | Permission source record | `tests/go-live/paid-signup-journey.ts:63` | asserted |
| PUB-005 | 4 | Wording version | `tests/go-live/paid-signup-journey.ts:64` | asserted |
| PUB-005 | 4 | One confirmation per payer per checkout session | `tests/go-live/paid-signup-journey.ts:58` | asserted |
| PUB-006 | 1 | Paid but consent missing | `tests/go-live/paid-signup-journey.ts:67` | asserted |
| PUB-006 | 1 | Paid-checkout evidence remains unconfirmed | `tests/go-live/paid-signup-journey.ts:60` | asserted |
| PUB-006 | 1 | One confirmation | `tests/go-live/paid-signup-journey.ts:58` | asserted |
| PUB-006 | 2 | No eligible paid-only recipients before confirmation | `tests/go-live/paid-signup-journey.ts:72` | asserted |
| PUB-006 | 2 | Paid-only send after confirmation | `tests/go-live/paid-signup-journey.ts:79` | asserted |
| PUB-006 | 2 | No free newsletters before confirmation | none | none |
| PUB-006 | 3 | Unsubscribed until affirmative confirmation | `tests/go-live/paid-signup-journey.ts:98` | asserted |
| PUB-006 | 3 | Subscribed after affirmative confirmation | `tests/go-live/paid-signup-journey.ts:100` | asserted |
| PUB-006 | 3 | Suppressed payer no confirmation or mail | `tests/go-live/paid-signup-journey.ts:106` | asserted |
| PUB-006 | 4 | Confirmed subscriber needs no second confirmation | `tests/go-live/paid-signup-journey.ts:85` | asserted |
| PUB-006 | 4 | Payment alone does not widen permission | `tests/go-live/paid-signup-journey.ts:94` | asserted |
| PUB-006 | 5 | Erasure removes signup address | `tests/go-live/paid-signup-journey.ts:118` | asserted |
| PUB-006 | 5 | Erasure removes consent evidence | `tests/go-live/paid-signup-journey.ts:119` | asserted |
