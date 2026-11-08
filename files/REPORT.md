# sd-mango-c-f141-pc1 results

The saved product head already passes Verify on the named continuation branch. No product change or new product commit was needed. The earlier campaigns failure did not reproduce, and no speculative repair was made.

Repository: just-every/run-mango
Branch: cloud/sd-mango-c-f141-pc1
Full head: 3ea2fb5227abbf479c7a190507b4199fba600993
Exact-head Verify: 42497332545, push, completed, success.
URL: https://github.com/just-every/run-mango/actions/runs/42497332545
Product custody: remote branch was read back at that exact head. No PR was created; Verify supports branch pushes.

## Investigation and results

The required failed-job command, `gh run view 42487666893 --repo just-every/run-mango --job 128753337741 --log-failed`, exited 0 with empty stdout. Its complete archive was cached locally by gh, so reading that existing archive recovered the assertion without another download or API call. The failed test was `tests/go-live/presend-checks.journeys.ts`, “preview a saved newsletter, resolve pre-send blockers and refuse unsafe handoff expansion”, in the email-size flow at line 79. It expected approval HTTP 200 and received HTTP 409 with `message.links.resolved`: “Link host shop.example.test could not be resolved and checked.” See `prior-failure.txt` for the actual excerpt. The aggregate verify job failed because that shard failed.

Before any product edit, the same shard command, `node scripts/verification/ci.mjs campaigns`, ran at the failed exact head with Node 22.20.0, CI settings, the same four selected files and two workers. Chromium used the required cloud executable and no-sandbox flag. All four tests passed in 411,313 ms. This is a local cloud VM reproduction attempt, not a claim to have executed on the original GitHub runner. `reproduce-campaigns.log`, `campaigns-files.json`, `campaigns-timings.json` and `reproduce-campaigns-exit.json` preserve the actual result. A VERIFY_REPRODUCED nonzero receipt would be false and is not supplied.

The registered focused shared-kiosk journey passed separately: one test in 2.0 minutes at the same unchanged full SHA. Typecheck, first-party command check, contract generation and check, source-lock regeneration and check all exited 0. Regeneration left the tracked tree and index clean. No assertion was edited, weakened, skipped or removed. No test registration was added or deleted. No production path, workflow, Base pin, contract clause, generated view or status cell was changed. No repair round, CI dispatch or rerun was performed.

A single exact-SHA discovery found completed successful push Verify 42497332545 on cloud/sd-mango-c-f141-pc1. The older failed push run 42487666893 belongs to cloud/sd-mango-c-f141 at the same SHA. The successful named-branch run establishes current branch Verify; it is not a green result borrowed from another SHA. Five GitHub invocations were used, with no polling loop. See `github-calls.json` and `exact-sha-runs.json`.

## Selected proof and remaining scope

`tests/go-live/confirmation-allowance-journey.ts`, invoked through `resubscribe.flow.ts` and the existing registration in `shared-kiosk.journeys.ts`, executes native import and public signup. Two independently imported unsubscribed destinations take hosted-first and kiosk-first orders with fresh disclosures and challenge tokens and distinct networks. The first three requests reconcile exactly three emails, three confirmation handoffs and one persisted destination-day counter. Each fourth request returns the identical 202 acknowledgment, sends no mail, adds no consent or capture record, and leaves both contact and address unsubscribed. Expected refusal report accounting and refusal history increase exactly once. A fresh destination still receives confirmation and subscribes only after affirmative recipient POST.

PROBE CONT-042 1: native import plus alternating hosted and kiosk POSTs from different networks -> each destination reserves and receives exactly three confirmations in one durable destination-day bucket.
PROBE CONT-042 2: fourth public POST with fresh disclosure and challenge -> identical 202 acknowledgment, zero additional mail, capture, consent, confirmation or subscription; expected refusal report and history only.
PROBE CONT-042 4: read mail before and after the fourth POST in both carrier orders -> three before, three after; fresh-destination control receives one mail and confirms.

Existing acknowledgment screens were captured and inspected at 1440 and 390. The eight original PNGs are explicitly included under `screens`. No screen source was edited. The images show the generic acknowledgment in admitted and exhausted states without a destination-status disclosure.

The acceptance map and every DONE-RIDERS row are in `ASSESSMENT.md`, including file and line references. Row 1 prevents full DONE because whole-clause outcomes remain unreached; row 2 passes for the selected behavior. Row 3 is satisfied for the selected proof by exact-head Verify 42497332545. Row 4 is satisfied because all proof ran at the unchanged candidate. Row 5 is inspected with the existing D-2 duty. Row 6 generation checks pass. Row 7 acceptance is unchanged. Row 8 selected authority refusals pass. Row 9 names synthetic mail and challenge boundaries without a live-provider claim. Row 10 has no new default. Row 11 remains pending guarded landing. No full acceptance sentence is claimed closed merely from its selected portion.

GAP CONT-042: Acceptance 1's other public carriers, acceptance 2's actual midnight-UTC reset with unchanged guards, acceptance 3's complete failed and uncertain no-retry matrix, and acceptance 4's next-day reset reconciliation remain unproved. Existing CONT-027, CONT-041 and CONT-043 obligations and all erasure, provider, account, device and Base holds remain unchanged.

Counts on the unchanged product head before and after: 21 DONE, 197 PARTIAL, 98 MISSING. CONT-042 remains PARTIAL. No plan row was edited; the continuation result for the CONT-042 row is that the selected hosted and kiosk portions pass and the above remainders remain open. The full work plan is `PLAN.md`.

## Mechanical and landing boundaries

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0.

No new candidate was created or pushed, so no rebase or merge was performed. Current main was fetched as f936cb5351ca3432e53e7ed5592f2aa720f3eab2 and differs from the saved branch. Its contract counts are 20 DONE, 198 PARTIAL, 98 MISSING; these newer judgments are not overwritten by this builder. Current-main integration remains the guarded lander's job. The product diff from its merge base contains no CONTRACT.md change. All saved product commits are preserved exactly; candidate identities and messages are recorded separately.

Publication scan receipt: commit=3ea2fb5227abbf479c7a190507b4199fba600993; complete=UNESTABLISHED; historyScanned=UNESTABLISHED; findings=UNESTABLISHED. The cloud adaptation assigns the complete exact-tree full-history publication scan to the Mac lander. No zero-findings result is invented. Main equality is false and no Run site result is claimed. The lander owns merge integration, publication scan, main-only Run site and landing admission. These pending conditions do not negate the recorded successful branch Verify. Evidence publication is separate report-only custody, not a landing signal.

No product blocker remains on this head. The earlier assertion did not reproduce and the named continuation's exact-head Verify is already green, so there is no failing candidate requiring a speculative repair. Full-clause proof gaps remain as above. No new policy default was adopted.

CLAIM CONT-042 PARTIAL points=none tests=tests/go-live/shared-kiosk.journeys.ts#[FORM-009][CONT-005][CONT-027][CONT-042] shared signup clears each visitor and resubscribes only after their affirmative confirmation
