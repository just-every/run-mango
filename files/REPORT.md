# sd-mango-c-f121

Product: `just-every/run-mango`, branch `cloud/sd-mango-c-f121`. Candidate identity and recorded checks are in `CHECKS.json`.

DELIV-009 remains PARTIAL. This round implements the selected Resend portion of acceptance 2. It does not close the entire acceptance sentence or promote the clause. Contract counts remain 20 DONE, 198 PARTIAL and 98 MISSING. No Status, Gap, Evidence, acceptance text or generated view was changed. The only plan row advanced is DELIV-009's Resend silence implementation and proof; no plan was rebuilt.

The full executable plan is in `PLAN.md`. No new policy default was adopted: the elapsed-day duty is explicit in DELIV-009, with Owner connection custody governed by existing RL-82. No live sending account, hosted deployment or external provider qualification is claimed.

## Result

New accepted marketing handoffs record the current Settings connection generation and acceptance time on their existing recipient rows. Only a verified Resend event for the matching generation, provider message and destination records signed event provenance. The event's original occurrence time is retained. Diagnostics and confirmation mail do not start the watch; provider lookup facts do not satisfy it. Old generations, unrelated messages, wrong destinations, old payloads and invalid signatures cannot recover it.

The existing scheduled monitor persists `delivery-events-silent` after an elapsed day of accepted marketing without correlated signed traffic. Existing capability checks refuse approval and defer dispatch. The Home alert and Settings show the distinct cause. The existing durable notice fence sends once to each current Owner or Admin, excluding a demoted Admin. A current correlated signed marketing event permits recovery; original sender diagnostic proof is retained internally while capabilities and the Settings verification state remain unavailable during the hold. Settings omits the misleading missing-diagnostic instruction when it already has a named connection error.

The existing Resend adapter receives the configured credential-bound retention policy. The policy still must match the actual key and owned webhook; no authority or provider proof is invented. The test edge uses its declared owned webhook identifier consistently. Native Cron and database observation controls no longer run request composition before their own operation, so a missing scheduled monitor cannot be concealed by an observing request.

Migration `0104_sending_event_silence.sql` adds three nullable provenance columns and an index. Earlier rows remain unqualified, without inferred signed history. It copies no address, key or message content and changes no existing recipient authority or outcome. Existing erasure removes the provider message and destination from the original recipient row, so this watch cannot correlate later events back to an erased destination. Release metadata records the additive migration and honest partial scope. An exact-head one-off upgrade proof replays the 103 prior migrations, inserts a populated accepted recipient, applies 0104 and confirms all 38 prior columns, provider identity, acceptance and deadline are unchanged, with all new provenance fields null. Its source and actual JSON receipt are included in the packet; it adds no permanent test.

## Runtime proof

The focused existing registration is `tests/go-live/delivery.journeys.ts` line 10, named `[MSG-011][RESULT-006] an owner connects delivery, account restrictions stop sending and signed facts update reputation`. It invokes `sendingConnectionJourney`, then `resendConnectionJourney`, then `sendingSilenceJourney`. It is already included in push Verify through the existing delivery shard. No test registration was added, removed, skipped or narrowed; the delivery file still registers three journeys. No workflow was edited and no pin test was introduced.

All new behavior assertions run at width 1440. Actual Home and Settings states are captured at 1440 and 390. The four PNG files in this packet are the changed screens; no external artwork or actual provider credential is included. Controls in the changed sending panel use text labels; no icon-only control was added. The existing visual design and homepage are unchanged.

