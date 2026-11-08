# sd-mango-hydration-date-3

Product custody: **PUSHED**, branch `cloud/sd-mango-hydration-date-3`, head `0e8e3f6c911cea8ec4dc35be223455dedfe8f7c2`, repository `just-every/run-mango`. Final exact-SHA Verify is unconfirmed because the ten-call GitHub budget is exhausted. No READY, acceptance, deployment or landing claim is made. The strictly isolated presend journey passed; the final full-suite result is pending at this revision and is recorded below before terminal publication.

## Final behavior and cause

Hydration and browser time-zone knowledge now originate in the document above the streamed app route. `TimeZoneProvider` publishes one context snapshot through `startTransition`; dates consume that snapshot instead of relying on each streamed consumer's passive external-store check. The app's existing hydration marker is published inside the streamed resource content after its React commit. Public documents publish their marker after the context commit. This makes the readiness signal agree with attached app handlers and rendered dates.

Previously, `useHydrated` used `useSyncExternalStore` with a subscription that never publishes. Its false server snapshot became true only through each consumer's post-hydration snapshot check. In the assignment's diagnosed failure, the root had hydrated while effects below the streamed `/app` boundary had not run, leaving the unchanged date formatter's ellipsis gate closed. A root-only readiness marker also preceded that streamed content's commit, allowing browser journeys to act on server-painted controls while React was still replacing them.

Server and first-client values remain false/UTC. Browser and saved IANA time-zone choices, storage notifications, date formatting, invalid-date handling and pointer-focus tracking remain intact. Product code adds no timer, polling loop or simulated interaction. No existing assertion, timeout or test definition was edited, deleted, skipped or weakened.

The final product diff contains only three leased source files and their generated lock entries:

- `src/routes/__root.tsx`: document provider, public-document readiness, retained pointer-focus effect.
- `src/core/app/client/lib/time-zone.ts`: one hydration/zone context and transition-scheduled publication above streaming.
- `src/core/app/client/ui/layout.tsx`: app readiness after streamed resource content commits.
- `sources.lock.json`: generated source hashes.

## Plan and baseline

PLAN.md records the complete plan. A fresh full-history `git clone --filter=blob:none` started from origin/main `eceb55d9eca66cf4a2702f69e23109d2266b1560`; the clone is not shallow. Fleet identity, bundle-only authentication and commit cleanup hooks were installed, including reinstallation after setup. Setup and baseline build passed.

The original presend journey was run first with a hard timeout and **passed** (1 journey, 3.2m). The actual output is repro.log. A separate no-input proof and 20 reloads also passed before changes. This environment did not independently reproduce the historical date failure; no failing baseline output is invented. The zero-effect diagnosis comes from the assignment.

A diagnostic worktree shares the same full-history clone and origin. It allowed scheduling/readiness changes to be tested independently of an earlier candidate run. The final checkout is `/workspace/mango-diagnostic`; the initial clone is `/workspace/run-mango`. Both are removed after successful product/evidence custody is recorded.

## Final-source browser and local proof

The final no-input proof passed 20 reloads across browser Australia/Brisbane and saved America/New_York preferences. It asserts the heading's text immediately after the app hydration marker, without a date-text polling assertion. The receipt records a complete document, hydrated=true, correct saved-date headings, zero trusted pointer/click/key/touch events during the no-input phase and no page errors. A later phase verifies picker changes to London and cross-tab storage changes to Berlin. Actual date captures at 1440 and 390 were visually inspected and show formatted saved dates. Full saved-newsletter captures and proof source are included. All data is synthetic local fixture data.

| Final-source check | Result | Actual evidence |
| --- | --- | --- |
| No-input dates, 20 reloads, preferences/storage | PASS, 1 journey | commit-ready-date.log; commit-ready-date-receipt.json |
| Rendering and both audience/editor journeys | PASS, 3 journeys | commit-ready-focused.log |
| Representative public/operator phone states and accessibility | PASS, 1 journey, 5.7m | app-phone.log |
| Typecheck after merging main | exit 0 | merged-typecheck.log |
| Production build | exit 0 | commit-ready-build.log |
| First-party command contract | exit 0 | commit-ready-first-party.log |
| Source freshness/offline Base comparison | exit 0 | commit-ready-source-check.log |
| Integration specification/identity | exit 0 | commit-ready-integration-check.log |
| Presend journey strictly isolated | PASS, 1 journey, 3.2m | isolated-presend.log |
| All 23 go-live journeys at maintained capacity | pending | final-go-live.log |

The focused editor test exercises the saved numeric value that failed in the prior CI run; its unchanged assertions passed. The phone journey recorded the public/operator states, dialogs, refusal states and role-limited pages fitting at 390 with clear axe results. The provided toolchain and cloud_run were used; headless Chromium used `/usr/bin/chromium` and `--no-sandbox`.

