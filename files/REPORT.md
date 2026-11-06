# Mango original PNG erasure correction

Repository: just-every/run-mango
Branch: cloud/sd-mango-c-f56-erasure-repair-1
Product head: c147c33081802768de02f968d6b76471906e3c09
Fresh-main base: cc6321c2372d631d9607df9af8ad1dd9f7878e84
Product push: succeeded on attempt 1, ordinary named-branch push; no main push, force push, PR or workflow dispatch.
Exact-SHA Verify: run 42139401035 completed FAILURE on c147c33081802768de02f968d6b76471906e3c09. The delivery shard failed to start a separate native pause/resume fixture. This is a blocking red check; no READY is claimed.

## Outcome and cause

The stored-object inventory decoded binary PNG bytes as a single text string. The retained exact fixture's tEXt value ends with synthetic-mango-156-person-6, but its following CRC starts with ASCII z. Identity-boundary matching consequently saw a longer token and retained the original image even after the native erasure receipt was complete.

The correction in src/core/features/audience/erasure/objects.ts recognizes PNG bytes, follows declared chunk lengths and inspects tEXt payloads separately from the CRC. It persists chunk and pending payload boundaries in the existing object scan cursor, uses the existing bounded 256 KiB reads and 64 KiB overlap, and preserves raw-text, JSON/Base64, key and metadata ownership checks. It neither relaxes identifier boundaries globally nor selects by a supplied MIME type. Invalid chunk/header/end framing raises an inventory error rather than being classified safe. The existing service still inventories, deletes and verifies each selected R2 object before completing, and the unchanged media route supplies 410 for the missing original.

## Retained before and changed evidence

BEFORE.md records the supplied native failure on unchanged main 955785c08ed00910bc83e3aa3bbb0a54703f6f71. It was not rerun. Original f56 9f5128e6da762065dbf8b79ddbe3f37a0e95efef and terminal f61 READY929a790d retain their immutable results; no successful JPEG/GIF/WebP format proof was repeated or attributed to this changed source.

The changed fixture uses the existing complete png(8,6,156), a valid Description NUL identifier tEXt chunk inserted after byte 33 and CRC32 over type plus text. A native D1 contact has the exact identifier, synthetic-mango-156@example.test and never-subscribed email/SMS states. It uploads via authenticated native multipart POST /api/campaign-assets, returning 201 and original public bytes. Native DELETE and maintained eraseHttp continuations return complete. Actual receipt reference: d98bc7dc-9041-4657-8227-bd354b87e929; removed.stored_objects=1, removed.contacts=1, retainedChannels=[].

The object is absent from R2; unauthenticated GET and HEAD both return 410. Pending erasure GET/HEAD return 503. The ordinary original image and an image holding the other contact's longer identifier remain byte-identical with GET/HEAD 200, and that contact's row and every campaign-asset metadata row remain unchanged. The existing approval check rejects the actual erased hash without inspecting this deployment over the network. The native receipt is native-png-erasure-receipt.json; campaign-assets-results.json and campaign-assets.log hold actual results. Native runtime uses the maintained local Worker entrypoint with real Miniflare D1 and R2, not a fake erasure implementation.

## Commands and validation

All fresh checkout commands source /tmp/rer-cloud-toolchain.sh; long commands use cloud_run. Setup completed with npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive. Runtime diagnostics containing possible local entry details were kept out of the public packet selection.

- MANGO_NO_FIXTURE_SERVER=1 pnpm exec playwright test --config playwright.config.js '(campaign-assets\.spec\.ts|contract\.js)' --workers=1 --reporter=list,json: 4 passed, 0 skipped, 0 failed, 17.9 seconds.
- Native erasure.spec.ts: 3 passed, 0 skipped, 0 failed, 35.2 seconds. It retains authorization/origin refusals, durable continuation, restriction and suppression/hash custody, source erasure, shared text/IP isolation, encoded payload erasure and reimport-unsendable assertions. Those tests were inspected before execution.
- pnpm run typecheck: exit 0.
- npx -y @runeditrun/rer check --profile first-party: exit 0, silent success.
- node src/base/contract-docs.mjs write then check: exit 0, wrote 0 documents. ACCEPTANCE.md and docs/CLAIMS.md restored whole from origin/main.
- node scripts/edition-authoring/cli.mjs lock, then check: exit 0. Lock was the last source generation, changing only the scanner and campaign-test hashes. pnpm run source:check also passed, including offline Base-copy verification.
- git diff --check: exit 0. Fresh-main fetch and rebase found the branch current. Identity/trailer inspection covered every origin/main..HEAD candidate commit; author and committer are Run Edit Run fleet <fleet@runeditrun.com>, with no trailers.

The provided toolchain selected Node v24.19.0, which satisfies AGENTS.md's Node 22-or-later requirement, and pnpm 10.12.4. pnpm printed its engine warning for package.json's exact Node 22.20.0 pin; exact-SHA CI uses that pinned Node. No full local suite or provider/phone/browser qualification was run.

