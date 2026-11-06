# sd-mango-c-f67 results

MSG-015 remains PARTIAL, with the selected acceptance 2 Admin exact-host campaign-review allowance proof completed. Counts remain 20 DONE, 198 PARTIAL and 98 MISSING across 316 status rows. No DONE promotion, acceptance change, new policy or production behavior change is claimed.

Repository: just-every/run-mango
Branch: cloud/sd-mango-c-f67
Candidate: a1bb0f0fdb93e77c61a285aedfe99773569f123c
Parent main read: cc6321c2372d631d9607df9af8ad1dd9f7878e84
Product push: succeeded through the fleet cloud push guard. No PR is needed: Verify runs on branch push. No main write or landing was attempted.

The full plan is in PLAN.md. Local execution receipts are in RECEIPT.json and the selected logs. Rider results and the selected-point rubric are in RIDERS.md. Workflow discovery and final observed status are separate actual receipt files.

The existing registered journey in ./tests/go-live/content-checks.journeys.ts invokes blockedHostJourney in ./tests/go-live/content-hosts.ts. The added adminHostAllowance path uses a newly opened native operator and assigns its Admin role through the authorized native role route, then verifies that role through /api/operator. It creates a fresh saved draft with one independently known confirmed reader and a distinct unlisted destination. The browser uses the existing review control at 1440; the same saved review is captured before and after at 1440 and 390.

Selected proof mapping:

- R1, lines 19 to 33 of ./tests/go-live/content-hosts.ts: native Admin role, fresh draft, known contact, distinct exact host and affected destination; the host is initially absent from settings and present in blocked hosts.
- R2, lines 49 to 66: the visible exact-host selection and actual Allow this host control POST exactly the intended host; HTTP 200 and returned host match.
- R3, lines 67 to 75: the response is a fresh preview with both direct and resolved link checks passing; the blocker disappears immediately and stays absent after reload. This is not just a successful save response.
- R4, lines 76 to 85: saved settings retain the exact host without a wildcard, review source, campaign and Admin identity. Native activity filtered by operator, action and campaign returns the corresponding entry; persisted actor, campaign and detail match.
- R5, lines 34 to 45 and 86: before and after the allowance, the campaign and revision stay draft, the draft revision pointer is unchanged, approval fields remain null, and immutable approval, recipient, dispatch state and dispatch command records are absent.
- R6: all existing Owner, Manager, Author, wildcard, contact-link and imported three-host assertions remain. There is still one focused registration; zero registrations or existing assertions were removed. The caller forwards the new synthetic host to the existing HTTP network-edge fixture so successful link inspection is actually exercised.

PROBE MSG-015 acceptance-2: native Admin opens a fresh campaign review with admin-review.example.test blocked, clicks Allow this host for that exact host -> HTTP 200 fresh preview; direct and resolved link checks pass; the blocker disappears and stays absent after reload; saved source, campaign and Admin reconcile with filtered native activity; draft authority is unchanged with no approval, recipients, dispatch state or dispatch command.

Validation: the focused registered content-check journey passed, one test in 1.3 minutes, using /usr/bin/chromium with --no-sandbox. Typecheck, production build and the first-party command check passed. No full local suite or additional workflow was dispatched. Tests and screenshots use synthetic data and network-edge fixtures; no live-provider or hosted qualification is claimed. The final test source bytes are identified in RECEIPT.json; no test or production byte changed between this passing run and the committed candidate.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0. After successful local generation, ACCEPTANCE.md and docs/CLAIMS.md were restored whole from origin/main and are not committed. Every parent status row remains in each new commit. The source lock was generated after all final source and contract edits. The last fetch and merge found main unchanged. History is full, not shallow.

Pre-ready review: existing assertions remain intact; no new authentication, erasure or replay behavior is introduced. Native Admin allowance and the retained Author refusal exercise the permission boundary. No screen or icon control was added or changed. The actual before and after screens were inspected; a missing test network forwarding host found in the first capture was corrected, and the final screenshots show 25 checks passed. No new email-shaped literals or provider-shaped keys were added. Publication scanning and final main equality and Run site are reserved to the guarded Mac lander; no cloud scan receipt or landing success is claimed.

Honest build corrections: the first new assertion incorrectly expected a null active draft pointer; the production draft pointer is its draft revision, so the assertion now requires that exact pointer unchanged. A first passing run asserted the direct host policy check while its screenshot exposed a blocked network inspection. The registered caller now forwards this fixture host, and both direct and resolved checks must pass, including after reload. The first-party evidence-path checker also rejected backticked helper names as nonexistent files; helper names now use plain text and only real paths are backticked. These are local development corrections, not CI repair rounds. Actual initial diagnostic and pass logs are included.

Unfinished clause outcomes remain explicit: flow blocked-host list, activation, allowance and attribution; host-specific append-only retention and Activity-screen filter proof; complete named-host approval-request payload; and remaining MSG-006 safety-inspection proof. FLOW-008 is unbuilt. Existing campaign, wildcard, contact-link and three-host imported evidence remains carried. CONT-013's SPLIT and NEW-1 disposition and original fix-1 hold, provider and account qualification, Base and cross-seed dependencies and release prerequisites remain unchanged. No external dependency prevented this selected native Admin proof. The broader clause stays partial.

Plan row update for the Mac lane: MSG-015 PARTIAL to PARTIAL; remove the selected Admin exact-host campaign-review proof from its missing list and retain the listed remainders. No other plan row changes. No judge request for DONE is made.

Exact-head Verify status and final custody are recorded in CI-STATUS.json and RECEIPT.json. A generated contract-view freshness failure alone is expected under this task's cloud landing rules; generated views must stay out of the product branch.

Final CI observation: push Verify 42151173941 completed with failure on the exact candidate. Primary job 127674559470 failed only “Check generated contract documents”, command `node src/base/contract-docs.mjs check`, with `ACCEPTANCE.md: generated content differs; run contract-docs write.` and exit 1. Aggregate job 127674643524 then failed because Build failed; shards were skipped. Both failed jobs were read once with gh run view, using the archive path required by the task. The relevant actual log excerpts omit runner environment metadata and are in the packet. This is the expressly permitted generated-view-only exception, not a product assertion failure. No workflow rerun, dispatch or CI repair was attempted. The builder marks the pushed candidate READY under that exception; the Mac lander must regenerate views and obtain exact-SHA green Verify before landing. Six budgeted GitHub invocations were used.

Run site on the candidate is not run: it belongs to the main landing. The starting main cc6321c2372d631d9607df9af8ad1dd9f7878e84 had green Verify 42137089578 and Run site 42137089740. No new publication scan or main equality receipt is claimed.
