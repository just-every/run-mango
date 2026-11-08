# sd-mango-c-f134 — FORM-012 refusal proof

Product: just-every/run-mango
Branch: cloud/sd-mango-c-f134
Candidate: c25389df22188f2da7b4abde3d71ed08bc823b6c
Base main: eceb55d9eca66cf4a2702f69e23109d2266b1560

FORM-012 remains PARTIAL. The scoped acceptance 4 is now proved by the existing registered shared signup journey. The product already enforced all three refusals, so only the journey and its generated source lock changed. No acceptance sentence, Status row, Gap cell, Evidence cell, generated view, homepage, workflow, dependency or production implementation changed.

CLAIM FORM-012 PARTIAL points=4 tests=tests/go-live/shared-kiosk.journeys.ts#[FORM-009][CONT-005][CONT-027] shared signup clears each visitor and resubscribes only after their affirmative confirmation; tests/go-live/signup-capacity-journey.ts#capacityJourney

GAP FORM-012: Acceptance 1's full floor matrix, acceptance 2's every-level, floor and delivery-ceiling disclosure, acceptance 3's complete hour, minute, day and actor-time matrix, and acceptance 5's actual raised-limit handoff rate across every promised carrier remain held under the planner's bounded POINTS selection. No other acceptance-4 refusal category is omitted. Successful-change and portability evidence remains unchanged.

No new policy default was adopted. RL-103's existing conservative Owner-only, audited, prospective raises remain in force. CONT-013's SPLIT and NEW-1 disposition, original fix-1 hold, prohibition on a third FIX or follow-up-only builder, provider, device, account, cross-seed and Base prerequisites, and existing rer0.2.95 adoption and release requirements remain unchanged.

## Plan and implementation

The complete plan is in PLAN.md. The sole plan-row result is FORM-012 PARTIAL to PARTIAL, with the three missing acceptance-4 refusal outcomes closed. No other campaign row was selected or changed. Status counts remain 21 DONE, 197 PARTIAL and 98 MISSING before and after. Test registration delta is zero; the focused registered file still contains one registration. No assertion was removed, weakened, skipped or moved behind a width condition. Existing successful update, replay, pending-state, activation and once-only Owner audit assertions are retained or strengthened.

The journey derives a legitimate raise, a positive value below the floor, and a value above the ceiling from authenticated native allowance readback. It creates an independently authenticated Admin, assigns that role through the Owner's native role route and reads the effective role through the native operator endpoint. For each invalid PUT it checks the precise 403 or 400 and named error, then compares the complete allowance readback except the naturally advancing observation clock, every persisted allowance row and every allowance-change audit row. A pre-existing pending Owner raise makes loss or replacement of pending state observable.

A successful Owner PUT and its replay remain controls. Active allowance remains unchanged until the existing fixture advances the persisted pending effective time into the current database window. The raised value then becomes active, pending state disappears and exactly one Owner audit names the value and original effective time. This is fixture-controlled activation evidence; it does not claim an actual timed throughput or carrier-rate qualification.

The existing hour-window helper avoids a real-clock boundary during the pending-state comparison. Settings is reloaded under both Owner and Admin sessions, with behavioral assertions at 1440 and screenshots at 1440 and 390. Capture waits for the Settings requests to finish to avoid layout movement while taking evidence.

## Acceptance evidence

The registration is tests/go-live/shared-kiosk.journeys.ts:5, invoked through tests/go-live/shared-kiosk.flow.ts. The helper is tests/go-live/signup-capacity-journey.ts. Native production paths are src/core/features/audience/signup-capacity-routes.ts and src/core/features/audience/signup-capacity.ts. The same focused journey uses real Worker routing, authentication, role checks, D1 and SSR. Existing fixtures remain confined to mail and challenge network boundaries and test identity or readback support.

| Item | Result | Evidence and practical limit |
| --- | --- | --- |
| Acceptance 1 — each allowance begins at its published floor | Held remainder | No new complete floor matrix is claimed. Existing source and carried evidence remain unchanged. |
| Acceptance 2 — Settings shows every level, floor and declared delivery ceiling at both widths | Partial carried evidence | Helper lines 62–82 inspect current Settings rights and saved active or pending values after reload at both widths. Full disclosure acceptance remains held. |
| Acceptance 3 — only Owner raises, correct next window and one activity entry | Partial carried evidence retained | Lines 25–33 and 84–92 prove the allowed Owner hour change, replay, original effective time, activation and one attributed audit. Lines 35–59 prove Admin refusal. The full window and actor-time matrix remains held. |
| Acceptance 4 — Admin raise refused with named reason | PASS locally | Lines 35–59: effective Admin readback, PUT returns 403 signup_allowance_owner_required, complete before and after state equality. |
| Acceptance 4 — Owner cut below floor refused with named reason | PASS locally | Lines 49–59: floor minus one returns 400 signup_allowance_below_floor and changes no active, pending, stored allowance or allowance-change activity state. |
| Acceptance 4 — Owner raise above ceiling refused with named reason | PASS locally | Lines 49–59: ceiling plus one returns 400 signup_allowance_above_handoff_ceiling and changes no active, pending, stored allowance or allowance-change activity state. |
| Acceptance 5 — admitted raised-limit handoffs remain within rate | Held remainder | No new carrier or throughput qualification is claimed. |
| BASE-ROLE-001 inherited duty | PASS for the scoped door locally | CONTRACT.md:2091 cites the duty. Authenticated Owner success, separately authenticated effective Admin refusal and unauthenticated 401 all execute the native allowance door. Other doors remain their owning clauses' work. |
| BASE-AUDIT-001 inherited duty | PASS for scoped change attribution locally | CONTRACT.md:2091 cites the duty. Lines 13–19 and 55–59 reconcile all change activity through refusals; lines 90–92 retain exactly one successful Owner entry with exact name, value and original effective time. Global audit search or provider retention is not newly claimed. |

