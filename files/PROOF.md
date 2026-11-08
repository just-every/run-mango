# SEND-004 proof register

Frozen scope: acceptance 3 permanent rejection terminal/error proof; preserve existing retry exhaustion, queued SEND-009 walk1 and all held prerequisites. No product behavior or contract judgments changed. The registered test remains `tests/go-live/delivery-recovery.journeys.ts` — `[SEND-004][SEND-005][SEND-009] recover refused handoffs and provider outages without duplicating uncertain sends`.

Acceptance outcomes:

- Acceptance 1, bounded increasing retry schedule: CARRIED, `tests/go-live/delivery-recovery.flow.ts` lines 23–43. Six attempts, increasing delays, original-hour bound, final failure and visible detail remain asserted. No new general-provider claim.
- Acceptance 2, uncertain handoff reconciled rather than retried: HELD as specified. Full uncertainty and reconciliation proof is not added; real-provider qualification stays separate.
- Acceptance 3, permanent rejection or retry exhaustion: MET LOCALLY. Existing retry exhaustion remains at `tests/go-live/delivery-recovery.flow.ts` lines 20–49. New helper `tests/go-live/permanent-rejection-journey.ts` lines 8–30 drives native consent, confirmation, saved draft and approval into a single SendGrid HTTP 400. Lines 16–26 assert one failed recipient, safe provider code and detail, terminal time bracket, one attempt, no retry, no provider message ID or acceptance/handoff timestamp and cleared lease. Lines 32–49 reconcile the authenticated campaign detail and recipient results. Lines 55–69 assert existing visible results at 1440. Lines 70–81 advance Cron past one hour, replay the original native dispatch, reload and compare the unchanged row, error and one failed recipient with no second attempt or accepted marketing handoff. Lines 82–86 capture the same changed screen once at 1440 and 390.
- Acceptance 4, atomic hard rejection, complaint and provider suppression: HELD as specified. The new HTTP 400 is a transport refusal, not evidence that the full contact-suppression matrix is qualified.
- Inherited BASE-OPS-004 visible failure: MET for this slice through authenticated detail and visible failed count plus safe provider error, helper lines 32–46 and 58–67.
- Inherited BASE-MAIL-001 truthful mail outcome: MET for this slice through failed transport, null message identity and acceptance/handoff timestamps, one exclusive failed bucket and empty accepted marketing-edge list, helper lines 21–30, 37–45 and 78–80.

DONE-RIDERS review against this bounded PARTIAL claim:

1. PARTIAL for full clause; acceptance 3 is exercised through the native journey. Acceptances 2 and 4 remain held. Exact-SHA Verify is separately recorded in the CI receipt.
2. PASS for slice: real native records and an HTTP 400 at the network boundary; a retry would consume the refusal and receive an actual acceptance, which the attempts and accepted-handoff assertions reject. Existing accepted native consent confirmation provides the supported outbound path. No mock sets a business outcome.
3. REGISTERED: the existing recovery journey remains in the delivery Verify pack in `scripts/verification/plan.mjs`. Candidate event and conclusion are recorded in the CI receipt; no new nightly or flag gate.
4. PASS: final local rerun uses the committed candidate. Product provenance records all relevant file hashes. Screens are actual outputs of that rerun.
5. PASS INSPECTED: current clause meta cites BASE-OPS-004 and BASE-MAIL-001. No inheritance or requirement edits.
6. PASS MECHANICAL: generator write then check succeeds; its generated views are restored whole from main and not committed. Status, Gap, Evidence and counts remain exactly main's and are fleet-owned.
7. PASS INSPECTED: no acceptance points, ruling, ID or coverage map changed.
8. NOT APPLICABLE to this proof-only change: existing native Owner consent, approval and authenticated report authority is used; no permission implementation changes.
9. PASS BOUNDARY: synthetic SendGrid network-edge proof only. No real provider, account, SMS, carrier or device qualification is claimed.
10. PASS INSPECTED: no policy default or consent/authority semantic was introduced.
11. PENDING LANDER: main equality, publication scan and main Run site remain fleet duties. Main is not advanced here. No DONE promotion is claimed.

Pre-candidate self-check:

- Acceptance 3's visible business outcome has failure-sensitive assertions. Full-clause DONE and exact-main green are not asserted.
- No existing assertion was removed, narrowed, conditionally skipped or moved behind a width check. The queued walk1 is byte-for-byte unchanged. One registration before and after.
- Replay is actively exercised after the retry hour and cannot resurrect delivery. Credentials, erasure, custody and consent implementations are unchanged; CONT-013 holds remain intact.
- No UI source changed. Browser captures show the existing results and recipient report in the seed's look. No new controls or configuration were introduced.
- Source lock is regenerated after the final source edits, including the added tracked helper, and checked. New fixture source has no literal email-shaped string or provider-shaped key. Commit identity and trailers are reviewed across all candidate commits. The cloud publication scan is NOT RUN, as assigned to the Mac lander; there is no invented COMPLETE or zero-findings receipt.
