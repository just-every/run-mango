# sd-mango-c-f99 — CAMP-010 native deadlines

Candidate: `cloud/sd-mango-c-f99`, `0acfc77e9b20718a284b6a9bb580cc717be79d43`, repository `just-every/run-mango`.

CAMP-010 changes from PARTIAL to DONE on the candidate. Native acceptance outcomes 1, 2 and 3 now have one registered sanity journey. Counts change from 20 DONE, 198 PARTIAL, 98 MISSING to 21 DONE, 197 PARTIAL, 98 MISSING. These are candidate counts, pending guarded landing.

The predecessor `686a91bec82afcbbeba3f54b7dad1b0afa81d7f4` was already in current main's ancestry, followed by generated-view commit `01f63103b73722c32e0c6cc13f7b9c2eacb4c59e`. Its source and assertions were retained. No duplicate replay or history rewrite was needed. Current main was fetched and merged before the candidate; it was already up to date.

## Work completed

The initial native probe exposed a real gap: complete draft creation with UTC-only send instants and IANA zones returned HTTP 400 when both deadline fields were omitted. The equivalent local-time creation passed. The existing schema defaulted only when the request supplied a local send time.

The schema now derives the scheduled instant's local calendar day in the supplied IANA zone and resolves 23:59 of that day. It does this for either channel and for UTC-only and local inputs. Explicit deadlines, local ambiguity refusals, local and UTC agreement checks, and the requirement for a deadline after the send instant remain intact. This uses the existing CAMP-006 end-of-day semantic; no acceptance sentence or policy changed.

The existing deadline spec was extended, with a focused dispatch helper. No permanent test registration was added or removed. The spec remains selected by the existing authoring pack in `scripts/verification/plan.mjs`; neither that plan nor any workflow was modified. Tests substitute provider network boundaries, never production persistence, approvals, eligibility or Queue results.

Native authoring proof covers both email and SMS, complete creation and PATCH, ordinary and spring-forward and fall-back dates, UTC-only and local schedules, explicit deadlines and agreeing values, refused mismatches without persisted changes, UI edits that preserve custom deadlines and move defaults with the local date, repeated authenticated readback and SQL reconciliation, and absence of approvals, recipient rows or dispatch commands from draft edits. Original reopened and reloaded 1440 and 390 screen evidence remains.

Native dispatch proof captures real consent and confirmation, saves real campaigns, approves exact revisions, and runs the production Cron and Queue exports. It checks a positive handoff before expiry; a partially dispatched step; an accepted email; an uncertain email submission; a prepared but unsent recipient at equality; missed first and later steps; a command delayed across its deadline; a paused window; and native queue replay after expiry. Both channels send a positive control. Expired unsent recipients have `send-window-expired`, zero attempts and no handoff start. Previously accepted or uncertain handoffs retain their provider authority. Authenticated results and existing result screens reconcile the outcomes.

## Frozen acceptance rubric and proof map

Journey J is `tests/campaign-authoring/step-deadline.spec.ts`, “[CAMP-010] native deadline defaults and expired dispatch stay safe through authoring, Cron and Queue”. Helper D is `tests/campaign-authoring/step-deadline-dispatch-journey.ts`, invoked by J at line 180. Both channels run inside the existing single registration; assertions run at 1440 and captures additionally show 390.

| Item | Public door and assertion | Native result | Distinct break checked by inspection |
| --- | --- | --- | --- |
| A1: Each step has a default local-day-end deadline | J lines 9–13, 28–72, 91–147 and 149–174: authenticated creation, PATCH, detail and review; persisted rows; actual editor saves and reload | Ordinary and both DST expectations match independently written UTC values for both channels; explicit overrides persist; mismatch refusal changes nothing; drafts gain no sending authority | Omitting the UTC-only default makes J line 106 fail; computing a fixed 24-hour duration fails the independently written DST expectations at lines 116–120 |
| A2: Unsent recipient-step is skipped after deadline with a reason | D lines 51–63, 71–105 and 163–166: native approval, production Cron and Queue; real network-edge handoffs | Prepared and queued work becomes skipped with the existing expiry reason and zero attempts; accepted and uncertain submissions retain their records | Removing expiry classification fails D line 101's exact persisted skipped reason, attempts and handoff-start assertion |
| A3: An already-expired step sends nothing | D lines 107–138 and 168–175: missed first and later steps, delayed Queue, native pause and resume, replay of actual emissions | No late marketing request; no dispatch-start record for a missed first or later step; each unsent recipient remains skipped without an attempt | Allowing late dispatch changes D lines 112, 123, 129 or 138's observed provider handoff count |

Mutation descriptions above are inspection of the assertions; no mutation experiment was performed or claimed. Positive controls and dangerous refusals execute through the real native doors. No acceptance was added or narrowed. The inherited door rules D-1 and D-3 remain unchanged; this change adds no new endpoint, delegation or configuration authority.

## DONE-RIDERS review

