# sd-mango-c-f55 results

Repository: just-every/run-mango
Product branch: cloud/sd-mango-c-f55
Candidate: 697525917a55c6da6bb8612640b864a258586721
Base main: 955785c08ed00910bc83e3aa3bbb0a54703f6f71
PR: none; Verify has a push entry point for this branch.

CONT-001 stays PARTIAL. Counts stay 18 DONE, 200 PARTIAL and 98 MISSING, across 316 clauses. The selected hosted email comparison POINT is closed. Other native proof gaps remain explicitly named; this run makes no DONE claim and requests no policy ruling.

The plan is recorded in PLAN.md. The only plan row changed by this run is CONT-001: hosted signup comparison proved, broader comparison and uniqueness gaps retained. The historical extract and other queued clauses were not changed. The product commit contains exactly the signup route, its existing registered journey, CONT-001's Status row and the generated source lock. Generated views, reports, browser artifacts and receipts are outside the product branch.

## Result and scope

The hosted signup schema previously validated the raw string before the later normalization. A request carrying surrounding whitespace therefore received invalid_signup even when its canonical identity was valid. The schema now trims and lowercases before the same email validator. Destination lookups, hashes and capture consume that validated canonical value. The shared identity module already normalized correctly and needed no change.

The existing registered signup journey now gets the current disclosure through GET /subscribe/info. It submits mixed-case and surrounding-whitespace variants of an independently chosen synthetic identity concurrently, then repeats the canonical spelling. Each request is accepted. The database contains one canonical contact, one address, one consent evidence row and one confirmation record, and the provider edge receives one confirmation addressed to that canonical destination.

Authenticated search and contact-detail reads return that same identity while pending, after affirmative confirmation and after opt-out. A signed-out contact read is refused. Malformed addresses, absent affirmative consent and obsolete disclosure are refused before contact or consent storage. Existing bot, scanner GET and HEAD, affirmative confirmation, spent-token replay and later opt-out checks remain. Campaigns, immutable approval records, recipient steps and dispatch commands stay empty; the sole outbound message is the confirmation.

Acceptance map:

- Acceptance 1: the selected hosted signup comparison is proved by ./tests/audience-import/signup.spec.ts, the existing test named “[CONT-003][CONT-004][CONT-009][FORM-001][FORM-007] public signup confirms once, resists duplicate capture and scanners, and never reverses a later opt-out”. Current disclosure and refusal checks are at lines 11–30; canonical capture and singular records at lines 31–45; authenticated identity readback at lines 46–55, 62 and 73. Other capture and API doors and CSV comparison remain unproved.
- Acceptance 2: phone canonicalization remains unproved in this slice.
- Acceptance 3: this journey proves hosted email uniqueness only. Complete canonical email and phone uniqueness across capture and import remains unproved. The prior archive journey and its evidence remain unchanged.

The planner explicitly omitted those remaining doors and proofs. They are native engineering and proof gaps, not account blockers. Twilio A2P and US carrier registration, SMS transport and qualification, provider and device qualification, owner-held account dependencies, cross-seed and Base prerequisites, rer adoption requirements, and other recorded acceptance prerequisites retain their existing holds. CONT-013's SPLIT and NEW-1 disposition and original fix-1 hold are unchanged. No homepage, logo, visual design, provider qualification, Base pin, workflow or migration changed.

## Actual validation

The extended signup journey was run against the original route and failed at the acceptance assertion: expected all responses to have status 202, received false. See signup-before-fix.log. This demonstrates the regression test catches the whitespace rejection.

After the fix, the registered focused signup journey passed. After the final test edit and synchronization it passed again: 1 test, 9.6 seconds, exit 0, in signup-final.log. The existing signup security spec passed all 11 registrations, exit 0, in signup-security.log. It covers preserved subscribed and restricted identities, erasure restrictions, scanner and token behavior, durable limits across restart, concurrent allowance claims, sender and Turnstile guards, expiry, opt-out, suppression and explicit reconsent. No test registration was added or deleted. No existing assertion was removed, narrowed, skipped or hidden behind a viewport condition. The same signup test still asserts every previously checked outcome.

Typecheck, first-party command check and rer build passed, each exit 0. The first-party command emitted no stdout. The local toolchain supplied Node 24.19.0 and pnpm 10.12.4 through the required cloud shim; CI uses the repository's pinned Node 22.20.0. The Base pin and dependencies were retained. Actual command receipts are in candidate-receipt.json and their corresponding logs.

The browser proof ran the existing signup screen at 1440 and 390 through the fixture Worker, with the real signup route and only the existing synthetic confirmation-mail HTTP edge. At each width, a direct whitespace request returned 202, the rendered form submitted successfully with 202, confirmation feedback was visible and horizontal overflow was absent. See browser-proof.log, browser-receipt.json and subscribe-1440.png and subscribe-390.png. The driver is retained in browser-proof.mjs. Browsers and the server this driver started were closed. Relevant product source bytes did not change between these screenshots and the candidate. The route journey is asserted at the configured 1440 viewport; the two browser captures add the required screen proof without adding permanent registrations.

