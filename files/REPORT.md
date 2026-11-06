# sd-mango-c-f88 results

PROP-006 remains PARTIAL to PARTIAL. The planner-selected citation work was already landed by the predecessor, before this run began. No product source, test, acceptance, Status row or generated view changed. No product commit was created, no published history was rewritten, and no PR was needed. The named task branch was pushed successfully through the fleet guard.

Repository: just-every/run-mango. Branch: cloud/sd-mango-c-f88. Exact product head: `5f740dc8cd6624d68df11cd55e56e317e5f6bc96`. Initial and refreshed origin/main equal this head. Predecessor `9b32e897756337b0a011fa29c726b2254b12fc84` is its ancestor; main's `5f740dc` regenerated that predecessor's contract views. There is no unfinished predecessor diff to replay. All other writers' work is retained.

Before and after contract counts: 20 DONE, 198 PARTIAL, 98 MISSING across 316 Status rows. Status changes: none. Plan update for the fleet: mark this continuation's selected citation points already satisfied on main; retain PROP-006's existing full-clause remainders. No plan was rebuilt and no lane file was read or written.

## Selected outcome and proof

The single registered public-door journey is `tests/proposals-decision/grounding-citations.spec.ts`, test “[PROP-006] forged citations and altered observations fail without composition or campaign authority, then valid generation recovers” at line 17. `scripts/verification/plan.mjs` includes it in the identity-data pack; `playwright.config.js` loads it as a main test. Native authenticated Hono routes, production services and repositories, migrated Miniflare D1 storage and real audience evaluation run beneath the test. The AI and commerce doubles are at existing external boundaries. No live AI-provider behavior is claimed.

The journey first retains a real successful proposal and historical recipients. Lines 32 to 61 independently mutate exactly one citation property, preserving the remaining output. Lines 63 to 85 assert HTTP 409 invalid_ai_output, persisted failed state, empty summary and decision context, no linked campaign, no composition, no accepted forecast or proposal steps, repeated detail and desk reads, adoption refusal and unchanged existing authority. Lines 89 to 118 exercise valid generation afterward and reconcile the independently expected owned-history forecast and draft state while preserving prior work.

| Selected point | Local outcome | Existing assertion |
| --- | --- | --- |
| Summary unknown citation key | PASS: generation refused and authority unchanged | Protected field line 33; isolated key mutation lines 49 to 52; native refusal and readback lines 63 to 85 |
| Summary altered observed value with a genuine key | PASS: generation refused and authority unchanged | Protected field line 33; isolated value mutation lines 54 to 55; native refusal and readback lines 63 to 85 |
| Audience explanation unknown citation key | PASS: generation refused and authority unchanged | Protected field line 34; isolated key mutation lines 49 to 52; native refusal and readback lines 63 to 85 |
| Audience explanation altered observed value with a genuine key | PASS: generation refused and authority unchanged | Protected field line 34; isolated value mutation lines 54 to 55; native refusal and readback lines 63 to 85 |
| Timing explanation unknown citation key | PASS: generation refused and authority unchanged | Protected field line 35; isolated key mutation lines 49 to 52; native refusal and readback lines 63 to 85 |
| Timing explanation altered observed value with a genuine key | PASS: generation refused and authority unchanged | Protected field line 35; isolated value mutation lines 54 to 55; native refusal and readback lines 63 to 85 |
| Valid generation after the six failures | PASS: HTTP 201, own-history forecast and editable draft with no approval or dispatch | Lines 89 to 118 |

Each probe's actual output is in `PROBES.txt` and `grounding-citations.log`. This run added zero test registrations and removed or weakened zero assertions. The existing focused journey has one registration. No assertions moved behind any new width, flag or branch condition. No UI changed, so additional browser screenshots were not applicable.

## Checks and custody

All checks ran on `5f740dc8cd6624d68df11cd55e56e317e5f6bc96` with a clean tracked tree.

