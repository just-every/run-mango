# sd-mango-c-f71 results

CONT-009 remains PARTIAL to PARTIAL. This round closes the selected hosted-email confirming-request-time proof and retains every named remainder. Counts remain 20 DONE, 198 PARTIAL and 98 MISSING, with 316 Status rows. No acceptance sentence changed and no DONE claim is made.

Repository: just-every/run-mango. Product branch: cloud/sd-mango-c-f71. Candidate: 12dec3e3f4c65910ffdec642c3718ec8c3a8edd2. Requested base a561179164a0e21b71452afd58bbce17c4c29951 and both existing c-f65 commits are retained. Main at integration was cc6321c2372d631d9607df9af8ad1dd9f7878e84. A final fetch and rebase left the candidate unchanged. The branch was pushed successfully on the first guarded attempt; remote ref readback matched the full candidate. Main was never pushed. No PR was needed: the push started Verify run 42156774407.

The full execution plan is in PLAN.md. The plan row to record is CONT-009: hosted-email confirming-request-time point complete; clause PARTIAL unchanged. No other campaign or clause was selected, rebuilt or reordered.

## Change and proof

The supplied base already contained timing reconciliation. This round strengthens it at the actual native HTTP request. In tests/go-live/resubscribe.flow.ts lines 77 to 89, Playwright intercepts the real affirmative POST, verifies its method and form body, records the test runner's real wall clock before forwarding, and closes the bracket after the response finishes. Lines 96 to 115 compare authenticated consent confirmedAt with that bracket and with persisted consent, confirmation and history times and the contact's channel status time. Capture must precede the bracket. Lines 121 to 137 independently establish later replay times, verify repeated GET and POST return 410, check unchanged persistence, detail, growth and handoff counts, and attach non-secret observed timestamps.

The unchanged registration in tests/go-live/shared-kiosk.journeys.ts lines 5 to 8 invokes the whole shared-signup flow and the resubscribe flow. scripts/verification/plan.mjs registers this journey in the reports pack. There is still one registration in that file: zero added or removed registrations. No existing assertion was removed, skipped, narrowed or placed behind a new condition. The test continues to cover both normal hosted signup and kiosk mode. Production routes and persistence were inspected but not changed. Confirmation is served by src/core/features/audience/public-routes.ts and persisted by src/core/features/audience/repository.ts.

The runtime uses the real Hono routes, sessions, D1 and rendered browser forms. Only the existing mail and challenge network boundaries are synthetic. This is native runtime proof, not a claim of live hosted or sending-provider qualification.

## Acceptance map

| Acceptance | Result this round |
| --- | --- |
| 1, pending consent and one confirmation | Existing assertions retained: consent is unconfirmed, opt-out persists, and exactly one fresh confirmation is handed off. No blanket new channel claim. |
| 2, affirmative confirmation and request time | Hosted-email point proven in normal and kiosk mode by the native POST bracket, authenticated detail and persisted consent, confirmation, status and history reconciliation. SMS time remains held. |
| 3, no marketing while pending | Carried evidence and its named Gap remain unchanged; no new complete-acceptance claim. |
| 4, single use and lifetime | Existing single-use and expiry evidence retained. This round additionally proves later GET and POST replays preserve the original timestamps. |
| 5, direct subscription when confirmation is not required | Existing shared opt-in journey is retained and executed; the clause's carried remainder is not silently deleted or promoted. |
| 6, inspection versus affirmative action | Two browser GET previews leave all authenticated detail unchanged before affirmative POST. Existing HEAD and other carried evidence remain unchanged. |
| 7, identity and restriction guards, authenticated SMS reply | Existing opt-out, scanner, pending and guard evidence retained. Inactive-identity and complete SMS exact-message reply qualification remain named remainders. |

External held remainder: owner Twilio A2P and US carrier registration, SMS transport and qualification, including acceptance 2 SMS timing and acceptance 7 complete authenticated reply. No held credential or provider account was sought. The existing provider, device, account and cross-seed or Base prerequisites remain unchanged. CONT-013's SPLIT and NEW-1 disposition and original fix-1 hold remain unchanged. No policy default or acceptance carve was introduced.

## Local results

- Required setup: passed with the supplied non-interactive owner option.
- Production build: passed through cloud_run.
- Typecheck: passed; actual output is typecheck.txt.
- First-party command check: passed with exit 0 and no output.
- Focused registered shared-kiosk journey: passed, one test, no skipped or flaky results, initial run 72.891 seconds; exact committed candidate run 70.751 seconds, also passed with no skipped or flaky results. Its actual result is journey-exact.json and journey-exact.txt.
- Contract generator write and check: passed. Both generated views were restored whole from origin main; neither view is committed.
- Source lock: regenerated last and checked successfully. Mechanical command exits and lock digest are in mechanical.json.
- Migration ledger: not applicable; no migration changed.
- Candidate history: all three commits between main and HEAD have fleet author and committer identities and no co-author trailers. All parent Status IDs and all 490 pipe rows are preserved. Product changes are limited to the selected test, CONTRACT.md evidence and sources.lock.json.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0, restored from origin main; ledger=none exit=0.

