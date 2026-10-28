Old reference: `6d9fc12eeae3b7ae661508996201cb8d008895af`.
# Carried-done outcome audit
| Clause | Point | Outcome | Asserting test | Result |
| --- | --- | --- | --- | --- |
| HOME-001 | 1 | Mango’s mark, name and one newsletter description identify the installation. | none | none |
| HOME-001 | 2 | Finish setup points to setup before claim | `tests/local-start/local.journey.ts:36` | asserted |
| HOME-001 | 2 | Sign in points to native sign-in after claim | `tests/local-start/local.journey.ts:69` | asserted |
| HOME-001 | 2 | The Lobby has only one action | none | none |
| HOME-001 | 3 | Unclaimed state before setup | `tests/local-start/local.journey.ts:35` | asserted |
| HOME-001 | 3 | Claimed state after setup | `tests/local-start/local.journey.ts:67` | asserted |
| HOME-002 | 1 | The primary action opens the Run page; the run-site landing has no sign-in link. | none | none |
| HOME-002 | 3 | The hero is the only top-level heading; the alternative sentence also ends the metadata description and names both replacement products. | none | none |
| HOME-002 | 4 | The sections explain collection, writing, exact-letter approval, scheduling, delivery reporting and ownership, followed by a closing action. | none | none |
| HOME-002 | 5 | The optional product credit appears only when the owner enables it; illustrative addresses, names, counts and dates are never records. | none | none |
| HOME-002 | 7 | The static landing reads no operator, contact, campaign or session data and is written once by the site build. | none | none |
| DOCS-001 | 1 | Public docs home and trailing-slash home | `tests/docs.spec.ts:72` | asserted |
| DOCS-001 | 1 | Manifest navigation order | `tests/docs.spec.ts:36` | asserted |
| DOCS-001 | 2 | Exactly one page title | `tests/docs.spec.ts:33` | asserted |
| DOCS-001 | 2 | Current page | `tests/docs.spec.ts:37` | asserted |
| DOCS-001 | 2 | Page-section navigation | `tests/docs.spec.ts:57` | asserted |
| DOCS-001 | 2 | Previous and next links | `tests/docs.spec.ts:44` | asserted |
| DOCS-001 | 2 | Phone Contents disclosure | `tests/docs.spec.ts:103` | asserted |
| DOCS-001 | 3 | Docs is current | `tests/docs.spec.ts:41` | asserted |
| DOCS-001 | 3 | Sign in destination | `tests/docs.spec.ts:58` | asserted |
| DOCS-001 | 3 | Sole Sign in link | none | none |
| DOCS-001 | 3 | Shared footer, palette, faces and drawings | none | none |
| DOCS-001 | 4 | Every root, docs and top-level readme Markdown file is published or explicitly excluded with a reason; undeclared files, broken links or anchors, links to unpublished pages, raw HTML, forbidden images and absolute build-machine paths fail validation. | none | none |
| DOCS-001 | 5 | Published pages describe the default newsletter profile, expose no maintainer material and have no source-repository or edit link. | none | none |
| DOCS-001 | 6 | No documentation request reads workspace, session or database records. | none | none |
| DOCS-001 | 7 | Reserved and unknown slug responses | `tests/docs.spec.ts:78` | asserted |
| DOCS-001 | 7 | Shared not-found header | `tests/docs.spec.ts:85` | asserted |
| DOCS-001 | 7 | Shared not-found footer | `tests/docs.spec.ts:86` | asserted |
| DOCS-001 | 7 | Link to docs home | `tests/docs.spec.ts:88` | asserted |
| DOCS-001 | 7 | Link to landing | `tests/docs.spec.ts:89` | asserted |
| DOCS-001 | 7 | Other-host behavior | none | none |
| DOCS-001 | 8 | Documentation is compiled before serving; Worker and browser outputs contain no Markdown or highlighter code, and individual page chunks are loaded lazily. | none | none |
| OPER-001 | 1 | Before role assignment, an operator can see and act on proposals, campaigns, flows, contacts and settings as Admin. | none | none |
| OPER-001 | 2 | Server navigation remains at setup | `tests/local-start/local.journey.ts:22` | asserted |
| OPER-001 | 2 | Client navigation remains at setup | `tests/local-start/local.journey.ts:28` | asserted |
| OPER-001 | 2 | Invalid sender data does not write | `tests/local-start/local.journey.ts:63` | asserted |
| OPER-001 | 2 | Saved identity opens app documents | `tests/local-start/local.journey.ts:71` | asserted |
| OPER-001 | 3 | Valid identity already configured for the installation also completes setup. | none | none |
| OPER-001 | 4 | Authenticated configuration APIs remain usable during setup, and completing setup does not claim provider readiness. | none | none |
| OPER-002 | 1 | Settings can invite an operator and remove an operator. | none | none |
| OPER-002 | 2 | A session without fresh email proof cannot grant another operator access. | none | none |
| OPER-002 | 3 | Settings can request a confirmation link bound to the current session; completing it permits an invitation retry. | none | none |
| OPER-002 | 4 | Reading or inspecting the confirmation link has no effect; only its affirmative submission supplies proof. | none | none |
| OPER-002 | 5 | Only the operator established at setup may remove that operator. | none | none |
| OPER-003 | 1 | Every proposal remains attributed to the removed operator. | none | none |
| OPER-003 | 2 | Campaign author | `tests/go-live/roles.journeys.ts:185` | asserted |
| OPER-003 | 2 | Revision approver | `tests/go-live/roles.journeys.ts:186` | asserted |
| OPER-003 | 2 | Approval request | `tests/go-live/roles.journeys.ts:187` | asserted |
| OPER-003 | 2 | Author and approver activity | `tests/go-live/roles.journeys.ts:188` | asserted |
| OPER-003 | 2 | Campaign, revision, request, transition and audit records unchanged after removal | `tests/go-live/roles.journeys.ts:206` | asserted |
| OPER-003 | 3 | Review author | `tests/go-live/roles.journeys.ts:210` | asserted |
| OPER-003 | 3 | Review approver | `tests/go-live/roles.journeys.ts:211` | asserted |
| OPER-003 | 3 | Review approval-request author | `tests/go-live/roles.journeys.ts:212` | asserted |
| OPER-003 | 3 | Campaign detail author | `tests/go-live/roles.journeys.ts:215` | asserted |
| OPER-003 | 3 | Campaign detail approver | `tests/go-live/roles.journeys.ts:216` | asserted |
| OPER-003 | 3 | Activity attribution unchanged | `tests/go-live/roles.journeys.ts:206` | asserted |
| STORE-002 | 1 | One record after repeated order sync and webhook | `tests/shopify/connection.spec.ts:68` | asserted |
| STORE-002 | 1 | One cart’s payload retained under replay | `tests/shopify/connection.spec.ts:130` | asserted |
| STORE-002 | 1 | Browsing-event replay has one observation for its id | `tests/shopify/connection.spec.ts:168` | asserted |
| STORE-002 | 1 | Customer and refund replay update existing contents without duplicates | none | none |
| STORE-003 | 1 | Last-success time and later error | `tests/go-live/source-freshness.journeys.ts:76` | asserted |
| STORE-003 | 2 | Failed source retains completion | `tests/go-live/source-freshness.journeys.ts:80` | asserted |
| STORE-003 | 2 | Unaffected source unchanged | `tests/go-live/source-freshness.journeys.ts:77` | asserted |
| STORE-003 | 3 | Unstarted sources have no completed time | `tests/go-live/source-freshness.journeys.ts:25` | asserted |
| STORE-003 | 3 | Unstarted source visible in desk | `tests/go-live/source-freshness.journeys.ts:91` | asserted |
| STORE-003 | 4 | Completion time advances | `tests/go-live/source-freshness.journeys.ts:121` | asserted |
| STORE-003 | 4 | Error clears | `tests/go-live/source-freshness.journeys.ts:122` | asserted |
| STORE-003 | 4 | Recovered desk no longer shows failure | `tests/go-live/source-freshness.journeys.ts:128` | asserted |
| STORE-003 | 5 | Safe failure cause | `tests/go-live/source-freshness.journeys.ts:88` | asserted |
| STORE-003 | 5 | Retained completion time visible | `tests/go-live/source-freshness.journeys.ts:89` | asserted |
| STORE-003 | 5 | Provider-private diagnostics absent | `tests/go-live/source-freshness.journeys.ts:78` | asserted |
| STORE-004 | 1 | Generation failure and safe source error | `tests/go-live/source-freshness.journeys.ts:59` | asserted |
| STORE-004 | 1 | Signed webhook failure and replay one record | `tests/go-live/source-freshness.journeys.ts:66` | asserted |
| STORE-004 | 1 | Forged delivery records none | `tests/go-live/source-freshness.journeys.ts:64` | asserted |
| STORE-004 | 1 | Recovery completes existing webhook operation | `tests/go-live/source-freshness.journeys.ts:117` | asserted |
| STORE-004 | 1 | Stripe signed failure and recovery | `tests/go-live/stripe-journey.ts:72` | asserted |
| STORE-004 | 2 | Failure text excludes diagnostics, secret, token and product record payload | `tests/go-live/source-freshness.journeys.ts:69` | asserted |
| STORE-004 | 3 | Saved draft readable after edit | `tests/go-live/source-freshness.journeys.ts:71` | asserted |
| STORE-004 | 3 | Recorded history equality | `tests/go-live/source-freshness.journeys.ts:72` | asserted |
| STORE-004 | 3 | Scheduled campaign retains state | `tests/go-live/source-freshness.journeys.ts:73` | asserted |
| STORE-004 | 3 | No added provider handoff | `tests/go-live/source-freshness.journeys.ts:74` | asserted |
| STORE-004 | 4 | Generation and webhook failure visibility | `tests/go-live/source-freshness.journeys.ts:99` | asserted |
| STORE-004 | 5 | Signed outage webhook retains failed response | `tests/go-live/source-freshness.journeys.ts:65` | asserted |
| STORE-004 | 5 | Recovery webhook is accepted | `tests/go-live/source-freshness.journeys.ts:115` | asserted |
| STORE-005 | 1 | Stale status and safe cause | `tests/go-live/stale-sources.journeys.ts:54` | asserted |
| STORE-005 | 1 | Refused approval blocker | `tests/go-live/stale-sources.journeys.ts:59` | asserted |
| STORE-005 | 2 | Counts unavailable | `tests/go-live/stale-sources.journeys.ts:65` | asserted |
| STORE-005 | 2 | No approval authority | `tests/go-live/stale-sources.journeys.ts:85` | asserted |
| STORE-005 | 2 | No recipients | `tests/go-live/stale-sources.journeys.ts:86` | asserted |
| STORE-005 | 3 | Safe cause visible | `tests/go-live/stale-sources.journeys.ts:72` | asserted |
| STORE-005 | 3 | Approval disabled | `tests/go-live/stale-sources.journeys.ts:73` | asserted |
| STORE-005 | 4 | Recheck enables approval | `tests/go-live/stale-sources.journeys.ts:92` | asserted |
| STORE-005 | 4 | Approval proceeds to saved schedule | `tests/go-live/stale-sources.journeys.ts:102` | asserted |
| STORE-006 | 1 | Source capability declared unavailable | none | none |
| STORE-006 | 2 | Unsupported requirement refused | none | none |
| STORE-006 | 3 | Reviews name missing source and leave no snapshots | none | none |
| STORE-006 | 4 | Generation source refusal without campaign or audience | none | none |
| CONT-001 | 1 | Case and whitespace canonicalization | none | none |
| CONT-001 | 2 | Phone canonicalization | none | none |
| CONT-001 | 3 | Archive duplicate email identities reconcile | `tests/move-in/archive.journeys.ts:145` | asserted |
| CONT-001 | 3 | Phone identity uniqueness on capture and import | none | none |
| CONT-002 | 1 | Imported subscribed, non-subscribed, unsubscribed and suppressed email states | `tests/move-in/archive.journeys.ts:167` | asserted |
| CONT-002 | 1 | Independent pending and SMS states | none | none |
| CONT-002 | 2 | Only eligible unsubscribed and suppressed exclusions leave the recipient set | `tests/move-in/held.journeys.ts:97` | asserted |
| CONT-002 | 3 | Cross-channel independence under store activity and consent | none | none |
| CONT-003 | 2 | Category/sender mismatch blocks approval | `tests/campaign-authoring/import-category.spec.ts:71` | asserted |
| CONT-003 | 2 | Recipient scope maintained | none | none |
| CONT-003 | 3 | Missing evidence creates a non-subscribed contact, except for the incumbent-held evidence CONT-024 defines. | none | none |
| CONT-003 | 4 | A reassigned phone or one no longer belonging to the recipient becomes non-subscribed until fresh evidence is captured. | none | none |
| CONT-003 | 5 | Stale and missing disclosure create no evidence | `tests/audience-import/signup.spec.ts:54` | asserted |
| CONT-004 | 1 | One-click state committed when response completes | `tests/go-live/go-live.journeys.ts:224` | asserted |
| CONT-004 | 1 | Review excludes opted-out contact | `tests/go-live/go-live.journeys.ts:232` | asserted |
| CONT-004 | 1 | Queued dispatch skips opted-out recipient | `tests/go-live/go-live.journeys.ts:234` | asserted |
| CONT-004 | 1 | SMS opt-out committed at response | `tests/provider-suppression-ingress.spec.ts:216` | asserted |
| CONT-004 | 2 | Import and undo retain restriction | `tests/move-in/held.journeys.ts:175` | asserted |
| CONT-004 | 2 | Sync, store events, merge and operator edits retain the restriction | none | none |
| CONT-004 | 3 | Parallel-run incumbent writeback | none | none |
| CONT-005 | 1 | Fresh affirmative evidence is later than the opt-out and is confirmed under CONT-009 before resubscription. | none | none |
| CONT-005 | 2 | An operator edit alone never resubscribes an unsubscribed or suppressed channel. | none | none |
| CONT-005 | 3 | Suppression blocks fresh capture and handoff | `tests/provider-suppression-ingress.spec.ts:93` | asserted |
| CONT-005 | 4 | A recipient’s own public-form resubscribe follows CONT-027. | none | none |
| CONT-005 | 6 | During parallel run, a confirmed resubscribe writes subscribed state back where the incumbent API allows; otherwise the cutover report lists it. | none | none |
| CONT-006 | 1 | Provider suppression retained before handoff eligibility | `tests/provider-suppression-ingress.spec.ts:83` | asserted |
| CONT-006 | 1 | Hard bounce and complaint both suppress | `tests/go-live/go-live.journeys.ts:142` | asserted |
| CONT-006 | 2 | Soft-bounce recorded and visible | none | none |
| CONT-006 | 2 | Consecutive soft-bounce policy suppresses | none | none |
| CONT-006 | 3 | Confirmed delivery resets consecutive soft-bounce count | none | none |
| CONT-006 | 4 | Signed ingress rejects invalid identity without changing accepted state | `tests/go-live/go-live.journeys.ts:135` | asserted |
| CONT-006 | 4 | Incomplete provider webhook setup blocks approval | none | none |
| CONT-006 | 5 | Refreshing local authentication/setup credentials preserves existing contact-hash restrictions, including restrictions without a remaining contact row. | none | none |
| CONT-006 | 6 | Legacy local authority conversion preserves the original verified contact authority before credential rotation; unknown or missing authority refuses work rather than selecting an unused secret. | none | none |
| CONT-008 | 1 | All required fact kinds present | `tests/audience-controls/contact-history.spec.ts:35` | asserted |
| CONT-008 | 2 | Occurrence order | `tests/audience-controls/contact-history.spec.ts:36` | asserted |
| CONT-008 | 2 | Form source record | `tests/audience-controls/contact-history.spec.ts:38` | asserted |
| CONT-008 | 2 | Conversion source record | `tests/audience-controls/contact-history.spec.ts:39` | asserted |
| CONT-008 | 2 | SMS source record | `tests/audience-controls/contact-history.spec.ts:40` | asserted |
| CONT-008 | 2 | Click source record | `tests/audience-controls/contact-history.spec.ts:41` | asserted |
| CONT-008 | 2 | Original order time and source record | `tests/audience-controls/contact-history.spec.ts:42` | asserted |
| CONT-008 | 2 | Original delivery time and provider | `tests/audience-controls/contact-history.spec.ts:43` | asserted |
| CONT-008 | 2 | Dispatch exclusion cause | `tests/audience-controls/contact-history.spec.ts:44` | asserted |
| CONT-008 | 2 | Operator attribution | `tests/audience-controls/contact-history.spec.ts:45` | asserted |
| CONT-008 | 2 | Every other event retains its source record | none | none |
| CONT-008 | 3 | Older events remain reachable | `tests/audience-controls/contact-history.spec.ts:62` | asserted |
| CONT-008 | 3 | Visible times equal full ordered timeline | `tests/audience-controls/contact-history.spec.ts:63` | asserted |
| CONT-008 | 4 | No other-contact or private-payload markers in timeline | `tests/audience-controls/contact-history.spec.ts:46` | asserted |
| CONT-008 | 4 | No other-contact marker in detail | `tests/audience-controls/contact-history.spec.ts:47` | asserted |
| CONT-009 | 1 | Email pending state and one confirmation | `tests/audience-import/signup.spec.ts:7` | asserted |
| CONT-009 | 1 | SMS pending state and one message | `tests/audience-import/signup.spec.ts:79` | asserted |
| CONT-009 | 2 | Email becomes subscribed after confirmation | `tests/audience-import/signup.spec.ts:13` | asserted |
| CONT-009 | 2 | Confirming request time read back | none | none |
| CONT-009 | 3 | Pending channel cannot receive marketing | none | none |
| CONT-009 | 4 | Repeated confirmation cannot reconfirm | `tests/audience-import/signup.spec.ts:12` | asserted |
| CONT-009 | 4 | Expired link invalid | `tests/audience-import/signup.spec.ts:17` | asserted |
| CONT-009 | 4 | Expiry leaves channel pending | `tests/audience-import/signup.spec.ts:18` | asserted |
| CONT-009 | 5 | When confirmation is not required, recorded consent under CONT-003 subscribes the channel directly. | none | none |
| CONT-010 | 1 | Archive per-file rejected and duplicate counts | `tests/move-in/archive.journeys.ts:145` | asserted |
| CONT-010 | 1 | Phone-only CSV validated | none | none |
| CONT-010 | 2 | Archive rerun repeated marker | `tests/move-in/archive.journeys.ts:273` | asserted |
| CONT-010 | 2 | Rerun leaves full table counts unchanged | `tests/move-in/archive.journeys.ts:274` | asserted |
| CONT-010 | 2 | Canonical identity update | `tests/move-in/archive.journeys.ts:145` | asserted |
| CONT-010 | 3 | All row outcomes reconcile | `tests/move-in/archive.journeys.ts:149` | asserted |
| CONT-010 | 3 | Each rejected row reason read back | none | none |
| CONT-010 | 4 | Opted-out identity retained after rerun | `tests/move-in/archive.journeys.ts:269` | asserted |
| CONT-010 | 5 | Owner affirmatively attests incumbent source record | `tests/move-in/archive.journeys.ts:137` | asserted |
| CONT-010 | 5 | Unnamed-file per-row rule | none | none |
| CONT-010 | 6 | Undo retains later restrictions | `tests/move-in/archive.journeys.ts:252` | asserted |
| CONT-010 | 6 | Full review capacity | none | none |
| CONT-011 | 1 | Exact union of consent, source activity, suppressions and campaign history | `tests/audience-controls/merge.spec.ts:57` | asserted |
| CONT-011 | 2 | Restrictive merge in both directions | `tests/audience-controls/merge.spec.ts:20` | asserted |
| CONT-011 | 2 | Every channel preserves the restrictive order | none | none |
| CONT-011 | 3 | Restricted aliases remain ineligible | `tests/audience-controls/merge.spec.ts:23` | asserted |
| CONT-011 | 3 | Old unsubscribe reaches surviving aliases | `tests/audience-controls/merge.spec.ts:41` | asserted |
| CONT-012 | 1 | Native aged order causes dormant exclusion | `tests/go-live/stale-sources.journeys.ts:163` | asserted |
| CONT-012 | 1 | Dormancy never removes current eligible order | `tests/go-live/stale-sources.journeys.ts:161` | asserted |
| CONT-012 | 2 | Imported click retains original time | `tests/move-in/archive.journeys.ts:424` | asserted |
| CONT-012 | 2 | Imported opens cannot prevent dormancy | `tests/move-in/archive.journeys.ts:402` | asserted |
| CONT-012 | 2 | Imported order and consent changes retain original times for dormancy | none | none |
| CONT-012 | 3 | No-history grace label and inclusion | `tests/move-in/archive.journeys.ts:402` | asserted |
| CONT-012 | 3 | Grace ends only after a full window | `tests/move-in/archive.journeys.ts:464` | asserted |
| CONT-012 | 4 | Open-only label visible | `tests/move-in/archive.journeys.ts:406` | asserted |
| CONT-012 | 5 | Inactivity leaves all existing contacts and their consent/suppression states unchanged | `tests/move-in/archive.journeys.ts:442` | asserted |
| CONT-012 | 5 | Inactivity leaves all existing contacts and their consent/suppression states unchanged | `tests/move-in/archive.journeys.ts:442` | asserted |
| CONT-013 | 1 | Restricted opt-out survives erase and archive restore | `tests/portability.spec.ts:263` | asserted |
| CONT-013 | 1 | All listed hash/channel/reason/time fields and opted-out aliases retained | none | none |
| CONT-013 | 2 | Readable address and name absent after erasure archive | `tests/portability.spec.ts:245` | asserted |
| CONT-013 | 2 | Installation-keyed one-way destination hash | none | none |
| CONT-013 | 3 | Subscribed identity has no row tombstone | none | none |
| CONT-013 | 4 | An import, sync or capture matching a retained local or portable identity preserves its restriction; an erasure opt-out means unsubscribed. | none | none |
| CONT-013 | 5 | Only the recipient’s own confirmed public-form resubscribe can clear an unsubscribe or erasure restriction under CONT-027; it cannot clear suppression. | none | none |
| CONT-029 | 1 | Surviving restrictions round-trip archive restore | `tests/portability.spec.ts:263` | asserted |
| CONT-029 | 1 | Local-to-portable mapping retained specifically | none | none |
| CONT-029 | 2 | Audience CSV exports carry surviving restrictions by their portable hash after erasure. | none | none |
| CONT-029 | 3 | Address and name absent in current archive | `tests/portability.spec.ts:245` | asserted |
| CONT-029 | 4 | Documentation explains that a mapping or export holder can test guessed destinations or an address dictionary without the installation secret and can match stable hashes across installations and exports. | none | none |
| CONT-029 | 5 | The retained mappings and exports are handled as sensitive personal data. | none | none |
| CONT-030 | 1 | Old archive rejected with no restored contacts | `tests/portability.spec.ts:252` | asserted |
| CONT-030 | 1 | No contacts after rejection | `tests/portability.spec.ts:253` | asserted |
| CONT-030 | 1 | Locally known current authority rejects old manifest before staging | `tests/portability.spec.ts:266` | asserted |
| CONT-030 | 2 | Nonempty legacy row journals are refused before staging. | none | none |
| CONT-030 | 3 | Upgrade retires legacy journals and transfers only after advancing every known source floor. | none | none |
| CONT-030 | 4 | An offline copy without current authority makes no claim to detect later erasure. | none | none |
| CONT-005 | 5 | Public-form proof boundary and guarded-capture pointer moved to their owning clauses. | `CONT-027; CONT-028` | moved |
| CONT-009 | 6 | Email confirmation GET leaves state unchanged | `tests/go-live/go-live.journeys.ts:215` | asserted |
| CONT-009 | 6 | SMS confirmation GET leaves pending state unchanged | `tests/audience-import/signup.spec.ts:79` | asserted |
| CONT-009 | 6 | Explicit affirmative confirmation POST | `tests/audience-import/signup.spec.ts:81` | asserted |
| CONT-009 | 6 | Reading and HEAD do not consume confirmation token | none | none |
| CONT-009 | 7 | Later opt-out prevents confirmation | `tests/audience-import/signup.spec.ts:35` | asserted |
| CONT-009 | 7 | Suppression guard cannot be bypassed | none | none |
| CONT-009 | 7 | Inactive identity cannot be confirmed | none | none |
| CONT-009 | 7 | Operator-recorded SMS exact authenticated reply | none | none |
| CONT-028 | 1 | Public eligibility, profile changes, consent evidence, capture metadata, history and pending status commit together, or a currently barred destination gains none of the new consent records. | none | none |
| CONT-028 | 2 | A surviving unsubscribe or erasure restriction may recreate an unsubscribed profile containing only new post-opt-out request evidence, without restoring history; confirmation mail stays within CONT-027’s shared allowance. | none | none |
| CONT-028 | 3 | Surviving suppression blocks fresh capture eligibility | none | none |
| CONT-028 | 4 | Confirmation preparation finishes before the authoritative handoff check; suppression, a later opt-out or an already committed confirmation prevents handoff when present at that check. | none | none |
| CONT-028 | 5 | The adapter is invoked immediately after the authoritative check; a provider handoff already authorized and in progress cannot be recalled by a later transition. | none | none |
| HOME-002 | 2 | Header Mango identity and links | none | none |
| HOME-002 | 2 | Hero identity and exact alternative sentence | none | none |
| HOME-002 | 2 | Hero actions and destinations | none | none |
| HOME-002 | 2 | Footer deployment-owner name and description | none | none |
| HOME-002 | 2 | Fixed page rather than a buyer page builder | none | none |
| HOME-002 | 6 | No vendor pricing | none | none |
| HOME-002 | 6 | No testimonials | none | none |
| HOME-002 | 6 | No customer logos | none | none |
| HOME-002 | 6 | No ratings | none | none |
| HOME-002 | 6 | No metrics | none | none |
| HOME-002 | 6 | No cross-store claims | none | none |
| HOME-002 | 6 | No third-party brand logos | none | none |
| HOME-002 | 6 | No optional commerce, SMS or AI advertising | none | none |
| HOME-002 | 6 | No per-reader-send-time or provider-neutral-delivery advertising | none | none |
| HOME-002 | 6 | Only specified link destinations | none | none |
| HOME-002 | 8 | Fixed light palette in a dark-themed browser | none | none |
| HOME-002 | 8 | Readable without scripts | none | none |
| HOME-002 | 8 | Readable with reduced motion | none | none |
| HOME-002 | 8 | Licensed self-hosted faces | none | none |
| HOME-002 | 8 | Inline drawings without raster or embedded images | none | none |
| HOME-002 | 8 | CSS-only once-only drawing motion | none | none |
| HOME-002 | 8 | No motion for reduced preference | none | none |
| HOME-002 | 8 | Motion never hides content | none | none |
| CONT-003 | 1 | Retained channel on capture and import | none | none |
| CONT-003 | 1 | Retained brand or legal sender on capture and import | none | none |
| CONT-003 | 1 | Retained SMS sender or program on capture and import | none | none |
| CONT-003 | 1 | Retained message subject or category on capture and import | none | none |
| CONT-003 | 1 | Retained frequency disclosure on capture and import | none | none |
| CONT-003 | 1 | Retained destination jurisdiction on capture and import | none | none |
| CONT-003 | 1 | Retained consent text on capture and import | none | none |
| CONT-003 | 1 | Retained consent version on capture and import | none | none |
| CONT-003 | 1 | Retained confirmation evidence on capture and import | none | none |
| CONT-003 | 1 | Retained capture source record | `tests/audience-import/signup.spec.ts:9` | asserted |
| CONT-003 | 1 | Retained capture method | `tests/audience-import/signup.spec.ts:9` | asserted |
| CONT-003 | 1 | Retained capture occurrence time | `tests/audience-import/signup.spec.ts:9` | asserted |
| FORM-001 | 1 | Hosted capture records explicit evidence before confirmation | `tests/audience-import/signup.spec.ts:9` | asserted |
| FORM-001 | 1 | Hosted identity becomes pending rather than subscribed | `tests/audience-import/signup.spec.ts:8` | asserted |
| FORM-001 | 1 | Embed captures only allowed-origin requests | none | none |
| FORM-001 | 1 | Optional SMS capture remains pending | `tests/audience-import/signup.spec.ts:79` | asserted |
| FORM-001 | 2 | One valid confirmation subscribes the email | `tests/audience-import/signup.spec.ts:13` | asserted |
| FORM-001 | 2 | Consumed confirmation returns already-confirmed | `tests/audience-import/signup.spec.ts:12` | asserted |
| FORM-001 | 2 | Expired link leaves pending state | `tests/audience-import/signup.spec.ts:18` | asserted |
| FORM-001 | 3 | Embed refuses unconfigured origin | none | none |
| FORM-001 | 4 | Submission provides no campaign or flow sending authority | none | none |
| FORM-007 | 1 | Missing/invalid sender is refused before any allowance, claim or consent write | none | none |
| FORM-007 | 2 | Malformed and oversized identity input is rejected | `tests/audience-import/signup.spec.ts:25` | asserted |
| FORM-007 | 2 | Honeypot sends no confirmation | `tests/audience-import/signup.spec.ts:24` | asserted |
| FORM-007 | 2 | Missing disclosure leaves no consent or mail | `tests/audience-import/signup.spec.ts:54` | asserted |
| FORM-007 | 2 | Configured challenge checks all failure modes before capture | none | none |
| FORM-007 | 3 | Concurrent destinations cause one confirmation | `tests/audience-import/signup.spec.ts:26` | asserted |
| FORM-007 | 3 | Network allowance eventually refuses | `tests/audience-import/signup.spec.ts:27` | asserted |
| FORM-007 | 3 | Destination and global counters persist across restart and clamp at ceiling | none | none |
| FORM-007 | 4 | IPv4/mapped forms and IPv6 /64 normalization share budgets | none | none |
| FORM-007 | 4 | Missing/invalid edge IP refuses with no writes | none | none |
| FORM-007 | 5 | Configured challenge validates action, hostname, expiry, reuse and provider failure | none | none |
| FORM-007 | 6 | Ordinary no-key and kiosk-required challenge behaviors | none | none |
| FORM-007 | 7 | Every protected address state has identical acknowledgment | none | none |
| FORM-009 | 1 | Kiosk opens full-screen geometry | none | none |
| FORM-009 | 1 | Email resets blank within five seconds | `tests/go-live/shared-kiosk.journeys.ts:59` | asserted |
| FORM-009 | 1 | Next visitor name is blank | `tests/go-live/shared-kiosk.journeys.ts:44` | asserted |
| FORM-009 | 1 | Next visitor consent is not checked | `tests/go-live/shared-kiosk.journeys.ts:45` | asserted |
| FORM-009 | 2 | No visitor cookies remain | `tests/go-live/shared-kiosk.journeys.ts:60` | asserted |
| FORM-009 | 2 | No local/session storage remains | `tests/go-live/shared-kiosk.journeys.ts:61` | asserted |
| FORM-009 | 2 | Kiosk facts cannot identify the next onsite visitor | none | none |
| FORM-009 | 3 | No-challenge submission is refused | `tests/go-live/shared-kiosk.journeys.ts:35` | asserted |
| FORM-009 | 3 | No-challenge submission creates no contact | `tests/go-live/shared-kiosk.journeys.ts:36` | asserted |
| FORM-009 | 3 | Each browser submission requires new enabled verification | `tests/go-live/shared-kiosk.journeys.ts:46` | asserted |
| FORM-009 | 4 | Thirty browser captures receive accepted responses | `tests/go-live/shared-kiosk.journeys.ts:55` | asserted |
| FORM-009 | 4 | Same-network three hundred captures yield three hundred confirmations | `tests/go-live/shared-kiosk.journeys.ts:67` | asserted |
| FORM-009 | 5 | Confirmed kiosk/device source appears in growth report | `tests/go-live/shared-kiosk.journeys.ts:72` | asserted |
| FORM-009 | 5 | Consent evidence records kiosk and device label | `tests/go-live/shared-kiosk.journeys.ts:73` | asserted |
| FORM-009 | 6 | Marking records actor, time and device once | `tests/go-live/shared-kiosk.journeys.ts:31` | asserted |
| FORM-009 | 6 | Ordinary consent, confirmation and destination allowances apply across kiosk captures | none | none |
| SEG-001 | 1 | Nested any/all groups persist in the saved segment | `tests/audience-controls/segment-journey.ts:47` | asserted |
| SEG-001 | 1 | typed properties selects expected audience | `tests/audience-controls/segment-journey.ts:103` | asserted |
| SEG-001 | 1 | channel consent selects expected audience | `tests/audience-controls/segment-journey.ts:103` | asserted |
| SEG-001 | 1 | topic consent selects expected audience | `tests/audience-controls/segment-journey.ts:103` | asserted |
| SEG-001 | 1 | tags selects expected audience | `tests/audience-controls/segment-journey.ts:103` | asserted |
| SEG-001 | 2 | Count, event-value and currency filters persist | `tests/audience-controls/segment-journey.ts:48` | asserted |
| SEG-001 | 2 | Event-window changes recompute selection | `tests/audience-controls/segment-journey.ts:84` | asserted |
| SEG-001 | 2 | US state selects expected contacts | `tests/audience-controls/segment-journey.ts:77` | asserted |
| SEG-001 | 2 | ZIP selects expected contacts | `tests/audience-controls/segment-journey.ts:103` | asserted |
| SEG-001 | 2 | ZIP distance selects expected contacts | `tests/audience-controls/segment-journey.ts:103` | asserted |
| SEG-001 | 3 | Purchased product membership | `tests/audience-controls/segment-journey.ts:103` | asserted |
| SEG-001 | 3 | Purchased collection membership | `tests/audience-controls/segment-catalog.ts:68` | asserted |
| SEG-001 | 3 | Purchased category membership | `tests/audience-controls/segment-catalog.ts:68` | asserted |
| SEG-001 | 3 | Viewed product membership | none | none |
| SEG-001 | 3 | Viewed collection membership | none | none |
| SEG-001 | 3 | Viewed category membership | none | none |
| SEG-001 | 4 | Human email/SMS click audience within original-time window | `tests/campaign-results/cross-channel-attribution.ts:92` | asserted |
| SEG-001 | 4 | named campaign membership | none | none |
| SEG-001 | 4 | named link membership | none | none |
| SEG-001 | 4 | flow activity membership | none | none |
| SEG-001 | 5 | RFM/lifecycle selection | `tests/audience-controls/segment-journey.ts:103` | asserted |
| SEG-001 | 5 | Prediction conditions select matches and become unavailable below minimum | none | none |
| SEG-001 | 5 | Unavailable catalog is distinct from empty matching membership | `tests/audience-controls/segment-catalog.ts:20` | asserted |
| SEG-001 | 6 | Builder live exact estimate | `tests/audience-controls/segment-journey.ts:39` | asserted |
| SEG-001 | 6 | Summary names every fixture condition | `tests/audience-controls/segment-journey.ts:41` | asserted |
| SEG-001 | 6 | Review intersects every fixture contact | `tests/audience-controls/segment-journey.ts:77` | asserted |
| SEG-001 | 7 | Saved count/value/time/state exact matching membership | `tests/audience-controls/segment-journey.ts:109` | asserted |
| SEG-001 | 7 | Nested operator change narrows audience | `tests/audience-controls/segment-journey.ts:82` | asserted |
| SEG-001 | 7 | Time-window change narrows audience | `tests/audience-controls/segment-journey.ts:84` | asserted |
| SEG-003 | 1 | One customer recency score | `tests/campaign-results/retention-journey.ts:15` | asserted |
| SEG-003 | 1 | One customer frequency score | `tests/campaign-results/retention-journey.ts:15` | asserted |
| SEG-003 | 1 | One customer monetary score | `tests/campaign-results/retention-journey.ts:15` | asserted |
| SEG-003 | 1 | Every customer quintile boundary matches independent calculation | none | none |
| SEG-003 | 2 | Five lifecycle stages match fixture distribution | `tests/campaign-results/retention-journey.ts:14` | asserted |
| SEG-003 | 2 | Method and thresholds visible | `tests/campaign-results/retention-journey.ts:21` | asserted |
| SEG-003 | 3 | Daily boundary recomputes scores and stages | none | none |
| SEG-003 | 4 | Fixture stage distribution | `tests/campaign-results/retention-journey.ts:14` | asserted |
| SEG-003 | 4 | Fixture recency/frequency/monetary customer scores | `tests/campaign-results/retention-journey.ts:15` | asserted |
| SEG-003 | 4 | Independent recalculation of the full documented method | none | none |
| BUILD-008 | 1 | chosen-contact HTML preview | `tests/go-live/presend-checks.journeys.ts:93` | asserted |
| BUILD-008 | 1 | HTML preview escapes the contact name | `tests/go-live/presend-checks.journeys.ts:94` | asserted |
| BUILD-008 | 1 | chosen-contact plain-text preview | `tests/go-live/presend-checks.journeys.ts:95` | asserted |
| BUILD-008 | 1 | chosen-contact preheader preview | `tests/go-live/presend-checks.journeys.ts:96` | asserted |
| BUILD-008 | 1 | mobile preview mode | `tests/go-live/presend-checks.journeys.ts:98` | asserted |
| BUILD-008 | 1 | dark approximation | `tests/go-live/presend-checks.journeys.ts:100` | asserted |
| BUILD-008 | 1 | desktop preview | `tests/go-live/presend-checks.journeys.ts:104` | asserted |
| BUILD-008 | 1 | fallback HTML preview | `tests/go-live/presend-checks.journeys.ts:110` | asserted |
| BUILD-008 | 1 | fallback plain-text preview | `tests/go-live/presend-checks.journeys.ts:111` | asserted |
| BUILD-008 | 2 | missing-alt located advisory | `tests/go-live/presend-checks.journeys.ts:51` | asserted |
| BUILD-008 | 2 | heading-order located advisory | `tests/go-live/presend-checks.journeys.ts:53` | asserted |
| BUILD-008 | 2 | link-text located advisory | `tests/go-live/presend-checks.journeys.ts:54` | asserted |
| BUILD-008 | 2 | spam-wording located advisory | `tests/go-live/presend-checks.journeys.ts:55` | asserted |
| BUILD-008 | 2 | advisories are nonblocking | `tests/go-live/presend-checks.journeys.ts:47` | asserted |
| BUILD-008 | 3 | 95 KB measured body | `tests/go-live/presend-checks.journeys.ts:42` | asserted |
| BUILD-008 | 3 | size advisory names measured size and limit | `tests/go-live/presend-checks.journeys.ts:57` | asserted |
| BUILD-008 | 3 | size advisory identifies the three largest blocks | `tests/go-live/presend-checks.journeys.ts:58` | asserted |
| BUILD-008 | 4 | contrast remains a blocking finding | `tests/go-live/presend-checks.journeys.ts:60` | asserted |
| BUILD-008 | 4 | failed approval creates no recipient steps | `tests/go-live/presend-checks.journeys.ts:70` | asserted |
| BUILD-008 | 4 | corrected revision has no blocking findings | `tests/go-live/presend-checks.journeys.ts:77` | asserted |
| BUILD-008 | 5 | over-limit HTML save reports the named oversized error | `tests/go-live/email-size.journeys.ts:61` | asserted |
| BUILD-008 | 5 | oversize is measured above the byte limit | `tests/go-live/email-size.journeys.ts:63` | asserted |
| DELIV-005 | 1 | delivered count by mailbox | `tests/go-live/mailbox-provider.journeys.ts:58` | asserted |
| DELIV-005 | 1 | bounced count by mailbox | `tests/go-live/mailbox-provider.journeys.ts:58` | asserted |
| DELIV-005 | 1 | complaint count by mailbox | `tests/go-live/mailbox-provider.journeys.ts:58` | asserted |
| DELIV-005 | 1 | unique click count by mailbox | `tests/go-live/mailbox-provider.journeys.ts:58` | asserted |
| DELIV-005 | 1 | total click count by mailbox | `tests/go-live/mailbox-provider.journeys.ts:58` | asserted |
| DELIV-005 | 1 | browser table carries the same Gmail outcome counts | `tests/go-live/mailbox-provider.journeys.ts:71` | asserted |
| DELIV-005 | 1 | Gmail provider attribution | `tests/go-live/mailbox-provider.journeys.ts:59` | asserted |
| DELIV-005 | 1 | Outlook and Hotmail provider attribution | `tests/go-live/mailbox-provider.journeys.ts:59` | asserted |
| DELIV-005 | 1 | Yahoo and AOL provider attribution | `tests/go-live/mailbox-provider.journeys.ts:59` | asserted |
| DELIV-005 | 1 | Apple iCloud provider attribution | `tests/go-live/mailbox-provider.journeys.ts:59` | asserted |
| DELIV-005 | 1 | Other provider attribution | `tests/go-live/mailbox-provider.journeys.ts:59` | asserted |
| DELIV-005 | 2 | invalid-address bounce category | `tests/go-live/mailbox-provider.journeys.ts:59` | asserted |
| DELIV-005 | 2 | mailbox-full bounce category | `tests/go-live/mailbox-provider.journeys.ts:59` | asserted |
| DELIV-005 | 2 | policy-block bounce category | `tests/go-live/mailbox-provider.journeys.ts:59` | asserted |
| DELIV-005 | 2 | reputation bounce category | `tests/go-live/mailbox-provider.journeys.ts:59` | asserted |
| DELIV-005 | 2 | content bounce category | `tests/go-live/mailbox-provider.journeys.ts:59` | asserted |
| DELIV-005 | 2 | other bounce category | `tests/go-live/mailbox-provider.journeys.ts:59` | asserted |
| DELIV-005 | 2 | reason totals reconcile to bounced count for every provider | `tests/go-live/mailbox-provider.journeys.ts:60` | asserted |
| DELIV-005 | 2 | Gmail and Outlook signed bounce categories | `tests/go-live/mailbox-provider.journeys.ts:59` | asserted |
| INT-002 | 1 | Owner Settings connection succeeds | `tests/go-live/woocommerce.journeys.ts:38` | asserted |
| INT-002 | 1 | customer sync stored | `tests/go-live/woocommerce.journeys.ts:49` | asserted |
| INT-002 | 1 | paginated product sync stored | `tests/go-live/woocommerce.journeys.ts:49` | asserted |
| INT-002 | 1 | order sync stored | `tests/go-live/woocommerce.journeys.ts:49` | asserted |
| INT-002 | 1 | refund sync stored | `tests/go-live/woocommerce.journeys.ts:49` | asserted |
| INT-002 | 2 | replay retains complete source records | `tests/go-live/woocommerce.journeys.ts:64` | asserted |
| INT-002 | 2 | one receipt after replay | `tests/go-live/woocommerce.journeys.ts:65` | asserted |
| INT-002 | 2 | conflicting webhook content refuses | `tests/go-live/woocommerce.journeys.ts:68` | asserted |
| INT-002 | 2 | forged provider signature refuses | `tests/go-live/woocommerce.journeys.ts:69` | asserted |
| INT-002 | 2 | foreign store origin refuses | `tests/go-live/woocommerce.journeys.ts:70` | asserted |
| INT-002 | 3 | exact activated revision and event exit once | `tests/go-live/woocommerce-plugin-journey.ts:36` | asserted |
| INT-002 | 3 | one contact tag | `tests/go-live/woocommerce-plugin-journey.ts:37` | asserted |
| INT-002 | 3 | one completion history row | `tests/go-live/woocommerce-plugin-journey.ts:38` | asserted |
| INT-002 | 3 | draft does not enroll | `tests/go-live/woocommerce-plugin-journey.ts:22` | asserted |
| INT-002 | 3 | stale event does not add enrollment | `tests/go-live/woocommerce-plugin-journey.ts:41` | asserted |
| INT-002 | 3 | purchased contact does not add enrollment | `tests/go-live/woocommerce.journeys.ts:84` | asserted |
| INT-002 | 3 | opted-out contact does not add enrollment | `tests/go-live/woocommerce.journeys.ts:94` | asserted |
| INT-002 | 4 | default collection denied | `tests/go-live/woocommerce-plugin-journey.ts:58` | asserted |
| INT-002 | 4 | explicit consent emits declared observations | `tests/go-live/woocommerce-plugin-journey.ts:61` | asserted |
| INT-002 | 4 | GPC withdrawal recorded | `tests/go-live/woocommerce-plugin-journey.ts:65` | asserted |
| INT-002 | 4 | observation sends no customer id or email | `tests/go-live/woocommerce-plugin-journey.ts:62` | asserted |
| INT-002 | 4 | no cross-site observation throughout the plugin journey | none | none |
| INT-002 | 4 | plugin event cannot widen existing Mango subscription evidence | `tests/go-live/woocommerce.journeys.ts:96` | asserted |
| INT-002 | 5 | public signup remains pending before confirmation | `tests/audience-import/signup.spec.ts:8` | asserted |
| INT-002 | 5 | affirmative confirmation subscribes | `tests/audience-import/signup.spec.ts:13` | asserted |
| INT-002 | 5 | confirmation replay does not subscribe twice | `tests/audience-import/signup.spec.ts:12` | asserted |
| INT-002 | 5 | expired confirmation remains pending | `tests/audience-import/signup.spec.ts:18` | asserted |
| INT-007 | 1 | one identified contact retained across replay | `tests/go-live/sync-integrations.journeys.ts:55` | asserted |
| INT-007 | 1 | updated custom contact property retained | `tests/go-live/sync-integrations.journeys.ts:56` | asserted |
| INT-007 | 2 | concurrent client event replay returns one identity | `tests/go-live/custom-event-journey.ts:18` | asserted |
| INT-007 | 2 | one stored custom event | `tests/go-live/custom-event-journey.ts:20` | asserted |
| INT-007 | 2 | conflicting client event content refuses | `tests/go-live/custom-event-journey.ts:19` | asserted |
| INT-007 | 3 | profile lists rule-derived membership | `tests/go-live/custom-event-journey.ts:23` | asserted |
| INT-007 | 3 | membership client lists matching member state | `tests/go-live/custom-event-journey.ts:24` | asserted |
| INT-007 | 4 | missing subscription evidence names the required error | `tests/go-live/sync-integrations.journeys.ts:65` | asserted |
| INT-007 | 5 | key exhausts into 429 while allowed requests remain valid | `tests/go-live/custom-event-journey.ts:40` | asserted |
| INT-007 | 5 | rate-limit refusal code and retry guidance | `tests/go-live/custom-event-journey.ts:41` | asserted |
| INT-007 | 5 | other key remains usable | `tests/go-live/custom-event-journey.ts:43` | asserted |
| INT-007 | 6 | custom-event write retains key attribution and occurrence time | `tests/go-live/custom-event-journey.ts:22` | asserted |
| INT-007 | 6 | public description declares the event-write scope | `tests/go-live/custom-event-journey.ts:10` | asserted |
| BUILD-008 | 4 | approval persists for the corrected and acknowledged revision | none | none |
| INT-007 | 6 | contact create/update write retains its key attribution | none | none |
| INT-007 | 6 | property write retains its key attribution | none | none |
| INT-007 | 6 | consent/subscription write retains its key attribution | none | none |
| INT-007 | 6 | public description covers all named contact and membership operations | none | none |
