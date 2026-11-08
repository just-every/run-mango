# sd-mango-hydration-date-4

Product: just-every/run-mango, branch cloud/sd-mango-hydration-date-4, head f2bd3456f173b70d9bd67394b687caf7b1ba4bcf. READY: product pushed, all required local checks pass, and exact-head push Verify 42499646308 completed/success. No landing, deployment or publication-scan claim.

## Plan and execution

PLAN.md retains the full plan: configure fleet identity/auth/hooks; full-history filtered clone; begin at the exact date-3 head; reproduce before editing; fix within the lease without undoing automatic dates; save early; merge current main without rewriting published history; run focused and broader journeys; perform mechanical generation and lock checks; require exact-head CI; publish explicitly selected non-secret reports on the separate evidence ref; remove the clone after transfer.

The fresh `git clone --filter=blob:none` had full history and initially checked out origin/main. The named branch began at the requested 0e8e3f6c911cea8ec4dc35be223455dedfe8f7c2. The explicit-boundary fix was saved and pushed early as 207aa26 with [skip ci]. Main 7b95de6 was merged into the initial candidate 7dc67ff. That candidate passed local checks but was rejected by its actual exact-head Verify 42496937599. The external-store correction was then committed/pushed as a1786dde741b6ac0ab6792bef690236170962a58. Newly advanced main f936cb5351ca3432e53e7ed5592f2aa720f3eab2 was merged into final f2bd3456f173b70d9bd67394b687caf7b1ba4bcf. All published history was preserved.

## Reproduction and root cause

The unchanged mailbox-provider journey initially passed alone on the exact date-3 head in this VM (1/1, 2.7 minutes, initial Node 24.19.0). The report retains that result rather than pretending it reproduced the supplied historical CI failure. A focused Insights-only diagnostic then reproduced duplicate DOM before any product edit. On pinned Node 22.20.0, navigation 5 recorded two .insights-page subtrees and two matching complaints rows, one hidden and one visible, both parented by MAIN elements. The overlap appeared at 385.8 ms and retired at 442.2 ms on that run; the diagnostic failed. Node 24 independently observed the same overlap. Actual failed output/observations are in repro-insights-node22.log/json. Hidden copies still match strict DOM locators.

The original saved-date defect had no document-level producer to notify readiness/zone consumers above streamed app content; effects/snapshot checks inside that subtree could remain uncommitted until interaction. Date-3 moved publication above the route and fixed the date, but its ancestor React context update also invalidated date consumers in still-hydrating routes. React could retain the hidden subtree while rendering an updated copy.

There was an additional boundary problem: in pinned TanStack Router 1.170.41, Await wraps children in Suspense only for a truthy fallback. `fallback={null}` therefore supplied no boundary and let resources suspend the entire app shell into the root Outlet boundary. An explicit main-content Suspense boundary helped, but did not fully remove the context-triggered duplicate. Initial 7dc67ff passed its 30-load probe, both journeys alone, the native go-live member and all 23 local go-live journeys. Its exact-head CI still failed with two SPF rows at compliance-journey.ts:78 and two Stripe sections at stripe-journey.ts:78. Each failed job's archive was read once using the prescribed gh run view --log-failed; those actual logs and the failed-job metadata are retained. This was a real failure, not the generated-view exception.

## Final correction

A document-mounted producer now publishes hydration and the chosen browser zone to a cached external store. useSyncExternalStore supplies a stable server/first-hydration snapshot (`hydrated:false`, UTC), then observes the current client snapshot after commit. Only committed subscribers are notified. The producer has no React state or ancestor context update, returns its children unchanged, and publishes the same zone idempotently during Strict Mode replay. Same-tab choices publish directly; the document owns the cross-tab storage listener.

Publication stays above streamed /app content, preserving the no-interaction date fix. The explicit resource Suspense boundary remains so the shell can commit independently. The formatter and all existing journey assertions are unchanged. No timer, polling, duplicate-removal code, visible-only locator, assertion weakening, test deletion or skip was introduced. Changes stay in the authorized client/root lease; product diff against integrated main is four files (the three client/root source files and sources.lock.json). CONTRACT.md and both generated views have no diff against integrated main.

ROOT-CAUSE.md provides the detailed diagnosis. The final repeated-load diagnostic passed 50 document loads with maximum matching row count reduced from 2 to 1 and no captured console warnings/errors or pageerrors. It remains report-only proof outside product history.

## Local verification and browser proof

