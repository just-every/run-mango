# sd-mango-c-f97 plan

Repository: just-every/run-mango. Product branch: cloud/sd-mango-c-f97.
Baseline: 5f740dc8cd6624d68df11cd55e56e317e5f6bc96.

The supplied campaign extract selects AUD-004 acceptance 1's missing terminal email exclusion and no-deferral proof. The clause has two acceptance points. Its initial Status gap lacks complete frequency exclusion, recorded reason, no deferral, email-window and SMS-window proof. Existing native eligibility returns frequency-window without a retry time; dispatch marks such a recipient skipped. Existing go-live journeys do not isolate this behavior through two campaigns approved before the first handoff and a replay beyond the protection window with an open deadline.

1. Reuse the existing isolated Mango runtime, consent doors, SendGrid network edge and controlled clock. Approve both native email campaigns before either handoff. Include a repeat reader and a fresh eligible control.
2. Dispatch the first campaign, then the second four hours later. Reconcile the repeat reader's persisted terminal skipped row, frequency-window reason, zero attempts and absent provider handoff with the control's accepted handoff and native campaign results.
3. Keep the second deadline open for 48 hours after its schedule. Advance beyond the email window, renew sender evidence, replay its actual native dispatch emission and run Cron. Require identical terminal rows, unchanged results and no later provider request to either reader.
4. Assert the results screen at 1440 and capture it once at 1440 and 390. Register the focused journey in the existing delivery verification pack; do not change workflow definitions, homepage or UI implementation.
5. Update only AUD-004's Evidence and Gap, retaining PARTIAL and every other Status row and judgment. Do not change acceptance text. Generate and check contract views, restore those views from main, regenerate the source lock last and check it. Run the focused journey, typecheck and the first-party command check.
6. Integrate current main before candidate publication, inspect all candidate identities and trailers, commit with fleet identity and active repository hooks, and use the product push guard for the named branch. Discover and report exact-SHA Verify through the prescribed REST door. Keep the complete non-secret report, receipts and screenshots in this packet and publish them only on the separate evidence ref.

Remainders retained: acceptance 1's SMS proof; acceptance 2's exact default-window boundary proof; AUD-009 overrides and FLOW-014 caps as separate duties; owner-held Twilio A2P and US carrier registration, SMS transport and provider qualification; all existing CONT-013 holds, provider and cross-seed prerequisites, and release requirements. No new policy default or DONE claim is intended. The plan extract's AUD-004 row alone gains this proof; no other campaign target is selected by this bounded brief.
