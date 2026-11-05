# DESIGN-003 R1 · sd-mango-c-f42-fix-1

Repository: `just-every/run-mango`. Branch: `cloud/sd-mango-c-f42-fix-1`.
Product head: `b2c7ffad18b02d90d15d293e023e607171bf3e9d`.
Original source / before head: `9b9f3867af955c390b39b740b89f96b4ef929ed1` on `cloud/sd-mango-c-f42`.
Merged main: `955785c08ed00910bc83e3aa3bbb0a54703f6f71`.
PR: none; guarded integration belongs to the fleet lane.
Original family: sd-mango-c-f42, lifetime **FIX1 of 2**, one writer, R1 only.
Requested Sol/xhigh is backend-unverified; no accepted-model inference is made.

## Result and custody

The quoted-fallback brace leak is corrected with the message renderer's existing token delimiter grammar, before the existing stray-brace cleanup. The original source remains an exact parent of the final merge commit. Main's newer forecast-provenance test, registration and Status judgment are retained. Because the original-family saves were already published, main was merged without rewriting published history. No main/default branch, tag, release, workflow, source pin, hold record, unrelated clause or PR was written.

The complete existing registered native design-generation journey failed once as expected against unchanged original product code, then passed once after the sanitizer change. Typecheck and declared source/contract mechanical checks passed. The candidate was committed with active fleet hooks and explicit fleet author/committer environment, all four candidate commits including side history passed identity/trailer inspection, and the first push succeeded. The remote advertised exactly the full product SHA above; the checkout was clean. See `product-custody.json`, `identity-receipt.json` and `product-push.log`.

Product custody and report publication are separate. This packet is for `refs/heads/evidence/sd-mango-c-f42-fix-1`; it grants no acceptance, landing, source award or hold release. The terminal message carries the actual evidence head. The clone and node_modules are removed only after durable product custody and verified evidence return.

## Full plan and implementation

The complete initial plan is in `PLAN.md`. It was carried out as follows:

1. Refreshed the fleet launcher; installed the decrypted-bundle Git helper, push guard and commit hook; shallow-cloned the named original source with `--depth 1 --filter=blob:none`; verified its exact SHA and created only the named product branch. Read AGENTS, BASELINE, HANDOVER, seed configuration, the actual clause and Status row, renderer grammar, and the existing native route/journey. History was deepened only to reconcile original source with main.
2. Extended the existing `tests/campaign-authoring/design-generation.flow.ts` brief with the quoted-brace token. The journey captures the real generation dialog's submitted brief, returned retained brief and actual `/api/v1/create` request received at the existing fake paid-provider network edge before the retained-brief assertion. The complete walk2 provider transcript is retained even on failure. No application mock or production substitute was added.
3. Reproduced the failure through the native browser/Worker/D1/R2 door against unchanged original product code. Replaced only the sanitizer's brace-free interior match with the renderer's `{{([\s\S]*?)}}` delimiter scan. Ran the identical case, with the identical journey file hash, through that door again. Existing assertions are intact; the outbound absence assertion additionally excludes the leaked fallback value.
4. Merged main, kept all 316 parent Status rows except the authorized DESIGN-003 correction, retained the full clause and original R2–R5 evidence, and left DESIGN-003 PARTIAL with R1 pending independent new-SHA acceptance. Main's newer PROP-008 row is byte-identical. The `review-receipt.json` records these comparisons.
5. Ran generator write/check, restored both view files whole from main, refreshed the source lock last and passed source integrity checks. Committed the final candidate, inspected all candidate identities/messages and pushed it with the fleet guard. Inspected the completed exact-SHA Verify and both failed-job log archives once, without a re-dispatch or attempts to repair the intentionally stale view.
6. Saved actual non-secret reports, receipts, logs, request captures, screenshots and source/test provenance in this packet for explicit report-only publication. `REGRESSION.md` records the bounded regression review; no extra observations or follow-up work were added.

## PROBE DESIGN-003 R1

