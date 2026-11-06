# sd-mango-c-f91 result

Repository: https://github.com/just-every/run-mango
Branch: `cloud/sd-mango-c-f91`
Exact product head: `e5ddac0129a005f30daa5749ab5f5308196ee7f8`

CAMP-004 remains PARTIAL. Counts before and after are 20 DONE, 198 PARTIAL and 98 MISSING. No clause status, acceptance text or plan row was changed. The selected sender-name outcomes were already implemented in the supplied base. This run verified those exact source and test bytes and published that inherited candidate on the requested branch, without creating an empty commit or duplicating a test. The focused test remains one registration and remains in the existing identity-data Verify pack in `scripts/verification/plan.mjs`.

The complete plan is in `PLAN.md`. Machine-readable provenance and actual command exits are in `RECEIPT.json`; runtime output is in `missing-sender-base.log`.

## Selected outcomes and actual proof

The test is `tests/proposals-decision/missing-sender.spec.ts`, named “a missing sender name blocks approval without authority and clears only after a saved correction”. It uses production sessions, campaign routes, lifecycle checks, sender verification, SQL writes and reads against native D1. Doubles are confined to external provider and transport boundaries.

- Acceptance 5: lines 17–27 establish an otherwise valid saved draft with two eligible contacts and no blockers. Lines 29–54 save an empty sender name and find the named `message.email-identity` blocker. This is a native incomplete draft save, not a malformed-input rejection.
- Acceptance 4 for this case: lines 55–68 attempt approval, require HTTP 409 with the same blockers, reopen both campaign and review routes, compare the unchanged campaign, revision, steps and links, and require empty approval receipts, recipient rows, dispatch rows, job emissions and marketing handoffs.
- Acceptance 5 correction: lines 73–85 restore the configured sender through the native draft route, require a passed identity check and no blockers, read back the draft, and repeat the absence-of-authority assertions without approving.
- The inherited continuation also exercises the other identity fields, subject, body, preheader, content, consent scope, schedule absence, provider capability failures, SPF, DKIM and DMARC failures, simultaneous missing fields, sender withdrawal and native unsubscribe during approval. Its final positive approval and replay preserve the exact immutable receipt and allow only the remaining eligible contact. These are carried base outcomes, not newly claimed work.

PROBE CAMP-004 acceptance-5: native revision PATCH with an empty sender name, then campaign checks -> saved draft; named missing-sender blocker; two eligible contacts.
PROBE CAMP-004 acceptance-4: native approve for that revision -> HTTP 409; both authenticated readback routes preserve draft data; no approval receipt, recipients, dispatch, emitted jobs or marketing handoff.
PROBE CAMP-004 acceptance-5 correction: native PATCH restoring the configured sender, then checks and review -> no blockers; campaign remains draft without approval or sending authority.

All three probes executed on the exact product head above. The focused journey passed once in about 1.4 minutes. `pnpm run typecheck` exited 0. `npx -y @runeditrun/rer check --profile first-party` exited 0. Setup also built the application and applied local migrations successfully. No UI source changed, so no new browser screenshot obligation was created. No existing assertion was removed, narrowed, skipped or conditioned on width. No fixtures or production files were edited by this run.

## Mechanical checks and custody

The prescribed pre-push rebase attempted to replay the inherited merge's side history and stopped on conflicts before making any new commit. It was aborted. Current main is already an ancestor of the supplied published base. A merge check reported “Already up to date”, preserving all existing published commit identities and the original base head. No conflict resolution, history rewrite or force push was published.

Every candidate commit, including the merge's side parents, has fleet author and committer identities and no co-author trailer. The programmatic parent audit confirms that each candidate retains all 316 parent Status IDs. The full `origin/main..HEAD` identity and trailer output was inspected immediately before the guarded product push. The guard succeeded on attempt 1 and the remote ref was independently read back at the expected head.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0,0; views=node src/base/contract-docs.mjs write then check exit=0,0; ledger=none exit=0 (no migration added or edited by this run).

