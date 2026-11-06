# sd-mango-c-f126 — DELIV-009 continuation

Product: just-every/run-mango, branch cloud/sd-mango-c-f126, exact full SHA `80bf3b386a946b6635c99513735b08aff4804e99`.
Claim: PARTIAL → PARTIAL. The selected Settings-connected Resend silence outcome is implemented and proved. No complete acceptance point or clause is promoted. Counts before and after: 20 DONE, 198 PARTIAL, 98 MISSING.

## Result and provenance

Replayed the two refused predecessor commits, ending at b8aa7197494c7aa1941ee9744a23698ab8ce1cf7, as one real commit on current main a6ff098f6cdf8b356b76105c726c2561f6051a8d. The resulting product tree is byte-for-byte identical to that predecessor. The predecessor branch and published history were left intact. Main was fetched and the new unpublished branch rebased immediately before its first push; main had not changed. All candidate authors and committers are fleet, with no co-author trailers. The first real commit was pushed successfully on its first attempt through the fleet guard.

The recovered source adds per-recipient current-connection acceptance and signed-event timestamps; the Resend adapter records only actual accepted marketing, and the verified webhook correlates message, destination, current generation and original event time. Cron and request composition reuse the existing durable watch and notice paths. A day of accepted marketing without current signed facts records `delivery-events-silent`, exposes it on Home and Settings, refuses approval and holds queued handoffs through their original deadline. Diagnostic messages, unrelated or replaced traffic and lookup facts never certify recovery. The existing test helper is invoked by the registered connection journey; zero test registrations were added or removed, and no assertion was removed, narrowed or hidden behind a width condition.

Files: the small event-silence module, existing sending loader, monitor and status; additive migration 0104 and schema; deployment metadata and release instructions; Resend journey, edge clock and fixture composition; source lock. CONTRACT.md, its Status, Gap and Evidence cells, ACCEPTANCE.md, docs/CLAIMS.md, homepage, Base pin and Verify workflow are unchanged. Plan row listed for relay: DELIV-009 stays PARTIAL with the selected Resend slice closed. The campaign extract itself was not rebuilt or edited.

## Exact-candidate proof

Focused registered command: `timeout 1200 pnpm exec playwright test --config tests/go-live/playwright.config.js delivery.journeys.ts --grep 'owner connects delivery'`. Result: exit 0, one registered journey passed, using Node 22.20.0, pnpm 10.12.4 and system Chromium with `--no-sandbox`. It ran outside push Verify on the exact committed candidate through the dedicated cloud VM; the normal test runtime supplied native HTTP, D1, Queue and Cron. Only external provider calls were doubled. The local receipt is CHECK-RECEIPT.json and the complete output is candidate-focused.log.

Verify: push event, run 42245094360, exact head `80bf3b386a946b6635c99513735b08aff4804e99`, observed in_progress. URL: https://github.com/just-every/run-mango/actions/runs/42245094360. No duplicate workflow was dispatched, no PR was needed, and no workflow was rerun.

| Selected outcome | Public-door proof on this candidate | Lines in tests/go-live/sending-silence-journey.ts | Verify |
| --- | --- | --- | --- |
| Native connection, signed diagnostic and accepted marketing | Settings review and connect, sender confirmation, signed public webhook, native consent, approval and accepted recipient readback | 30–49, 72–83, 90–104 | push 42245094360, in_progress |
| Idle and valid-event controls | More than a day idle yields no notice; a correlated signed event keeps health valid after the day | 74–89 | push 42245094360, in_progress |
| Distinct durable silence and visible alert | Before-day control, elapsed-day Cron, stored cause, native status and rendered Home and Settings | 109–124 | push 42245094360, in_progress |
| Current authorized once-only notices | Owner and current Admin receive one accepted notice each, former Admin none; repeat Cron and restart preserve the total | 94–99, 118–121, 140–144 | push 42245094360, in_progress |
| Approval refusal changes no recipient authority | Native approve answers 409 with silence; recipient list stays empty | 122–123 | push 42245094360, in_progress |
| False recovery is refused | Lookup facts, diagnostic, unrelated, old generation, wrong destination, stale time and invalid signature cannot clear the cause | 109–112, 125–135 | push 42245094360, in_progress |
| Original deadline and no extra handoff | Pending email remains queued with zero attempts across restart, same deadline, then a named deadline skip | 105–107, 136–148 | push 42245094360, in_progress |
| Genuine recovery and replay safety | Current correlated signed marketing clears health; replay preserves original time and expired work stays skipped | 149–155 | push 42245094360, in_progress |