| Rubric | Selected outcome | Proof in `tests/go-live/sending-silence-journey.ts` |
| --- | --- | --- |
| R1 | Native Settings connection and signed owner diagnostic enable actual marketing | lines 31–42 and 72–83; native review, connect, confirmation, approval and real Queue handoff |
| R2 | An idle connected installation does not alert merely because a day passes | lines 74–77; zero marketing and zero silence notices |
| R3 | A correlated current signed marketing event prevents a false silence alert | lines 80–89; accepted receipt, signed webhook, persisted original event time and later Cron |
| R4 | Replacement separates old connection traffic from the current watch | lines 90–104 and 125–135; new generation and refused false recovery |
| R5 | Lookup delivery is not a signed stream receipt | lines 109–112; native reconciliation persists delivered, signed timestamp stays null |
| R6 | Elapsed-day Cron stores a distinct cause before an observing request can run the monitor | lines 113–117; just-before-day control, scheduled handler and raw database readback |
| R7 | Home and Settings expose the cause and approval refuses without new recipients | lines 64–70 and 118–124; actual rendered screens, HTTP 409 and empty recipient set for refused draft |
| R8 | Current Owner and Admin receive exactly one notice; demoted Admin does not | lines 94–99, 118–121 and 140–144; actual mail edge bytes and durable notice states |
| R9 | Diagnostic, unrelated, old-generation, wrong-destination, old-payload and unsigned traffic cannot recover | lines 125–135; native webhook requests and unchanged signed timestamp and cause |
| R10 | Approved pending work stays unsent through its original deadline, repeat Cron and native restart | lines 105–107 and 136–148; unchanged send-by instant, zero attempts, stable marketing count and named deadline skip |
| R11 | Valid recovery does not resurrect deadline-expired work; old payload replay does not renew time | lines 149–155; matching signed event, cleared current cause, preserved signed event time and still-skipped recipient |

The accelerated clock controls elapsed time only. Approval, consent, provider signatures, scheduled handling, native Queue consumption, persistent database state and restart run production paths. Fakes are confined to provider network edges and the existing trusted mailbox receipt boundary. This is not a live-provider or real-day hosted receipt.

PROBE DELIV-009 2: native Settings connection, signed owner diagnostic, accepted Resend marketing, elapsed-day Cron -> stored delivery-events-silent, Home and Settings cause, two current-role notices, HTTP 409 approval refusal, and a pending recipient held to its original send-window-expired outcome with zero attempts; repeat Cron and restart send no extra marketing.
PROBE DELIV-009 2-controls: idle day, current signed marketing, lookup delivery, diagnostic, old generation, wrong destination, old payload and invalid signature -> only the current correlated signed marketing stream establishes recovery; lookup and false traffic do not.

## Clause sentences and inherited duties

| Item | Result | Evidence or remaining scope |
| --- | --- | --- |
| Acceptance 1: revoked keys or deleted webhook raise notices and block approval | Carried unchanged | Existing connection journey is rerun, including Resend 401, 403 and 404 cases; no new claim for full provider qualification |
| Acceptance 2: disabled signing or a day without signed events, with hold, deadline and activation behavior | PARTIAL | R1–R11 prove the selected Settings Resend silence slice. SendGrid silence, disabled-signing variants, complete activation and deadline matrix remain open |
| Acceptance 3: replacement leaves uncertain work unsent and repeats all evidence work | Carried remainder | New-generation isolation is covered, but replacement after uncertain handoff and the complete permission, domain and sender-evidence matrix are not claimed |
| Acceptance 4: disconnect removes private key and owned webhook, blocking approval | Carried unchanged | Existing connection journeys exercise native disconnect while moving between providers; no new completion claim |
| Acceptance 5: connect, replace and disconnect record actor, time and provider | Carried unchanged | Existing Activity assertions remain; new automated silence notices retain existing audit custody |
| Acceptance 6: Settings labels route and developer route has equivalent event checks | PARTIAL remainder | Settings route remains visible; complete developer-route authority is omitted by the selected scope |
| BASE-SECRET-001 | Inspected and carried runtime proof | Clause already cites it. Existing journey checks encrypted connection, export exclusion and absent key material from logs and rendered content. New columns contain only generation and timestamps |
| BASE-MAIL-001 | PASS for slice | R1, R5, R9–R11 distinguish accepted marketing, signed facts, lookup facts, held work and deadline skips without replay |
| BASE-OPS-005 | PASS for slice | R8 checks durable system notice records with current operator identity and accepted transport state; existing connect Activity assertions remain |

## DONE-RIDERS

