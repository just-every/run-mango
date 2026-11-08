# sd-mango-c-f86-fix1: migration-prefix collision repair

Repository: just-every/run-mango
Product branch: cloud/sd-mango-c-f86-fix1
Product head: bb36ce7f27837f0c7aab61541c97d02918e67ab0
Published candidate parent: e5ddac0129a005f30daa5749ab5f5308196ee7f8
Merged fresh main: ad1a605639c006c0e002a53f8cebed6a104aeceb
PR: none; this assignment returns a product branch to the fleet lander.
Landing: not performed. No default branch was written.

## Outcome

The f86 candidate's unapplied native audience authority migration is now migrations/core/0105_native_audience_authority.sql. Main's highest prefix was 0104, occupied by 0104_sending_event_silence.sql; 0105 was free. The renamed SQL is byte-identical to the original candidate migration. All 104 main migration files retain their original names and bytes.

RELEASE.json retains main's DELIV-009 entry and migration, adds the candidate's CAMP-004 entry and renamed migration, and preserves both sets of update instructions. The deployment specification was regenerated from the build using node scripts/sync-integration.mjs --write; its migration inventory contains both core-0104_sending_event_silence.sql and core-0105_native_audience_authority.sql with matching SHA-256 digests and SQL bytes. No tracked reference to the old audience migration filename remains.

Main's newer tests, fixtures, clause judgments and ID map are retained. The verification plan retains main's owner-control, step-deadline and embed-origin coverage and registers the candidate missing-sender proof. The shared proposal fixture retains both main's owner/agent controls and the candidate's sender-edge/public-unsubscribe controls. The candidate's missing-sender test and sender verification helper are byte-identical to f86. No test was deleted, skipped or weakened.

## Plan and implementation

The full executed plan is in PLAN.md. A fresh git clone --filter=blob:none without a depth restriction acquired full history. The requested f86 ref was fetched and required to equal e5ddac0129a005f30daa5749ab5f5308196ee7f8; git rev-parse HEAD printed that full SHA after checkout. The repair branch was created from that published candidate and fresh main was merged without rebasing or force-pushing.

CONTRACT.md merged cleanly. Its only difference from main is the retained f86 CAMP-004 evidence description, with the new migration path added to the Evidence cell. Line-based assertions prove that every status row and every non-CAMP-004 row equals main. The remaining conflicts were resolved by merging structured release entries, preserving main's complete test inventory, combining independent fixture controls, and regenerating integration and lock files.

Contract documents were generated and checked successfully, then ACCEPTANCE.md and docs/CLAIMS.md were restored whole from origin/main as instructed. Neither has a candidate diff from main. The source lock was regenerated last with node scripts/edition-authoring/cli.mjs lock and its check passed before commit. A subsequent check also passed.

## Mechanical results

MECHANICAL ledger=python3 ../packet/migration-ledger.py exit=0; lock=node scripts/edition-authoring/cli.mjs check exit=0; views=node src/base/contract-docs.mjs check exit=0

The views result above is measured with generated views present. After their required restoration to main, the same check exits 1 and names stale ACCEPTANCE.md. The lander must write generated views from merged CONTRACT.md. This is the authorized generated-view exception, not permission to commit those view changes.

The ledger proof verifies applied-main byte preservation, the new prefix above main, exact SQL preservation, generated inventory identity and both migration paths. Main has 104 migration files and the candidate has 105. Historical duplicate prefixes 0058 and 0059 are retained unchanged; this repair introduces no prefix collision.

- Empty SQLite database: all 105 migrations apply; all 18 newly introduced audience triggers exist; contact insert, update and delete each advance generation once.
- Main-state SQLite database: all 104 main files apply, a synthetic contact is inserted, then only 0105 applies; all contact fields remain equal and all 18 new triggers exist.
- Native Miniflare D1 database with the production platformLedger reader: the 104-file main ledger refuses with migration_ledger:unapplied:0105_native_audience_authority.sql before the pending migration. Applying the new migration through its deployment-spec statements and recording its SHA-256 makes platformLedger return true. The retained contact is unchanged; a native contact update advances generation once.

migration-ledger.json, native-migration-probe.json and their actual executable probes record these observations.

## Touched verification

The provided cloud_run subreaper executed bounded setup, build, test and typecheck commands directly in this dedicated VM, replacing the Mac heavy-slot wrapper.

- cloud_run timeout 600 npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive: exit 0.
- cloud_run timeout 600 npx -y @runeditrun/rer build: exit 0.
- Integration generation and check: both exit 0.
- MANGO_NO_FIXTURE_SERVER=1 MANGO_CHROMIUM_EXECUTABLE=/usr/bin/chromium cloud_run timeout 600 pnpm exec playwright test tests/proposals-decision/ --workers=1 --reporter=list: exit 0, six tests passed in 2.5 minutes.
- cloud_run timeout 300 pnpm run typecheck: exit 0.
- Contract status/row preservation, old-reference removal, byte-identical candidate-test preservation and git diff --check: passed.

