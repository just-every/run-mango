# Browser proof

Chromium /usr/bin/chromium, headless, --no-sandbox; Node 22.20.0 and pnpm 10.12.4. Existing state assertions are at 1440 pixels; changed saved-newsletter and Insights compliance screens are captured at both 1440 and 390. These are isolated synthetic installations/provider edges, not production data or provider acceptance.

The corrected-store pre-send journey passes its existing inspectSnapshot assertion against browser Intl.DateTimeFormat before any click on the saved-newsletter page, then reloads and runs the same assertion again. Tests and assertions are unchanged. Updated screenshots were inspected directly: both audience widths read `Saved 8 Nov 2026, 4:15 pm` without an ellipsis and show the actual stored counts (3 candidates, 1 excluded, 2 eligible contacts, 4 email steps). The phone layout fits at 390 with one snapshot. The email previews and compliance warning/failure screens are retained alongside them.

The corrected-store complete pre-send journey passed alone (6.1 minutes) and mailbox-provider passed alone (5.6 minutes), including every strict compliance locator. The separate mutation-observer diagnostic passed 50 Insights loads under concurrent local-suite load, with max matching row count 1 and zero captured browser errors. The observer is test-only and never changes product DOM or source.

Initial boundary-only candidate evidence is retained separately and was rejected by exact-SHA CI despite passing its local 30-load probe and 23-journey suite. Only the final external-store candidate's receipts count toward its result.

An additional browser probe passes same-tab time-zone selection, automatic cross-tab storage publication and persistence after reload (47.1 seconds). The preliminary probe used a stale option list and timed out; it was corrected to choose from the current visible options without changing the product or weakening its assertions.

The final complete go-live stage passed all 23 journeys in 31.3 minutes; exact-head Verify 42499646308 also completed/success on f2bd3456f173b70d9bd67394b687caf7b1ba4bcf.