This is an honest PARTIAL claim, not a DONE request.

| Row | Result | Basis |
| --- | --- | --- |
| 1 | PARTIAL for full clause; selected slice proved | R1–R11; unclosed acceptance scope is listed above |
| 2 | PASS for selected slice | Actual allowed handoffs and unsafe approval and dispatch refusal; populated pending recipient checked through expiry |
| 3 | FAIL: exact-SHA Verify is red | Existing push Verify registration and exact candidate workflow receipt; no green result borrowed from main |
| 4 | Candidate binding in CHECKS.json | Final source hashes, exact candidate journey receipt and actual PNG files |
| 5 | INSPECTED | DELIV-009 already cites BASE-SECRET-001, BASE-MAIL-001 and BASE-OPS-005; no inheritance rewrite |
| 6 | Mechanical checks passed | Contract generator write and check, generated views restored, no Status edits; stale broad Gap wording is left to its single writer |
| 7 | PASS | No acceptance text, clause ID or coverage map changed |
| 8 | PASS for selected slice; full authority remainder retained | Owner connect, existing Admin mutation refusals, current-role notice filtering, refusal without new recipients; no delegation authority added |
| 9 | Boundary retained | Synthetic provider edge only; sandbox, hosted and full provider qualification remain open |
| 10 | PASS | No new policy default; existing explicit clause and RL-82 |
| 11 | Fleet landing custody | This cloud does not change main, run the publication scanner or claim landed counts. Candidate Verify and all required landing scans remain exact-SHA gates |

## Pre-ready checks

1. Selected behavior is exercised through native public doors with allowed and refused outcomes. Entire DELIV-009 remains PARTIAL. Exact candidate Verify status is recorded separately.
2. Existing assertions and registration coverage were retained. The observation seam was strengthened, with a raw cause assertion before request composition. No assertion was hidden behind a viewport or branch condition.
3. Old and revoked connections retain their existing fences. Current-generation and destination checks prevent old traffic or erased recipient correlation from certifying the watch. Expired recipients remain skipped after valid recovery and replay. No contact, consent or erasure path was redesigned.
4. Existing Home and Settings design was retained and actual 1440 and 390 states inspected. Named text controls remain, without new icon-only actions, layout styles or homepage changes.
5. Source lock, contract views, migration ledger, build, typecheck and first-party command results are recorded in CHECKS.json. Publication scan is NOT RUN in this cloud: complete, historyScanned and findings are unestablished, not reported as zero. The Mac lander must run the complete exact-tree scan, enforce exact-SHA Verify and obtain Run site on the resulting main SHA. Main does not equal this unlanded candidate.

## Development checks

The first uncommitted journey attempt failed after the idle-day control because its sender inbox evidence had expired: "The inbox check has expired. Send a new check from Settings." The fixture now refreshes that independent evidence through the existing diagnostic door before its allowed marketing control. No product check or assertion was weakened. Subsequent focused runs passed, including the final source before commit. This was a development setup correction, not a red Verify repair.

## CI repair

The first candidate, `1d5101e0fb7e297211e2abafdb84cb010f81224d`, failed push Verify run 42231880118 in build job 127939620718. Its command `node scripts/verification/ci.mjs static` failed the existing `integration:check` assertion with "Stale management/integration/deployment-spec.json; rebuild then run pnpm integration:sync." The exact command reproduced with exit 1 on that head under Node 22.20.0 and the same static environment. The same command passed on unchanged main `a6ff098f6cdf8b356b76105c726c2561f6051a8d`.

Repair round 1 ran the existing integration generator. Its diff adds only the generated 0104 migration entry, and the lock was regenerated last. The failing static command then passed, including its integration stage and standard production-preview check (the root was plain HTML and setup returned a sign-in redirect). No workflow, guard, existing assertion, runtime code or journey code was changed by this repair. Both product commits remain published without rewritten history. The replacement candidate and its exact-SHA Verify result are recorded in CHECKS.json. Actual failed log, reproduction JSON, main result and successful repair log are included.