The local shell used Node v24.19.0 and pnpm 10.12.4 under the supplied toolchain setup; pnpm reported the package's exact Node 22.20.0 engine pin as a warning. Setup and build succeeded; CI owns its pinned Node verification. No product UI changed, so no changed-screen browser screenshots were required.

PROBE audience authority: native POST /api/campaigns/<id>/approve with a public unsubscribe forced during approval -> atomic HTTP 409, unchanged draft and no approval receipt, recipient, dispatch or marketing handoff; replay retains the opt-out, fresh review has one eligible control, and corrected approval creates one immutable receipt and dispatch with an exact content digest. A second approval replay creates no extra authority and the opted-out contact remains excluded.

The proof also exercises each missing sender identity field, compliance, links, personalization, missing schedule, provider guarantees, SPF/DKIM/DMARC failures and withdrawal after valid sender inspection. The complete actual output is in probe-tests.txt.

During local preparation, Playwright rejected an incomplete merged fixture closure before running tests. That merge typo was corrected without changing assertions; probe-tests-attempt1.txt retains the diagnostic. The evidence-only SQLite probe was corrected to supply the schema's mandatory synthetic status fields and to count the exact introduced triggers instead of legacy audience triggers. The final probes all pass.

## Clause counts and judgments

Counts are done / partial / missing, total 316:

- Original f86: 20 / 198 / 98.
- Fresh main before this repair: 21 / 197 / 98.
- Final candidate: 21 / 197 / 98.

The difference from f86 is main's already-published PROP-005 judgment. This repair makes zero new clause judgment changes. CAMP-004 stays partial -> partial; only its evidence reference changes. The production and provider gaps retained by f86 remain open.

## Product publication and custody

One new merge commit was created with author and committer Run Edit Run fleet <fleet@runeditrun.com>. All five commits in origin/main..HEAD, including side parents, were inspected for identities, complete messages and trailers; all are fleet-authored and fleet-committed and have no trailers. The fleet commit hook remained active and preserved repository hooks.

The product branch was pushed once, without [skip ci], through the required cloud-push.py guard. It succeeded on attempt 1. Product provenance, commit audit and actual push output are separate packet files. No main/default branch push, force push, rebase, status promotion, private gate or landing occurred.

## Exact-SHA Verify

Run: 42491595519
URL: https://github.com/just-every/run-mango/actions/runs/42491595519
SHA: bb36ce7f27837f0c7aab61541c97d02918e67ab0

Initial discovery: in_progress; the single run poll after 300 seconds observed completed/failure on the exact product SHA. GitHub REST usage is bounded to ten calls with at least 300 seconds between discovery and run polling. Failed-job archives, if needed, are read once per job with gh run view --log-failed.

The known main-wide presend-checks.journeys.ts “Saved …” defect is outside this repair. It will be named if encountered; its test is retained unchanged from main.

## Evidence return and cleanup

Reports and receipts are selected explicitly from this packet, scanned for injected secret values and published solely to refs/heads/evidence/sd-mango-c-f86-fix1. Evidence publication does not signal product acceptance or landing. The terminal message will name the exact evidence ref/head. After successful product and evidence transport, the disposable clone and its node_modules will be deleted as required; actual packet files remain outside the clone.


### Terminal CI finding

The completed exact-SHA run fails only its generated-view check: ACCEPTANCE.md differs from CONTRACT.md. Build job 128765005254 names that one failed step; later build steps and all shards are skipped. The downstream verify job 128765054085 fails because BUILD=failure. Both failed-job archives were read successfully exactly once using the mandated gh run view --job ... --log-failed commands. Their published actual output omits environment blocks, keeping commands and assertion diagnostics.

This is the prompt's explicit generated-view-only READY exemption. Local contract generation and checking passed before the views were restored, and source-lock checking passed on the restored tree. The lander must generate the views and rerun Verify before landing. No raw green CI conclusion is claimed. The known main-wide presend-checks.journeys.ts “Saved …” defect was not reached because shards were skipped; its main test bytes are retained.

Five GitHub commands were used in total: discovery, one run poll at least 300 seconds later, completed-run job diagnostics, and one failed-log read for each of the two failed jobs. No retry or rerun occurred. No task blocker remains.

Product custody: READY branch=cloud/sd-mango-c-f86-fix1 head=bb36ce7f27837f0c7aab61541c97d02918e67ab0 (generated-view-only exemption).
