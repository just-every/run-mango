# sd-mango-c-f110 results

Repository: just-every/run-mango. Product branch: cloud/sd-mango-c-f110.
Exact candidate: e619395d34184b1003fdde7808bd8a9a2b61eae4.
Starting and synchronized main: 01f63103b73722c32e0c6cc13f7b9c2eacb4c59e.
First published save: 5b25c1b1e94ef89ded01a076e69561fb941c8eb8, with CI skipped.
No PR is needed: the existing Verify workflow accepts branch pushes. Main was never pushed. No published history was rewritten.

FORM-001 remains PARTIAL → PARTIAL. Acceptance 3's configured-origin exclusion proof is complete. Counts remain 20 DONE, 198 PARTIAL, 98 MISSING, 316 total. The plan row to update is FORM-001: remove the missing configured-origin proof and retain the remaining matrices and external boundaries described below. No other clause or plan row changed.

The new focused journey goes through native authenticated signup settings and the real public signup document. It uses two separate loopback embedding origins and an unlisted outer origin around the allowed intermediate frame. Neither the browser nor Mango document responses are intercepted. Production source and existing allowed-embed email proof remain unchanged.

At both 1440 and 390, the configured allowed frame accepts explicit consent with HTTP 202, creates exactly one pending contact, matching consent evidence and unused confirmation, and emits exactly one actual confirmation email carrying this installation's confirmation link. The three denial cases each navigate to the actual signup response, receive Chromium's frame-ancestor refusal, expose neither email input nor submit control, and leave contact, consent, confirmation, signup-request, provider mail, relay mail and browser signup-POST counts unchanged. Removing all allowed origins takes effect on reload of the previously functional frame. Eight screenshots and the complete browser observations are attached.

PROBE FORM-001 acceptance-3 allowed: native authenticated settings with the allowed loopback origin, then real iframe consent capture → HTTP 202, one pending contact and matching consent, confirmation and email at each width.
PROBE FORM-001 acceptance-3 unlisted: unlisted loopback embedding origin → Chromium blocked rendering; no signup controls or side effects at either width.
PROBE FORM-001 acceptance-3 ancestor: unlisted outer origin around the allowed intermediate → Chromium blocked the nested signup; no signup controls or side effects at either width.
PROBE FORM-001 acceptance-3 removal: remove the allowlist through native settings and reload the formerly working frame → Chromium blocked rendering; all tracked counts unchanged at either width.

The exact candidate journey passed: one registration, about 25 seconds, using system Chromium with sandbox disabled through the existing browser helper. See journey-receipt.json and journey.log for the actual command, exit and SHA. Typecheck passed. The first-party public-command check passed after updating the contract evidence. The unchanged production tree supports the typecheck receipt across the metadata and test-only commits. No full local verify, live provider, deployment, scale journey or unrelated suite was run.

Playwright discovery counted 89 registrations before and 90 after this round across the existing configurations, below the 200 cap. Added one public-door security journey. Removed, skipped, narrowed or width-gated existing assertions: zero. The planned desktop and phone denial matrix intentionally runs both widths within that single registration. The journey is explicitly registered in the existing native push pack in scripts/verification/plan.mjs; workflow YAML was not changed.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock followed by node scripts/edition-authoring/cli.mjs check exit=0; views=node src/base/contract-docs.mjs write followed by check exit=0; ledger=none exit=0.
After generation and a passing check, ACCEPTANCE.md and docs/CLAIMS.md were restored whole from origin/main. The restored-view check reports only stale ACCEPTANCE.md, which is expected until the lander writes it. Neither generated view was committed. All 316 parent Status rows and all 490 parent table rows survive each commit. Only FORM-001's Evidence and Gap metadata changed. No acceptance sentence or status changed, and source lock was regenerated after the final test edit.

Pre-ready review: supported and refused origin cases exercise the actual browser threat boundary; no production authority, erasure or replay path was changed. There is no new UI control or screen implementation to audit for text sizes or tooltips. Existing signup controls are labelled, have readable text and render at both recorded widths. No existing assertion was weakened. Diff whitespace and changed-text hygiene checks passed; there is no new email-shaped literal or bare repository reference in added prose. The scoped test-package import, standard MIME types and regular-expression flag are code syntax, not repository claims. All candidate authors and committers are the fleet identity and no trailers remain. The complete publication scan is NOT RUN in cloud and remains the maintained lander's gate; this report does not claim a complete scan or landing.

Remaining acceptance: 1's complete hosted and embedded explicit-consent and optional-SMS matrix; 2's full embedded pending, confirmation, replay and expiry matrix; 4's explicit absence of campaign and flow handoff authority after submission. Existing hosted, confirmation and allowed-email proof is retained and not promoted into broader claims. Twilio A2P and US carrier registration remain owner-held, with SMS transport and real-provider qualification unproved. No held keys were needed or searched. CONT-013's existing disposition and hold, all carried provider, device, account, cross-seed and Base prerequisites, rer adoption and release requirements are unchanged. There is no blocker to landing this bounded acceptance-3 proof; full FORM-001 DONE is not claimed.

DONE-RIDERS review for this partial candidate:

1. FAIL for full-clause DONE: the omitted acceptance 1, 2 and 4 matrices remain in Gap. Acceptance 3 is exercised by tests/go-live/embed-origin.journeys.ts, the configured-origins journey, lines 35–101.
2. PASS for the changed origin boundary: seeded allowed capture lines 73–92; refused direct, nested and removed-origin paths lines 50–65 and 95–101, each checking unchanged nonempty state.
3. Registered in push Verify's native pack. The final exact-SHA CI status is recorded below; the local exact-SHA journey receipt passes. No other SHA is used as candidate CI proof.
4. PASS: journey-receipt.json binds the final local run to the exact candidate, with screenshots and observations copied from that run.
5. PASS for the changed duty: FORM-001 already cites BASE-PUBLIC-002 at CONTRACT.md line 1975; its acceptance 3 names configured allowed origins.
6. PASS for honest partial Gap and generated-source validity; the lander intentionally owns committed view freshness and final judged provenance. No DONE provenance claim is added.
7. PASS: no acceptance text changed and no ct scope ruling is needed.
8. PASS for the affected public origin threat boundary using both allowed and refused real browser paths. Broader campaign and flow authority proof remains explicitly unproved.
9. PASS: no provider or legal boundary is claimed; SMS and owner registration remain held.
10. PASS: no new policy default was adopted; the existing configured-origin rule is proved.
11. PENDING maintained lander: default-branch equality, exact-SHA Verify qualification, complete publication scan and Run site remain landing custody. Starting main's Verify 42195975560 and Run site 42195975538 were successful, but they are not final-candidate evidence.

No DONE judge request is made. The full implementation and validation plan is PLAN.md. Report transport is separate from product READY and never signals acceptance or landing.

Final CI: exact-SHA push Verify 42209116526 completed with failure, solely the permitted generated-view check. Build job 127863155610 ran `node src/base/contract-docs.mjs check` and reported `ACCEPTANCE.md: generated content differs; run contract-docs write.` with exit 1. The aggregate job 127863251418 failed because build failed and shards were skipped. The plan selected full coverage. No product test assertion failed; no CI product journey ran after the early view check. No repair, rerun or dispatch was attempted. Failed-job logs were read once per failed job, successfully, using the prescribed gh archive command. Five GitHub budget calls were used overall. CI job metadata, non-secret relevant log excerpts and ci-receipt.json are included. The permitted generated-view exception allows READY for this pushed candidate; it does not establish green full-suite execution or landing.