Substantive verification uses Node 22.20.0, pnpm 10.12.4 and headless Chromium /usr/bin/chromium with --no-sandbox. Commands run through cloud_run with hard timeouts; commands.json, RECEIPTS.json and actual terminal/timing files retain their results.

- Final pre-send journey alone: 1/1, 6.1 minutes; automatic saved-date checks before any click on the page and again after reload.
- Final mailbox-provider journey alone: 1/1, 5.6 minutes, including unchanged strict compliance-row assertions.
- Final native shard's complete go-live member: mailbox-provider and embed-origin, 2/2, 3.9 minutes. This is not a claim to have run the unrelated native local-start member locally; exact-head CI covers the full workflow.
- Final repeated Insights hydration probe: 50 loads, max row count 1, exit 0.
- Extra time-zone browser probe: same-tab changes, cross-tab storage updates and reload persistence pass, 47.1 seconds. Its preliminary test-only probe used a stale option list and timed out; the corrected probe re-reads current visible options without changing product behavior or weakening assertions. Its owned orphan Vite server was stopped by exact PID after timeout; no other server was stopped.
- Production build: exit 0. Typecheck and first-party checks after the latest main merge: exit 0. Source and integration checks: exit 0. Main's imported runtime is unchanged; its PNG helper's existing three-argument output is unchanged.
- Complete final go-live stage: 23/23 passed, 31.3 minutes, exit 0. Actual coordinator receipt: timings/go-live-final.json. The initial boundary-only candidate's earlier 23/23 is archived separately and is not substituted for this result.

BROWSER-PROOF.md and screenshots/ retain the changed screens at 1440 and 390. Updated saved audience captures were inspected directly: both read `Saved 8 Nov 2026, 4:15 pm`, without an ellipsis, and show the actual fixture counts (3 candidates, 1 excluded, 2 eligible contacts, 4 email steps). The phone layout fits and contains one snapshot. Email previews and Insights warning/failure states are also retained. This is isolated local browser/provider-edge evidence, not production provider acceptance.

## Mechanical checks and source judgments

After each integration, CONTRACT.md was resolved first by retaining main's newer source. No manual clause judgment or summary edit was made. Ran `node src/base/contract-docs.mjs write`, then `node src/base/contract-docs.mjs check` (both exit 0); restored ACCEPTANCE.md and docs/CLAIMS.md whole from origin/main; regenerated sources.lock.json last with `node scripts/edition-authoring/cli.mjs lock`, then its check (both exit 0). Actual final receipts are mechanical-merged.exit and corresponding logs.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock exit=0; views=node src/base/contract-docs.mjs check exit=0.

Before task/main integration: 21 done, 197 partial, 98 missing, 316 total. After retaining newer main: 20 done, 198 partial, 98 missing, 316 total. The sole inherited status change is PROP-005 done → partial from newer main. This task adds no judgment/status change or raise. BUILD-008 and DELIV-005 remain done; BUILD-012, RESULT-001 and REPORT-005 remain partial. clause-counts.json records before/after/main counts and attribution; touched-clauses.json retains task-clause statuses/gaps.

## Product custody, exact-head CI and evidence

All product commits use Run Edit Run fleet <fleet@runeditrun.com> for author and committer. Preserved repository hooks stayed active; Codex/OpenAI co-author lines were removed by the installed hook. Every candidate commit, including side parents, was audited before every guarded push. All pushes used cloud-push.py on the named cloud branch. No default branch push, force push, rebase of published history, PR, landing or deployment occurred.

Final exact-head push Verify 42499646308 is completed/success for f2bd3456f173b70d9bd67394b687caf7b1ba4bcf: https://github.com/just-every/run-mango/actions/runs/42499646308. No generated-view exemption is needed. Nine GitHub calls were used in total, including discovery/polls, failed-job discovery and one log archive read per failed job for the rejected candidate. ci-receipt.json holds the full ledger; ci-final.json holds final exact-head metadata. No further CI read is needed.

The non-secret packet is published separately to refs/heads/evidence/sd-mango-hydration-date-4, never to a product branch or PR. Its manifest binds the report to the terminal product branch/head and file hashes. Evidence publication is separate from product READY/PUSHED custody and from the Mac fleet's publication scan and landing gates. The clone and node_modules are removed only after successful report transfer; terminal return confirms cleanup.

Final result: all requested builder checks pass; no blockers. Product checkout/head/index are clean before evidence publication. The full 23-journey final suite completed at 16:45 UTC; no source changes followed the verified final commit.