The Verify registration is `tests/go-live/delivery.journeys.ts:10`, invoking `tests/go-live/delivery.flow.ts:224`, `tests/go-live/sending-connection-journey.ts`, `tests/go-live/resend-connection-journey.ts:67` and the helper. The delivery pack is selected by `scripts/verification/plan.mjs:28`.

## Full acceptance and inherited-duty map

| Acceptance sentence or inherited duty | What this round establishes | Remaining boundary |
| --- | --- | --- |
| 1. Revoked key or removed webhook alerts and approval refusal | Existing registered SendGrid and Resend revoked-key, webhook, Home and notice assertions are retained and rerun by the focused journey; see resend-connection-journey.ts:47–65 and sending-connection-journey.ts. | Carried evidence unchanged; no live-provider qualification claimed. |
| 2. Disabled signing or event silence, hold, deadline and activation | The eight selected outcome rows above prove the Settings-connected Resend silence branch through native doors. | SendGrid silence, disabled signing and the complete flow activation and deadline matrix remain open. |
| 3. Replacement preserves uncertain work and renews evidence | New-generation isolation is exercised at helper lines 90–104 and 125–135. | Complete replacement after an uncertain handoff, plus full permission, domain, event and sender-evidence renewal remain open. |
| 4. Disconnect removes key and owned hook and refuses approval | Existing connection journey retained and rerun. | No expanded claim; carried evidence unchanged. |
| 5. Connect, replace and disconnect activity | Existing actor, provider and time activity assertions retained; notice audit records are also read. | Carried evidence unchanged. |
| 6. Settings route and developer-route checks | Existing Settings route disclosure retained; the cause is visible at both required sizes. | Complete developer-route authority and equivalent event checks remain open. |
| BASE-SECRET-001 | Already cited; the registered Resend journey checks encrypted storage and absence of key or signing secret from status, browser, logs and archive. | No new provider qualification claimed. |
| BASE-MAIL-001 | Already cited; accepted handoffs are kept separate from delivered facts and actual signed marketing observations; lookup-only facts do not recover health. | Live provider and hosted qualification remain open. |
| BASE-OPS-005 | Already cited; durable notice records retain feature, current operator recipient, reason, generation and recorded occurrence time; existing connection activity proof is preserved. | Full clause remainder unchanged. |

## Runtime probes

PROBE DELIV-009 acceptance-2: native Settings connection, signed sender diagnostic, accepted Resend marketing and elapsed-day Cron -> distinct stored delivery-events-silent, Home alert and fenced approval.
PROBE DELIV-009 acceptance-2-notices: current Owner and Admin plus former Admin, repeated Cron and restart -> exactly two accepted notices to the current authorized recipients; no duplicate mail.
PROBE DELIV-009 acceptance-2-refusal: native contender approve while silent -> 409 naming silence, zero recipient authority.
PROBE DELIV-009 acceptance-2-recovery: lookup delivery, signed diagnostics, unrelated and replaced traffic, wrong destination, stale time and invalid signature -> still silent; current correlated signed marketing -> healthy.
PROBE DELIV-009 acceptance-2-deadline: one pending approved email across silence and restart -> zero attempts, unchanged send-by instant 1794250967738, then send-window-expired; marketing handoffs remain 2.

## Mechanical and publication checks

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check, restored from main exit=0; ledger=node scripts/sync-integration.mjs --check and migration replay proof exit=0

Typecheck, first-party command check, integration check, contract generator write and check, source lock generation and freshness all exited 0. The temporary generator output was restored from origin/main, and none is committed. The new migration replays after all 103 prior migrations and its SQL and SHA-256 match deployment metadata. The production build passed on the byte-identical predecessor tree. Complete actual logs and the one-off migration proof are in this packet.

Main at candidate push is a6ff098f6cdf8b356b76105c726c2561f6051a8d; its observed green Verify runs are 42217811205 and 42214350885, and Run site is 42217811413. The candidate is branch-only and does not equal main. Candidate publication scan: NOT RUN in cloud, complete=false, historyScanned=unestablished, findings=unestablished. Full history is present; the guarded Mac lander must produce COMPLETE with zero new findings and exact resulting-main Run site before counting or landing. No scan or landed status is inferred from evidence publication.

Changed text contains no added email-shaped literal or provider-shaped credential. Newly matched slash tokens are necessary MIME or scoped module names; the release instructions' existing merge and reapply wording was retained from main. No account credential, private environment file, held-out gate material or symlink is selected for evidence.