Exact operator brief submitted through the native generation dialog:

```text
Good Things Are Ripening
Hello {{first_name | fallback: "{friend}"}} and {{unsubscribe_url}}
```

Before, both the retained brief and the actual outbound concept's operator-brief suffix were:

```text
Good Things Are Ripening
Hello first_name | fallback: "friend" and
```

After, both are exactly:

```text
Good Things Are Ripening
Hello and
```

The actual complete concept retains Mango's fixed marketing-email layout description before that suffix. The passing native assertions exclude braces, `first_name`, `fallback`, `friend`, `unsubscribe_url`, the audience predicate value `@example.test`, and unrelated stored draft/preheader content from the create payload. The existing chosen-candidate-only file hash, idempotency, retained rows and bytes, authenticated export/restore, no-repurchase and per-paid-request cost assertions all completed in the same passing journey. The paid 12ui network edge alone was replaced; no live-provider request or paid API/credit spend occurred.

Actual native request captures:

- `before-native/campaign-authoring-design--bfe9c-and-expose-provider-refusal/design-generation-r1-probe.json`
- `before-native/campaign-authoring-design--bfe9c-and-expose-provider-refusal/design-generation-provider-requests.json`
- `after-native/campaign-authoring-design--bfe9c-and-expose-provider-refusal/design-generation-r1-probe.json`
- `after-native/campaign-authoring-design--bfe9c-and-expose-provider-refusal/design-generation-provider-requests.json`

`native-probe-summary.json` ties the same submitted brief and journey hash to both actual captures. `before-test-extension.patch` preserves the exact failing-before test change; `model-original.ts` preserves the unchanged original sanitizer. The original failing attempt is retained in full, rather than replaced by a function probe or the later pass.

## Commands and actual exits

All native/browser work used `cloud_run`, real HOME, pinned Node 22.20.0, pnpm 10.12.4, the checkout's installed/pinned rer 0.2.85, and `/usr/bin/chromium` with `--no-sandbox`, `--use-mock-keychain`, `--password-store=basic`. The initial required `npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive` exited 0 and installed the checkout pin; no pin was changed. `toolchain.json` records the actual versions. Setup's own native build ran; no extra baseline or full local suite was run.

The native command in each receipt is:

```sh
cloud_run env MANGO_NO_FIXTURE_SERVER=1 MANGO_CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  MANGO_TEST_WORK_DIR=/home/agent/rer-consolidation/work/sd-mango-c-f42-fix-1 \
  WRANGLER_SEND_METRICS=false pnpm exec playwright test \
  tests/campaign-authoring/design-generation.spec.ts --workers=1 \
  --output=../packet/<before-or-after>-native --reporter=list
```

It was recorded by `cloud_run python3 /tmp/run-check.py <receipt> <log> -- <command>` so the actual exit, time, logs and source hashes are preserved.

| Check | Actual result | Receipt / log |
| --- | --- | --- |
| Native failing-before | exit 1; 1 failed; 134.328 seconds; expected retained-brief assertion at flow.ts:250 after actual outbound capture | `before-receipt.json`, `before.log` |
| Native passing-after | exit 0; 1 passed; 223.620 seconds; complete registered walk0/walk1/walk2 | `after-receipt.json`, `after.log` |
| `pnpm run typecheck` | exit 0; 22.451 seconds | `typecheck-receipt.json`, `typecheck.log` |
| `node src/base/contract-docs.mjs write` | exit 0; generated two documents and summary counts | `views-write-receipt.json`, `views-write.log` |
| `node src/base/contract-docs.mjs check` immediately after write | exit 0 | `views-check-receipt.json`, `views-check.log` |
| Same generator check after restoring views whole from main | exit 1, only `ACCEPTANCE.md: generated content differs` | `views-restored-check-receipt.json`, `views-restored-check.log` |
| `node scripts/edition-authoring/cli.mjs lock`, last source regeneration | exit 0 | `lock-receipt.json`, `lock.log` |
| `pnpm run source:check` (`cli.mjs check` and `verify-base --offline`) | exit 0; lock current, no Base drift/unrecorded copies | `source-check-receipt.json`, `source-check.log` |
| Read-only parent Status/clause/registration review | exit 0 | `review-receipt.json`, `review-candidate.py` |
| Product push guard | exit 0 on attempt 1 | `product-push.log`, `product-custody.json` |

