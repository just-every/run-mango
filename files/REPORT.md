# sd-mango-c-f104 result

CAMP-001 remains PARTIAL → PARTIAL. The sole selected point was already complete in the supplied f100 base; this run independently executed and inspected that proof. No product source, test, clause, Status row or count was changed. No duplicate test, no empty commit and no new policy were introduced.

Product: just-every/run-mango, branch cloud/sd-mango-c-f104, head 1be192cc51d208a35826bb77e211b841d8f22d3b. The fleet push guard published that exact head successfully on its first attempt. Remote branch readback matched. No PR is required: the branch push started Verify.

Counts before and after: 20 DONE, 198 PARTIAL, 98 MISSING, 316 Status rows. Plan row reviewed: CAMP-001 only; no plan row or acceptance was rewritten. The selected pause and resume proof was already closed by f100, rather than newly closed here. Full working plan: PLAN.md.

## Actual proof

The registered test in tests/go-live/multistep.journeys.ts:5 invokes tests/go-live/pause.flow.ts unchanged. It passed once on the exact candidate: 1 test, 1 passed, approximately 1.9 minutes, Chromium headless with the required no-sandbox option. The full registered caller also preserves its existing multistep and catalog evidence.

- Four distinct native operator operations: scheduled pause and resume, then mid-dispatch pause and resume. Installation-clock brackets are recorded independently of returned and persisted times at pause.flow.ts:61. Durable audit actor, revision, operation uniqueness, event count, original occurrence and creation times, and authenticated Activity are reconciled at lines 27–59.
- Later duplicate pause and invalid resume compare full audit, channel-pause, Activity, approval, revision, recipient, queue-command and handoff snapshots at lines 85–99 and 110–114.
- Pausing prevents the next provider handoff; resumption sends the remaining eligible recipients once per step, retaining accepted results and excluding a current opt-out. Completed-state refusals preserve history, timestamps and authority at lines 161–167.
- The Activity screen shows the four retained Owner operations and original datetime attributes at lines 168–178. Scheduled pause, dispatch pause, completion and Activity screenshots were captured at 1440 and 390. The desktop and phone scheduled and Activity captures were visually inspected. These are layout captures; no independent phone interaction claim is made for CAMP-014.
- Existing send-window expiry skips and unchanged handoff totals remain asserted at lines 181–190.

PROBE CAMP-001 acceptance-2 operator occurrence retention: native campaign pause and resume controls plus authenticated Activity and durable readback -> four distinct Owner transitions within independent clock brackets; later replay, reload and named 409 refusals preserve original times, events and handoff authority; focused registered journey PASS.

Receipt: journey-receipt.json and journey.log. Eight selected captures are under screens. No live provider or SMS qualification was attempted or claimed.

## Checks and custody

Typecheck, first-party command check, local contract generation and generated-view check, source-lock regeneration and source-lock check all returned exit 0. See mechanical-receipt.json and the corresponding actual logs. Generated views were restored from origin/main whole; the worktree remained clean, including sources.lock.json. The final main fetch and merge returned Already up to date; current main is already a parent of the supplied published integration commit. No published history was rewritten.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, generated views restored from origin/main; ledger=none exit=0.

Every candidate author and committer is the fleet identity; trailers are absent. Both candidate commits and all three parent relationships, including the integration side parent, passed identity and Status-row retention inspection. No parent Status ID was dropped. See candidate-identities.log and status-row-receipt.json. No test registrations were added or removed, and no assertion was narrowed, skipped or made conditional.

Exact-head Verify from the supplied base: run 42198818840, push, completed failure. Job 127828787333 failed only at Check generated contract documents with “ACCEPTANCE.md: generated content differs; run contract-docs write.” The same command on its exact SHA reproduced exit 1. Its failed-job archive was read once. This is the expressly permitted generated-view exception, not a product repair. The dependent aggregate failure and skipped shards follow that check; the CI journey is not claimed to have run.

The f104 branch push started exact-head Verify 42203866613, push, queued at discovery. No duplicate workflow was dispatched and no rerun was requested. Four GitHub command invocations were used: base discovery, base jobs, one failed-job archive, candidate discovery. The new branch run remains with the fleet watcher. A passing full Verify is not claimed. No CI repair rounds occurred.

Publication scan, landing, exact-main Verify custody and Run site remain with the Mac fleet. No cloud publication scan or main landing is claimed. The identical SHA's known Verify failure is solely the permitted generated-view exception. The branch is a reviewable candidate, not a DONE or landing receipt.

## DONE-rider assessment

No DONE claim or judge request is made. These are the rows checked against this candidate:

1. FAIL for whole CAMP-001: acceptance 1's complete state, deadline and provider matrix and acceptance 2's other transitions and acting features are still unproved. The selected operator slice passes the local registered journey.
2. PASS for the selected slice: seeded real campaign authority, actual controls, four distinct operations, later replay, explicit refusals, current opt-out and real network-edge handoffs are asserted.
3. PENDING: the journey is registered in push Verify's delivery pack, but the base run stopped at generated views and the f104 run was queued at discovery. No CI execution or green journey is invented.
4. PASS locally: exact candidate SHA executed; no source or test bytes changed afterward.
5. UNCHANGED: no inheritance or Base-duty rewrite; no additional duty claimed.
6. PASS for honest PARTIAL metadata: current Gap retains the complete omitted remainder. Local write and check pass; candidate stale generated views are intentional under the cloud rule. No DONE Gap or candidate judging claim is made.
7. PASS: acceptance unchanged, no ruling reinterpretation, all 316 Status rows retained across all candidate parents.
8. PASS for selected authority behavior: signed-out pause is 401, invalid resume and terminal-state operations are 409, unsafe operations preserve authority. No broader role matrix is claimed.
9. PASS for boundary honesty: network-edge fixtures only; provider, SMS, device, account and release qualification remain held as before.
10. PASS: no new consent, custody, spending or authority default adopted.
11. PENDING fleet landing: no main equality, Run site or COMPLETE scan is asserted.

## Remaining work and limits

Acceptance 1 still needs the complete state, deadline and provider matrix, including Draft, SEND-009 provider holds and first-step deadline failure caused by unavailable provider or sender registration. Acceptance 2 still needs attribution, occurrence-time retention and invalid-transition refusal for every other transition and acting feature. Those are the existing Gap, expressly omitted from this round's selected POINTS. Nothing in this report promotes CAMP-001 to DONE.

All existing provider, device, account, cross-seed, Base, rer adoption and release requirements remain unchanged. CONT-013's existing disposition and original hold are unchanged. The selected scope has no new blocker and yields no new product commit or count gain. The appropriate planning result is “selected point already proved in pinned base; independently revalidated,” not another duplicate builder for that same point.

Pre-ready self-check: the selected behavior has a meaningful seeded public-door assertion; no existing assertion changed; replay cannot manufacture pause events or authority in the tested paths; no production behavior changed in this run. Revocation and erasure guarantees outside this slice are not newly claimed. No new fixture, email-shaped string, icon-only control, configuration surface, homepage or visual design was introduced. Source lock is fresh. Full green CI, publication scan and landing custody remain explicitly unestablished here.

Report and actual receipts are selected explicitly for the report-only evidence ref. No credential file, environment dump, private gate material, runtime database or symlink is included. Product checkout and index are not changed by evidence publication.
