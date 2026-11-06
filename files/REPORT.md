# sd-mango-c-f60 result

Product repository: just-every/run-mango.
Branch: cloud/sd-mango-c-f60.
Candidate: 1a4f7d299e3c366e6321a8eb4b481a6d2d840576.
Proof source and tests: 6a0bc82eeebc63536e6e0cbc002b72f32194f447.
PR: none; the repository has branch Verify and an explicit dispatch entry point.

CONT-001: PARTIAL -> DONE in the candidate, pending independent judgment and guarded landing. All three acceptance sentences are preserved verbatim. Native identity proof does not require an SMS send or provider account: the contract separately names provider and carrier obligations. The current main has 20 DONE, 198 PARTIAL and 98 MISSING; this candidate has 21 DONE, 197 PARTIAL and 98 MISSING. The supplied f55 base had 18 DONE, 200 PARTIAL and 98 MISSING; main's separate PUB-005 and PUB-006 promotions account for the other two DONEs. This round's own count delta is one.

## What changed

The required f55 base already normalized hosted signup email before validation. The hosted journey now also submits encoded forms, independently chosen mixed-case and whitespace variants, and authenticated searches for all three forms while retaining malformed-address, consent, disclosure, duplicate, confirmation, scanner and opt-out protections.

Mapping the actual clause's remaining native outcomes exposed a second defect: POST /api/contacts/consent rejected a valid padded email with 400 and invalid_request before capture. Its email schema now trims and lowercases before the existing email validator. A recorded pre-fix run reaches this refusal; no production fallback or permission change was added.

The existing registered signup journey calls identityDoors in tests/audience-import/identity-doors.ts. It uses native manual, integration and CSV routes with real migrated D1. It proves international phone canonicalization, phone-only imports, email and phone uniqueness in both capture and import orders, duplicate rows, conflicting existing owners refused without identity or consent changes, revoked-key refusal, and no marketing authority. No registration was added or removed: the touched registered file still has one sanity journey. The timeout accommodates the extended journey; no assertion was removed, skipped, narrowed or moved behind a condition. All original malformed-input categories and protections remain asserted.

## Acceptance rubric and proof

Frozen rubric for this claim:

- R1, acceptance 1: signup.spec.ts lines 12-77 and identity-doors.ts lines 30-56 and 83-100. Public signup, manual capture, scoped integration capture, CSV import and authenticated search/detail compare canonical, mixed-case and padded inputs. The one hosted confirmation and one API confirmation are independently counted.
- R2, acceptance 2: identity-doors.ts lines 30-38, 49-63 and 74-81. US, UK and Australian formatted inputs read back in E.164 form; phone-only imports remain non-subscribed; malformed numbers are refused without contact or consent changes. Documented form: docs/importing-contacts.md line 62.
- R3, acceptance 3: identity-doors.ts lines 40-72 and 106-114. Capture before import and import before capture retain independently recorded contact IDs, duplicate email and phone rows produce one owner each, conflicting owners are refused, and the complete expected four-contact set excludes orphan or duplicate profiles.
- R4, inherited door rule D-2: signup.spec.ts lines 78-95 and identity-doors.ts lines 40-47 and 101-114. Later opt-out and its identity survive import; a revoked credential is refused without changing contact data; the journey creates no campaign, approval, recipient or dispatch authority.

The journey is registered in scripts/verification/plan.mjs in the identity-data pack and runs under the root Playwright configuration. The registered invocation passed on the proof commit. The candidate's relevant source and test bytes equal that proof commit. A separate candidate invocation supplies exact-head runtime probe evidence.

## DONE-RIDERS

1. PASS local, subject to the recorded Verify result below: R1-R3 perform all three native acceptance outcomes through real routes. See the registered and candidate journey logs and the source lines above.
2. PASS: populated independently selected identities and exact IDs; supported writes complete; conflicting-owner and revoked-key requests are refused and full contact/consent snapshots remain unchanged (identity-doors.ts lines 30-72 and 101-112).
3. PASS under the explicit cloud generated-view exception: exact-candidate workflow_dispatch Verify 42134898452 completed/failure only at the stale ACCEPTANCE.md generator check, with dependent aggregate failure and skipped shards. The journey remains registered in the identity-data pack and passed locally on the committed proof and exact candidate. CI shards are not claimed as executed; the lander must regenerate the views and enforce its new exact-SHA checks.
4. PASS: the registered proof SHA is 6a0bc82eeebc63536e6e0cbc002b72f32194f447; a diff proves no relevant source or test byte changed in the final status commit. Candidate runtime probe is rerun at the final SHA.
5. PASS: CONT-001 already names Rules D-2 in Published clauses. It owes no additional Base duty in its metadata; R4 retains permission precedence.
6. PASS mechanical with the instructed view exception: DONE Gap is empty; evidence maps every acceptance; Judged from records the proof commit and retained relevant bytes. Generator write then check passed, then both views were restored from main. Their stale candidate rendering is intentional and must be written by the lander. Counts were generated, never hand-edited.
7. PASS: no acceptance sentence, policy, clause ID or coverage mapping changed. Every parent's 316 Status rows and 490 table lines are retained. Current main's newer PUB-005 and PUB-006 judgments were kept.
8. PASS for the touched boundary: authenticated capture succeeds, existing different owners cannot be linked by manual capture or import, revoked integration credentials cannot write, and denied writes leave identity and consent snapshots unchanged. Existing signed-out detail refusal remains in the signup journey.
9. PASS boundary: no SMS, carrier, real provider, hosted deployment or legal qualification is claimed. Twilio A2P and US carrier registration, SMS transport and qualification remain held. CONT-013 SPLIT and NEW-1 disposition and the original fix-1 hold remain unchanged, explicitly retained in the Evidence cell.
10. PASS: no new custody, consent, spending or delegation policy was adopted; this fixes normalization under the existing identity requirement.
11. PENDING LANDER: candidate is branch-only. Main equality, exact-main Run site and full-history COMPLETE publication scan with zero findings are not claimed. The cloud does not run that scanner or land main.

