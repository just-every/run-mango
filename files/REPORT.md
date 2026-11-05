# sd-mango-c-f54 report

Repository: just-every/run-mango. Branch: cloud/sd-mango-c-f54.
Product head: dbd058a5567d5a60f1a1b56596f8d36d0485c622.
Base: 955785c08ed00910bc83e3aa3bbb0a54703f6f71.
PR: none; branch push starts Verify.

SEND-009 remains PARTIAL → PARTIAL. Acceptance 4's missing email provider-error visibility proof is closed. Counts remain 18 DONE, 200 PARTIAL, 98 MISSING, total 316. All 316 parent Status rows remain in the same order. The sole changed plan row is SEND-009: remove provider-error visibility from its native proof remainder; preserve the continuous-five-minute trigger, post-recovery audience recheck and external qualifications as outstanding. No plan was rebuilt.

The production behavior already carried the safe provider code. This change extends the existing registered recovery journey and corrects its Status Evidence citation. No production, homepage, UI, workflow, migration, dependency or Base source changed. The source lock reflects only CONTRACT.md and the recovery flow. No generated view is committed.

The existing authenticated 503 phase now checks provider_health.code and reachable state, provider_outages.last_error and campaign_channel_pauses.detail against the independently expected provider-read-http-503. Authenticated GET /api/campaigns/{campaignId} must expose the same paused state, safe detail, queued count and next probe instant. Opening and reopening the scheduled campaign must visibly expose that code. Repeated native reads, reopening and both browser captures retain the same queued recipient identity, contact, channel, step, destination, disposition, zero attempts and null handoff fence. The marketing edge remains empty. All retry-budget, deadline, late-replay, bounded-probe, durable-cadence, restart, automatic-recovery and notification assertions remain.

PROBE SEND-009 acceptance-4: authenticated 503 provider edge, native campaign GET and scheduled campaign page → provider-read-http-503 in durable health, outage and channel pause; matching authenticated result and visible explanation before and after reopen; one unchanged queued email recipient, zero attempts, no marketing handoff. Assertions at 1440; the same paused screen captured once at 1440 and 390.

Local checks:
- Focused registered journey: pnpm exec playwright test --config tests/go-live/playwright.config.js delivery-recovery.journeys.ts. Initial run passed, one registration, about 2.2 minutes. The repeated exact committed-head run passed one registration in 2.1 minutes; TEST-RECEIPT.json binds its command, observed assertions, screenshots and log to the candidate.
- pnpm run typecheck: exit 0.
- npx -y @runeditrun/rer check --profile first-party: exit 0.
- node src/base/contract-docs.mjs write, then check: exit 0; generated views restored from origin/main.
- node scripts/edition-authoring/cli.mjs lock, then check: exit 0, repeated after final integration; clean committed tree.
- Migration ledger: not applicable; no migration touched.
- git diff --check: exit 0. Added email-shaped strings: zero. No new fixture, test registration or dependency. Existing 37 direct assertions increased to 51; the prior queued-disposition assertion is subsumed by a stronger identity-bearing snapshot, retaining its queued state and zero-attempt requirements.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0.

Candidate Verify: run 42128336016, event push, exact SHA dbd058a5567d5a60f1a1b56596f8d36d0485c622, completed/failure. The sole substantive failure is the generated-view check: ACCEPTANCE.md: generated content differs; run contract-docs write. Build job 127598280808 stops there; aggregate job 127598406891 fails because its required build failed and shards are skipped. The cloud contract explicitly permits READY for this exception. No test assertion failed in CI; the registered journey was not executed there because the build prerequisite stopped. No generated view is committed or repaired.
https://github.com/just-every/run-mango/actions/runs/42128336016
Base Verify: 42115822313 success. Base Run site: 42115822121 success. No run was dispatched or rerun. CI discovery and polling use one watcher, REST, at least 300 seconds between calls for this run; the API budget is ten calls. Final run state and both failed-job identities are recorded in CI.json. Six GitHub calls total, including one archive read per failed job; no blocked blob download or retry.