| Row | Result | Candidate evidence or remaining landing duty |
| --- | --- | --- |
| 1 | Native proof PASS; remote execution pending | A1–A3 above; one registered sanity journey reaches every named outcome. Exact-SHA remote Verify is recorded in the receipt; the generated-view exception may prevent its browser jobs until landing. |
| 2 | PASS | Independent calendar expectations; populated native contacts; positive handoffs plus explicit unsafe expiry and replay paths. J 116–120, D 83–105 and 107–138. |
| 3 | Registered; landing verification pending | J is already in the push authoring pack. The exact candidate's local registered runner passes. A remote generated-view freshness failure is expected after deliberately restoring the views; the lander generates them and reruns exact-SHA Verify. |
| 4 | PASS | Final receipt binds the local journey and screen artifacts to the terminal head. The only correction to the preceding unpublished candidate was inclusion of the newly tracked helper in the generated source lock; no behavior or test bytes changed in that correction. |
| 5 | PASS, no new inherited duty | CAMP-010 retains D-1 and D-3. No new receiving clause or Base duty was introduced; native authoring and approval authority checks remain enforced. |
| 6 | Evidence, empty Gap and generated counts PASS; historical global provenance retained | The CAMP-010 Evidence cell identifies J and D per acceptance. Generator write then check passes before the generated views are restored. Exact candidate provenance is in this report and receipt. Historical unrelated `Judged from` prose is preserved; its stale global provenance is a mechanical note for the lander, not a new judgment of other clauses. |
| 7 | PASS | All three acceptance sentences and all other clause Status rows are retained. No ID mapping or semantic rewrite. Generated summary counts only. |
| 8 | PASS for changed authority | J 52–55 and 108–147 prove draft saves and refused mismatches create no approval, recipients or jobs; D 51–63 obtains real approval before its positive and unsafe dispatch paths. Existing role and sender authority implementation is unchanged. |
| 9 | PASS, bounded claim | Network-edge fixtures prove native behavior. No live SMS, Twilio A2P, US carrier registration, provider acceptance, hosted timing or real transport qualification is claimed. Existing release and provider holds remain elsewhere unchanged. |
| 10 | PASS | No new custody, consent, spending or authority default. The deadline is the existing CAMP-006 23:59 semantic. |
| 11 | PENDING GUARDED LANDER | Product is branch-only. The Mac must regenerate views, require exact-SHA Verify, run the complete full-history publication scan with zero findings, land, and confirm Run site. No cloud scan or landing is claimed. |

## Verification and mechanical checks

Commands, real exit codes, exact-head checks, CI observations and artifact hashes are in `RECEIPT.json`. The actual final registered journey log, typecheck log and generated-document logs are selected in the evidence packet. The source lock was generated after the new helper became tracked, then checked. An initially stale unpublished lock was corrected before product publication. No published commit was rewritten.

MECHANICAL lock=`node scripts/edition-authoring/cli.mjs lock` then `node scripts/edition-authoring/cli.mjs check` exit=0; views=`node src/base/contract-docs.mjs write` then `node src/base/contract-docs.mjs check` exit=0, followed by restoring `ACCEPTANCE.md` and `docs/CLAIMS.md` from origin main; ledger=none exit=0 because no migration changed.

The offline Base integrity check and first-party command check pass. Base pins, dependencies, applied migrations, workflow bytes, homepage, logo and other clause judgments are unchanged. The source diff contains no literal email-shaped fixture strings. Every candidate author, committer and trailer is audited before publication, including side parents; the fleet commit hook remains active.

Pre-ready checks: all named native outcomes have observable assertions; no prior assertion was removed, skipped or placed behind a new condition; drafts never obtain approval or delivery authority; real pending work cannot acquire handoff authority through expiry or replay; no erasure or credential behavior was altered. Existing screens were captured at 1440 and 390. No product UI or configuration placement changed. The 300 ms shared tooltip behavior and existing text controls are retained; there is no new icon-only control. Publication scan, candidate main equality, exact-main Run site and final remote browser execution remain lander duties and are not fabricated as green.

## Plan and custody

Only the CAMP-010 plan row changes: native acceptance 1's remaining scheduling cases and acceptances 2–3's native expiry matrix are closed. No other target is selected, and no historical plan, ruling or inbox file was read from or written to this VM. The full execution plan is `PLAN.md`.

The production fix was first saved and pushed as `4cb2ae9b787b2871c89024086bad2279a4200ad3` with CI skipped, then this completion candidate was prepared. All product changes are confined to the named cloud branch. No PR is needed because Verify accepts branch pushes. No default branch or PR write occurred. The separate evidence ref transports only the explicitly selected public-safe packet and confers no acceptance or landing authority.

The owner-held SMS and carrier prerequisites, CONT-013's existing disposition and repair hold, and existing Base adoption and release requirements remain unchanged. They do not certify or invalidate this native deadline enforcement proof; they still gate their own provider and release claims. There is no unresolved native CAMP-010 implementation blocker.

## Terminal CI observation

Push Verify run 42201171130 was discovered through REST on exact candidate 0acfc77e9b20718a284b6a9bb580cc717be79d43 and was in progress at the recorded observation. No dispatch or rerun was requested. No remote green result is claimed. Main at 01f63103b73722c32e0c6cc13f7b9c2eacb4c59e had green Verify 42195975560 and green Run site 42195975538. Two GitHub API calls have been used: one main discovery and one candidate discovery. The local generated-view check after restoration reports only the expected ACCEPTANCE.md difference.

Non-blocking pre-existing observation: the unchanged schedule overview can say zero messages were not sent while the per-step rows correctly show expiry skips. Its old summary aggregates the legacy deadline reason differently from the current stored reason. This round deliberately preserves carried expiry terminology and does not change campaign-result summary scope. The native step rows, persisted reasons and absence of late provider handoffs are independently asserted.

Evidence transport recovery: initial report publication failed at Git ls-remote with exit 128, and ordinary Git reported invalid username or token without an HTTP status. Product push had already succeeded on the terminal head. Recovery refreshes the same fleet launcher bundle and reinstalls the fleet helper; it does not search for another credential. The report helper is additionally aligned with the product guard's command-scoped Git authentication resets. Final transfer status is recorded separately and must not be confused with product readiness.