The initial combined file selector ran only the 3 plain erasure registrations: Playwright attributes contract() registrations to tests/contract.js. The corrected selector explicitly includes the existing wrapper location, executing the four campaign tests without modifying the wrapper. Two new fixture assertions initially failed (missing required display_name, and comparing D1 query statistics instead of metadata rows); both were corrected. Their actual failure logs are retained. Every original assertion remains; no registration was added, deleted or skipped. Local proof ran before commit; recorded scanner/test hashes equal the committed candidate bytes.

## Counts, scope and held remainder

CAMP-012 remains PARTIAL, with all 8 acceptance points and every existing Gap/Evidence/provenance byte unchanged. CONT-013 remains PARTIAL. No clause status change or source acceptance is claimed. Fresh-main totals remain 20 DONE / 198 PARTIAL / 98 MISSING, total 316 (published 13/97/0; target 7/101/98). Historical 18/200/98 was not restored. Affected registrations remain campaign-assets 4→4 and erasure 3→3, net 0.

Only objects.ts, existing campaign-assets.spec.ts and sources.lock.json changed. CONTRACT.md, both generated views, the approved homepage, all existing newer main source/assertions, migrations, providers, UI and sending remain unchanged. No migration ledger update applies.

The closed CONT-013 two-FIX/SPLIT+NEW1 lifetime remains closed. Superseded cd87786f remains held and MUST NEVER LAND; landed fix2 041c8774 is not replaced. The distinct restored-other-installation opt-out NEW1 is neither solved nor reopened. No resubscribe/restriction semantics, lifetime/provider/release obligations, holds or source acceptance pins were changed. The brief's supplied terminal f61 status was used to establish that this correction is not a duplicate active writer; prohibited fleet INBOX/STATE files were not read.

Independent affected-source qualification, merged generation/current counts/provenance, lock-last, actually executed full exact-final runtime Verify, COMPLETE full-history publication scan, guarded main landing and exact-site checks remain fleet landing duties. The cloud cannot run the fleet publication scan and makes no COMPLETE publication or production cutover claim. Product push custody and report-only evidence publication are separate. No builder-side gate/judge, submission/readmission/adoption or hold release occurred.

PLAN.md contains the full executed plan. checks.json and product-provenance.txt bind validation and identities to the candidate. The explicit evidence file manifest is generated by cloud_evidence.py in the report-only evidence ref, never the product branch. Local PNG qualification passed. The exact-SHA CI failure below prevents READY and is the terminal blocker.

## Final exact-SHA CI and dependency

Run: https://github.com/just-every/run-mango/actions/runs/42139401035
Exact head: c147c33081802768de02f968d6b76471906e3c09
Conclusion: completed/failure. This is not the generated-contract-view exception: that check passed.

Build and public command checks, contract documents, source-lock freshness, retained-authoring, retained-data and every shard except delivery passed. Delivery job 127636292887 failed Run this shard; its four other registrations passed. The failing registration was tests/go-live/multistep.journeys.ts:5, [AUD-006][CAMP-014] an approved multistep campaign can pause, recheck current inclusion and consent, and resume. The second section called tests/go-live/pause.flow.ts:12 -> installation -> tests/campaign-authoring/browser-runtime.mjs:131; commands.waitForReady failed before the pause/resume scenario acquired its installation:

“Starting authoring fixture: readiness deadline exceeded (exit none, signal none). Last health: Health probe failed.”

The final log output showed the Vite SSR optimizer scanning dependencies. No deeper cause is established by this log. The PNG inventory is not invoked by that fixture-startup/health path. The startup harness and delivery journey are outside this brief's lease; changing them or increasing their timeout is not an authorized PNG correction. No assertion was relaxed, no unrelated source was changed, and no empty commit, workflow dispatch or rerun was used to seek green. The aggregate verify job 127639734872 consequently failed its selected-coverage requirement, and full-push-proof was skipped. Independent exact-final green Verify remains required before landing.

The prescribed failed-log archive command was executed exactly once for the relevant failed shard and succeeded:

gh run view 42139401035 --repo just-every/run-mango --job 127636292887 --log-failed

ci-jobs.json, ci-auth-recovery-2.json and ci-delivery-failed.log contain the actual CI records. Seven direct budgeted gh read invocations were used, including transient recovery. The second CI poll returned HTTP 401; after launcher refresh and full Git helper reinstallation, the recovery probe returned a sanitized Bad Gateway transport error. A later refreshed exact-SHA read succeeded. No alternate credential or raw job-log redirect was used. The original product push was successful on attempt 1; these later API errors were not product push rejections.

Terminal product custody: PUSHED, branch cloud/sd-mango-c-f56-erasure-repair-1, head c147c33081802768de02f968d6b76471906e3c09. Terminal landing readiness: BLOCKED by the red delivery startup check. No PR was required or created.

A Git bundle was additionally saved and git bundle verify succeeded outside the product clone. It is recovery data, not READY or proof of acceptance: product-c147c33081802768de02f968d6b76471906e3c09.bundle, SHA-256 473540ffe9e45a146c2d43c61964ee1358ae2d34bf29c4cb8dc1b0fb124b473c. rescue-bundle.json records its absolute path and verification output. The actual correction and report packet remain preserved; cleanup of the disposable checkout follows successful evidence publication.
