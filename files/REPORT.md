# sd-mango-c-f49 — CAMP-023 completed

CAMP-023 changes from PARTIAL to DONE on product branch cloud/sd-mango-c-f49 at 2beb5ed987bece4b87ec0c93048761d6a7d2e6cd. Counts change from 18 DONE, 200 PARTIAL, 98 MISSING to 19 DONE, 199 PARTIAL, 98 MISSING. Its Gap is empty. No acceptance sentence changed.

The prior round's required-description proof is retained. This continuation closes the remaining native outcomes: refusal of another HTTP origin in preview, actual own-origin HTTP-image test-send refusal, and named HTTP-image delivery refusal. It also carries public address, stored-type bytes, wrong-extension refusal, styled opt-in preview and successful HTTPS sending through the same registered journey.

A delivery defect was fixed: fresh unsafe HTTP media previously threw into a silently retried queue command, while a retained outbound request bypassed HTML validation. Both now record a permanent image-https-required failure with the existing HTTPS explanation before any provider attempt. Existing HTTPS marketing still hands off once. The change introduces no provider request, policy choice, automatic approval or new authority.

The complete execution plan is in PLAN.md. The selected lane plan row is CAMP-023 only; it is ready to record native acceptance complete and its status change. No other clause is promoted. CONT-013's SPLIT and NEW-1 disposition and original fix-1 hold, the Base and rer adoption holds, other clauses' provider and account prerequisites, the homepage and logo remain unchanged.

R-202 remains explicitly not run: hosted image serving, mailbox image-proxy qualification at the declared rate and real inbox rendering need field evidence. CONTRACT.md expressly says the Field proof register never blocks done. No real-provider or hosted qualification is claimed.

## Product custody and integration

The full-history clone started at the requested f45 base 4d13e0e38d2481f361a0279a71813fc230e0d35e. The first save, 1744617, was pushed with skip-CI custody. The completed candidate 353e7070632f096c809cca78b85d66289523df0e was merged with updated main 955785c08ed00910bc83e3aa3bbb0a54703f6f71, producing the terminal product head above. The merge retains main's foreign-store forecast proof, verification registration, complete contract rows and newer clause evidence. The CAMP-023 source, tests and runtime helpers are byte-identical across that merge.

CONTRACT.md merged without a source conflict. Both parents retain all 316 Status rows; total pipe-prefixed table rows stay 490. The source lock was the sole conflict and was regenerated with the documented command. ACCEPTANCE.md and docs/CLAIMS.md were taken whole from origin/main, and remain byte-identical to that main. No generated view from this builder is introduced relative to main.

Every candidate commit, including side parents, passed fleet author, committer and trailer inspection. No OpenAI or Codex co-author trailer remains. Product pushes used the required fleet guard and only the named cloud branch. No force push, default-branch write, deployment or PR was used. The repository's Verify workflow has an ordinary push entry point, so no PR is required.

## Registered proof and public-door probes

L denotes ./tests/campaign-authoring/local-images.spec.ts, registered test “[CAMP-023] Insert image requires a description, previews only own HTTP media and requires HTTPS for every sending door”, beginning at line 12. S denotes ./tests/campaign-authoring/image-sending-journey.ts, imageSendingJourney, invoked by L:151. These are one existing registration before and after; no permanent test was added.