## Prior red Verify

Predecessor Verify 42233607156, failed job 127946175800, reported `custom-event-journey.ts:40`, `expect(limited.length).toBeGreaterThan(0)`, expected greater than zero, received zero. The completed job archive was read once using `gh run view 42233607156 --repo just-every/run-mango --job 127946175800 --log-failed`.

Before any product replay or repair, the same failed connections command and member selection ran at b8aa7197494c7aa1941ee9744a23698ab8ce1cf7. All three journeys passed in 9.3 minutes, so the assertion did not reproduce. This exploratory replay used the VM's Node 24.19.0 and system Chromium; it is not represented as an identical GitHub runner. No rate-limit code or assertion was changed, and no speculative repair was attempted. Its complete output is predecessor-shard.log. Candidate proof and static checks use the exact Node 22.20.0 pin. The first exact-candidate Playwright invocation printed one passing test in 5.2 minutes, but the enclosing tool returned exit 1 without any failed-test output; its complete output is retained in candidate-focused-first.log. A confirmation run retained the same product and test bytes, used the same public journey, and recorded its shell exit explicitly. No product or assertion was changed to address that command-status discrepancy. This round is recovery of unfinished product work, not a repair claim for the unrelated red job.

## DONE-RIDERS and pre-ready assessment

| Row | Result | Basis |
| --- | --- | --- |
| 1 | FAIL for full DONE | Complete acceptance 2, 3 and 6 outcomes remain open; the bounded outcome map above passes its local native journey. |
| 2 | PASS for selected slice | Real accepted and queued product records, supported and refused signed-event cases, actual control handoffs and refused approval with no recipient authority; helper 74–155. |
| 3 | in_progress | Registered delivery pack, exact push run 42245094360; no DONE inference from a queued or running result. |
| 4 | PASS | Focused journey rerun at exact `80bf3b386a946b6635c99513735b08aff4804e99`; source and tests also byte-identical to the first successful replay. |
| 5 | INSPECTED PASS | Receiving clause already cites all three Base duties; no inheritance text was added. |
| 6 | PASS mechanically | Generator write and check exit 0; views restored and Status cells unchanged. Full DONE metadata is not claimed. |
| 7 | PASS | No acceptance rewrite or clause text change. |
| 8 | PASS for selected slice, remainder open | Current authorized notice recipients and refused approval exercised; full developer authority still unclaimed. |
| 9 | Honest external boundary | Network-edge doubles only; no real provider, hosted or sandbox qualification claimed. |
| 10 | Not applicable | No new policy default or scope ruling. |
| 11 | PENDING lander | Branch-only; main equality, complete publication scan and exact resulting-main Run site remain fleet duties. |

Pre-ready self-check: (1) selected user-visible outcomes have the native sanity journey above; complete clause outcomes do not, so PARTIAL; (2) no assertion removed or weakened; (3) old generation, stale signed traffic, wrong destination and invalid signature cannot recover or replay a handoff, no new personal-data store or erasure restoration path was introduced, and uncertain work remains unreplayed; (4) real Home and Settings screens inspected at 1440 and 390, cause readable, native styling retained, all action controls in the touched Settings region have visible text, card chevrons are decorative parts of named links; no new icon-only control; (5) exact-SHA Verify is honestly recorded, source lock fresh, main-only Run site and publication scan remain with the fleet. No broader erasure or provider qualification is claimed.

## Handoff

CLAIM DELIV-009 PARTIAL points=none tests=tests/go-live/delivery.journeys.ts#[MSG-011][RESULT-006] an owner connects delivery, account restrictions stop sending and signed facts update reputation
GAP DELIV-009: The selected Settings-connected Resend silence case is proved. SendGrid silence, disabled signing, the complete activation and deadline matrix, replacement after uncertainty, complete developer-route authority and full scheduled-daily, hosted and provider qualification remain open. DELIV-008's fresh-install and Free sign-in and DELIV-002's domain creation remain open; uncertain handoffs stay unreplayed. CONT-013's SPLIT and NEW-1 disposition and original fix-1 hold, all provider, device, account and cross-seed or Base prerequisites, rer 0.2.95 adoption and release requirements are unchanged.

No product blocker was observed in the selected scope. No new default, ct scope ask, PR, workflow change or landing action was made. Full plan: PLAN.md; bounded rubric: RUBRIC.md; terminal product provenance: PRODUCT-RECEIPT.json; actual local proof: CHECK-RECEIPT.json and the explicit packet files. Evidence transport is separate from product READY and does not itself establish acceptance or landing.