PROBE CONT-001 acceptance-1: /subscribe with current disclosure, mixed case and surrounding whitespace -> HTTP 202 for every valid variant; one canonical contact, address and confirmation; authenticated pending, subscribed and unsubscribed readback; no campaign approval, recipients or dispatch commands.
PROBE CONT-001 acceptance-2: none, phone canonicalization is omitted by the selected POINTS and remains a named Gap.
PROBE CONT-001 acceptance-3: hosted email uniqueness observed through the same signup capture and authenticated readback; all other capture and import uniqueness proof remains a named Gap.

The contract generator's write and check succeeded before both generated views were restored whole from origin/main. The source lock was regenerated last and its check passed. The exact committed head's lock and offline Base-copy checks also passed. No migration ledger check applies because no migration changed.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0.

The final synchronization rebased the unpublished branch onto current main, preserving all source and test changes. Main was unchanged at that fetch. Before the commit, all 490 parent table lines and all 316 parent Status rows remained. The only removed Status line in the staged diff was the old CONT-001 line replaced by its updated evidence and Gap. No acceptance sentence changed. See row-preservation.json. The source lock contains only the three changed file digests. Both generated views are absent from the commit.

The fleet commit hook remained enabled after repository setup and build. Every candidate commit, including all side parents, was inspected before the product push. There was one candidate commit; author and committer both use the fleet identity, and its message has no co-author trailer. See identity-receipt.json. The fleet push guard printed PUSH_OK, and a separate remote-ref read matched the exact candidate. See product-push.log and remote-product-ref.txt. Added text has zero email-shaped strings and git diff --check passed. Existing repository fixtures are retained; this is not a claim that historical files contain no synthetic addresses. No cloud publication scan was run: the mandated full-history scan remains the fleet lander's gate.

## DONE-RIDERS and pre-READY checks

No clause is promoted. These notes distinguish the selected point's proof from the complete clause and landing conditions.

1. PARTIAL for the complete clause. The hosted email journey reaches the selected comparison and uniqueness outcome; the remaining capture and import doors and phone outcomes are named in the Gap. The exact candidate's Verify result is recorded separately in CI-RESULT.md.
2. PASS for the selected outcome. A nonempty synthetic identity is captured and independently expected canonical bytes are checked. The journey failed against the old validator. Refusal cases leave contact and consent stores empty.
3. PERMITTED GENERATED-VIEW EXCEPTION. Exact-SHA Verify completed with only the stale ACCEPTANCE.md generator failure and its dependent coverage failure; product test shards were skipped and are not claimed green. The test is already in the identity-data push verification group in ./scripts/verification/plan.mjs. No workflow or registration change was needed. See CI-RESULT.md for the final observed run result.
4. PASS for local provenance. The final signup run uses the candidate's exact source and test bytes; candidate-receipt.json records their hashes. Browser-relevant product source is unchanged since capture. Build and security proofs use the same product route bytes.
5. PASS for retained scope. CONT-001 retains door rule D-2; this change adds no inherited Base duty and changes no acceptance text.
6. PASS for the updated partial evidence and Gap. Write and check passed before view restoration; honest remaining proofs are named. The historical Judged from paragraph is retained because no new DONE judgment is claimed. The stale committed generated view is deliberately left for the lander.
7. PASS. Acceptance sentences, clause identities and existing rulings are unchanged; no rewrite or coverage-map edit occurs.
8. PASS for the selected authority paths. Signed-out contact read returns 401; signup creates no campaign, approval, recipient or dispatch authority. Existing affirmative confirmation, replay refusal and opt-out remain asserted at lines 57–80 of the signup journey. Related security journeys retain suppression, erasure and reconsent refusal checks.
9. PASS as an honest boundary. Only a synthetic provider HTTP boundary was exercised. No hosted mail, SMS carrier, compliance or live-provider qualification is claimed.
10. PASS. Normalization changes no custody, consent, spending or authority policy and needs no new default or ruling.
11. PENDING LANDING. The product branch is pushed. Main equality, exact-SHA landing Verify, complete full-history publication scan with zero findings and Run site are the guarded fleet lander's responsibilities. The last observed base main had green Verify runs 42115822313 and 42112962771 and green Run site 42115822121. Those runs are not claimed as candidate proof.

Pre-READY: the selected public-door behavior has a regression-sensitive passing journey. Existing protections and assertions remain. The relevant restricted, erasure and replay paths pass in the related security spec. Screens retain their existing typography and controls; no icon-only control or configuration surface was introduced. The source lock is fresh. Candidate Verify, publication scan and landing custody are stated honestly rather than borrowed from another SHA.

## Terminal custody

The product push and report publication are separate. The report-only evidence ref contains this report, plan, actual receipts, relevant logs and browser proof; it signals neither DONE nor landing. CI-RESULT.md records the latest observed exact-SHA Verify event, run and conclusion. There is no PR because this repository runs Verify on the product branch push. Remaining native proof gaps are not repaired or hidden by this hosted slice. No selected-point runtime blocker remains.

Final CI disposition: Verify 42128823026 completed with the permitted generated-view freshness failure on ACCEPTANCE.md; dependent coverage failed and test shards skipped. See CI-RESULT.md and ci-failure-receipt.json. The expected stale view was reproduced locally on the exact committed head. Local contract write and check passed before restoration. This is READY under the explicit generated-view exception, with full tests, scan and landing gates retained for the lander.