| Item | Public door and independently asserted outcome | Evidence |
| --- | --- | --- |
| R1: acceptance 1 | Insert image with an 800 by 400 PNG: empty and whitespace descriptions retain linked errors, focus, selected file, dialog and unsaved editor, unchanged persisted draft and zero uploads. A valid description uploads exactly once and inserts at the chosen cursor with exact alt text and 600 by 300 dimensions. | L:26–92 |
| R2: acceptance 2 | Actual upload response gives the public media address; unauthenticated GET of its PNG extension returns the original bytes and image type; a JPG extension returns 404. | L:73–87 |
| R3: acceptance 3 | Save and opt into the own HTTP image: image loads at its source dimensions and validated text style remains. Save markup with the same media path on another HTTP origin: preview names the HTTPS fault, removes that image and makes no foreign request, while retaining the safe own image. Unsupported draft markup remains editable for correction. | L:90–126 |
| R4: acceptance 4 | Actual local approval and test-send doors return 409 with the named HTTPS requirement, retaining draft state and zero approval, recipient or dispatch authority. Native sending journey repeats refusal, then sends the HTTPS control through test send, approval and one actual mail-edge marketing handoff. Historical stored HTTP content and retained outbound HTTP content both fail at production scheduler and queue dispatch with image-https-required, zero attempts and no handoff; authenticated recipient reports expose that reason. | L:128–151; S:11–86 |
| D-1 | Only the intentionally configured native mail edge is exercised. No live commerce, SMS, AI or design qualification is inferred. Unexpected network calls remain empty. | S:9, S:86; unchanged native fixture defaults |
| D-3 | Draft editing, image upload and preview create no marketing authority. Refused approval and test send leave no authority; only explicit successful HTTPS approval freezes recipients and permits delivery. | L:133–149; S:25–39, S:49–82 |

PROBE CAMP-023 acceptance-1: Insert image, selected valid PNG, empty and whitespace descriptions -> linked required-field error, retained file and dialog, unchanged editor and persisted draft, zero upload requests; correction -> exactly one upload and correctly positioned scaled image.

PROBE CAMP-023 acceptance-2: uploaded address, public PNG and wrong JPG extension -> exact original PNG bytes and type at the stored-type extension, 404 at the wrong extension.

PROBE CAMP-023 acceptance-3: own HTTP media plus validated presentation and explicit image opt-in -> source image loads with preserved text styles; another HTTP origin -> named unsafe preview, foreign image omitted and no outbound request.

PROBE CAMP-023 acceptance-4: local HTTP image at approve and test-send -> named HTTPS refusal with unchanged authority; production cron and queue on historical and retained outbound HTTP content -> failed recipient, image-https-required, zero attempts and no handoff; HTTPS control -> successful test send, approval and one marketing handoff.

## Mutation sensitivity

No temporary mutation was executed or committed. The following distinct changes are INSPECTED sensitivity mappings, not claimed mutant runs; the native assertions themselves were executed. The current DONE rule does not require one mutation per sentence or new per-point unit tests.

| Item | One distinct change | Its own observable assertion |
| --- | --- | --- |
| R1 | Remove required validation from the description field. | L:55–69 detects a closed dialog or upload, missing linked error or changed draft. |
| R2 | Admit the wrong stored-type extension. | L:82 detects a non-404 response. |
| R3 | Admit another HTTP origin as local media. | L:116–123 detects missing refusal, a second image or a foreign request. |
| R4 | Remove the retained outbound HTTP-image guard. | S:71–78 detects a handed-off recipient instead of the named pre-attempt failure. |
| D-3 | Let a refused image approval create recipient authority. | L:146–148 and S:35–39 detect any approval, recipient or dispatch record. |

## DONE riders