The local after and typecheck checks ran in the final merged working tree before committing. Their receipts therefore record the original HEAD plus working-tree hashes, rather than pretending the commit already existed. Final committed runtime and journey hashes equal those passing receipts exactly; subsequent source-only changes were the generator's summary and the mechanically regenerated source lock. `product-custody.json` and `review-receipt.json` bind those hashes to the final candidate. The journey hash is unchanged between the expected failure and the pass. No registration, timeout, assertion weakening, retry-to-green or increased deadline was used.

MECHANICAL lock=`node scripts/edition-authoring/cli.mjs lock` exit=0; lock check=`pnpm run source:check` exit=0; views=`node src/base/contract-docs.mjs write` exit=0 then `node src/base/contract-docs.mjs check` exit=0; after whole-file main restore, view check exit=1 as required; ledger=none, exit=not-applicable (no separate ledger command declared). The read-only Status preservation audit exited 0.

## Exact-SHA Verify

Run: **42117902278**, https://github.com/just-every/run-mango/actions/runs/42117902278

Head: `b2c7ffad18b02d90d15d293e023e607171bf3e9d`. Status: completed. Actual conclusion: **failure**.

- Build job **127562373516** failed solely at `Check generated contract documents`: `ACCEPTANCE.md: generated content differs; run contract-docs write.`
- Downstream verify job **127562479234** failed its coverage gate because BUILD=failure and SHARDS=skipped.
- Plan succeeded. Runtime shards, full-push-proof and nightly-proof were skipped. This is **not executed-green runtime Verify**.

This is precisely the brief's generated-view-only exception for READY. The two view files remain byte-identical to main; no generated view was authored to turn CI green, and no second Verify was dispatched. The Mac lander must generate views from merged CONTRACT and run its exact-SHA/full runtime gates before landing.

`ci-receipt.json`, `ci-jobs.json`, `ci-build-failed.log`, `ci-verify-failed.log` and `github-calls.json` preserve the actual classification. Four GitHub invocations were used: one exact-SHA discovery (already completed, so no status polling), one failed-job metadata request, and the required archive read once per failed job. Both archive commands succeeded. The initial discovery output scrubber damaged later JSON while removing URL queries; the run identity/status fields before that damage were retained, the original sanitized output is preserved separately, and the scrubber was corrected without repeating discovery. The full jobs response independently verifies every job's exact candidate SHA.

## Counts, judgment and remaining duties

| Scope | Original source | Candidate / merged main |
| --- | --- | --- |
| Published clauses | 14 done / 96 partial / 0 missing / 110 total | 13 done / 97 partial / 0 missing / 110 total |
| All clauses | 19 done / 199 partial / 98 missing / 316 total | 18 done / 200 partial / 98 missing / 316 total |
| Target and push further | 5 done / 103 partial / 98 missing / 206 total | unchanged |

The original source's whole-clause DONE proposal was unawarded. This candidate restores DESIGN-003 to **PARTIAL**, matching the original independent Opus5.5 judgment that ended **2026-11-05T21:21:17Z, STAYS PARTIAL**. Only the narrow R1 product correction is proposed. R2–R5 remain **MET** by the original exact-source registered journey, frozen and unchanged; the full clause/riders and original retained-evidence implementation remain intact. Live-provider qualification remains external and unclaimed.

There is no unresolved builder blocker. Original-family affected gate and independent Opus new-SHA R1 re-gate with the original report are owed. Final runtime Verify, COMPLETE full-history NEW0, publication scan, guarded main integration and exact-main Run site duties remain with fleet. This builder does not submit itself, award source acceptance, release a hold, land or deploy.