## Mutation and failure evidence

- Hosted trim removal: remove trim before the existing email validator. The padded encoded-form assertion at signup.spec.ts line 42 fails: expected 303, received 400. Exit 1. Source was restored before commits; mutation log and receipt are included.
- Manual normalization regression: the new native journey before the fix fails at identity-doors.ts line 30 with invalid_request, Invalid email address, HTTP 400. After the one-line schema fix, the full native journey passes. This was a local acceptance failure, not a CI repair.
- Other rubric rows are runtime assertions or INSPECTED proof from those assertions; no per-sentence mutation matrix is claimed. Both sides of the dangerous identity-linking and revoked-credential paths execute in the journey.

## Local checks and mechanics

- Focused hosted baseline: pass, one test.
- Extended native signup journey: pass, one test, 43.6 seconds in the focused configuration.
- Registered root configuration on committed proof SHA: pass, one test, approximately 1.4 minutes including fixture-server setup.
- Exact candidate runtime probe: pass, one test, 35.3 seconds; explicit process receipt exit 0. An extra run resolved an ambiguous earlier tool-session status after its assertions had passed; no product repair was needed.
- Typecheck on committed proof SHA: exit 0.
- First-party command check on final candidate tree: exit 0.
- Final contract generator write and check: exits 0 and 0; generated views restored from origin/main, and no own generated-view change is committed.
- Final source lock generation and freshness check: exits 0 and 0. Source lock was regenerated last after source, test, contract and main integration changes; no hash was hand-edited.
- Migration ledger: not applicable; no migration changed.
- All candidate authors and committers are fleet identity; messages and trailers were inspected including side parents before each push. No OpenAI or Codex co-author survived. No email-shaped literal or provider-shaped secret was added to fixtures or product text.
- No UI code or screen was changed. Browser screenshots and a new UI audit are not applicable to this route and data proof. Browser processes from the registered fixture run were closed by the test runner; no shared stop command was used.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0 followed by restoring main views; ledger=none exit=0.

## CI and publication custody

Exact-candidate Verify 42134898452 (workflow_dispatch) completed/failure only at the expected ACCEPTANCE.md generated-content check. Job 127620523679 is the underlying view failure; job 127620606162 is the dependent aggregate failure, and shards skipped. The same read-only generator check reproduced that expected stale-view result locally. The explicit cloud view exception applies for READY; the raw conclusion remains failure. No product assertion failed in CI, and no CI shard execution is claimed. The final status commit changes only contract metadata and the source lock and carries skip ci as required; discovery found no automatic run, so exactly one dispatch was requested. Eight GitHub calls were used, with one watcher and a 300-second discovery interval. Both failed job archives were read exactly once. CI_FAILURES.md and CI_RECEIPT.json preserve commands, IDs and the actual result.

The main SHA observed before integration was 4d12f9dea9a4a866334e361714e5d16a3ff6fe79: Verify 42130882310 and Run site 42130882206 were completed/success. An initial mistyped main-SHA discovery returned no runs and was not treated as evidence; it counts toward the API budget.

Product saves were pushed at 9e851da7565de6419b237cec2ab880e3ba79b790 and 6a0bc82eeebc63536e6e0cbc002b72f32194f447, followed by final candidate 1a4f7d299e3c366e6321a8eb4b481a6d2d840576. Every push succeeded on its first guard attempt. No force push, main push, history rewrite or PR was performed. Full plan is PLAN.md. PROBES.md records one runtime probe per acceptance point.

Plan row changed: CONT-001 evidence, Gap and status; generated summary counts; Judged from provenance. No other clause is selected after CONT-001 in the supplied current native campaign. Other writers' newer main rows and tests are retained. No homepage, logo, Base pin, rer pin, workflow or deployment change was made.

No product blocker remains in the native identity scope. Independent judgment, publication scanning and landing custody remain with the fleet. Evidence publication is a separate report-only ref and does not claim acceptance or landing.