- Setup: `npx -y @runeditrun/rer setup --owner-email <fleet identity> --non-interactive`, through cloud_run, exit 0. Setup installed locked dependencies and built the application; its private settings remain outside evidence.
- Focused journey: `MANGO_NO_FIXTURE_SERVER=1 MANGO_CHROMIUM_EXECUTABLE=/usr/bin/chromium pnpm exec playwright test --config playwright.config.js tests/proposals-decision/grounding-citations.spec.ts --workers=1 --reporter=list`, through cloud_run with a 1200-second hard timeout, exit 0, one test passed in 32.1 seconds. No browser or fixture server was required by this route-only journey.
- Typecheck: `pnpm run typecheck`, exit 0.
- Public command contract: `npx -y @runeditrun/rer check --profile first-party`, through cloud_run, exit 0.
- Views: `node src/base/contract-docs.mjs write`, then `node src/base/contract-docs.mjs check`, both exit 0. Restored ACCEPTANCE.md and docs/CLAIMS.md from origin/main; neither was committed.
- Lock, last: `node scripts/edition-authoring/cli.mjs lock`, then `node scripts/edition-authoring/cli.mjs check`, both exit 0 with no resulting change.
- Migration ledger: not applicable; no migration added or edited.
- Main integration: fetched origin/main and ran the task branch rebase under the explicit fleet identity; already up to date. No replay, merge conflict or new commit occurred.
- Before push: `git log origin/main..HEAD --format="%an <%ae>%n%cn <%ce>%n%(trailers:only,unfold)"` produced no candidate commits because HEAD equals origin/main. Independently inspected HEAD: fleet author and committer, no trailers. The push guard succeeded on attempt 1. No recovery bundle was required.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0.

Previously recorded exact-SHA CI, discovered by REST in this run: branch push Verify 42179839411 SUCCESS; main push Verify 42181327459 SUCCESS; Run site 42181327367 SUCCESS. All name `5f740dc8cd6624d68df11cd55e56e317e5f6bc96`. The new task-branch push Verify is 42183651100, observed in progress at the same exact head. That new run is not reported as green; the exact same product SHA already has the two recorded successful Verify runs and successful Run site above. candidate-ci.json records the discovery. GitHub API calls used: 2 of 10. No workflow was dispatched or rerun, and there was no failing CI repair. Publication scanning and landing remain fleet custody; a COMPLETE scan receipt was not generated or inferred in this cloud.

## Full-clause remainder and DONE riders

Acceptance 1's complete imported-data and configured-knowledge request provenance remains unproved. Acceptance 2's general claim derivability and other malformed-schema cases remain unproved. The existing acceptance 3 fabricated-prose, foreign-store benchmark and provider-failure evidence is retained unchanged. Actual AI-provider behavior and real AI, commerce and sending-provider qualification remain unproved. These are the planner's held remainder, not newly introduced blockers or a claim that native work is fully complete.

CONT-013 SPLIT and NEW-1 disposition, original fix-1 hold, prohibition on a third FIX or follow-up-only builder, all provider, device, account and cross-seed or Base prerequisites, rer 0.2.95 adoption and release requirements remain unchanged. No new policy choice, scope ruling, acceptance point or inherited duty was introduced. No scope ASK or DONE judge request is warranted for this unchanged PARTIAL status.

| Rider | Assessment at this head | Evidence or remaining limit |
| --- | --- | --- |
| 1 | FAIL for a full DONE claim; selected slice PASS | Journey lines 32 to 118 covers every selected citation outcome; acceptance 1 and the broader acceptance 2 evidence remain open |
| 2 | PASS for the selected slice | Existing populated authority lines 21 to 31; six unsafe cases lines 63 to 85; successful control lines 89 to 118 |
| 3 | PASS for the selected slice | Registered main journey and identity-data pack; exact-SHA branch push Verify 42179839411 SUCCESS |
| 4 | PASS | Fresh local journey, typecheck and mechanical receipts at this head; source-equality.json records unchanged bytes |
| 5 | No new inheritance claimed | Acceptance text is byte-identical and no duty was moved |
| 6 | PARTIAL bookkeeping retained | Existing Gap names remaining proof; generator write and check pass; historical Judged from text was preserved because no DONE promotion occurred |
| 7 | PASS | No acceptance or coverage rewrite; no Status rows changed or dropped |
| 8 | PASS for the selected slice | Refused adoption and identical campaign, revision, recipient, approval, dispatch and job authority on both read passes, lines 78 to 85; draft-only positive control lines 99 to 118 |
| 9 | PASS for honest boundaries | Status remains PARTIAL and retains all provider qualification gaps; no live-provider receipt claimed |
| 10 | Not applicable | No policy default adopted |
| 11 | No new DONE count claimed | Exact head already equals main and has green Verify and Run site; this cloud does not establish a publication scan receipt or claim a new landing |

Pre-READY self-check: selected refusal and recovery behaviors passed through public routes; no assertion changed; authority remains unchanged after unsafe generation. Revoked credentials, erased people and replayed captures are untouched and were not newly claimed as qualified. No screen, icon control, homepage, logo or configuration placement changed. Source lock is fresh. Exact-SHA Verify and Run site have recorded successes; the full-history publication scan remains the fleet's gate. No new fixture, provider-shaped key, email fixture or product prose was added. Actual failures or blockers in this run: none.

The report-only packet and its manifest are published separately on evidence/sd-mango-c-f88. The product branch contains no fleet report or receipt. The full plan is in PLAN.md. The machine receipt is RECEIPT.json, with detailed check logs and provenance files alongside it.