No production screen, layout, homepage, logo or configuration control changed. Existing browser assertions run at 1440. The UI-change requirement for new screen proof at 1440 and 390 is not triggered by this test-only change.

## DONE-RIDERS review

The clause is intentionally not promoted. These are checks of the selected point and the honest remaining boundary, not a DONE judgment.

1. FAIL for the whole clause: SMS timing, inactive identity and complete SMS reply plus the carried named gaps remain unproved. PASS for the selected hosted-email outcome at resubscribe.flow.ts lines 77 to 131.
2. PASS for the selected point: real seeded opted-out contacts; GET leaves consent unchanged, affirmative POST subscribes, and used-link requests refuse with unchanged persisted records and detail.
3. Exact candidate journey and exact-SHA push Verify are recorded in the receipts. The full clause remains partial. Exact-SHA push Verify completed with a generated-view-only failure before shards; local exact-SHA registered journey passed. The explicit cloud exception permits handoff, not a claim that CI tests ran.
4. Candidate proof is tied to the full product SHA and source hashes in receipt.json; exact committed run is recorded separately.
5. PASS: CONT-009 retains its BASE-MAIL-001 citation in CONTRACT.md's metadata; no duty was moved or weakened.
6. PASS for this partial update: the evidence describes present proof, all named gaps remain, and generator write followed by check passes. The historical Judged from text is unchanged because this is not a new DONE judgment. Lander restoration of views is explicit.
7. PASS: no acceptance point, clause ID, ruling or coverage obligation changed.
8. No operator-authority implementation change. Existing authenticated detail reads and public recipient confirmation continue through their native doors.
9. PASS: no provider, carrier, device or legal qualification is claimed; held boundaries remain in the Gap.
10. Not applicable: no new consent, authority, custody or other policy was adopted.
11. Pending the Mac lander: exact main equality, complete publication scan with zero findings and resulting Run site. None is claimed from this cloud execution.

Pre-ready self-check: the selected observable behavior is asserted through the native door; no existing assertion was weakened; later replay cannot update the original consent or history. No production authority, erasure or data-exposure path was changed, and no broader erasure or inactive-identity proof is claimed. There is no touched product screen to audit. Source lock is fresh. Cloud publication scanning and landing remain with the fleet. CI status is recorded separately and will be reported honestly.

## CI and custody

Main Verify 42137089578 and Run site 42137089740 were completed with success on cc6321c2372d631d9607df9af8ad1dd9f7878e84. Candidate Verify 42156774407 was discovered on push at 12dec3e3f4c65910ffdec642c3718ec8c3a8edd2. It completed with failure solely at the expected generated-view freshness check: build job 127692748783 ran `node src/base/contract-docs.mjs check` and reported `ACCEPTANCE.md: generated content differs; run contract-docs write.` Summary job 127692825851 failed because the build failed, and shards were skipped. The exact candidate reproduces that expected exit 1; generator write and then check both pass, and restoring the views leaves a clean tree and a fresh source lock. This is the brief's explicit READY exception, not a green CI test claim. Actual job and command evidence is in candidate-ci-jobs.json, verify-failure.txt and generated-view-exception.json. No workflow was edited, dispatched or rerun. GitHub calls are bounded to ten and each run is observed at most once per 300 seconds, including discovery.

Report files are explicitly selected for the separate evidence ref. The evidence commit and product candidate are separate custody records. The report contains no credentials, private runtime state or live-provider receipt. Publication of this packet is neither landing nor a DONE claim.

## Exact candidate public-door observations

PROBE CONT-009 acceptance-2-hosted-email-normal: native affirmative confirmation POST confirm=true after capture 1793935789827 -> HTTP 200, confirmedAt 1793935790555 inside [1793935790526, 1793935790615], matching consent, confirmation, contact status and both history records; two later GET and POST replays -> HTTP 410 and unchanged original times.

PROBE CONT-009 acceptance-2-hosted-email-kiosk: native affirmative confirmation POST confirm=true after capture 1793935794007 -> HTTP 200, confirmedAt 1793935794737 inside [1793935794708, 1793935794766], matching consent, confirmation, contact status and both history records; two later GET and POST replays -> HTTP 410 and unchanged original times.

GitHub calls used: 6 of 10. No failing product test or repair round occurred. No live-provider or owner-account blocker was newly introduced.