| Row | Result | Exact scope and evidence |
| --- | --- | --- |
| 1 | PASS locally; exact-SHA CI recorded separately | All four native outcomes run through the one registered browser and sending journey, L:12–151 and S:8–86. |
| 2 | PASS | Seeded PNG bytes, retained nonempty draft, known subscribed contacts, actual HTTPS test and marketing handoffs; unsafe HTTP paths refuse and change no sending authority. |
| 3 | CI status in CI-STATUS.md | The existing retained-authoring Verify pack invokes L at 1440. The 390 browser proof runs the same assertions on the terminal product SHA. No new env flag hides the registered test. |
| 4 | PASS | Final local runtime receipts name the terminal full SHA. Source and test byte equality across the main merge is additionally verified. |
| 5 | PASS for applicable duties | Published CAMP-023 meta names D-1 and D-3 and its own four outcomes. The broader image lifetime and Base duties remain with CAMP-012; they are not newly claimed here. |
| 6 | PASS mechanically; generated-view landing step pending | Gap empty, complete evidence names, generated counts 19/199/98, generator write and check passed, views restored whole from main, exact-SHA receipts retained. Existing ct provenance is preserved; this is not an invented ct judgment. The lander must regenerate its own views. |
| 7 | PASS | No acceptance, rider, ID, coverage map or policy text changed. All 316 parent Status rows retained in every new commit and both merge parents. |
| 8 | PASS for applicable authority boundary | Upload and preview grant no authority; local approve and test-send refuse; only explicit HTTPS approval sends. No authorization, refund or role model is changed. |
| 9 | PASS with explicit field boundary | R-202 is still not run; no hosted, inbox, rate-at-provider or real-provider claim is made. |
| 10 | PASS | No new policy default or missing ruling. HTTPS is an existing explicit acceptance requirement. |
| 11 | PENDING guarded landing | This cloud writes no default branch. Main equality, complete publication scan and terminal Run site are owned by the maintained lander. No landed count is claimed. |

## Checks and receipts

The four retained CAMP-012 image-asset tests also passed (asset-receipt.json). The final registered local-image journey passed at 1440 and 390 on 2beb5ed987bece4b87ec0c93048761d6a7d2e6cd. The terminal typecheck and first-party command check passed. Runtime commands used Chromium at the required system path with no sandbox, bounded hard timeouts and the supplied cloud subreaper; all owned runtimes close in finally blocks.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, restored whole from origin/main; ledger=none, no migration changed, exit=0.

The generator's check passes immediately after write. The committed views intentionally remain main's views; their check can therefore be red before the lander regenerates them. This is the explicitly permitted generated-view exception, not a repair or a reason to alter those views.

There were local fixture-authoring corrections before the final successful runs: an empty audience fixture was invalid, an HTTP image on another origin adds a link-resolution blocker as well as the content blocker, and a held fixture clock prevented provider pacing from advancing. The fixture now uses a known subscribed reader, names both relevant image blockers and advances time only for dispatch. No production guard or existing assertion was weakened.

The initially selected retained asset file reported no selected tests because its contract wrapper records locations at contract.js. The anchored grep also matched no full test titles. The later selection uses the four unique existing asset-test names; its actual outcome is in asset-receipt.json. CAMP-023 acceptance 2 is independently inside L, so it does not depend on wrapper selection.

Pre-READY self-check: every native named outcome has a passing public-door assertion; no existing assertion was removed, narrowed, skipped or moved behind a width condition; retained outbound replay is explicitly refused before exposure; erasure and credential revocation implementations are unchanged and not newly claimed. The Insert image dialog has text controls rather than icon-only controls, legible text, complete field borders and no new configuration surface. Source lock is fresh. Publication scanning, candidate Verify and site landing state are stated honestly in CI-STATUS.md.

Scan receipt: commit=2beb5ed987bece4b87ec0c93048761d6a7d2e6cd complete=not-run historyScanned=not-run findings=not-run. Full history is present, but the cloud-side scan is explicitly delegated to the fleet's guarded lander. No COMPLETE or zero-findings result is fabricated.

No native CAMP-023 acceptance remains unproved. External R-202 field qualification and all unrelated held prerequisites remain. Evidence publication is separate from product custody and does not imply READY, acceptance or landing. The complete non-secret packet is published only on evidence/sd-mango-c-f49.

Terminal CI: push Verify 42116771178 on the full terminal head completed with only the expected ACCEPTANCE.md freshness failure and its dependent aggregate guard. Browser shards were skipped, not claimed green. This is the explicit cloud READY exception; full details and failed job IDs are in CI-STATUS.md. No repair, rerun or workflow change was made. The lane hold until the retained f45 base is on main remains with the fleet.