The recorded Verify event is push, run 42484470495, on the exact candidate SHA. Its final observed status is recorded in the CI receipt and custody addendum below. A local pass is not a claim that branch CI or landing has completed.

## DONE-RIDERS review

No DONE claim is made. All eleven rows were reviewed against this bounded PARTIAL claim.

| Rider | Result | Evidence |
| --- | --- | --- |
| 1 — every acceptance outcome reached | FAIL for whole-clause DONE; PASS for selected acceptance 4 locally | The three refusal outcomes execute and observe real state at lines 49–59. The planner's held outcomes remain explicit above. |
| 2 — meaningful real-data assertions and both unsafe and allowed paths | PASS for scoped door locally | A real persisted pending Owner raise precedes all three refused writes; complete stored rows and activity are compared. Owner success and replay remain at lines 25–33 and 84–92. |
| 3 — recorded exact-head Verify loads proof | Registered; CI receipt governs completion | Existing reports partition in scripts/verification/plan.mjs:25 contains shared-kiosk.journeys.ts. Verify push run 42484470495 targets the exact candidate. |
| 4 — candidate provenance | PASS locally | source-receipt.json records exact committed blobs and SHA-256 values; the final focused run executes the clean committed candidate. |
| 5 — inherited duties cited | PASS, INSPECTED | CONTRACT.md:2091 already cites BASE-ROLE-001 and BASE-AUDIT-001. No inheritance text changed. |
| 6 — generated views and provenance | PASS mechanically, no status promotion | Generator write and check both exit 0; main's views are restored. Every Status, Gap and Evidence cell is untouched. |
| 7 — unchanged acceptance and coverage | PASS, INSPECTED | CONTRACT.md has no diff. No acceptance change, rewrite or new ruling is needed. |
| 8 — dangerous authority path both ways | PASS for scoped door locally | Owner change succeeds; effective Admin change is refused with 403; both invalid Owner bounds are refused with 400; all refused paths preserve persisted authority and activity. |
| 9 — provider and legal boundaries honest | PASS, INSPECTED | No provider qualification, real handoff-rate, legal or device claim is added. Named remainders and the existing fixture boundary remain explicit. |
| 10 — policy approval | PASS, INSPECTED | No new authority or spending policy was introduced. The existing Owner-only implementation and RL-103 are retained. |
| 11 — main, Verify, Run site and publication scan | Pending guarded lander | Product main is not changed. Main equality is false by design. The cloud does not run the fleet's publication scanner or claim a candidate Run site receipt. |

## Pre-READY review and mechanical checks

1. Selected refusal outcomes have native request, status, named-reason and unchanged-state assertions. Removing the authority guard or either bound check makes the corresponding assertion fail. Removing successful authority or audit behavior fails the retained positive control. Whole-clause outcomes are honestly held.
2. No existing assertion was deleted, narrowed, skipped or moved behind a width condition. Phone capture adds evidence; behavioral assertions remain at 1440. No test registration was added or removed.
3. The change adds no credential, contact, erasure, capture, provider or delivery mutation path. It strengthens the authority refusal and idempotent Owner replay proof. Existing erasure, resubscription and provider fixtures remain registered and unchanged; no new coverage of unrelated credential-revocation or erasure matrices is claimed.
4. Settings remains the configuration location. Existing allowance controls use labeled text buttons and labeled inputs, with no new icon-only controls. Desktop and phone evidence shows readable rights and saved values. Inspection noted existing clipping of long network allowance save buttons at phone width. The tall element captures can include the sticky navigation over a row; this is recorded as evidence-capture limitation. No UI change was authorized, so neither existing presentation issue is altered or claimed fixed.
5. Source lock is freshly generated and checked after the final test edit and rebase. First-party command checks, build, typecheck and the focused registered journey pass locally. Exact-SHA Verify, candidate Run site, main equality and full-history publication scanning are recorded honestly; fleet-owned receipts remain independent landing requirements.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0

Both view files were restored from origin/main before commit. The lock was generated by the documented tool, never hand-edited. The only committed files are tests/go-live/signup-capacity-journey.ts and sources.lock.json. The branch was up to date with fetched main before its first commit; no published history was rewritten. All candidate authors and committers are the fleet identity, with no trailers. The push guard succeeded on its first attempt.

## Browser and evidence custody

The packet selects only the actual plan, report, public-door observations, local and mechanical receipts, exact source hashes, CI observations, command logs and the four signup allowance screenshots. Runtime directories, fixture sessions, private configuration, environment files and other captures are not selected. Source and output artifacts are outside the product branch except the requested test and generated lock.

No PR is needed: the product branch push started the repository's existing Verify entry point. The fleet owns publication scanning and guarded landing. Prior main eceb55d9eca66cf4a2702f69e23109d2266b1560 had successful Verify 42480504208 and successful Run site 42480504239 when inspected. These earlier runs are not candidate proof.