VERIFY_REPRODUCED: see `VERIFY_REPRODUCED.json` for the full failed head, job, command, assertion, actual nonzero exit and quoted error.

## Remaining scope

GAP DELIV-009: SendGrid silence and disabled-signing variants; full flow activation and deadline matrix; replacement after uncertainty; complete developer-route authority; scheduled daily, hosted and real-provider qualification remain unproved. Related DELIV-008 fresh installation and Free sign-in and DELIV-002 domain creation remain open. Uncertain handoffs remain unreplayed. CONT-013's SPLIT and NEW-1 disposition and original fix-1 hold, the prohibition on a third FIX, existing account and cross-seed prerequisites and rer adoption and release requirements are unchanged.

No status promotion is claimed. The unresolved exact-SHA CI gate below is the terminal blocker. Product push and exact-SHA CI custody are separate from report publication. Complete push and workflow receipts are in CHECKS.json and the selected log files; the final EVIDENCE line identifies the report-only ref and head.

Final local candidate: `b8aa7197494c7aa1941ee9744a23698ab8ce1cf7`. Its registered journey passed in 4.3 minutes under Node 22.20.0. The exact-head populated upgrade probe, lock and migration ledger checks passed. The four captured Home and Settings states were inspected at 1440 and 390. Final Verify run 42233607156 is recorded in CHECKS.json; no successful conclusion is claimed until its exact-SHA receipt says completed and success.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then node scripts/edition-authoring/cli.mjs check exit=0; views=node src/base/contract-docs.mjs write then node src/base/contract-docs.mjs check, followed by restoring ACCEPTANCE.md and docs/CLAIMS.md from origin/main exit=0; ledger=pnpm exec wrangler d1 migrations list mango-local --local --config wrangler.toml exit=0.

CLAIM DELIV-009 PARTIAL points=none tests=tests/go-live/delivery.journeys.ts#[MSG-011][RESULT-006] an owner connects delivery, account restrictions stop sending and signed facts update reputation

## Second Verify result under investigation

Run 42233607156 on `b8aa7197494c7aa1941ee9744a23698ab8ce1cf7` completed with failure in the connections shard. The existing custom-event journey expected at least one HTTP 429 after 65 reads, but received none (`tests/go-live/custom-event-journey.ts` line 40). The build and integration stage passed. The remaining diagnostic invocation retrieved the failed run archive with `gh run view 42233607156 --repo just-every/run-mango --log-failed`; no further GitHub calls remain in the ten-call budget. Reproduction on the failed head and the same test on main are recorded separately. No product or assertion edit has been made for this second failure.

## Terminal custody

BLOCKED: exact-SHA Verify run 42233607156 is red on `b8aa7197494c7aa1941ee9744a23698ab8ce1cf7`. Its connections shard failed the existing read-allowance assertion at `tests/go-live/custom-event-journey.ts:40`: expected at least one HTTP 429, received zero. The exact failed shard command, `node scripts/verification/ci.mjs connections`, passed all three journeys locally on that same head under Node 22.20.0 in 7.2 minutes. The same unchanged failing test passed on main `a6ff098f6cdf8b356b76105c726c2561f6051a8d` under the same runtime in 4.4 minutes. Actual receipts and logs are included. This does not establish a proven flake cause.

The brief states: "If it does not reproduce, stop BLOCKED with that output; do not guess a fix." No product or test edit was made for this second failure, and no guard was weakened. All ten GitHub diagnostic calls were used; no failed-job rerun was attempted. The final remaining call retrieved the run archive rather than separately discovering numeric job identifiers; the failed job label is known, its numeric id is unestablished. The lane must triage the non-reproducing failure and obtain exact-SHA green Verify before landing. Neither READY nor landing is claimed. Both product commits are already pushed; report publication is separate custody.

The selected DELIV-009 Resend watch, native approval refusal, once-only notices, false-recovery controls, restart and original-deadline skip are locally proved. All clause statuses and counts remain unchanged: 20 DONE, 198 PARTIAL, 98 MISSING. Main has not been changed. No PR was required or created.