One concurrent presend run hit the known five-second save-notice timeout at `tests/go-live/email-size.flow.ts:78`. Its actual snapshot showed the save still busy and the Save button disabled, rather than a completed refusal. app-presend.log and busy-save-context.md retain that result. Several native/browser jobs overlapped on the VM's four CPU quota. The final isolation run removed competing browser work without changing the assertion or timeout and passed in 3.2m. The failed concurrent observation is retained and is not represented as a pass. The final full suite uses the maintained two-worker capacity with no additional browser jobs alongside it.

The first immediate-text diagnostic omitted waiting for the newly reloaded document's readiness marker and saw the expected server placeholder. That probe is retained in commit-ready-unawaited-reload.log. The corrected proof awaits the existing hydration marker on every reload and then checks text synchronously; it passed. No product workaround or existing test relaxation was introduced.

## Mechanical and clause custody

After the final source change and again after merging updated main, contract-docs write/check both exited 0. Generated views were restored whole from origin/main. The source lock was regenerated last and its check exited 0. merged-mechanical.log and merged-mechanical-receipt.json contain the actual final sequence. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are unchanged from merged main.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock exit=0; views=node src/base/contract-docs.mjs check exit=0

Before and after: **21 done / 197 partial / 98 missing, 316 total**. BUILD-008 remains done; BUILD-012 and RESULT-001 remain partial. No clause judgment, status or acceptance text changed.

## Product history and main integration

Every product push used cloud-push.py and succeeded on its first attempt. All candidate commits, including the merge, have fleet author and committer identity, with no co-author trailers. The complete identity/message audit is in identity-audit.txt. Published history was never rewritten; main was never pushed or locally advanced.

1. `39c03ea45c11d92edecc0c5abfc94ad396e47752`: first real date fix save, `[skip ci]`, pushed after no-input proof.
2. `2b1bda4efbbf42400627653c63f9e6689b4b4fe9`: source-lock candidate.
3. `cb141908f50e4b314aa255e51746f8611d5e7d26`: transition-scheduled publication.
4. `514201cf5985749987b3852bc0bedaeb06b0814f`: readiness after streamed app content commits.
5. `0e8e3f6c911cea8ec4dc35be223455dedfe8f7c2`: merge of newer main `ad1a605639c006c0e002a53f8cebed6a104aeceb`, retaining its Resend completion-proof tests and lock entries. The regeneration/check sequence passed afterward, and the remote named branch was confirmed at the merged SHA.

No PR is required by the repository's instructions, and none was created. The new main change affected Resend test definitions, so the early full-suite run was restarted to avoid mixing collected old test titles with new modules. A later four-worker probe was stopped to restore the maintained native capacity after the concurrent save timeout. Interrupted runs are retained as actual evidence and never counted as complete passes. The terminal final suite uses two workers and runs after the isolated presend journey.

## Exact-SHA CI and limits

- Verify **42485646853**, SHA `2b1bda4efbbf42400627653c63f9e6689b4b4fe9`: failure. Native job **128747202834** found two complaint DOM rows at compliance-journey.ts:40. The prescribed archive command succeeded and was invoked once; ci-native-failed.log contains its actual sanitized output.
- Verify **42487392666**, SHA `cb141908f50e4b314aa255e51746f8611d5e7d26`: failure in native, connections, phone and identity-data, plus the dependent aggregate. Native job **128752515474** hit a detached complaint row at compliance-journey.ts:42. Identity-data job **128752515528** saved numeric value 2 while the edited value expected by audience-summary-journey.ts:42 was 1. Both archives were read once successfully. The other two shard archives were not read because the ten-call budget was exhausted.
- Final SHA **0e8e3f6c911cea8ec4dc35be223455dedfe8f7c2**: exact-SHA Verify **unconfirmed**. No further API/archive calls or alternative provider reads will bypass that budget. The return is PUSHED, pending the fleet's independent exact-SHA gate. No generated-view exemption applies to the observed failures.

The earlier failures show why document-shell hydration alone was an insufficient app-ready signal: DOM and controlled state could still be replaced after the marker. The final source publishes app readiness inside its streamed content and passes the focused editor/date/phone checks above. Remote confirmation remains outstanding; local results do not claim hosted/provider acceptance.

## Evidence custody

All actual non-secret reports, receipts, logs and captures are kept under the task packet directory. Files are selected explicitly, checked to be regular files and scanned for injected bundle values before transfer. Credentials, environment dumps, private held-out material and symlinks are excluded. Evidence uses only the report-only `evidence/sd-mango-hydration-date-3` ref. An earlier pending snapshot was published at `b63900ba0565af56d57008cf4217d582ae67096c`; the terminal EVIDENCE line identifies the complete final packet's commit. Product custody and evidence publication are separate. The fleet owns its independent publication scan and landing.