Generated views were restored whole from main after successful generation and checking. Source lock regeneration then passed its check and left no tracked changes. No generated view was committed. No new product commit was necessary. Full source-lock command output is retained in the packet; it contains public source metadata, not environment values.

## Honest remaining boundary

The contract's existing Gap remains unchanged: complete atomic audience coverage beyond the native identity and consent cases; complete source freshness coverage including parallel incumbent sync; sending reputation; complete named link and schedule matrices; SMS checks; live sender registration and authentication qualification; provider-effective deduplication and reconciliation qualification. The missing-sender point is fully exercised, but this run does not promote the whole clause or erase other native proof obligations.

Real-provider sender, authentication, deduplication and reconciliation qualification remain unestablished. Owner-held Twilio A2P and US carrier registration, SMS transport qualification, cross-seed and Base prerequisites, the current rer pin, adoption and release requirements are unchanged. CONT-013's SPLIT and NEW-1 disposition and original fix-1 hold remain unchanged. The f81 landing hold is carried; this run does not authorize bypassing it. No policy default, acceptance carve or additional FIX was introduced. No CT judgment is requested for a DONE claim.

## DONE riders: no DONE claim

1. FAIL for whole-clause coverage: the selected missing-sender outcomes pass at test lines 17–85, but all remaining outcomes listed above have not been established by this run.
2. PASS for the selected case: seeded eligible contacts, actual refusal and unchanged-data readback at lines 23–68; correction without authority at 73–85; inherited explicit positive approval at 243–260. No claim of whole-clause completeness.
3. NOT ESTABLISHED for a DONE claim: exact-head named-branch Verify 42189801768 completed with the permitted generated-view freshness failure; browser shards skipped after that step. The journey is registered in the existing push pack. Actual jobs and logs are retained; local runtime proof passed on this exact head.
4. PASS: focused runtime proof, typecheck, first-party and mechanical checks used the exact unchanged candidate head. No source or test byte changed afterward.
5. UNCHANGED: no inheritance or receiving duty was changed.
6. PASS for honest partial scope: existing Gap and Evidence are retained, counts are unchanged, local generator write and check pass. The checked-in generated views intentionally remain main's versions under the cloud landing rule.
7. PASS: no acceptance point or coverage obligation was changed; all parent Status rows are retained.
8. PASS for this refusal boundary: lines 41–68 and 73–85 prove no authority or sending side effects. Broader authority matrices are not newly claimed.
9. PASS for honest reporting: provider qualification remains unproved and named in the Gap.
10. PASS: no policy decision or new default was introduced.
11. PENDING the guarded lander: main equality, exact-head green Verify, Run site and the full-history publication scan are not claimed by this builder.

## CI and landing

The earlier exact-head f86 push Verify `42184249151` failed at “Check generated contract documents”; its dependent verification aggregation failed and browser shards were skipped. The jobs listing and the actual failed-job log are retained. This is the explicitly permitted generated-view freshness case; no product repair or generated-file commit was attempted.

The named-branch push started exact-head Verify `42189801768`. It completed with the same expected failure only in `node src/base/contract-docs.mjs check`: “ACCEPTANCE.md: generated content differs; run contract-docs write.” Dependent verification failed and browser shards skipped as a consequence. This is the explicitly allowed generated-view exception for the READY handoff; it is not claimed as a successful workflow or a DONE proof. Seven GitHub command invocations were used, with the status poll at least 300 seconds after discovery. No PR was created because this repository already has a branch-push Verify entry point. No workflow was edited, dispatched or rerun. A complete publication scan and Run site checks remain the Mac fleet's landing duties; no scan result or production acceptance is invented here.

The evidence packet is published only to the separate report-only evidence ref. Evidence transfer is not product acceptance or landing. After successful report transfer, the disposable product clone and dependencies are removed as required; the actual packet and receipts remain under this task's fleet work directory.