DONE-RIDERS disposition, with no DONE claim:
1. NOT MET overall: acceptance 4 is now reached by tests/go-live/delivery-recovery.flow.ts lines 121–165 through authenticated API and page doors; acceptance 1's continuous-five-minute trigger and acceptance 3's audience recheck remain unproved, with SMS qualification also external.
2. PASS for this slice: nonempty seeded approved work remains queued with zero attempts; exact native and rendered code checks would fail if code propagation disappeared (lines 127–159). No expectation is computed from the result it verifies.
3. NOT ESTABLISHED in CI: exact-SHA Verify 42128336016 stopped at the permitted stale ACCEPTANCE.md check, before its test shards. The registered delivery-recovery.journeys.ts caller remains selected by the existing delivery member in scripts/verification/plan.mjs. The focused exact-head local journey passed. READY uses the explicit generated-view exception; no DONE claim follows.
4. PASS local provenance: SOURCE-PROVENANCE.json binds relevant code and test blobs to the product head; exact-head local receipt is retained. No relevant byte changed after proof.
5. PASS: SEND-009 already cites BASE-OPS-004 and BASE-MAIL-001 in CONTRACT.md's published meta lines; citations unchanged.
6. PASS for the scoped metadata correction: Evidence names the real registered journey and helper, Gap retains native and external remainders, counts unchanged, generator write and check pass. The historical global Judged from paragraph was retained; this is not a new ct judgment. Stale candidate views are deliberately restored under the cloud landing contract.
7. PASS: no acceptance sentence or ct ruling changed, no row lost, no inherited obligation removed.
8. NOT APPLICABLE: no mutation authority, correction, refund or production access path changed; only authenticated reads and existing approved fixture work are exercised.
9. PASS: network-edge proof only. SMS outage qualification, owner Twilio A2P and US carrier registration, SMS transport and provider qualification remain unproved. No live provider or account claim.
10. NOT APPLICABLE: no new policy default adopted.
11. PENDING guarded landing: no main push, main equality, publication scan or candidate Run site claim is made. The Mac lander owns the complete full-history scan, exact-SHA Verify and landing.

Proof sensitivity map (inspection, no mutations executed):
- Safe durable provider code: replacing its stored value breaks the independent providerCode assertions at lines 128–134.
- Authenticated campaign projection: omitting pause detail breaks readPaused at lines 136–139.
- Visible provider error: omitting rendered detail breaks the page assertion at line 155, independently repeated after reopen at line 159.
- Read invariance: recipient replacement, attempted handoff or changed pause state breaks lines 140–142 after each read and reopen.
These are distinct assertion expectations; this report does not claim executed mutation evidence or DONE.

Pre-ready self-check: all newly added behavior is reached by the focused native journey; no existing assertion was removed, narrowed, skipped or width-gated. The existing queued-state assertion was strengthened with identity, destination and handoff-fence checks. No new authority, erasure or capture replay door exists; the prior late dispatch replay, no-send deadline and uncertain-notice controls remain. The product UI was not edited. Captures show readable pause detail at 1440 and 390 and no newly introduced icon-only control. No new email-shaped fixture or source string was added. Source lock and generator checks pass. Exact-SHA Verify state and publication scan are reported honestly rather than inferred from another SHA.

Remaining obligations and boundaries: SEND-009 acceptance 1's continuous-five-minute transient-failure trigger and acceptance 3's audience recheck after recovery remain native proof work. SMS outage qualification, owner Twilio A2P and US carrier registration, SMS transport and qualification remain external. Provider, device, account and cross-seed Base prerequisites, rer 0.2.95 adoption and account acceptance prerequisites remain binding. CONT-013's SPLIT and NEW-1 disposition and original fix-1 hold remain unchanged. No scope ruling was needed. These remainders prevent a DONE claim; they do not block this passing proof slice. There is no real blocker on its product handoff; the only CI red is the expressly permitted generated-view freshness check.

Publication custody: product push succeeded on the first guarded attempt. Only cloud/sd-mango-c-f54 was pushed. Complete non-secret report, plan, command receipts and selected screenshots are prepared for evidence/sd-mango-c-f54. The first transfer was rejected with exit 1; after refresh, the second was rejected with fatal error in commit_refs_rules and no HTTP status supplied by Git. Bounded recovery continues through the same entrypoint and credential bundle. The final response records the actual transfer outcome; product custody remains unchanged. Credentials, runtime state, session material and setup logs are excluded. A cloud-side publication scan is not required; the lander must still report COMPLETE with zero findings before landing.
