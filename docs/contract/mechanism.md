# Mango mechanism and evidence records

This document holds implementation details and original evidence descriptions relocated from the contract. It does not add acceptance proof.

## HOME-001

The installed Lobby and setup-state routes use Base’s shared Lobby. Original routing and identity details: An installed Mango answers its sessionless root (`/`) with Base's shared Lobby (`src/base/lobby.ts`, edition identity in `src/identity.ts`): Mango's mark and name, one line about this newsletter, and one action, “Finish setup” (`/setup`) until the owner has saved the sender identity at first-run setup and “Sign in” (`/signin`) after; `GET /setup/state` answers exactly `{"state":"unclaimed"}` or `{"state":"claimed"}` from the same reading (owner decision, 12 October 2026).

## HOME-002

 is the run site's homepage (`run-mango.com`, built by `rer build --site` from `src/site/pages.tsx`), where the primary action reads “Run Mango” and opens the Run page (`/run`) and no link reaches sign-in; everything else about it is unchanged. The landing is a static page for Mango's default newsletter profile, drawn in one hand-illustrated style. Its header carries Mango's mark and name with links to How it works, Docs (`/docs`) and, on an installed Mango's docs pages, the page's only link named “Sign in” (`/signin`). Its hero headline is the page's only top-level heading; directly under the lead, one line reads “100% free, open source alternative to Mailchimp and Klaviyo” with the two product names in bold and the wording unchanged (the same sentence, as plain text, ends the page's meta description, and `seed.json` `replaces` names both products), naming what Mango replaces without comparing against it; the hero offers “Start your newsletter” (`/docs/install`) and “Read the docs” (`/docs`). Sections then cover how a letter leaves Mango (collect, write, approve, schedule, deliver), consent, approval of the exact letter, scheduling, delivery reports and ownership, followed by a closing call to action; the footer repeats the section links, Docs and (on an installed Mango) operator sign-in and shows the configured deployment owner's name and one-line description. It may show the static credit `Powered by Mango · runeditrun.com` only when the owner enables it in configuration. It describes only capabilities the newsletter profile ships and contains no vendor pricing, testimonials, customer logos, ratings, metrics, cross-store claims, third-party brand logos or telemetry; sample addresses, names, counts and dates inside its drawings are pictures, never records. It reads no operator, contact or campaign record and no session, sets no cookies, is written once by the site build, serves every font, style, icon and image from the site's own origin (its drawings are inline), keeps its own fixed light palette in a dark-themed browser, and stays fully readable without scripts and with reduced motion.

## DOCS-001

The public paths `/docs` and `/docs/<slug>` serve Mango's first-party operator documentation: the Markdown files that `docs/site.json` lists as published, in the sections and order it gives, which is the only navigation, with the first page as the docs home at `/docs` (and `/docs/`). The Markdown is rendered to HTML at build time: a Vite plugin renders each page to static HTML when Vite loads it, in a build and in development, and never in the Worker or the browser. The emitted Worker and client bundles contain no Markdown or syntax-highlighting code, and each page is its own lazily loaded chunk that the Worker renders per request. A page has its title as its one top-level heading, a section sidebar listing the pages in manifest order with the current one marked, an on-this-page list of its sections, previous and next links, and a "Contents" disclosure for narrow screens, inside the public landing's shared header (with Docs marked as the current section) and footer, in the landing's palette, faces and paper drawings. Every Markdown file at the repository root, under `docs/` and as a top-level `<directory>/README.md` is either published or listed in the manifest as not published with a reason, and an unlisted file, a broken link or anchor, a link to a page the site does not publish, raw HTML, an image outside `docs/media/` or an absolute build-machine path fails verification or the build. The pages link to no source repository and offer no edit link. Published pages describe the default newsletter profile and contain no maintainer-only material. The documentation reads no workspace record, session or database row, sets no cookie, runs no analytics or tracking and loads only same-origin resources. An unknown, miscased or nested slug, and `/docs/index`, answer `404` with a short not-found page in the same shared header and footer that links back to `/docs` and `/`; a request for another host is answered as it is for every other path.

## OPER-001

Setup completes through the existing sender-settings authority; valid existing environment identity also counts. This is a navigation gate, not a provider-readiness claim.

## OPER-002

*Policy: `operator.management.v1`; default: any operator may invite with fresh email proof or remove.* Confirmation GET and HEAD remain read-only; affirmative POST supplies the proof.

## OPER-004

An owner assigns each operator one role: *Owner* (everything, including billing-bearing provider connections, operator management and installation erasure), *Admin* (everything except removing the owner and connecting, replacing or disconnecting a billing-bearing provider connection: the sending provider under DELIV-008 and Twilio under SMS-008), *Manager* (approve campaigns, activate and pause flows, manage segments, forms and integrations), *Author* (create and edit drafts, templates, forms and draft flows; request approval; never approve, activate or send), *Analyst* (read reports, campaigns and flows; contact details shown with email and phone masked unless granted) and *Support* (look up a contact, view their history, record an opt-out or erasure request; never subscribe anyone). These six product roles are separate from Base's unchanged owner/admin/member authentication roles. The last product Owner is always protected from removal or demotion. On restore, product authority belongs to the destination installation; source role assignments confer no authority there. CSV export remains Owner/Admin only. Every server function and API route enforces the role; a hidden button is never the control. Role changes take effect on the next request and are audited.

## OPER-005

*Policy: `approval.separation.v1`; default: off.* Existing refusal code: `separation-required`.

## OPER-006

Named providers remain Okta, Microsoft Entra ID, Google Workspace, JumpCloud and sibling Auth; standards are SAML 2.0, OpenID Connect and SCIM 2.0. Pending invitations and sessions revoke within 60 seconds. Real named-vendor tenant receipts belong in the Field proof register, not the standards-fixture acceptance.

## OPER-007

Operators with Owner or Admin role can view, filter (by operator, agent, action, object and date) and export as CSV every operator and agent action: drafts saved, approvals, activations, pauses, imports, exports, erasures, integration changes, role changes, consent edits, signup allowance and kiosk-form changes (FORM-008, FORM-009) and hourly signup refusal summaries (FORM-010). Entries are append-only and survive operator removal with attribution intact; erased contacts appear anonymized (CONT-013).

## STORE-001

Commerce connections use the `commerce.store.v1` extension. INT-001 through INT-007 own individual source doors; INT-015 owns the Shopify merchant installation.

## STORE-004

Failed webhook and generation operations share the failed-sync operation record (`source_sync_runs`, operation `webhook` or `generation`); a webhook keeps its existing HTTP answer so the provider retries it.

## STORE-005

A source type is stale when its last successful sync completed more than 24 hours ago or a sync has failed since it.

## STORE-007

The ingestion-latency bar is 60 seconds from acknowledgment to readable source record.

## CONT-001

Phone numbers are stored in E.164 form.

## CONT-002

Channel states: pending = consent captured and confirmation outstanding; subscribed = eligible consent; non-subscribed = no consent evidence; unsubscribed = opted out; suppressed = blocked by CONT-006 or CONT-013.

## CONT-006

*Policy: `contact.soft-bounce.v1`; default: suppress after three consecutive soft bounces.*

 local authority clarification (CONT-004/006, OPER-001):** Refreshing local session/setup credentials while retaining D1 preserves the effective contact hash authority, including suppression and surviving opt-out records without contact rows. New local installations record a versioned independent contact salt in `.dev.vars`; missing, empty, unknown-version or unversioned authority fails closed. Explicit conversion of a verified legacy session-key installation retains its original effective session authority before rotating authentication credentials. An upgrade must never select a previously unused secret merely because it exists.

## CONT-007

STOP, STOPALL, END, QUIT, CANCEL, UNSUBSCRIBE, OPTOUT and REVOKE are the opt-out family; HELP and INFO request help; START and UNSTOP begin fresh consent. Mobile Message has existing proof; Twilio remains owed by SMS-001.

## CONT-009

Confirmation links expire 30 days after issue. *Policy: `contact.opt-in.v1`; default: confirmation is required on both channels for Mango’s own forms, popups, landing pages and API captures; CONT-025 states each source’s default.* Public confirmation is POST-only.

## CONT-013

Local restrictions use one-way destination hashes keyed with the installation secret. All Base erasure timing, dependent-record deletion, completion and audit-anonymization guarantees remain inherited.

## CONT-029

`audience_portable_hashes` maps the local hash to unsalted SHA-256 of `mango-audience-export-v1:` followed by the destination. This encoding allows dictionary comparisons and stable matching across installations and exports; treat it as sensitive personal data.

## CONT-030

Restore uses source-wide epoch floors. Nonempty legacy row journals are refused before staging. Upgrade 0044 retires legacy journals and transfers after advancing every known source floor; offline copies without current authority cannot reveal later erasure.

## HOME-002

- **HOME-001 policy:** `BASE-PUBLIC-001` to `BASE-PUBLIC-003` govern the landing as an anonymous surface and are neither satisfied nor waived by it. The root and the favicon files claim no rate limiter, so `BASE-ACCESS-003`'s rate-limit sentence is neither claimed nor waived for them. The landing is the deployment's own fixed page, not a page builder for buyers. It links only to its own sections, `/run`, `/docs` and, while the credit is on, the credit, and it does not advertise optional commerce, SMS or AI, per-reader send times or provider-neutral delivery. Its fonts are self-hosted Newsreader and Outfit under the SIL Open Font License, static files from `public/fonts` served at `/fonts/` and declared in `deploy.publicPaths`, so the server-rendered message pages load the same faces; the favicons are static files from `public/`, also declared there. Its drawings are inline and contain no raster or embedded image. Its motion is CSS-only, plays once, runs only without a reduced-motion preference, moves only drawings and never hides content.

## DOCS-001

- **DOCS-001 policy:** `/docs` and `/docs/` are declared in `seed.json → deploy.publicPaths`, which `BASE-ACCESS-003` keeps as the only sessionless paths; `BASE-PUBLIC-001..003` govern these anonymous pages and are neither satisfied nor waived by them. Start renders each page per request from its prebuilt chunk; no Hono route, operator gate or Worker event handler serves them. The slug is looked up as an own property of the manifest's page table, so `__proto__`, `constructor` and every other unlisted segment is a `404`. Markdown is rendered with raw HTML disabled, a link-scheme allowlist and images restricted to `docs/media/`. No rate limiter is claimed for these paths, as for Mango's other public documents (`/`, `/signin`).

## CONT-028

- **CONT-005/009 concurrency:** Public eligibility, contact/profile changes, consent evidence, capture IP, history and pending status commit in one guarded D1 transaction. A destination barred by current consent, suppression or identity guards at that transaction causes no new consent writes. Under the approved CONT-027 rule, a surviving erasure hash with an unsubscribe or erasure reason may recreate an unsubscribed profile holding only new request evidence and send its confirmation email within the shared UTC-day allowance; only the person's own affirmative POST can subscribe it, with no history restored. A surviving suppression hash permits neither consent nor confirmation mail. Confirmation message preparation completes before a database-authoritative handoff check, and the adapter is invoked immediately after that check. Suppression, an opt-out later than the request evidence or confirmation committed before the check prevents handoff. A provider handoff already authorized and concurrently in progress cannot be recalled by a later database transition.

## CONT-009

- **CONT-009 policy:** Opening a confirmation link by GET or HEAD only previews an affirmative POST form. It never writes consent, consumes a token or changes status: mailbox scanners and link prefetchers cannot provide consent. Only a POST with explicit `confirm=true` may confirm. The original 30-day expiry, single-use token, active identity, later opt-out and suppression guards remain mandatory.

## CONT-005

- **CONT-005 public capture policy, as amended by CONT-027 (owner decision, 19 Oct 2026):** Public signup returns the same generic acknowledgment whether or not an address is suppressed. An already subscribed address receives no mail or new consent and is never downgraded. A previously unsubscribed person, including an address with a surviving unsubscribe or erasure hash, may supply new logged post-opt-out request evidence and receive a confirmation email sent to that address, at most three confirmations per destination address per UTC calendar day across public signup surfaces. Only that person's own affirmative POST from the confirmation email resubscribes them; submission, GET and HEAD do not. An exhausted allowance returns the same generic acknowledgment and sends no further confirmation. Nothing bypasses suppression: bounces, complaints, provider or operator suppressions and legal holds remain suppressed, including their surviving hashes, and receive no confirmation mail. Other explicit logged post-opt-out evidence through the ledger remains subject to confirmation and suppression resolution. The CONT-027 Status row records implementation of this approved rule.

## CONT-009

- **CONT-026 / CONT-009:** the former confirmation policy admitted only a URL POST with explicit `confirm=true`. For operator-recorded SMS permission, the confirmation text now asks for YES; only the authenticated Mobile Message callback POST carrying that exact reply and the original confirmation's provider identity confirms the number. A URL cannot confirm that operator-recorded SMS evidence. Email and hosted-SMS URL confirmation retain their explicit POST rule. This target amendment's conflict with CONT-009's retained link wording is named in its Gap pending ct's text ruling; no clause sentence is narrowed.

## PROP-001

*Policy: `proposal.selection.v1`; default: rank by expected revenue where this deployment has enough of its own attribution history (RESULT-003) to estimate it, then by the earliest send-by instant; proposals with neither rank last.*

## PROP-006

configured knowledge, supplied to `ai.provider.v1`

## AUD-003

*Policy: `audience.exclusions.v1`; default: exclude a contact from a product campaign for seven days after purchasing that product, while a refund or return of it is unresolved, and while the contact is dormant under a twelve-month dormancy window (CONT-012).*

## AUD-004

*Policy: `audience.frequency.v1`; default: 24 hours since the contact's last marketing email and 72 hours since their last marketing SMS.*

## CAMP-006

*Policy: `campaign.send-time.v1`; default: resolve every step against the store time zone and the operator-selected local time.*

## CAMP-012

It is served without a session at `/media/<sha256>` on this deployment with its exact content type, `X-Content-Type-Options: nosniff`, an immutable public cache and no cookie, answers 404 for an unknown name, and is rate-limited per image at the limit in `seed.json`, not per client address, returning 429 without affecting other images.

## DESIGN-001

The design module is disabled while both `DESIGN_PROVIDER_API_KEY` and `DESIGN_PROVIDER_ORIGIN` are absent; supplying either requires both, and startup fails naming what is missing.

## DESIGN-003

the candidate images and the layout are stored in R2 as authoring evidence and exported with everything else (DATA-001).

## CAMP-019

`seed.json → limits.maxTestSendsPerDay`

The owner can change the limit by editing `maxTestSendsPerDay` in the source and rebuilding/redeploying; there is currently no Settings control for it.

## AUD-008

under `audience.exclusions.v1`

## CAMP-021

**CAMP-021 start-and-adopt policy:** Every signed-in operator can create a blank newsletter without AI or commerce, or select an available starter derived from this deployment's recorded store signals, and reach the same editable Review in at most three clicks from Campaigns. Decision Desk “Use this” reuses its linked campaign or atomically adopts an unlinked, unexpired proposal once. Creating, selecting and saving never approve or enqueue delivery. Incomplete drafts may be saved; approval names missing content. Rich text is the default, with an optional HTML mode preserving allowed authored markup in the canonical form saving stores (CAMP-022 policy). Rich text keeps only unstyled markup, so emails containing images or inline styles and presentational attributes use HTML editing, which also avoids fetching remote images during authoring.

## CAMP-022,CAMP-003,CAMP-020

**CAMP-022 canonical-save and CAMP-003 preview policy:** Draft create/save normalizes the managed unsubscribe and postal footer once, derives plain text with actual destination URLs, and persists that normalized revision for preview and approval. Create/save also stores the email body in canonical form (13 October 2026): it is parsed with the WHATWG HTML parsing algorithm (parse5) as the content of `<body>` with scripting off, as mail clients read it, and the tree is written back with the HTML fragment serialization algorithm, so every element is closed explicitly where parsers keep it, attribute values are double-quoted, character references are decoded (text escapes only `&`, `<`, `>` and no-break spaces; attribute values `&`, `"` and no-break spaces), comments stay comments and personalization tokens stay exactly as written. This is parse and serialize only: it never changes a style declaration or the value of an attribute it keeps, never removes what the checker refuses (comments, refused tags and attributes stay and are refused), and never refuses a body for how it is written. What parsers drop is absent from the stored body as it is from every recipient's tree: of an attribute written twice the first is kept, and attributes on a closing tag, or a tag parsers ignore where it stands (a cell or row outside a table, a `<body>` tag) together with its attributes, are gone; the checker then judges exactly that tree, so a hiding style is still refused, never repaired. The stored form parses back to itself, so saving it again stores the same bytes: an HTML `pre`, `textarea` or `listing` whose text starts with a line break is written with the extra one parsers drop, and nothing follows the text of an HTML `plaintext` element (neither its end tag nor its ancestors'), which parsers never close and which would turn the managed footer into its text on every save (the body is stored without the footer and refused at approval for the tag and the missing footer). Because writing a tree out and parsing it again can build a different tree (an element moved out of a table into a MathML text integration point changes namespace, and raw text becomes markup), the body is parsed and written again until its written form parses back to itself before the managed footer is placed after it, and a save is repeated on its own result until it stores what it read, so saving the stored body, or the body the editor shows (the stored body with every managed footer removed), stores the same bytes for every input. Every body tried settles within two rounds; one that has not settled after sixteen is refused with `invalid_email_body` (400) rather than stored in a form the next save would change. *Replaced behavior (13 October 2026, hardening):* the footer was appended to a body after one round of parsing and writing, so for such a body the first save placed it inside an element and the next save moved it (`<math><mtext><table><mglyph><style><li style="color:#ffffff">` stored the footer inside the list item, then after the math element), a managed footer written with single quotes ahead of the content moved to the end on the second save (now the first save stores it there), a `plaintext` inside SVG's own `plaintext` grew on every save, and an SVG or MathML element named `template` failed the save; such bodies were and remain refused at approval. *Security consequences:* none weakened: saving stays parse and serialize only, the checker judges the stored tree as before, and approval binds bytes that a later save of the same draft cannot move. *Replaced behavior (13 October 2026):* such a body was refused with a 400 instead of saved, and a draft stored before canonical saving that held one could not be saved at all. The plain-text part is derived from the same parse. The saved-revision preview renders the validated set: it shows the saved body with its styles when the approval checker passes it, and shows a failing body unstyled with its warning. Existing approval content/link checks remain strict for every stored revision. Editing inclusion and exclusion controls changes version-1 structured rules and refreshes counts from real contacts and source evidence. Missing or stale commerce blocks the result with unavailable counts; superseded requests cannot replace a newer rule's count.

## CAMP-004,PROP-006,PROP-007

**CAMP-004 policy:** Missing subject, message body, preheader or sender identity remains a named approval blocker. Optional AI/commerce absence does not block a manually authored mail-only audience; required source dependencies still block. Explicit Decision Desk generation uses configured AI and deployment-owned evidence, with unavailable/failed states and no semantic fallback. SendGrid follows the single-attempt and sender-evidence requirements above.

## CAMP-006

**CAMP-006 policy:** The editor uses local dates and times in the configured IANA store zone, independent of the browser zone, shows read-only resolved UTC instants, and defaults the deadline to 23:59 on the chosen local day. UI and API reject nonexistent and ambiguous local times, including non-hour DST transitions, until the operator chooses an unambiguous time. Existing API clients supplying an explicit resolved instant and IANA zone remain compatible; local and UTC values, when both supplied, must agree.

## CAMP-012,CAMP-023

**CAMP-012 policy (13 October 2026):** `/media/` is declared in `seed.json → deploy.publicPaths`. The image is the rate-limit key declared for this public path under `BASE-ACCESS-003` (`limits.mediaRequestsPerMinutePerAsset`, twice the declared email hand-off rate), because mailbox image proxies fetch for many recipients from few addresses. Upload is `POST /api/campaign-assets` with the image as the single `file` part of a multipart/form-data body, under an operator session and the same-origin check; the response names the image's public URL, `/media/<sha256>`, and the same image is also served at `/media/<sha256>.<ext>` with its stored type's extension (`png`, `jpg` or `jpeg`, `gif`, `webp`; another extension is 404). A file must run to its format's end marker (PNG IEND, JPEG EOI, GIF trailer, WebP RIFF length), so a truncated upload is refused. In HTML mode the email editor's **Insert image** uploads one file through this route and writes `<img src width height alt>` at the cursor, sized from the server's reading of the header and scaled down to the 600px email width when wider; the description (alt text) is required. Design import (DESIGN-004) uploads its photos with `?source=design-import`, which the image record keeps (`upload` otherwise). There is no deletion route, and the database refuses to change or delete an image record. The rate counter is the only write a fetch makes, and it holds a count for the current minute, nothing about the requester; it is outside the contact-erasure write fence for that reason.

## CAMP-012

**Security consequences:** `/media/` is a new anonymous surface serving operator-uploaded bytes. Only the four raster types are accepted, checked by header and never decoded by Mango; they are served with the stored type, `nosniff` and `Content-Security-Policy: default-src 'none'; sandbox`, so an upload cannot be served or sniffed as HTML, SVG or script on Mango's origin. A file with a valid header is stored as uploaded; the recipient's mail client decodes it. It is not a tracking channel: every recipient gets the same URL, the route records no address, user agent, cookie, recipient or per-request time, these campaign image fetches are never counted as opens (Apple Mail Privacy Protection prefetches images anyway); the separate opt-in pixel is governed by RESULT-002. Images are public by design: the SHA-256 name is unguessable, but an image in a sent letter can be fetched by anyone holding it, and an uploaded image cannot be withdrawn in this release, so operators upload only what they would publish. Contact erasure scans every stored object, campaign images included, for an erased contact's exact id, address or phone in readable bytes such as image metadata, and removes a matching image's bytes; the record stays, `/media/` answers 410 for it and approval names it missing. Pixels are not inspected. Unknown names cost one database read and write nothing; anyone holding an image URL can spend that image's allowance for the rest of a minute, which shows a broken image to recipients fetching it then (the MSG-010 trade-off). Each fetch of a known image writes its rate counter, so anyone holding one image URL can make up to that per-minute limit of database writes for it, which counts against the deployment's D1 write quota or bill. The pixel limit is checked on the header's declared size; Mango never decodes the image, so a recipient's client may decode a larger image than the header declares. Erasure's 410 reaches only requests that come to this deployment: copies already held under the immutable year-long cache by browsers, mailbox proxies or CDNs keep the image. While a contact erasure is pending or restore mode is on, `/media/` answers 503 like the other public paths. Saved revisions keep absolute image URLs, so a restore onto another origin keeps pointing at the original origin.

## CAMP-023

**Copies running on a computer:** a local copy's public origin is `http:` (`rer dev`), so its own images are `http://<host>:<port>/media/<sha256>`. A draft may hold exactly those: saving, the editor's import and the preview pass the deployment's own origin to the MSG-009 checker, which then also admits an `img src` that is that origin plus a `/media/` image path, keeps the preview's validated styles, and after the operator opts in to images adds that origin to the preview's image policy beside `https:`. Approval, test send and delivery never pass it, so they refuse those images and name the reason: approval needs images at an HTTPS address, so a designed email is approved from an HTTPS deployment. *Security consequences:* nothing changes on an HTTPS deployment, where own images are already HTTPS; on a local copy the exception covers only the deployment's own origin and media path, never another `http:` host, and never reaches a recipient.

## DESIGN-004,DESIGN-014,DESIGN-013,DESIGN-012

**DESIGN-004 policy (13 October 2026):** The operator runs `12ui draft` and `12ui convert <candidate.png> --engine api --output layerdoc --model fast` on their own machine and account, then chooses **Import 12ui design** in the draft's email editor. Mango reads only LayerDoc version `"2"` (at most 2 MB, 2,000 layers and 64 levels of nesting, counted with an explicit stack before the layer schema reads the tree, so a deeply nested file is refused by name rather than overflowing the stack; anything else is `invalid_layout`, never guessed) and a PNG whose shape matches the LayerDoc canvas. It lays the design out as a 600px centered table: header emblem and lettering, full-width or two-column photo sections (two cells of one row, vertically centered on each other as the design draws them), one bulletproof button, and the footer, all in the tightened MSG-012 grammar: the email's outer wrapper is the one cell of a full-width table and carries the design's page color (only cells paint), images keep their inline box aligned to the bottom of their line instead of a `display`, and the button's fill and rounded corners are its cell's, with the radius held to the cell's 32px side padding (at the button's height any larger radius draws the same pill). Text is HTML-escaped, and the wrapper sets `overflow-wrap:anywhere`, so a design word too long for its column wraps inside it; colors are used only when they are `#rgb`/`#rrggbb` and are moved to at least 4.5:1 against their background; type faces map to two fixed stacks (Georgia or Helvetica); sizes and spacing are Mango's own. Icons, dividers, shapes, links with no destination, a second button, footer links and any footer line with a digit (the address the design invented) are left out and listed. Design text containing `{{` or `}}` is refused, so a design cannot write personalization or managed tokens. A line counts as from the brief only when the whole line appears in the brief as whole words, ignoring case, spacing and typographic quotes; the brief starts as the draft's name, subject, preheader and sender name and the operator may edit it. Photos are cropped from the full-resolution PNG on a canvas at up to twice their displayed width, encoded as JPEG and uploaded through `POST /api/campaign-assets`; no image codec runs in the Worker. The compiled body is checked with the approval checker and BUILD-012's measured per-part UTF-8 size limit before it reaches the editor: at most 102,400 bytes for each of the HTML and plain-text parts, from `seed.json → limits.maxEmailHtmlBytes` through `src/core/features/campaigns/email-size.ts`. This supersedes this policy's historical 20,000-character save cap of 13 October 2026. The server re-measures at save, approval, test send and delivery; oversize content is refused without truncation, and a recipient whose hand-off exceeds the limit is skipped under BUILD-012. Replacing a body that already has content asks for confirmation first. The change summary beside the editor shows a thumbnail of every hosted image, loaded from its own `/media/` address, so the operator sees the pixels recipients will see (the PNG is checked only for the LayerDoc's shape, so a different candidate of the same size crops the wrong pixels), and highlights an image description (it becomes the alt text) that is not in the brief; it says whether the imported body is saved yet or has been edited since, and disappears when Discard changes restores the earlier body. The importer's code loads only when the operator opens it.

## DESIGN-004,DESIGN-014,DESIGN-013,DESIGN-012

**Security consequences:** the LayerDoc and PNG are untrusted operator files. No LayerDoc value reaches the email unmatched: text is escaped, colors must match a closed hex shape and are rewritten, font names select one of two fixed stacks, and the signed 12ui URLs a LayerDoc carries are never fetched by the browser or the Worker. Import itself uses no 12ui key and makes no request to 12ui; generating designs inside Mango is the optional design module (DESIGN-001 to DESIGN-003), with its own declared external (`seed.json → externals → design-provider`) and the BASE-DATA-005 policy below. Images uploaded by an import that is then abandoned stay stored and public under CAMP-012. *Residuals:* the design's words are model-written and can make claims the operator never made; highlighting lines not in the brief and the operator's review are the safeguard, and approval never verifies marketing claims. Two-column sections stay side by side on phones, narrowing with the email: without `display` (MSG-012) only table cells hold a row of columns, and there are no media queries; until the grammar was tightened (13 October 2026) they stacked on phones as inline blocks. Real inbox rendering is unverified.

## DESIGN-002,DESIGN-003,DESIGN-010,DESIGN-009,DESIGN-008,DESIGN-007,DESIGN-011,DESIGN-006

**DESIGN-001 to DESIGN-003 policy (13 October 2026):** The adapter `design.provider.v1` (`src/core/platform/adapters/twelve-ui.ts`) calls 12ui's hosted `/api/v1` with plain `fetch` and `Authorization: Bearer <DESIGN_PROVIDER_API_KEY>` at `DESIGN_PROVIDER_ORIGIN` (`https://12ui.com`): `POST /api/v1/create` claims a run and buys nothing (`concept`, `aspect: portrait`, `mode: inspiration`, slots `a` to `d`); `POST /api/v1/create/<run>/candidates/<slot>` buys one image; `GET` reads the run and each candidate PNG; `POST /api/v1/convert` (multipart: the chosen PNG, `output=layerdoc`, `model=fast`) buys the layout; `GET /api/v1/convert/<id>` reads the operation and then its LayerDoc, which must match the SHA-256 12ui publishes and parse as LayerDoc version 2 (anything else is `invalid_layout`). Every `POST` carries `Idempotency-Key: mango-design-<run>-draft`, `-draft-<slot>` or `-layout-<slot>`, and `-layout-<slot>-<round>` for a layout the operator asks for again after a failed layout step (`layout_round`, migration 0042), so a new try is one new purchase and never a replay of the failure. Queue commands `design.draft` and `design.layout` carry only the run's ID; each pass makes only the requests the run's state still needs, stores each candidate PNG as it lands (read with a streamed 40 MB cap, refused unread when its declared length is larger, and at most 4,096 pixels a side, checked by its header, as campaign images are, since the editor decodes it to crop photos), and re-enqueues itself after 5 seconds until the run settles. Every JSON answer (a run, a purchase, a convert operation) is read with a streamed 64 KB cap in the same way, so no answer from 12ui is read without a limit; a larger one is `provider_invalid`. Consumers are idempotent and run under the contact-erasure write fence and restore mode like every queue command. Every request has a deadline: 30 seconds, 60 for a candidate image or LayerDoc download, and 150 for a candidate purchase, which answers once the image is drawn (past it the next run read says what happened). A 429 that names a time to ask again (`Retry-After`) delays the run that long with the same idempotency keys, recorded as its wait (`wait_code`, `retry_at`, migration 0041) and shown in the editor as a calm, muted alert with the time relative to now, kept until 12ui answers the request that follows (past that time the editor says Mango is asking again, so the panel never flips back to ordinary progress while a retried request is unanswered; once 12ui answers, the wait is cleared and the editor shows the run's ordinary progress), and fails it as `provider_quota` when that time is past its deadline; a 429 without a time (the daily allowance) or a 402 (the wallet) fails it at once as `provider_quota`; a network failure, a 5xx answer or a request past its deadline is retried on up to three passes 5 and 10 seconds apart (shown as a status line with the time, cleared in the same way), then fails as `provider_unavailable`, so a service that stops answering fails a run within about two minutes (five while a purchase is drawing); a refused key, request or unreadable answer fails at once (`provider_unauthorized`, `provider_rejected`, `provider_invalid`; a redirect is followed only by a read and only on the configured origin, so a redirect elsewhere, or one answering a purchase, is `provider_invalid` and the key never leaves for another host); a candidate or layout 12ui could not make is `provider_failed`, and an expired layout operation `provider_timeout`. The every-minute (`* * * * *`) cron fails runs past their deadline as `provider_timeout` and re-enqueues live runs that have been quiet for two minutes and are not waiting for 12ui's time to ask again; reading a draft's run applies the same deadline, so a copy without a cron also settles. A new run cannot start while another run of the draft waits on the service (a run on offer may still prepare a layout meanwhile). Starting a run never sets aside an earlier one: the status route returns the latest run and, as `earlier`, up to ten older runs whose drawn designs are still on offer (`choosing`, `preparing`, `ready`, or `failed` with designs drawn), which the editor shows, with their own **Use this design** buttons, under **Earlier designs** (the operator may fold them away), and the brief dialog says the designs already on offer stay. A `failed` run with drawn designs can still be chosen from: choosing after a failed layout step increments `layout_round`. In the editor, **Use this design** beside a candidate's image chooses it (or opens the import path for the design already prepared, buying nothing); once the layout is ready the import path opens as the continuation of that choice only if the operator has pressed no key, pointer or wheel in the tab since (the awaited design is kept per tab in sessionStorage, so a reload while preparing keeps it); otherwise the run shows a notice whose button opens it, and nothing opens or moves focus while the operator works. The run stays `ready` while its design is only an unsaved edit, and the editor records it `applied` once the draft is saved with that design (or an edit of it); closing the import path keeps the run on offer. Each candidate also links to its full-size image. Operator routes, all behind the session and same-origin checks: `GET` and `POST /api/campaigns/:id/design-jobs`, `POST /api/design-jobs/:id/choose`, `POST /api/design-jobs/:id/close` (`discarded` by the operator, `applied` by the editor once the draft is saved with the design), `GET /api/design-jobs/:id/candidates/:slot/image` and `GET /api/design-jobs/:id/layerdoc`. Records: `design_jobs` and `design_candidates` (migration 0040, with the wait columns of migration 0041 and the layout round of migration 0042) and R2 `design-jobs/<run>/`; `design_jobs` briefs are redacted by contact erasure like campaign text. Shown estimates use 12ui's list prices of 12 October 2026 (about $0.03 per candidate and $0.05 per fast layout; free within 20 images and 50 layouts a day); Mango sets no cap of its own (decision D6a). A copy running on a computer reads both inputs from `.dev.vars` (decision D8a), and its queue consumer runs design commands only; every other command is left for retry, unconsumed as on a copy before this module. `deploy.json` declares both inputs as secrets marked `"optional": true`. Mango's deploy step (`scripts/installer/deploy-declaration.mjs`) hands the unchanged rer deploy kit a declaration under `.rer/declarations/` holding the required secrets plus each optional one whose environment input is set, so `deploy` uploads them once the owner sets them (on the first deploy or a later one), never requires them, and later deploys keep them; `rer verify` serves the build without them, so the module stays off there. Setting them with `wrangler secret put` works too.

## DESIGN-005

**BASE-DATA-005 policy (13 October 2026, deliberate requirement change):** 12ui's packages name Just Every as their author and Mango's public source is `just-every/run-mango`, so the literal baseline text would forbid any request to it. Replacement requirement: the deployment makes no request to the marketplace or the seed author. A design service the owner configured with the owner's own credentials in the default-off design module (DESIGN-001), contacted only for a design run an operator started, is not a request to the seed author: it is the owner's own provider, called on the owner's account at an operator's request. Those requests are the run's candidate purchases and reads, the layout of the candidate an operator chose, and the cron's resumption of those same runs, and they carry only the DESIGN-003 data. There is still no telemetry, phone-home, license check or kill switch: with the module absent Mango makes no request to 12ui at all; nothing is sent at startup, on a schedule of its own or about anything but an operator's run; and a 12ui refusal or outage fails only that run. *Security consequences:* the owner's 12ui key is a Worker secret, never sent to the browser, logged or exported; an operator whose product role permits design authoring under OPER-004 can spend from the owner's 12ui account within its wallet and daily allowance, with an estimate before each paid step and each request recorded (RESULT-004); the brief and the chosen image leave the deployment for 12ui and its sub-processors (OpenAI, fal.ai, Google, Cloudflare), and 12ui may keep them in its evaluation corpus until the account owner asks for deletion; 12ui learns that, and when, this deployment designs email. *Residual:* 12ui's terms forbid sharing a key and do not address a personal key held as a server secret that teammates use; that remains between the owner and 12ui.

## DESIGN-011

**Security consequences:** design generation adds one declared outbound flow (`seed.json → externals → design-provider`, BASE-DATA-004). 12ui's answers are untrusted: run and operation shapes are validated, downloads are read with a streamed size cap and follow no redirect off the configured origin, candidate images must be PNGs within the byte and pixel limits, the LayerDoc must match its published digest and pass the import parser, and its values reach the email only through the DESIGN-004 compiler and the MSG-009/MSG-012 checker. 12ui's own error text is never stored or shown; the editor shows Mango's reason for each failure code. Candidate PNGs and the layout are served only to signed-in operators; only the crops the operator uses become public `/media/` images (CAMP-012). *Residuals:* the design's words are model-written (highlighted for review, never verified); a run can buy candidates nobody uses; the 15-minute deadline can fail a slow but healthy run, whose purchase is still recorded.

## AUD-010

**AUD-010 derived-summary and CAMP-002 saved-revision policy:** The audience rule shown in campaign review, approval checks, the scheduled page, campaign lists and audience snapshots is the plain-text summary derived from the structured inclusion and exclusion rules that select recipients. It includes every condition, comparison, value and lookback, with the same field labels as the editor and explicit all/any matching. The composer shows that summary live and does not author audience prose. Every newly saved revision stores its derived summary; caller-supplied audience text is ignored as authority. Earlier revisions display the derived summary without rewriting immutable approval records. Readiness requires valid structured rules, and approval continues to bind the exact saved rules.

## MSG-001

- **MSG-001 — Sender identity.** Every email uses the configured business display name, From address, reply-to address, and physical postal address; every SMS uses a sender registered for the recipient's country.

## MSG-002

- **MSG-002 — Email authentication.** A marketing email cannot be scheduled unless the mail adapter reports SPF, DKIM, and DMARC passing for the sending domain and the visible From domain aligns with an authenticated domain.

## MSG-003

- **MSG-003 — Email unsubscribe.** Every marketing email carries a visible unsubscribe link and an opaque per-recipient HTTPS `List-Unsubscribe` URL with `List-Unsubscribe-Post: List-Unsubscribe=One-Click`; DKIM covers both headers. The one-click URL accepts a context-free HTTPS POST body of `List-Unsubscribe=One-Click`, does not redirect, and applies CONT-004 before returning success. The visible link opens a page that applies CONT-004 on a single confirming action and never on page load, so a mailbox scanner or link prefetcher cannot unsubscribe anyone. Both paths are idempotent under repeats, need no session or cookie, and reveal no contact other than their own.

## MSG-004

- **MSG-004 — SMS permission.** An SMS is eligible only when its phone number is subscribed for the recorded consent scope and the SMS adapter confirms an approved sender for that recipient's country. For every permitted sender and jurisdiction, the adapter must be able to receive and enforce the standard opt-out and help keywords in CONT-007; otherwise SMS is blocked for that recipient.

## MSG-005

- **MSG-005 — SMS opt-out.** Every marketing SMS carries the configured program identity and `Reply STOP to unsubscribe`, or the jurisdiction's required equivalent, and the configured frequency disclosure where required. An opaque unsubscribe URL may be additional but never replaces reply-based opt-out. Review shows the exact compliance text and resulting segment count.

## MSG-006

- **MSG-006 — Links.** Scheduling is blocked when a destination link is malformed; uses a scheme other than HTTPS or the contact schemes MSG-013 admits (`http:`, `javascript:`, `data:`, `file:` and every other scheme block); or resolves, on the link itself or on any redirect it follows, to a host outside the allowed link hosts MSG-014 sets out. Image sources must be HTTPS on an allowed host. Review names every blocked link with the scheme or host that blocks it, and offers MSG-015's allow action for each blocked host. Approval (CAMP-004), flow activation (FLOW-008), the link inspector and tracking (RESULT-005) apply this one rule.

## MSG-007

- **MSG-007 — Content checks.** Review names blocking and advisory content findings per channel. An operator can acknowledge an advisory finding; the consent, sender registration, opt-out, authentication, link, personalization, and reputation checks are blocking and cannot be overridden.

## MSG-008

- **MSG-008 — Personalization.** Every personalization token carries a fallback value. A bare token is refused by the authoring checks and blocks approval and scheduling even when every current eligible contact resolves it, because the audience can change before send. When a contact has no value for a valid token, its saved fallback is rendered and the count of eligible contacts using a fallback is shown in review.

## MSG-009

- **MSG-009 — Email body.** Every marketing email is sent as multipart/alternative with an HTML part and a plain-text part carrying the same offer, links, and unsubscribe link, plus the preheader text set on the revision. Operator-authored HTML is saved as the WHATWG HTML parser reads it and transmitted exactly as saved within the allowed tag, attribute, and inline-style set and within the size limit BUILD-012 derives from delivery, which admits no script, form, stylesheet, class, or CSS function. The single exception is the responsive block BUILD-010 generates from builder settings: no author writes it, saving regenerates it, and the checker judges the email with and without it. One checker, reading the stored body with that parser, decides approval, test send, and delivery; the preview renders the HTML sanitized per BASE-INPUT-002 from the same parse and keeps its styles only when that checker passes, and the plain-text part is derived from the same parse.

## MSG-010

- **MSG-010 — Unsubscribe availability.** The unsubscribe path answers within 2 seconds and is rate-limited per unsubscribe token at the limit in `seed.json`, not per client IP address. The token is the rate-limit key declared for this public path under BASE-ACCESS-003, so mailbox-provider requests for unrelated recipients cannot consume one another's allowance; an exceeded token allowance returns 429 without affecting other tokens.

## MSG-011

- **MSG-011 — Sending reputation.** Once a sending domain has at least 1,000 marketing deliveries in the reporting window, scheduling a marketing email from it is blocked while provider-reported complaints divided by delivered marketing emails are at or above 0.3%, or hard bounces divided by attempted marketing hand-offs are at or above 5% (RESULT-006). A provider's stricter block applies at any volume. The block names each numerator, denominator, reporting window, and provider rule, cannot be acknowledged away, recomputes when late facts arrive, and clears only when every applicable threshold is below its limit.

## MSG-012

- **MSG-012 — Hidden or deceptive presentation.** Authored presentation cannot hide or disguise content. Approval, test send, and delivery judge the tree mail clients build from the stored body. Only table cells and the email's outer wrapper paint a background, no element changes its display, and nothing in the grammar can carry text out of the table cell that holds it, so every text run is drawn on the background of its nearest table cell that paints one, or outside any on the wrapper or the white page; they are blocked, with the reason named, when text sits below 3:1 contrast against that background (text on the wrapper also against the white page, since a block does not hold what overflows it) in standards or quirks rendering, when a style hides, clips, fades, shrinks below 10px, moves, overlays, or reverses text, when presentation stands where the grammar does not admit it (a background outside a table cell or the outer wrapper, any display, a width or height that could make a box smaller than its text, a border on an inline element, a rounded painted corner over the text it holds, right-to-left text outside a cell, overlapping styled cells), when styled markup is not written the way HTML parsers build it, or when markup is written in a way mail clients read differently from how it looks. The unsubscribe link and postal address fall under the same rule.

## MSG-013

- **MSG-013 — Contact links (`mailto:`, `tel:`, `sms:`).** Besides HTTPS, a link destination may be one of these:
  - `mailto:` with exactly one address that passes CONT-001's address check and, optionally, `subject` and `body` parameters. `cc`, `bcc`, any other parameter and several addresses block.
  - `tel:` with one phone number, in E.164 form (`+1…`) or as a 10-digit US number, with visual separators allowed.
  - `sms:` with one such number and, optionally, a `body` parameter.
  - The builder's link tool (BUILD-001) offers Web, Email, Phone and Text links as first-class kinds and writes these forms; the HTML view accepts them as written.
  - A contact link has no host, so it needs no MSG-014 entry. It is never rewritten for tracking and records no click (RESULT-005). The plain-text part shows its address or number. Review lists every contact link with its decoded address or number, subject and body, and MSG-006's malformed-link check applies to each. Image sources stay HTTPS only.
  - *Acceptance:* a draft with `mailto:hello@myshop.example?subject=Order%20question`, `tel:+15555550123` and `sms:+15555550123?body=Hi` approves. Review lists each contact link decoded, and the delivered HTML and plain text carry each one unchanged and unrewritten. `mailto:a@x.example,b@x.example`, `mailto:a@x.example?bcc=c@x.example`, `tel:call-me`, `javascript:alert(1)` and `http://myshop.example` each block approval with the reason named.
  *Status:* done. `tests/go-live/contact-links.journeys.ts` exercises the link tool and authored HTML through saved review, exact-revision approval and provider-edge delivery, with decoded destinations at desktop and phone widths and no tracked-link or click fact for contact links.

## MSG-014

- **MSG-014 — Allowed link and image hosts.** Settings → Link hosts lists every allowed host with the source it came from. The list starts populated, so a store's normal email needs no settings change:
  - *Deployment:* this deployment's own host (its `/media/` images follow the MSG-006 policy).
  - *Connected stores:* each connected store's storefront domains (primary and additional) and the hosts its synced catalog uses for product, collection and image URLs. From INT-001 these are, for example, `myshop.com`, `www.myshop.com` and `cdn.shopify.com`; WooCommerce, BigCommerce, Stall and the other store connections (INT-002 to INT-006) contribute theirs the same way. They are refreshed on each catalog sync.
  - *Social links:* the web hosts of every network the BUILD-001 social links block offers (for example `www.instagram.com`, `www.facebook.com`, `www.tiktok.com` and `www.youtube.com`). The block's icons are served from the deployment's own media, so they add no image host.
  - *Brand kit:* the website and social link hosts named in the brand kit (BUILD-003).
  - *Operator entries:* hosts typed in settings, allowed from review (MSG-015) or allowed from a move-in report (MOVE-011).
  - *Matching:* each entry is an exact host, unless an operator explicitly enters a subdomain entry such as `*.myshop.com`, which covers every subdomain of `myshop.com` but not `myshop.com` itself. Approval, flow activation, the link inspector and tracking use this one matching rule.
  - *Changes:* removing an entry is recorded and keeps it removed, so a later store sync does not re-add a host an operator removed. Disconnecting a source removes its derived entries from later checks. Every change is in the activity log (OPER-007). An allowed host still passes the rest of MSG-006: redirects are followed and checked, and private-network addresses and unreachable links still block.
  - *Acceptance:* on a fresh installation with a connected Shopify edge store, settings lists the deployment host, `myshop.com`, `www.myshop.com`, `cdn.shopify.com` and the social link hosts, each with its source. A campaign with a catalog product block (a `cdn.shopify.com` image and a `myshop.com` link), a social links block and `mailto:` and `tel:` footer links (MSG-013) approves with no settings change. A `shop.myshop.com` link blocks until an operator adds `*.myshop.com`, and then passes. `myshop.com.evil.example` still blocks. A host the operator removed is not restored by the next store sync.

## MSG-015

- **MSG-015 — Allow a blocked host from review.** Campaign review and flow activation list each blocked host with the links that use it.
  - An operator whose role may approve (Manager, Admin or Owner; OPER-004) can choose **Allow this host**, or the subdomain entry for its domain, beside it. The host joins MSG-014's list with the source `allowed in review`, the campaign or flow and the operator. The change is recorded in the activity log (OPER-007), and the checks run again at once.
  - An Author sees the blocked hosts and can request approval, with the blocked hosts named for the approver, but cannot allow a host.
  - Contact links (MSG-013) never need this. A host allowed this way still passes every other MSG-006 inspection.
  - *Acceptance:* a link to an unlisted `partner.example` host blocks approval with the host named. An Author's session shows no allow action, and the route refuses it with 403. A Manager's **Allow this host** clears the block, approval passes, and the activity log records the Manager, the host and the campaign. A MOVE-011 imported Mailchimp template with links to three outside hosts reaches review with those three hosts listed, each with the allow action.

## SEND-001

- **SEND-001 — Provider hand-off.** Email uses `mail.sender.v1` and SMS uses `sms.sender.v1`. Every recipient-step carries a provider-effective idempotency key derived from the campaign, revision, step, and contact. Mango stores the provider message identifier before treating it as handed off. A timeout or lost response becomes `handoff-unknown` and is reconciled by provider lookup before any retry; an adapter whose deduplication retention cannot cover the campaign deadline and reconciliation window cannot pass CAMP-004. A retried job, redelivered queue message, or resumed dispatch therefore never produces a second provider message.

## SEND-002

- **SEND-002 — Quiet hours.** SMS is handed off only inside the recipient-local legal and provider-required windows. The recipient time zone is resolved from recorded location evidence with its source and freshness, never substituted with the store time zone; an unknown or stale zone blocks hand-off; the US area-code evidence SMS-003 defines counts as recorded location evidence. Legal and provider windows are mandatory minima that a policy cannot weaken. *Policy: `sms.quiet-hours.v1`; default: defer until the next allowed instant at or before the step's send-by instant (CAMP-010), otherwise skip and record `quiet-hours-deadline`.*

## SEND-003

- **SEND-003 — Throttling and progress.** Dispatch paces hand-offs to the provider and carrier rate limits in `seed.json`. Campaign status shows the estimated completion instant and updates the handed-off, delivered, skipped, and failed counts within 30 seconds of each change.

## SEND-004

- **SEND-004 — Transport failure.** A transient provider or network failure on a recipient-step is retried up to 5 times over 1 hour with increasing delay, except that `handoff-unknown` is reconciled rather than retried. A permanent rejection or exhausted retry budget marks that recipient-step failed with the provider's error and campaign detail shows it; a hard rejection, complaint, or provider suppression also updates CONT-006 atomically before another hand-off.

## SEND-005

- **SEND-005 — Provider-event identity.** Every signed provider webhook is stored once as an immutable fact using the strongest identity that adapter declares: provider event identifier where supplied, otherwise provider message identifier, event kind, provider event time or version, and a stable payload digest. Replaying or reordering delivery, bounce, complaint, suppression, and SMS reply facts produces the same derived delivery disposition and contact state, and an older fact never downgrades a later provider disposition.

## SEND-006

- **SEND-006 — Delivery truth.** A recipient-step has a transport disposition of queued, handoff-unknown, handed-off, accepted, delivered, bounced, skipped, or failed, plus independent complaint and suppression facts. *Delivered* is recorded only from a provider fact asserting delivery; provider acceptance is never reported as delivery. A later complaint remains visible without erasing the earlier delivery fact, and a skipped disposition carries its reason.

## SEND-007

- **SEND-007 — Partial completion.** A campaign becomes completed only once every recipient-step has a terminal transport disposition; `handoff-unknown` is not terminal. Its summary keeps delivered, skipped, failed, bounced, complained, and suppressed totals separate and never sums them into a single success figure. Later complaint or suppression facts update the completed campaign's summary and the contact ledger.

## SEND-008

- **SEND-008 — Resumable dispatch and reconciliation.** Dispatch survives worker eviction, redeployment, and restart: it resumes from recipient-steps without a terminal transport disposition, sends nothing twice (SEND-001), and needs no operator action. At the reconciliation interval in `seed.json`, it queries the provider for handoff-unknown and other unresolved messages and imports missed provider facts. After the provider's declared lookup window expires, an unresolved message becomes failed with `outcome-unconfirmed`; it is never counted as delivered or retried blindly. A campaign never remains dispatching with no work or reconciliation in progress.

## SEND-009

- **SEND-009 — Provider outage.** When hand-offs to a provider fail transiently for 5 continuous minutes, or the adapter reports the provider unavailable, the affected campaign channel moves to paused and no recipient hand-offs are attempted on it. The adapter runs a bounded health probe or non-recipient canary at the reconciliation interval in `seed.json`; a successful probe resumes dispatch automatically, subject to CAMP-010 and AUD-005. The pause and provider error are shown on campaign detail, and each operator is emailed once as soon as the mail provider is available.

## RESULT-001

- **RESULT-001 — Campaign history.** Operators can list campaigns by state and channel, open the approved revision, and inspect its audience snapshot, delivery timeline, cancellation, and per-channel outcome totals.

## RESULT-002

- **RESULT-002 — Engagement.** Clicks and store conversions are shown as observed events. Open tracking is off by default; when an operator enables it, opens are labeled privacy-sensitive estimates and never support a confidence, deliverability, or attribution figure.

## RESULT-003

- **RESULT-003 — Attribution.** Revenue attributed to a campaign names the qualifying store event and attribution window, is reported separately from any forecast, and is assigned at most once per order. *Policy: `campaign.attribution.v1`; default: the most recent non-automated tracked click in the seven days before purchase wins; a cancellation or refund subtracts the corresponding attributed amount.*

## RESULT-004

- **RESULT-004 — Cost.** Each AI call and provider hand-off records the external provider, model or channel, billable units, and reported cost; totals are visible by campaign and by day.

## RESULT-005

- **RESULT-005 — Link tracking.** A tracked link is rewritten to an opaque per-recipient-step redirect on this deployment that records the request and forwards to the original URL. The redirect sets no cookie, loads nothing, and carries no address, name or contact ID in the destination URL; the only thing it adds is CONT-018's opaque, expiring click token, and only to a connected store's storefront host. Known mailbox security scanners and bot requests are retained as automated events but excluded from engagement and attribution. An operator can disable tracking per campaign, which sends the original URLs and records no clicks. Contact links (`mailto:`, `tel:`, `sms:`; MSG-013) are never rewritten and record no click.

## RESULT-006

- **RESULT-006 — Deliverability reporting.** Per sending domain and SMS sender, Mango shows the delivered, bounced, complained, and failed counts and the resulting hard-bounce and spam-complaint rates over the reporting window in `seed.json`, and the rates MSG-011 is currently evaluating.

## RESULT-007

- **RESULT-007 — Click map, per-link clicks and clicker lists.** Each tracked link in a sent campaign or flow message is identified within its revision by position and destination, and every click fact records the link it came from. Campaign and flow-message reports show, per link, total and unique non-automated clicks, plus the automated requests retained but excluded (RESULT-005). They show this as a table and as a click map over the saved revision's preview. Each link opens the list of contacts who clicked it, with first and last click times. An operator whose role permits it (OPER-004; masked for Analyst) can export that list as CSV or start a segment from it (SEG-006). Unique counts count each contact once per link and per campaign. Erased contacts leave only anonymous counts (CONT-013). *Acceptance:* a seeded send has three links; some recipients click one link twice, and a known scanner requests every link. The report shows each link's total and unique clicks, with the scanner excluded. One link's clicker list equals the seeded clickers and exports as CSV with the same rows, and a segment started from it holds exactly those contacts.

## RESULT-008

- **RESULT-008 — Recipients per outcome.** Each sent campaign and flow message lists its recipients by outcome: delivered; bounced, hard or soft, with the provider's reason; complained; unsubscribed from this send, by link, one-click or reply, with the time; skipped, with the SEND-006 reason; and failed, with the provider error. Each list can be filtered, exported as CSV and used to start a segment, under the role and masking rules of RESULT-007. Its counts equal the campaign's totals (SEND-007), and erased contacts leave only anonymous counts (CONT-013). *Acceptance:* a seeded send has one hard bounce, one complaint, one unsubscribe from the message and one quiet-hours skip. Each contact is listed under its outcome with the reason, the CSV export matches the lists, and every list count equals the campaign summary.

## DATA-001

- **DATA-001 — Export contents.** The export contains every contact, source record, consent record, suppression and surviving opt-out record (CONT-013), proposal, campaign, revision, audience decision, message, recipient-step outcome, attribution event, setting, and audit entry as JSON, and every uploaded campaign asset as its original file.

## MGMT-001

- **MGMT-001 — Signed first-owner admission.** A claim is bound to the trusted management issuer, installation, configured app origin and owner email, expires promptly, and can initialize an installation only once. GET and HEAD never initialize it. Admission uses ordinary Base operator-auth and its native owner session. An existing installation cannot claim another first owner.

## MGMT-002

- **MGMT-002 — Native owner editor.** Only an active native owner receives a short-lived editor grant. The frame loads from the exact configured management origin and trusts messages only from that frame and origin. Anonymous visitors receive no widget. Logout, authorization loss and grant expiry remove it. Compiled visual edits apply after the real route leaf has hydrated. Mango product authority follows OPER-004's six roles (Owner, Admin, Manager, Author, Analyst and Support), separately from Base's unchanged owner/admin/member roles. The last product Owner is always protected, and product authority on restore belongs to the destination installation. CSV export remains Owner/Admin only.

Command contract 1 retains CONT-004/006 private contact authority during explicit local recovery. Ambiguous legacy state and conflicting authentication configuration fail visibly without changing data or private settings. Confirmed reset is an explicit destructive local operation; source, exports and deployment receipts remain intact. DATA-001 excludes signed owner-claim admission authority along with other authentication credentials.

## RESULT-005

- **RESULT-005 policy (13 October 2026):** Campaign images served at `/media/<sha256>` (CAMP-012) are not tracking: every recipient's email carries the same image URL, a fetch records nothing about who asked for it (no address, user agent, cookie, recipient or time; only the per-image rate counter for the current minute), and an image fetch is never counted or shown as an open. Tracked links remain the click and attribution evidence. Separately, RESULT-002 permits an operator to enable privacy-sensitive open estimates in Insights; this is off by default. Future marketing email preparation then adds a signed, recipient-specific first-party `/o/:token` pixel; ordinary `/media/` images remain untracked. Image requests establish only privacy-sensitive estimates, never reads or evidence for clicks, conversions, delivery, confidence, deliverability or attribution. Disabling revokes every previously issued pixel; re-enabling admits only newly prepared messages. Repeated pixel requests record at most one estimate per recipient-step, no IP address, user agent or cookie. Private open tokens and facts are retained until contact erasure removes them.

## MSG-006

- **MSG-006 policy:** an image or link whose address is exactly this deployment's `/media/<sha256>` is checked against its record and stored object directly, with no DNS lookup and no request to the deployment's own hostname (Cloudflare restricts same-zone subrequests). A missing image blocks approval and is named. Every other destination keeps the network inspection.

## RESULT-004

- **RESULT-004 policy (13 October 2026):** A design run records `external_cost_facts` rows with provider `12ui`, operation `design-draft` (tier `standard`, one billable unit per candidate image bought) or `design-layout` (tier `fast`, one unit), and the draft's campaign ID, once per idempotency key: a candidate image when 12ui answers its purchase or a later read of the run shows the slot bought (a purchase whose answer timed out counts once 12ui shows it happened, and never otherwise), and the layout when 12ui answers the convert request. 12ui's API reports no per-request price, so the reported cost stays empty; campaign and daily totals count these units with the other costs.

## SEND-001

- **SEND-001 policy:** Mango durably fences each recipient-step before an at-most-once SendGrid handoff. Success stores the provider message ID. A definite nonacceptance (including a rate-limit rejection) is retry-safe within the existing deadline; no accepted or uncertain handoff is automatically retried. Timeouts, connection resets, HTTP 408 and 5xx, missing message IDs, and eviction after the handoff fence remain `handoff-unknown`, presented as **uncertain · operator review required**. A correlation key is not provider deduplication.

## SEND-008

- **SEND-008 policy:** Restart, redelivered queue jobs, and resumed dispatch preserve the fence and never resubmit uncertain messages. Reconciliation correlates the submission ID with signed SendGrid event message IDs and Activity data where available. Unavailable Activity access or an expired lookup window leaves uncertainty visible for operator review rather than authorizing another send or inventing a delivery/failure. Operators review receiver evidence and provider IDs; no automatic retry control is exposed for uncertainty.

## MSG-012

- **MSG-009 and MSG-012 policy (13 October 2026; tightened the same day by owner decision):** Besides the unstyled tags and attributes listed under "Email authoring and preview" in README.md, operator HTML may carry a `style` attribute on any allowed tag and these presentational attributes: `table` `role="presentation"`, `width`, `cellpadding`, `cellspacing`, `border="0"`, `align` (`left` or `center`); `td`/`th` `align`, `valign`, `bgcolor`, `width`, `dir` (`ltr` or `rtl`); `div` `lang` and `dir`; `img` `border="0"`. A `style` value is at most 600 characters of `property: value` declarations drawn only from letters, digits, spaces, `#`, `%`, `.`, `,`, `:`, `;`, `-` and quotes, so no comment, escape, entity, function (`url()`, `calc()`, `expression()`), at-rule, block, custom property or `!important` can be written, and a property may appear once. Values are judged decoded, as mail clients read them, and a style or presentational attribute written with a character reference (other than the `&quot;` the canonical form writes for a quote) is refused as written. Property names are written in lower case; values are compared in lower case, as CSS keywords and hex colors are. Allowed properties (`email-style-declarations.ts`): `color` and `background-color` as hex colors (background also `transparent`); `font-family` as a stack of ordinary text faces from a fixed list (Arial, Helvetica, Verdana, Georgia, Times New Roman, Courier New and similar; no symbol or redaction fonts) ending in `serif`, `sans-serif` or `monospace`; `font-size` 10–72px; `font-weight`; `font-style`; `line-height` `normal`, unitless from 1 to 3 or 10–120px, and a pixel line height never below the text size; `letter-spacing` `normal`, `0` or −2px to 10px; `text-align`; `text-decoration`; `text-transform`; `vertical-align`; `width`, `min-width`, `max-width` and `height` in px, % or `auto`; `padding` and `margin` 0–80px (margin also `auto`); `border` as 0–8px solid, dashed or dotted with a hex color; `border-radius` 0–40px; `border-collapse`; `table-layout` `auto` only; `white-space` (normal or nowrap); `word-break`; `overflow-wrap`. Every other property and value is rejected, including `display`, `table-layout: fixed`, `position`, offsets, `z-index`, `float`, `opacity`, `visibility`, `overflow`, `max-height`, `clip`, `transform`, `filter`, `direction`, `unicode-bidi`, `text-indent`, `background`, `background-image` and `mso-hide`. *Where presentation may stand* (`email-placement.ts`; each rule is a step of the argument under *Security consequences*): (1) only a table cell (`td`, `th`) paints a background, by `background-color` or `bgcolor` (a declared `background-color: transparent` paints nothing whatever `bgcolor` says), and the email's outer wrapper, the first `div` at the top level of the body that sets a `background-color`; no other `div`, no table, row, inline element or other element may set either. A cell's background fills its box and the cell grows to hold everything in it; any other element's background covers only part of what it holds (an inline's line boxes, not the blocks inside it), which is how the last bypass hid its text. The wrapper is a block, which does not hold a line too long for the screen or a table floated out of its bottom, so text on the wrapper is judged on the white page around it too (readability below). Mango's design compiler instead writes the page color on the one cell of a full-width table around its 600px column, which needs no second color, and an author can do the same; (2) no element declares `display`, so every element keeps its native display, every cell is a table cell; (3) `width` and `min-width` only on tables, cells and images, and `max-width` only on tables and images: in automatic table layout (fixed layout is not in the grammar) a table never narrows below its content and a cell's width is only its least width, so both grow to hold what they contain, and images hold no text, while a width on any other box, or a maximum width on a cell (a real limit in browsers), could make it narrower than its text; (4) `height` only on tables, rows, cells, images and empty boxes: a table part with its own display treats a height as its least height, images hold no text and an empty box (a rule drawn as a border) holds nothing, while any other box with a height lets what it holds run out below it (text onto whatever follows its cell, an image over the text below); (5) a table or image whose width or minimum width is a percentage (style or `width` attribute) sets no left or right margin, padding or border, which would come on top of its share of the room and push it out of its cell; (6) inline elements (`span`, `strong`, `b`, `em`, `i`, `u`, `s`, `a`) set no border: an inline box's top and bottom borders take no room in its line, so a top border paints over the line above, drawn earlier (an inline element's padding paints nothing, since it has no background); (7) a cell that paints a background rounds its corners by at most its padding on the left and right, or on the top and bottom (its own style padding, else its table's `cellpadding`, else the browser's 1px), so nothing it holds sits in a corner the rounding leaves unpainted; (8) `dir="rtl"` only on a table cell or inside one: right-to-left content wider than its box runs out on the left, past the left edge of the email, where no reader can scroll, while a cell grows to hold it; for the same reason a table is not aligned `right` (a right float wider than its room runs out on the left); (9) in styled markup the cells of one table may not cover the same slot where a row span meets a column span (`email-table-slots.ts`, the HTML table processing model): browsers draw both, and the later paints its background over the other's text; (10) a pixel line height is never below the text size it sets (unitless ones are at least 1), so no line is shorter than its text and no glyph spills out of its cell; fixed table layout, where a cell keeps its width and its text runs out of it, is refused, so every table is laid out automatically. Other spacing (`padding`, `margin`, block borders, `cellpadding`, `cellspacing`) and `white-space: nowrap` stay: they take room in layout, which the cell around them grows to give. *Readability* (`email-presentation.ts`): every text run must reach 3:1 contrast against the background of its nearest ancestor table cell that paints one; outside any painted cell, against the outer wrapper's color and the page's white `#ffffff`, or the page's white alone outside the wrapper; in every color it may take: its own declared or inherited `color`, default `#000000`, or the browser's `#0000ee` for a link with an address (visited links are darker and read wherever it does; an anchor without an address inherits its parent's color, as browsers show it). Many mail clients render a body without a doctype in quirks mode, where a table does not inherit `color`, so text in a table that sets no color between the table and the text must also reach 3:1 in default black. No text renders below 10px, headings included (they scale with the text around them, and a quirks-mode table starts again from 16px; the smaller size counts); an image's styled width or height must be at least 2px; and the direction override characters U+202D and U+202E in text are refused, since they reverse the letters readers see as `unicode-bidi:bidi-override` would while screen readers, search and the plain-text part read them in written order (embeddings and isolates, U+202A to U+202C and U+2066 to U+2069, only set direction, as `dir` does, and pasted right-to-left names carry them). The unsubscribe link and the postal address are text runs under the same rule, so they are visible on their own background. Mango's design compiler aims for 4.5:1. When a body uses any of this presentation, it must be written the way HTML parsers build it: every element closed in order where parsers keep it (no implicit closing, table foster parenting, misnesting, or a tag parsers ignore or rename; a `tbody` parsers add around table rows is the one allowance), so the cell each text run is judged in is the one recipients see in quirks and standards rendering alike. The canonical form saving stores always meets this (CAMP-022 policy); the earlier unstyled grammar keeps its looser nesting. Anything outside this set is rejected, never repaired. BUILD-010's generated responsive block is the one named exception, and it is never authored text. *Replaced behavior (13 October 2026, owner decision "Tighten the style rules"):* the grammar first let any element paint a background and admitted `display` (block, inline, inline-block, table, table-cell, table-row), fixed table layout, widths and heights on any element, borders on inline elements, a table `bgcolor` and a table aligned `right`, and judged text against its nearest declared background. Keeping that sound took modeling which elements paint behind which descendants (`email-ink.ts`) and laying every body out across a 600px column with measured glyph widths to follow text that could leave its box (`email-geometry.ts`, `email-geometry-boxes.ts`, `email-glyph-widths.ts`, the generated glyph table and `scripts/measure-email-glyphs.mjs`). Each modeling round leaked a new hiding family; the last was an element set `display:inline` with a background, which paints none behind the block inside it, so white text inherited into that block was judged against a black background no browser paints and reached recipients white on white, with approval, test send, delivery and the styled preview passing. Now the grammar removes what the modeling followed, the modeling is removed with it, and readability is the one contrast check above. A rule kept from before still needs its own small model: a pixel line height is compared with the text size inherited through the tree. The narrower set refuses a background on anything but `td`/`th` and the outer wrapper (whose text must now also read on white), every `display`, `table-layout: fixed`, `width` and `min-width` outside tables, cells and images, `max-width` outside tables and images, `height` outside table parts, images and empty boxes, any border on an inline element, a table `bgcolor`, `align="right"` on a table, `dir="rtl"` outside a cell, a percentage-wide table or image with side spacing, a rounded painted cell padded less than its radius and overlapping styled cells; `dir` is newly allowed on cells. The structure rule that kept blocks out of phrasing elements and table parts in their tables for styled markup went with inline backgrounds: the parser places table parts, and the written-as-parsed rule stays. Text is no longer judged against every background it could land on, since it can land on none but its own. *Security consequences:* hiding by color has one place to happen and one check. The only painted boxes are table cells and the wrapper; a cell's background fills its whole box (rounded corners are padded clear); a cell and its table grow to hold everything inside them, and what the wrapper cannot hold lands on the page, against which its text is judged too; and nothing inside can be sized, displayed, positioned or bordered so as to leave its cell or be painted over (inline borders, overlapping cells), so the background behind every text run is read from the tree alone, in standards and quirks rendering: sound by construction rather than by modeling. This was compared with Chromium's rendering pixel by pixel (every glyph made transparent, in quirks and standards mode at 800px and 375px) on every earlier bypass family, the adversarial suite and the new grammar's edge cases: no approvable body hid a word. There is still no remote load other than `img src` and link `href`, both inspected under MSG-006; no style can express an at-rule, so no CSS tracking channel exists. *Residuals:* text that runs past the right edge of the email (a long word or a table wider than a phone) lands on the page, where it is read like any other text, but a reader must scroll to it; a large unitless `line-height: 1` can let a few pixels of tall glyphs overlap the line above, which stays readable; list markers (not authored text) can hang outside a cell when a list's padding is removed; padding on a link or cell makes a large tap target, but its visible label is still required and its destination is still inspected under MSG-006; clients render differently (classic Outlook ignores `border-radius` and `max-width`; dark mode recolors), so approval binds the exact bytes, not every client's look; a personalization value can be longer than its fallback, and its cell grows to hold it; the checker is security-critical code with adversarial tests in an executed spec that consumes `tests/support/adversarial-email.mjs` (see Evidence) (shared cases in `tests/support/adversarial-email.mjs`, which `scripts/prove-email-preview.mjs` also saves and previews in a browser). The renderer and `messageRendererVersion` are unchanged, and every revision that was valid under the earlier unstyled grammar remains valid, so no approved plain revision needs re-approval, except markup the earlier checker read differently from mail clients (parsing policy below). A revision approved under the styled grammar before it was tightened (unreleased, so in practice only on review copies) that uses what is now refused is refused at test send and delivery with the reason named and needs a new approval; a design imported before is imported again, since it was built with inline blocks, block images and a table background. Move-in import keeps its stricter unstyled output.

## MSG-016

- **MSG-009, MSG-012, MSG-016 and CAMP-022 parsing policy (13 October 2026):** One parser reads every email body: parse5, an implementation of the WHATWG HTML parsing algorithm that runs in the Worker and the browser, reading the body as the content of `<body>` with scripting off, as mail clients do, and keeping personalization tokens whole as written (`src/core/features/campaigns/email-html-parse.ts`). The approval checker (`inspectEmailHtml`, used by approval, test send and delivery), the preview sanitizer, the plain-text part and the editor's switch to HTML mode all walk that tree. *Replaced behavior:* the checker walked tags with its own tokenizer, which read `< /span>` and `</ span>` as closing tags while HTML parsers read text and a comment and keep the element open, so text styled to be hidden passed approval while recipients saw it hidden; the plain-text part was derived with regular expressions and dropped text such as `1 < 2 and 3 > 2` that the HTML part shows. Refused as written, with the place named: tag-level parse errors (malformed tags, comments and doctypes), unquoted attribute values, attributes parsers drop, any tag outside the grammar wherever parsers place, rename or ignore it (the attributes of a `<body>` tag, which a document parser applies to the whole email, included), comments, and for styled markup any difference between the markup as written and as parsed. Character-level parse errors (a missing semicolon after a character reference, a control character) are read as parsers read them, as before, and so is a `<` that starts no tag (`< p>`, `< /span>`), which every parser shows as text. Text below 10px is now refused in unstyled markup too, because the tree shows a heading nested inside a heading. Saving stores the canonical form (CAMP-022 policy), so every revision saved from now on reads the same in every HTML parser, in quirks and standards mode; markup that differed only in how it was written (an element left open, a reference in a style) is approvable once saved, because its saved form states the structure recipients see. Normalization never changes a declaration: a style that hides text is stored as written and refused. Delivery transmits the stored bytes unchanged (managed tokens substituted, tracked hrefs rewritten, as before) and never re-serializes them, so the exact approved revision is what is sent; delivery checks those bytes again with the same parser. *Revisions approved before this change* stay deliverable byte for byte and are not normalized, since that would change approved bytes: the earlier checker admitted only quoted attributes, no comments and, for styled markup, explicit in-order nesting, which the parser reads as written (the 12ui design compiled before this change, with implied table bodies and HTML-escaped quotes, is delivered unchanged under test). Refused at delivery, needing a new approval, are only revisions that used a close tag written `</ tag>`, which every parser reads as a comment, that wrote an attribute on a table cell or row outside any table, which parsers ignore together with its attributes, that set unstyled text below 10px with nested headings, or that wrote a direction override character (U+202D, U+202E). A `< tag>` or `< /tag>` the earlier reader took for a tag is text to mail clients and is delivered as approved, with the element it meant to close left open, as recipients always saw it; unstyled text has no presentation for the placement rules to refuse and no background to hide against, so the tightened MSG-012 rules refuse no earlier plain approval. Link and image addresses are judged decoded; besides the earlier rules they may not contain a literal `"`, `<`, `>` or no-break space. Drafts saved before this change are stored in canonical form on their next save, whichever fields that save changes; no draft is refused for how its body is written. *Security consequences:* the checker, preview and plain text no longer disagree with HTML parsers about structure, and saved bodies give clients that do not implement the HTML parser (classic Outlook's Word engine) explicit structure. *Residuals:* the renderer still substitutes tokens and rewrites tracked `href` values in the stored string; values are HTML-escaped and attributes in the canonical form are double-quoted, so a substitution stays inside its text or attribute value. The move-in importer keeps its own tag reader to reduce foreign HTML; its output is stored in canonical form and judged by this parser before approval. parse5 and its `entities` dependency are security-critical third-party code, pinned by the lockfile. *Dependency:* `parse5` ^8.0.1 (MIT; maintained; the parser jsdom, Angular and rehype use; passes the html5lib tree-construction tests; pure ECMAScript modules with no Node API, so it runs in workerd and browsers) adds about 154 KB minified (43 KB gzip) to the Worker and to the campaign editor's client code. The browser's own parser is unavailable in the Worker, Cloudflare's HTMLRewriter tokenizes without building the tree, and htmlparser2 does not follow the parsing algorithm.

## DATA-002

**DATA-001 implementation:** Maintained Base portability archives all product D1 rows and original R2 assets, with staged restore into an empty maintenance-mode destination. Authentication credentials, sessions and transfer bookkeeping are excluded; operator profiles remain attribution only. Restore requires matching privately backed-up contact/link keys, explicit confirmation and fresh destination Base authentication. Mango adapts the journal to source-wide erasure floors (CONT-013), deliberately refusing all older archives against current authority and refusing nonempty legacy journals before staging; current post-erasure exports remain restorable with matching authority.

## CONT-014

Original evidence: `tests/go-live/sync-integrations.journeys.ts` · `src/core/features/integrations/contacts.ts`

## CONT-015

Original evidence: `tests/go-live/sync-integrations.journeys.ts` · `src/core/features/integrations/contacts.ts` · `src/core/features/lifecycle/email-consent-scope.ts`

## CONT-017

Original evidence: `tests/audience-controls/contact-history.spec.ts` — “[CONT-008] [CONT-017] a contact profile combines identities, properties, segments and original source, consent, suppression, eligibility, delivery and operator facts with masked role views”: identities and merges, per-channel consent/topic evidence, properties and rule-derived segment membership; form, order, conversion, click, SMS-reply and consent facts in original time/source order; Analyst and Support masking, axe, overflow and hydration at 1440/390.

## CONT-018

Original evidence: `tests/shopify/connection.spec.ts`

## CONT-019

Original evidence: `src/core/features/sms/signup.ts` · `tests/audience-import/signup.spec.ts`

## CONT-021

Original evidence: `src/core/features/audience/erasure` · `tests/audience-import/erasure.spec.ts`

## CONT-022

Original evidence: `src/core/features/audience/ui/contact-merge.tsx`

## CONT-024

Original evidence: `tests/move-in/archive.journeys.ts` account-export registration via `tests/move-in/incumbent-journey.ts` (Verify move-in): attestation, restrictive states, native export/restore, revocation and retained audit fact; campaign review records eligible contacts relying on that evidence at 1440/390. `tests/portability.spec.ts` (Verify main 4/6 for DATA-001; main 5/6 for erasure authority) proves populated native restoration.  `tests/go-live/contact-links.journeys.ts` (Verify go-live 1/9) extends the source attestation to the three CSV source presets and both API edge exports.

## CONT-025

Original evidence: `tests/go-live/shared-kiosk.journeys.ts` via `tests/go-live/opt-in-journey.ts` — hosted default and single capture, accepted-only capacity, protected resubscription, Admin/Author/Manager/Support permissions, future-only mode changes, activity and Settings at 1440/390; `tests/go-live/sync-integrations.journeys.ts` — API capture fixed double mode, one confirmation and replay; `tests/portability.spec.ts` — native policy restore.

## CONT-026

Original evidence: `tests/go-live/sync-integrations.journeys.ts` via `tests/go-live/manual-entry-journey.ts` — Author hand entry, permission method/time/wording and properties, default confirmation, operator-recorded single mode, exact-message signed SMS YES replies, restriction reasons, Support/Analyst 403 and 1440/390 form/evidence/absent controls; `tests/portability.spec.ts` — operator evidence restore; the same hand-entry journey proves evidence, profile and SMS-sidecar erasure

## CONT-027

Original evidence: `tests/go-live/resubscribe.journeys.ts` · `src/core/features/audience/public-capture-writer.ts` · `src/core/features/audience/confirmation-handoff.ts`

## FORM-001

Original evidence: `src/core/features/audience/signup-routes.ts` · `tests/audience-import/signup.spec.ts`

## FORM-007

Original evidence: `src/core/features/audience/signup-security.ts` · `tests/audience-import/signup.spec.ts`

## FORM-008

Original evidence: `tests/go-live/shared-kiosk.journeys.ts` via `tests/go-live/signup-capacity-journey.ts` — 600 hosted captures on 200 networks, 100-request minute bursts, 200 bot attempts, duplicate claim, shared network, unchallenged isolation, Owner/Admin settings and 1440/390; `tests/audience-import/signup-security.spec.ts`; `tests/audience-import/signup-reservation-clock.spec.ts` — actual D1 admission interval across minute rollover — global last slot, IP grouping and token replay/expiry; `tests/audience-import/signup-reservation-clock.spec.ts` — database admission clock; `tests/portability.spec.ts` — populated upgrade and capacity restore.

## FORM-009

Original evidence: `tests/go-live/shared-kiosk.journeys.ts` · `src/core/features/audience/signup-routes.ts` · `src/core/features/audience/ui/kiosk-signup-page.tsx` · `migrations/core/0075_kiosk_forms.sql`

## FORM-010

Original evidence: `tests/go-live/shared-kiosk.journeys.ts` — shared kiosk / refusal screens at 1440 and 390; `tests/go-live/signup-refusal-screens.ts`; `tests/audience-import/signup-security.spec.ts` — “security: durable global allowance advances monotonically, reserves its last slot atomically and survives restart”; `tests/audience-import/signup-reservation-clock.spec.ts` — D1 clock; `tests/go-live/resubscribe.journeys.ts` — fourth destination request; `tests/go-live/sync-integrations.journeys.ts` via `tests/go-live/activity-log.ts` — hourly summary.

## SEG-001

Original evidence: `tests/audience-controls/segments.spec.ts` — “AUD-001 AUD-002 AUD-007 CAMP-004 nested saved segments select exact contacts by count, event value, window and state at 1440/390; copied rules remain immutable”, via `tests/audience-controls/segment-journey.ts`: nested all/any builder, every summary condition, live estimate, exact per-contact review and approved membership at count/value/time/state boundaries; properties, tags, consent/topics, ZIP/distance, RFM and bought products through review; builder and review at 1440/390 with overflow and accessibility assertions. Collections and categories bought: `tests/audience-controls/segment-catalog.ts` (same case) syncs a Shopify catalog through the sync door (collection IDs drained across pages, taxonomy categories, uncategorized products recorded as null); before the catalog is recorded both conditions report unavailable with no count; the builder at 1440/390 nests US state with an any-group of bought collection and bought category, its plain-text summary names both and its live estimate equals review; review intersects each condition with every contact (bought from the collection on its second page, only from another collection, in the category, only in other categories, in the category only in a future order, no purchase), and after Shopify removes a product from the collection its earlier buyer leaves on recount; review at 1440/390 with overflow and accessibility assertions. `tests/audience-controls/segment-fixture.ts` supplies contacts through scoped integration and products and purchases through Shopify sync; no direct rows. `tests/campaign-results/performance.journeys.ts` — “[REPORT-002] [RESULT-005][RESULT-003][REPORT-003] campaign filters, exact CSV rows and optional open estimates at 1440; native commerce and cross-channel attribution at 1440 and 390” (via `tests/campaign-results/cross-channel-attribution.ts`) selects a contact by a human email or SMS click in the last 7 days through the campaign-authoring audience door and no longer once those clicks are older.

## SEG-003

Original evidence: `tests/campaign-results/results.journeys.ts`, `tests/campaign-results/retention-journey.ts`

## FLOW-001

Original evidence: `tests/go-live/roles.journeys.ts` via `tests/campaign-authoring/flow-journey.ts` (Verify go-live 6/9): three-message welcome graph with split, unreachable-node validation and repair, keyboard pan/zoom, saved revision reload and 1440/390 accessibility/overflow/hydration; all node-kind explanations, named loop/unended-path validation and delay-cycle acceptance; Author saves, Analyst reads, Support named 403. `tests/portability.spec.ts` (Verify main 4/6 for DATA-001; main 5/6 for erasure authority) exports/restores the draft revision with prior data.

## CONT-018

Onsite storage names: the first-party cookie is `mgo_s`; the tracked destination parameter is `mgo_c`. Shopify signed login identity is `logged_in_customer_id`. Shopify permission checks are `analyticsProcessingAllowed`, `marketingAllowed` and `saleOfDataAllowed`; WordPress uses WP Consent API `statistics`/`marketing`; the snippet consumes the banner consent call. The token uses a CSPRNG, base64url encoding and SHA-256-only persisted digest. The Shopify app proxy binds its signed `shop`; plugin and Stall bind their signed connection, and the snippet binds requesting Origin. A storefront-login/form identification replaces click identity. Active-on-site ends after 30 minutes idle. The outbound queue and Shopify observation-log retention are 30 days; identified Mango onsite event retention is 90 days. Tracking carrier requests never carry credentials to the Mango deployment.

## CONT-024

Incumbent fields preserved as supplied: Mailchimp `OPTIN_TIME`, `OPTIN_IP`, `CONFIRM_TIME`, `CONFIRM_IP`, `LAST_CHANGED`; Shopify `emailMarketingConsent`/`smsMarketingConsent`, `single_opt_in`, `confirmed_opt_in`, `unknown`, or legacy `accepts_marketing` and `accepts_marketing_updated_at`; Klaviyo consent, method and timestamp, and corresponding fields of other incumbents. Evidence time chooses confirmation, opt-in, last-change, then explicitly supplied export creation time with `time-unknown`. Source identifiers include audience/account IDs, archive SHA-256 or Shopify shop ID. Incumbent-held evidence is distinct from Mango-captured evidence. SMS requires the source collection point, consent time and CONT-019 disclosure; Shopify `consentCollectedFrom`, Klaviyo SMS method/time and Mailchimp SMS source/time are examples.

## FORM-007

Public signup protocol retains the 8192-byte body limit; invalid sender name/from/reply-to/physical address is rejected before any allowance or claim. Atomic durable counters use full IPv4, IPv4-mapped IPv6 equivalence and IPv6 /64 grouping including textual/interface forms; missing/invalid edge IP fails closed and counters persist across restart and clamp at ceiling. Turnstile requires both `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`; one-sided configuration rejects startup. Siteverify must return success for action `newsletter-signup` and configured public hostname. A token is at most 2048 characters; verification is bounded to five seconds. Missing/malformed/rejected/unavailable verification fails closed before storage. Tokens are single-use with five-minute lifetime.

## CONT-014

Original acceptance evidence: Scoped integration coverage: `tests/go-live/sync-integrations.journeys.ts`. Current scope and remaining work: The scoped API persists contact fields with contact identity and consent source. Typed property definitions, UI editing, date/money semantics, segments and personalization remain unimplemented.

## CONT-015

Original acceptance evidence: Evidence: `tests/go-live/sync-integrations.journeys.ts` · `src/core/features/integrations/contacts.ts` · `src/core/features/lifecycle/email-consent-scope.ts` · `tests/campaign-authoring/import-category.spec.ts`. Current scope and remaining work: Scoped subscriber sync stores deduplicated tags without granting consent, and maintains saved integration lists. Topic preference-center acceptance and general tag-driven segmentation remain unmet.

## CONT-017

Original acceptance evidence: `tests/audience-controls/contact-history.spec.ts` — “[CONT-008] [CONT-017] a contact profile combines identities, properties, segments and original source, consent, suppression, eligibility, delivery and operator facts with masked role views” proves email/phone and merged identities, channel/topic consent evidence, persisted properties/tags and saved-rule segment membership, and a source-ordered timeline with form capture, orders, conversions, clicks, SMS replies, consent changes and operator actions. The native page and API exercise both masked roles (Analyst and Support), 1440/390, no horizontal overflow, serious axe finding or hydration error. Gap: ct’s 22 October 17:12Z ruling assigns flow enrollments/current node to FLOW-002 and predictions to SEG-004, but the clause text still carries both. Default ADOPTED: row stays PARTIAL pending ct’s text carve; both panels remain visible with honest unavailable statements. Topic evidence reads the current channel ledger; independent topic withdrawal awaits CONT-015/016.

## CONT-018

Original acceptance evidence: Evidence: `tests/shopify/connection.spec.ts`. RESULT-005's redirect consumes this clause's click token: it adds `mgo_c` to connected-store destinations once the token is built; until then the redirect adds nothing. Gap: Default in force (owner direction 19 Oct 2026), written into the clause: site tracking off per site until an Owner or Admin turns it on (Manager may turn it off; OPER-007); consent only from the store's consent tool (Shopify Customer Privacy API, WP Consent API, Stall, the snippet's consent call), none or no decision = refused; GPC (`Sec-GPC: 1` or `navigator.globalPrivacyControl`), sale-or-share opt-outs and CONT-021 do-not-share always refuse; one cookie `mgo_s` (Secure, SameSite=Lax, Path=/, no Domain, at most 30 days, HttpOnly where server-set, at most 2,048 bytes; no other browser storage); nothing sent to or held by Mango for an unidentified visitor (up to 20 events wait in the cookie until identification); `mgo_c` is 32 random bytes, single-use, host-bound, digest-only, 7 days, never for automated clicks, GPC or tracking off; identified onsite events kept 90 days; erasure under CONT-013. ct approval of the landed default: pending. Built and exercised: Shopify signed pixel ingest and current privacy controls (`tests/shopify/connection.spec.ts`); the separately approved INT-002 plugin semantic stays DONE. Acceptance not yet met: the snippet and Stall surfaces; the shared site switch, click-token journey and exchange on every surface; consent buffering, cookie parity, anonymous-request refusal, 90-day retention, erasure, segment-window and cross-site browser assertions on each surface. The Shopify pixel and WooCommerce plugin have not run this expanded acceptance. RESULT-005's redirect consumes this clause's click token: it adds `mgo_c` to connected-store destinations once the token is built; until then the redirect adds nothing. ct 23 October 04:38Z: INT-002 stays done on its approved semantic, not evidence for this expanded acceptance. Before other CONT-018 work, implement 90-day onsite retention, withdrawal deletion and explicit HTTPS enforcement.

## CONT-019

Original acceptance evidence: Evidence: `src/core/features/sms/signup.ts` · `tests/audience-import/signup.spec.ts`.

## CONT-021

Original acceptance evidence: Evidence: `src/core/features/audience/erasure` · `tests/audience-import/erasure.spec.ts`.

## CONT-022

Original acceptance evidence: Evidence: `src/core/features/audience/ui/contact-merge.tsx`.

## CONT-024

Original acceptance evidence: Evidence: `tests/move-in/archive.journeys.ts` account-export registration via `tests/move-in/incumbent-journey.ts` (Verify move-in): attestation, restrictive states, native export/restore, revocation and retained audit fact; campaign review records eligible contacts relying on that evidence at 1440/390. Current sandbox-safe account-export journey passed locally in 4.1 minutes. `tests/portability.spec.ts` (Verify main 4/6 for DATA-001; main 5/6 for erasure authority) proves populated native restoration. An attestation with one statement answered "not sure" subscribes no row of that move-in. A `postmaster@` row and a row whose country is outside the attested jurisdiction import non-subscribed with their named reasons. The DATA-001 export carries the attestation record with its operator, time, wording hash and answers, and each incumbent-held contact names that record. Erasing one such contact leaves the attestation record in place. Gap: Mailchimp archive source attestation and incumbent-held email evidence are exercised through the public preview, apply, campaign-review, native export/restore, revocation and erasure doors at 1440/390. Store connections (INT-001 to INT-006), five-year expiry and positive SMS evidence (A2P hold) remain unproved. A source without a row time requires an explicitly supplied export creation time. No real provider call or consent was used.

## CONT-025

Original acceptance evidence: `tests/go-live/shared-kiosk.journeys.ts` via `tests/go-live/opt-in-journey.ts` proves default double and single hosted captures with full evidence, no single-mode confirmation or destination reservation, one accepted capacity charge, confirmed-only public resubscription, future-only Owner/Admin mode changes with activity, denied Author/Manager/Support changes and Settings at 1440/390. `tests/go-live/sync-integrations.journeys.ts` proves the API capture path uses fixed double mode and one replay-safe confirmation. `tests/portability.spec.ts` covers policy restore. Default ADOPTED: Owner/Admin authority governs manual entry too. Store/move-in mode enforcement and the Shopify acceptance sentences, popup/landing sources, Zapier/Crank, SMS mode editing and ct approval remain open. No real provider call or consent was used.

## CONT-026

Original acceptance evidence: `tests/go-live/sync-integrations.journeys.ts` through `manual-entry-journey.ts` exercises Author entry, default email confirmation, operator-recorded single opt-in with named operator, properties, per-channel consent records, SMS pending until an exact-message authenticated YES reply, replay safety, protected destination refusal, Support/Analyst 403 and form/evidence screens at 1440/390. `tests/portability.spec.ts` covers the operator evidence round-trip; the hand-entry journey covers evidence, profile and SMS-sidecar removal. Gap: topic-specific permission, legacy email API attestation enforcement, the signed-out 403 wording (Base retains 401) and ct approval of Owner/Admin manual-mode authority. Named CONT-009 amendment: a signed provider reply POST confirms hand-entered SMS; no URL can confirm it. No real provider call or consent was used.

## FORM-001

Original acceptance evidence: `tests/audience-import/signup.spec.ts` (public signup stays pending until the single-use confirmation; embed origins enforced). Evidence: `src/core/features/audience/signup-routes.ts` · `tests/audience-import/signup.spec.ts`.

## FORM-007

Original acceptance evidence: `tests/audience-import/signup.spec.ts` security cases (allowances, Turnstile fail-closed, status-free acknowledgment). Evidence: `src/core/features/audience/signup-security.ts` · `tests/audience-import/signup.spec.ts`.

## FORM-008

Original acceptance evidence: Evidence: `tests/go-live/shared-kiosk.journeys.ts` via `tests/go-live/signup-capacity-journey.ts` exercises 600 captures across 200 networks, full 100-request minute bursts, 200 bot attempts without accepted charge, one reservation for concurrent duplicates, 30/120 on the same network, separate unchallenged flood and challenged capacity, Owner-only next-window changes, floor/ceiling refusals, challenge permissions and Settings at 1440/390. `tests/audience-import/signup-security.spec.ts` and `tests/audience-import/signup-reservation-clock.spec.ts` preserve restart, address grouping, database clock, one-use/expired challenge and last-slot concurrency. `tests/portability.spec.ts` preserves populated settings through upgrade and restores capacity revisions without resuming sends; the existing erased-optout case removes linked refused-network state. Gap/default ADOPTED: hosted form substitutes for the absent popup carrier; FORM-002 to FORM-004, FORM-005's report wording, CONT-025 single opt-in and ct approval of the landed capacity default remain pending. No real provider call or consent was used. The existing `tests/audience-import/signup-reservation-clock.spec.ts` measures the actual D1 admission interval for the new minute partition; destination-dependent daily refusals retain their status-free 202 acknowledgement.

## FORM-009

Original acceptance evidence: Evidence: `tests/go-live/shared-kiosk.journeys.ts` · `src/core/features/audience/signup-routes.ts` · `src/core/features/audience/ui/kiosk-signup-page.tsx` · `migrations/core/0075_kiosk_forms.sql`. The native journey exercises server-owned marking and the device label, 300 accepted signups from one network, a fresh mandatory challenge for each person, a blank reset within two seconds, no visitor cookies/storage, operator attribution and confirmed kiosk-source reporting in Insights. Turnstile provisioning and ordinary-form intake remain FORM-008 obligations; the hosted/kiosk resubscribe path is exercised separately under CONT-027.

## FORM-010

Original acceptance evidence: Evidence: `tests/go-live/shared-kiosk.journeys.ts` via `tests/go-live/signup-refusal-screens.ts` (1440/390, overflow and axe), `tests/audience-import/signup-security.spec.ts` (durable global last slot), `tests/audience-import/signup-reservation-clock.spec.ts` (database clock), `tests/go-live/resubscribe.journeys.ts` (destination daily allowance), `tests/go-live/sync-integrations.journeys.ts` via `tests/go-live/activity-log.ts` (one summary per closed hour). Gap/default ADOPTED: counts are on Settings; FORM-005's form report remains unbuilt and no clause sentence is changed. Network-edge fixtures only; no real provider call or consent was used.

## SEG-001

Original acceptance evidence: Evidence: `tests/audience-controls/segments.spec.ts` — “AUD-001 AUD-002 AUD-007 CAMP-004 nested saved segments select exact contacts by count, event value, window and state at 1440/390; copied rules remain immutable”, with `tests/audience-controls/segment-journey.ts`, `tests/audience-controls/segment-catalog.ts` and `tests/audience-controls/segment-fixture.ts`; `tests/campaign-results/performance.journeys.ts` — “[REPORT-002] [RESULT-005][RESULT-003][REPORT-003] campaign filters, exact CSV rows and optional open estimates at 1440; native commerce and cross-channel attribution at 1440 and 390” (via `tests/campaign-results/cross-channel-attribution.ts`) for human email and SMS clicks in the last N days. Proven: a saved nested all/any segment with Placed Order count, a same-event value/currency filter and US state returns exactly the matching contacts in review, including count, value, time-window and state boundary cases. The builder live estimate and plain-text summary name every condition; review recomputes membership and approval freezes the same exact IDs. Recorded properties, tags, consent/topics, bought products, ZIP/distance and RFM also pass through review. Collections and categories bought: Shopify product sync records each product's collection IDs (every page drained) and taxonomy category (null when uncategorized); before the catalog is recorded both conditions are unavailable rather than empty; a builder segment nesting US state with an any-group of bought collection and bought category shows both in its summary and a live estimate equal to review, and review selects exactly the contacts who bought from the collection or in the category (not those who bought only from another collection, only in other categories, only in a future order, or nothing); when Shopify removes a product from the collection, recount drops its earlier buyer. Builder and review are exercised at 1440 and 390 with no overflow or accessibility violations (sandboxed authored email preview is asserted directly). Contacts use the integration door; products and orders use the Shopify sync door; no direct rows. Inherited: campaign/link/flow activity by SEG-006, predictions by SEG-004, and products, collections and categories viewed by CONT-018. Collection and category membership is the synced catalog's current placement; ZIP distance uses Census ZIP-area representative points.

## SEG-003

Original acceptance evidence: Evidence: `tests/campaign-results/results.journeys.ts` · `tests/campaign-results/retention-journey.ts`.

## FLOW-001

Original acceptance evidence: Evidence: `tests/go-live/roles.journeys.ts` via `tests/campaign-authoring/flow-journey.ts` (Verify go-live 6/9): three-message welcome graph with split, unreachable-node validation and repair, keyboard pan/zoom, saved revision reload and 1440/390 accessibility/overflow/hydration; all node-kind explanations, named loop/unended-path validation and delay-cycle acceptance; Author saves, Analyst reads, Support named 403. `tests/portability.spec.ts` (Verify main 4/6 for DATA-001; main 5/6 for erasure authority) exports/restores the draft revision with prior data. Gap: Draft revisions only. Trigger enrolment, including the INT-004 renewal reminder (FLOW-002), and activation (FLOW-008) remain unbuilt. All node kinds have plain explanations; unavailable transports/actions are identified. No flow is enrolled, activated or sent.

## CONT-027

Recipient reconfirmation uses an affirmative POST with `confirm=true` from the emailed form; GET and HEAD are read-only. The link is single-use and expires after 30 days. For a recreated erased contact, expiry removes the request and recreated contact while leaving the surviving restriction. A provider hand-off already authorized and in flight cannot be recalled by a later database transition; before the authoritative hand-off check, a suppression or later opt-out prevents it.

## BUILD-010, BUILD-013 and BUILD-014

*Mobile-only settings.* Hide on mobile, hide on desktop, mobile content orientation and per-block or per-section mobile font size, line height, padding and alignment are written into one generated responsive block. This is a single `<style>` element in the document `<head>`, of at most 8,192 bytes, holding only `@media only screen and (max-width: 480px)` rules over a closed vocabulary of Mango class names (hide, show, stack, order, font size, line height, padding, alignment), plus, for hide on desktop only, `@media only screen and (min-width: 481px)` rules that hide, so a desktop-hidden block stays visible wherever the block is not applied. Its declarations come from the allowed-property list, plus `display: none` for hiding and `display: block` with `width: 100%` for stacking, each written with `!important`, which only this generated block may carry, so it overrides the inline styles it refines; for the chosen mobile content orientation the builder writes the columns in their stacking order and the generated rules restore the desktop order.

## BUILD-010, BUILD-013 and BUILD-014

*Authors cannot write it.* Saving regenerates the block from the per-block settings. Any `<style>` element, class or at-rule that is not byte-identical to the regenerated block is refused, so MSG-009's authored grammar and the 13 October policy are unchanged for everything an author writes.

## BUILD-010, BUILD-013 and BUILD-014

*Conservative default (Gmail CSS support, caniemail `<style>`/media-query data; owner rule of 19 October 2026):* the block is generated, never merged with authored text, and its absence never loses content. Hide on mobile is applied only by the block, so a client without it shows the block. Hide on desktop is applied only by the min-width rule, so Outlook desktop and style-stripping clients show it, and preview says so. No MSO conditional comment, `mso-*` property, attribute selector, ID selector or `@import` is ever generated. A block over 8,192 bytes is refused at save with its size named.

## BUILD-010, BUILD-013 and BUILD-014

*Security consequences:* the responsive block is Mango's own output from a closed vocabulary, never authored text. It adds no remote load, no tracking channel and no selector an author controls. Hiding is limited to whole blocks that remain visible and checked at the other width and in plain text. This is the one named amendment of the MSG-009 and MSG-012 policy by a target clause, and it ships only with its adversarial cases in an executed spec that consumes `tests/support/adversarial-email.mjs` (see Evidence).

## SMS-008

*Connect:* in Settings → SMS an Owner (OPER-004) pastes the Twilio Account SID and Auth Token (the Auth Token is what Twilio signs its webhooks with, so it is needed even when an API key sends). Mango reads the account back, names a suspended or trial account, and stores the credentials as a server secret exactly as DELIV-008 stores a mail key, with no deployment input, `hosted.env` edit or redeploy.

## SMS-008

*Developer route:* the deployment-input route stays, labeled and never offered first, as in DELIV-008.

## SMS-008

*Acceptance:* against a Twilio edge, an Owner on a fresh installation with no SMS deployment input connects by pasting the Account SID and Auth Token, with no redeploy. The edge records the Messaging Service Mango created with its callback and inbound URLs, and an existing service at the edge is unchanged. Before the test text's signed callback, SMS approval names `sms-events-missing`; after it, the step passes. An inbound STOP signed by the edge opts the number out (CONT-007). A rotated Auth Token at the edge raises the Home alert and blocks SMS approval. An Admin calling the connect route is refused with 403.

## DELIV-008

Mango reads the key's permissions and names any that are missing before anything else happens. For SendGrid (`GET /v3/scopes`): `mail.send`; domain authentication read and create (`whitelabel.*`); the event webhook settings and test scopes (`user.webhooks.event.*`); and email Activity read where the account has it (SEND-008). For Resend: a full-access key, which webhook and domain management need; a sending-only key is named as missing that permission.

## DELIV-008

Mango starts using the connection on the next request, with no redeploy. No `MAIL_*` or `MARKETING_MAIL_*` deployment input, `.rer/hosted.env` edit, `rer deploy` or `--set-secret` is needed.

## DELIV-008

creates its own event webhook at the provider, at this deployment's canonical HTTPS origin. For SendGrid: `POST /v3/user/webhooks/event/settings` to `/webhooks/mail/sendgrid`, subscribed to delivered, bounce, dropped, deferred, spam report and unsubscribe (and group unsubscribe), named as Mango's. For Resend: `POST /webhooks` to `/webhooks/mail/resend`, subscribed to `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained` and `email.failed`, plus Resend's suppression event where it offers one.

## DELIV-008

turns on signing (SendGrid's signed event webhook toggle for that webhook), reads back the verification public key (SendGrid) or stores the returned `signing_secret` and webhook ID (Resend), as the same server secret.

## DELIV-008

*Domain setup reads from the provider:* DELIV-002's records come from the connected account. If the account has no domain authentication for the From domain, Mango creates it through the provider's API (SendGrid `POST /v3/whitelabel/domains` with automated security; Resend `POST /domains`), shows the exact records to add, asks the provider to validate them, and rechecks until they pass.

## DELIV-008

*Developer route:* the deployment-input route (`MAIL_PROVIDER` with `MAIL_PROVIDER_API_KEY` and `MAIL_WEBHOOK_SECRET`, or `MARKETING_MAIL_*` on Managed, and the hand-built webhook in `docs/install.md`) stays for owners who manage configuration in their deployment. It is labeled the developer route, never offered first, read only while no Settings connection exists, and Settings shows which route is in use; every check above except Mango's webhook creation applies to it.

## DELIV-008

*Connect:* on a fresh Managed installation with no `MARKETING_MAIL_*` input, and on a fresh Free installation with no `MAIL_PROVIDER_API_KEY` or `MAIL_WEBHOOK_SECRET` input, an Owner connects the SendGrid edge by pasting a key in Settings, with no redeploy. No route, page, log line or export contains the key afterwards. On the Free installation, an invited operator's sign-in email then arrives through the edge.

## DELIV-008

*Resend:* the same connect, wiring, completion and bounce journey against the Resend edge stores the returned `signing_secret`.

## INT-015

the read scopes today's adapter checks (`read_customers`, `read_products`, `read_inventory`, `read_locations`, `read_orders`, `read_all_orders`, `read_returns`, `read_pixels`, `read_customer_events`)

## INT-015

`write_pixels`, to activate the pixel

## INT-015

`write_customers`, for consent write-back (INT-001) through Shopify's email and SMS marketing-consent updates (CONT-025)

## INT-015

`write_discounts` and `read_discounts`, for unique codes (BUILD-007)

## INT-015

`read_themes`, to verify the theme app embed

## INT-015

*Per-installation webhook address:* each subscription Mango creates delivers to `https://<connector>/shopify/w/<routing token>`. The token is 32 random bytes issued for one shop and one installation at connection, compared in constant time. Only that shop's own Admin token, held by that installation, registered it.

## INT-015

*Signature and shop check:* the connector verifies Shopify's HMAC with the app secret on every delivery. It routes app-level deliveries (the mandatory privacy topics) only by the `shop_domain` and `shop_id` inside the signed body. It routes app-proxy requests only by the signed `shop` query parameter, and passes on Shopify's signed `logged_in_customer_id` (CONT-018).

## INT-015

*Forwarding and read-back:* the connector forwards each verified delivery to the installation within 5 seconds, signed with that installation's own forwarding key (HMAC-SHA256 over the body, shop, topic, Shopify webhook ID and time). The installation refuses anything unsigned, stale or replayed (SEND-005). As today, customer, product and order notifications are re-read through the Admin API with the shop's own token before they change a source record, so a delivered body is never authoritative on its own.

## INT-015

The shop's Admin access token comes from the OAuth code exchange (and any refresh Shopify requires) at the connector. It is handed to the installation over TLS in a response bound to the signed state, and the connector keeps no copy. The installation stores it as a server secret, never sent to a browser, logged or exported.

## INT-015

It is a declared external (`seed.json → externals → shopify-connector`, BASE-DATA-004). This is a named amendment of BASE-DATA-005, as Managed mail is, and of the `extensions/mango-pixel/INSTALL.md` rule that a shared multi-shop app is unsupported (Interpretations). It is built to the conservative default below (*Conservative default*), with no further owner confirmation.

## INT-015

*OAuth as Shopify requires:* the callback is accepted only when the `shop` matches `^[a-z0-9][a-z0-9-]*\.myshopify\.com$`, the query `hmac` verifies with the app secret in constant time, and the `state` is the unexpired single-use one this installation issued. Anything else completes no exchange and names the reason.

## INT-015

*Scopes:* the install asks only for the scopes listed above. A scope a target clause needs but the store has not granted shows as missing and is never assumed.

## INT-015

*Declared:* `seed.json → externals → shopify-connector` names exactly what the connector holds and sees (shop domain, shop ID, installation origin, routing token, forwarding key, delivery counts, forwarded bodies in transit) with the BASE-DATA-004 privacy, cost and secret boundaries.

## BUILD-001 evidence record

`tests/proposals-decision/decision-routes.spec.ts` — existing PROP-004 saved-content registration via `tests/campaign-authoring/block-builder-journey.ts` (Verify main 6/7): native two-column product/button composition, uploaded image, drag and keyboard reorder, duplicate/delete, undo/redo, padding/alignment, byte-identical save/reopen and HTML-mode round trip, sent-size display, decoded uploaded image in the inert Saved Preview, stacked 375px render and approval; editor at 1440/390 with overflow, hydration and serious/critical axe checks. `tests/campaign-authoring/canonical-save.spec.ts` — existing canonical-save-tree registration via `tests/campaign-authoring/block-builder-journey.ts` and `tests/campaign-authoring/full-promotional-email-journey.ts` (Verify main 4/7): native header, hero, button, two text columns, six manually entered products, social links with deployment-owned icons beside grammar-valid text links, managed footer and mobile controls; drag/keyboard reorder, duplicate/delete for both new blocks, including a reorder while the native icon upload is held; byte-identical reopen and HTML-view round trip; 32,117 stored characters and 33,768 shown/provider-edge HTML bytes within the 102,400-byte limit; 1440/390 overflow, hydration and serious/critical axe checks; stacked 375px rendering with every image decoded and a fluid 600px product image.

## BUILD-002 evidence record

`tests/campaign-authoring/browser.spec.ts` · `tests/portability.spec.ts` · `tests/move-in/archive.journeys.ts` (Verify move-in) · `tests/campaign-authoring/design-import.spec.ts` · `tests/campaign-authoring/design-generation.spec.ts` (Verify main 3/7)  `tests/go-live/contact-links.journeys.ts` (Verify go-live 1/9) imports a restricted-conversion Klaviyo template into the library; `tests/portability.spec.ts` preserves it on native restore.  `tests/campaign-authoring/canonical-save.spec.ts` — existing saved-body round-trip registration via `tests/campaign-authoring/flow-template-journey.ts` (Verify main 4/7; 1440/390) starts a Flows email node from a library template, saves its independent copy, edits the library and reloads the byte-identical flow revision.

## BUILD-004 evidence record

`tests/proposals-decision/decision-routes.spec.ts` — existing PROP-004 saved-content registration via `tests/campaign-authoring/block-builder-journey.ts` and `tests/campaign-authoring/reusable-block-journey.ts` (Verify main 6/7; 1440/390): native named reusable footer save/edit, Author mutation refusals, placement in two drafts, a saved template and a FLOW-001 draft email, linked draft-body updates, unchanged approved campaign bytes and a fresh unapproved replacement, stale-version refusal, explicit independent copies and repeated edits reusing the pending replacement. `tests/portability.spec.ts` — DATA-001 complete native records registration (Verify main 5/7) retains prior data and round-trips definitions and placements through native export/restoration.

## BUILD-008 evidence record

`tests/go-live/presend-checks.journeys.ts` · `tests/go-live/email-size.journeys.ts`

## BUILD-009 evidence record

`src/core/features/sms/content.ts` · `src/core/features/sms/review-preview.ts`

## BUILD-010, BUILD-013 and BUILD-014 evidence record

`tests/campaign-authoring/canonical-save.spec.ts` — existing saving/approval-tree registration (Verify main 4/7), via `tests/campaign-authoring/mobile-presentation-journey.ts`: all 138 `tests/support/adversarial-email.mjs` cases, generated/authored CSS and hidden-compliance refusals, exact generated bytes in sent-size accounting, eight stored-body 375/600 standards/quirks renders with/without style, nonblank inert Preview and serious-axe/overflow/hydration proof at 1440/390. `tests/campaign-authoring/canonical-save.spec.ts` — existing saving/approval-tree registration via `tests/campaign-authoring/block-builder-journey.ts` · blockMobileControlsJourney (Verify main 4/7) edits hide on mobile/desktop, font size, line height, padding and alignment through the native block editor at 1440/390, checks the saved generated body and the resulting 375px computed styles, and audits overflow, hydration and serious axe findings; shell axe runs directly to avoid sandbox child-frame discovery. `tests/campaign-authoring/design-import.spec.ts` exercises the fluid column compiler. `tests/proposals-decision/decision-routes.spec.ts` via `tests/campaign-authoring/block-builder-journey.ts` (Verify main 6/7) exercises generated column stacking.

## BUILD-011 evidence record

`tests/go-live/multistep.journeys.ts` — [AUD-006] later steps reapply ordinary inclusion, custom exclusions and consent without adding new candidates via `tests/go-live/chosen-catalog-journey.ts` and `tests/go-live/chosen-catalog-edge.ts` (Verify go-live 9/9): original synthetic-mango Shopify catalog fixtures prove title/SKU/collection/vendor searches, product and grid selection with a chosen variant, identifier-only HTML round-trip, current values/read time, revision locking, changed price at provider hand-off, unpublished/deleted/out-of-stock hiding, empty hide/skip, unavailable-read skip, visible per-recipient reasons, recovery with a fresh read and campaign counts; picker, previews and outcomes at 1440/390. `tests/local-start/signin-hydration.journey.ts` — [OPER-001][BUILD-011][BUILD-012] one-click local owner sign-in works before JavaScript at 390px; chosen catalog promotions bound configured items and recheck handoff, via `tests/campaign-authoring/chosen-size-journey.ts` and `tests/go-live/chosen-catalog-edge.ts` (Verify local-start 3/3): original synthetic-mango fixtures drive the six-item Shopify picker in a full promotional email above 20,000 stored characters, unchanged reopen and approval; unpublished and out-of-stock selections remain in the save bound, seven-item grids and two-item product layouts are refused, oversize catalog diagnostics name the grid as one block, template/start/duplicate refusals preserve records, browser refusals retain unsaved HTML at 1440/390, restored six-item hand-off bytes equal the shown bound, in-limit tracked title growth sends, and oversized live title growth skips with email-too-large counted on campaign detail. `tests/local-start/signin-hydration.journey.ts` — [OPER-001][BUILD-011][BUILD-012] one-click local owner sign-in works before JavaScript at 390px; chosen catalog promotions bound configured items and recheck handoff, via `tests/campaign-authoring/catalog-guard-journey.ts` (Verify local-start 3/3): six roles and anonymous have exact search/preview permissions without denied edge reads; an Author places identifiers but cannot approve; non-canonical/overlong state, foreign or malformed gids, mismatched variants, invalid item counts/layouts/providers and extra keys refuse without storing changes, and oversized queries refuse before an edge read; markup and managed-token title payloads stay escaped and opaque, unsafe product URLs and image hosts skip catalog-blocked with campaign counts; template save/start, duplication and follow-up retain identifier-only blocks, measure hidden configured items and read fresh title, price and image values at hand-off.

## BUILD-012 evidence record

`tests/go-live/email-size.journeys.ts` — large newsletters save by transmitted bytes, retain refused edits and recheck expansion at handoff (helpers `tests/go-live/email-size-imports.ts`, `tests/go-live/email-size-reuse.ts`); `tests/campaign-authoring/create-api.spec.ts`; `tests/campaign-authoring/browser.spec.ts` (helper `tests/campaign-authoring/email-size-adoption.ts`); `tests/campaign-authoring/design-import.spec.ts`  · `tests/campaign-authoring/canonical-save.spec.ts` via `tests/campaign-authoring/mobile-presentation-journey.ts` (Verify main 4/7: generated responsive bytes count in sent size) · `tests/proposals-decision/decision-routes.spec.ts` via `tests/campaign-authoring/block-builder-journey.ts` (Verify main 6/7, existing PROP-004 saved-content registration): native block-editor sent-size display and unchanged approved body at 1440/390; `tests/campaign-authoring/canonical-save.spec.ts` via `tests/campaign-authoring/block-builder-journey.ts` · blockMobileControlsJourney (Verify main 4/7) proves saved generated bytes after mobile-control edits at 1440/390 and 375px computed styles. `tests/campaign-authoring/create-api.spec.ts` — existing native create registration via `tests/campaign-authoring/reusable-size-journey.ts` (Verify main 4/7) proves an oversized reusable edit reports measured HTML/text bytes, the derived limit and largest sections, preserves the exact linked draft and saved source version, and permits a later valid edit. `tests/campaign-authoring/canonical-save.spec.ts` — existing saved-body round-trip registration via `tests/campaign-authoring/audience-size-journey.ts` (Verify main 4/7): audience-selected save and live meter at 1440/390, widened-audience refusal with measured bytes, limit and three largest blocks, unchanged saved revision, frozen approval and every provider-edge hand-off within the bound; deployment-wide fallback without a selection. The audience journey also proves refused unsaved HTML and widened rules remain in the editor at 1440/390, the 95 KB advisory is acknowledged against the same eligible email identities as approval, and a valid edit recovers. `tests/campaign-authoring/canonical-save.spec.ts` — existing canonical-save-tree registration via `tests/campaign-authoring/full-promotional-email-journey.ts` (Verify main 4/7): a complete manually populated promotional email stores 32,117 characters; the shown 33,768 HTML bytes equal the provider-edge part, including saved analytics expansion, generated responsive styles, managed footer and open-estimate pixel; plain-text bytes also match. `tests/go-live/email-size.journeys.ts` via `tests/go-live/email-size-reuse.ts` retains every reuse refusal, including a new follow-up whose cohort authority is not yet inserted. `tests/local-start/signin-hydration.journey.ts` — [OPER-001][BUILD-011][BUILD-012] one-click local owner sign-in works before JavaScript at 390px; chosen catalog promotions bound configured items and recheck handoff, via `tests/campaign-authoring/chosen-size-journey.ts` and `tests/go-live/chosen-catalog-edge.ts` (Verify local-start 3/3): original synthetic-mango fixtures drive the six-item Shopify picker in a full promotional email above 20,000 stored characters, unchanged reopen and approval; unpublished and out-of-stock selections remain in the save bound, seven-item grids and two-item product layouts are refused, oversize catalog diagnostics name the grid as one block, template/start/duplicate refusals preserve records, browser refusals retain unsaved HTML at 1440/390, restored six-item hand-off bytes equal the shown bound, in-limit tracked title growth sends, and oversized live title growth skips with email-too-large counted on campaign detail. Under ct's ruling of 25 October 2026 at 23:46Z, the existing local-start chosen catalog registration via `tests/campaign-authoring/catalog-riders-journey.ts` proves that a deleted selection remains stored and visibly removed, while unpublished and out-of-stock selections have distinct states at 1440 and 390 and still count in the save bound. Under the same ct ruling of 25 October 2026 at 23:46Z, that registration proves a catalog_unavailable save refusal names the current product and directs publication or removal before saving again, retains unsaved edits without storing changes at 1440 and 390, and re-measures the item after publication; existing email-too-large hand-off refusal proof remains unchanged.

## SMS-001 evidence record

`src/core/platform/adapters/mobile-message.ts`

## SMS-003 evidence record

`src/core/features/sms/policy.ts`

## SMS-004 evidence record

`src/core/features/sms/inbound.ts`

## DELIV-001 evidence record

`src/core/platform/adapters/sendgrid.ts` · `src/core/platform/adapters/resend.ts` · `tests/go-live/resend-delivery.journeys.ts`

## DELIV-002 evidence record

`src/core/features/sender-verification/domain-setup.ts` · `src/core/features/sender-verification/setup-routes.ts` · `tests/go-live/contact-links.journeys.ts`

## DELIV-003 evidence record

`src/core/features/lifecycle/reputation-guard.ts` · `tests/go-live/delivery.journeys.ts`

## DELIV-005 evidence record

`tests/go-live/mailbox-provider.journeys.ts`

## DELIV-007 evidence record

`tests/sender-verification/worker.spec.ts` — native Worker renewal proof (day 22/23/29/31, last confirmer and all Owners, diagnostic and reminder replay, provider evidence change, populated 0094 upgrade); `tests/go-live/managed-mail.journeys.ts` — managed relay and authenticated connector renewal, Home at 1440/390 with axe, overflow and hydration checks

## DELIV-008 evidence record

`tests/go-live/delivery.journeys.ts` — MSG-011 case calls `tests/go-live/sending-connection-journey.ts` for completed Connect Activity actor/time, named Admin 403 refusals on review/connect/disconnect (also OPER-004), key scopes/account review before create, signed-or-delete failures, existing-hook preservation/reconnect, encrypted key and export secrecy, signed Owner-check delivery gate and Settings Sending at 1440/390 (Verify go-live 2/9); `tests/audience-controls/sendgrid-forwarding.spec.ts` for unsigned/stale/future signatures and replay; `tests/portability.spec.ts` for populated migration, private connection exclusion and restore without resumed sending. `tests/go-live/resend-connection-journey.ts` extends that MSG-011 registration (Verify go-live 2/9): sending-only key refusal before mutation, six-event disclosed webhook creation, encrypted secret/reconnect reuse including recovery after refused configuration confirmation, unrelated-hook preservation, unsigned/stale rejection, named 401/403/deleted-hook approval blocks and Owner/Admin mail notices, with Settings and Home at 1440/390.

## INT-001 evidence record

`src/core/platform/adapters/shopify.ts` · `tests/shopify/connection.spec.ts`

## INT-002 evidence record

`tests/go-live/woocommerce.journeys.ts` — “[INT-002] WooCommerce owner connection syncs store facts and signed replay preserves identity, consent and failed-operation recovery”: Owner connects encrypted REST/signing credentials through Settings; seeded customers, paginated products, orders and refunds sync through Store with original identity/occurrence times and financial projection; the signed order webhook replays once without duplicate facts and rejects conflicting bytes; the installed-plugin edge supplies abandoned checkouts, whose signed event enters only an explicitly activated exact flow revision, adds one contact tag and exits once. Draft, stale, purchased and opted-out cases never enroll; forged, expired, nonconsented and GPC events are refused. `tests/go-live/woocommerce-plugin-journey.ts` runs the shipped browser script against the WordPress network edge for default-deny, explicit consent and GPC withdrawal. Settings/Store are exercised at 1440/390. The real plugin source is `extensions/mango-woocommerce/mango-woocommerce.php` with `extensions/mango-woocommerce/INSTALL.md`; its shortcode uses the existing confirmed signup door proved by `tests/audience-import/signup.spec.ts` — “CONT-003/009 public signup remains pending until single-use expiring confirmation and records source time method IP”. Ct approved the INT-002 semantic on 22 October 2026 at 20:20Z: store-admin enablement is off initially; only signed-in store customers; explicit analytics and marketing consent before the one Secure HttpOnly SameSite=Lax first-party cookie, expiring after 30 days; GPC records no observation and revokes pending eligibility; no cross-site tracking or subscription-consent widening; WordPress observations expire after 30 days. The allowlisted signup iframe uses Mango’s own confirmation. A saved tag-and-exit flow revision must be explicitly activated; it sends no marketing message. CONT-018 and FORM-008 retain their other acceptance obligations and statuses; FLOW clauses retain their graph/message obligations.

## INT-004 evidence record

`src/core/features/store/stripe/` · `tests/go-live/roles.journeys.ts` · `tests/portability.spec.ts`

## INT-007 evidence record

`tests/go-live/sync-integrations.journeys.ts` via `tests/go-live/custom-event-journey.ts`: shipped JavaScript client records one general event on concurrent replay, rejects conflicting content, reads profile and rule-derived segment membership, refuses subscribe without evidence by name and exhausts one key without affecting another; timeline at 1440/390 passes axe, overflow and hydration checks. OpenAPI: `src/core/features/integrations/openapi.ts`; client: `src/core/features/integrations/client-source.ts`. Existing scoped profile/consent/suppression, conversion and refusal-feed journeys remain green.

## INT-011 evidence record

`tests/go-live/sync-integrations.journeys.ts` · `docs/integrations.md`

## INT-013 evidence record

`tests/go-live/contact-links.journeys.ts` via `tests/go-live/domain-journey.ts` — configured UTM redirect on the branded tracking host; `tests/campaign-results/performance.journeys.ts` — INT-013 / REPORT-002 at 1440 via `tests/campaign-results/tracking-journey.ts` and `tests/campaign-results/custom-attribution.ts`: sent UTM destinations, original click identity, author values, managed/contact exclusions, campaign off, Settings at 1440/390 and one idempotent Vane goal on the contact timeline; `tests/portability.spec.ts` — native settings restore.

## INT-014 evidence record

`tests/go-live/sync-integrations.journeys.ts` via `tests/go-live/review-loyalty-journey.ts`; `tests/sender-verification/worker.spec.ts` — populated 0096 upgrade. Owner/Admin inbound Judge.me review, Okendo review/earned-points/tier-entry and Smile customer-profile adapters verify native signatures and use the INT-007 event writer. Existing contacts only; no consent or outbound action. Signed replay, account/timestamp refusal, concurrent unmatched count, encrypted export-excluded secrets, populated receipt restore, erasure/reconnection replay protection and Settings at 1440/390 are exercised.

## INT-015 evidence record

`src/core/features/store/shopify/health.ts` · `src/core/features/store/shopify/collector.ts` · `tests/shopify/connection.spec.ts`

## INT-013 static parameter mechanism

The adopted campaign.analytics.v1 parameter labels are source=mango, medium by channel, campaign name slug and content=message revision. Values are static and bounded and apply to ordinary HTTP/HTTPS links only; author keys win and managed links and contact interpolation are excluded. Labels freeze into new drafts and changes require revision review, leaving approved revisions unchanged. Flow dimensions and the general INT-007 custom-event path remain unfinished.

## Agent evidence and legacy authority history

## Agent evidence and legacy authority history

The pre-rewrite acceptance record at `6d9fc12eeae3b7ae661508996201cb8d008895af` contains these original evidence sentences. They describe their historical scope; they do not prove the new MCP or policy clauses.



## MOVE-007 mechanism

With an API key, every saved segment of each moved audience is read from the Mailchimp Marketing API with its match type and conditions. It is recreated as a draft segment for review, which no campaign uses until an operator saves it. Conditions map as follows: merge fields to properties; tags to tags; groups to topics; signup date and location to SEG-001 conditions; contact rating and engagement (often, sometimes, rarely) to the SEG-006 engagement level; and ecommerce conditions to SEG-001 event conditions over the imported store data. Campaign-activity conditions (was sent, opened, clicked or did not click a named campaign, or any of the last 5 campaigns) map to SEG-006 conditions over the campaign history MOVE-009 imports. Automation-activity conditions (started or completed a classic automation) map to SEG-006 flow conditions over the draft flow MOVE-008 creates and the imported history. Every condition Mango cannot express is named in the segment and in the report, and the recreated segment's count is shown beside the count Mailchimp reported. An export-only move-in carries no segment definitions: it brings static segments across as tags and says that saved segments need the API pull.

## MOVE-011 mechanism

Imported Mailchimp templates and campaign bodies, and Klaviyo, ActiveCampaign and Kit templates, become builder templates (BUILD-002) in the email grammar. - *Merge tags* map to Mango tokens with fallbacks the owner confirms (MSG-008): `*|FNAME|*` and `*|LNAME|*` to name tokens; other merge fields to their mapped properties; `*|UNSUB|*` to the managed unsubscribe link; `*|UPDATE_PROFILE|*` to the preference center (CONT-016); `*|LIST:ADDRESS|*` and `*|LIST:ADDRESSLINE|*` to the saved postal address; `*|ARCHIVE|*` to the campaign's web version (PUB-001); and `*|DATE|*` and `*|CURRENT_YEAR|*` to date tokens. Klaviyo-style `{{ first_name }}` tags map the same way. - *Styles:* `<style>` rules are inlined onto the elements they select and kept only where the grammar admits them. Media-query rules become BUILD-010 mobile settings where they map. Classes and everything else are removed. - *Report:* each template's conversion report lists every mapped and unmapped merge tag, every dropped rule, property or block with its location, every link and image host it uses outside MSG-014's list, its sent size against BUILD-012's limit, and whether the result passes the MSG-012 checker. - *Readability:* a text run below MSG-012's 3:1 contrast is recolored to the nearest shade of its own hue that reaches 4.5:1 against the background it is judged on, as Mango's design compiler aims. For example, `#999999` on white becomes `#767676`. Each recoloring is listed in the report with its location and its before and after colors. The operator can undo one in the builder, and the run then blocks approval under MSG-012 as it does today. - *Size:* inlining grows a template, so conversion measures each result's sent size (BUILD-012). A result over the limit is never dropped: it is kept as a held conversion, listed in its report and in the reconciliation report (MOVE-006) with its size and its largest blocks, and opens in the builder for the operator to trim before it can be saved as a template. - *Images:* each template's images come home under MOVE-014. - *Outside hosts:* the reconciliation report (MOVE-006) gathers those hosts across every imported template and campaign, with a count of uses each. The owner can allow the chosen ones there in one step (MSG-014, recorded in OPER-007). Any not allowed are listed again with MSG-015's allow action when a campaign or flow message built from the template reaches review. An unmapped merge tag stays visible and blocks approval through the personalization check, as it does today. -

## MOVE-013 mechanism

From the moment a move-in with API access completes until the owner marks the cutover complete (MOVE-006), Mango and the incumbent stay in step on consent. An opt-out in either is an opt-out in both, as CAN-SPAM treats them for one business. - *Mailchimp in:* a Mailchimp API-key move-in (MOVE-001) registers an audience webhook on each moved audience for subscribe, unsubscribe, profile, email-change and cleaned events from every source (subscriber, admin and API). - Mailchimp does not sign audience webhooks, so each webhook URL carries an unguessable secret for that move-in. Mango reads the member back from the Marketing API before applying an event. When that read fails, an unsubscribe or clean still applies, because opt-out precedence wins; a subscribe or profile change waits for the next read. - Every 15 minutes, a cursor re-pull of the members changed since the last pull (`since_last_changed`) applies anything a webhook missed. It uses the same idempotent path, so a dropped or repeated event never changes anything twice. - *Applying incoming changes:* - An unsubscribe applies CONT-004, and an unsubscribe Mailchimp marks as `abuse` is a complaint that applies CONT-006. A clean applies CONT-006. Each is recorded with the incumbent as its source and applies before Mango's next hand-off to that contact. - A new subscriber arrives subscribed with incumbent-held evidence (CONT-024) under the audience's existing attestation, and a `pending` member stays pending. Either enters the flows whose triggers admit them (FLOW-002), such as the welcome series. - A profile change updates the mapped properties (MOVE-001). An email change moves the address under CONT-001 and keeps its consent. - No incoming change ever upgrades a status Mango holds as unsubscribed or suppressed (CONT-004). - *Freshness before sending:* while the sync is on, the incumbent is a source under STORE-005. - A campaign step begins dispatch only after a re-pull completed within the previous 15 minutes, and runs one first if needed. - A flow hand-off waits with `incumbent-sync-stale` while the last successful re-pull is more than 30 minutes old, until a re-pull succeeds or its deadline passes (CAMP-010). - Approval names a stale incumbent sync as a blocking check (CAMP-004). - *Mango out:* every Mango unsubscribe, one-click unsubscribe, preference-center opt-out and suppression (CONT-004, CONT-006, CONT-016) is written back as an unsubscribed member, through the Marketing API, to each moved audience that holds the address. So is an erasure request (CONT-013), written before the erasure completes. - Transient failures are retried up to 5 times over 1 hour. A write-back that still fails is shown on the move-in page and on Home with its count, its error and a retry action, and the pending write-backs can be downloaded as a CSV to import into the incumbent by hand. - The webhook echo of Mango's own write-back is recognized and recorded once. - *Export-only move-ins:* the move-in page states that, without an API key, Mango cannot see later incumbent changes, and that the export must be re-imported before each Mango send during the parallel week. - A re-import of a newer export is a delta under the same idempotent rules: new restrictive statuses apply, new subscribers arrive as incumbent-held under the attestation, and nothing is upgraded. - Approval shows an advisory finding (MSG-007), which the approver acknowledges on record, when the last incumbent import is older than the last incumbent send Mango knows of. That is the latest send in the imported campaign history. While the MOVE-008 journey inventory lists a journey the owner has not marked turned off, it is 24 hours after the last import. - *Ending the sync:* **Mark cutover complete** (Owner or Admin; OPER-004) works in this order: - It first flushes pending write-backs, and lists any that still fail. - It then deletes the registered webhooks at the incumbent, stops the re-pull and write-back, and deletes the stored incumbent API key. - The event and its operator are recorded in the activity log (OPER-007). A later call to an old webhook URL is answered 410 and changes nothing. - Until the cutover is marked, Home shows the parallel run's day count and the sync's last success. - *Other incumbents:* the same sync runs for every incumbent whose API allows it. The move-in page names, for each incumbent, the mechanism used in each direction and any gap. - Klaviyo: a 15-minute re-pull of profiles and subscription changes in, and write-back through its unsubscribe and suppression jobs (MOVE-002). - ActiveCampaign: its unsubscribe, subscribe, bounce and contact-update webhooks plus the re-pull in, and write-back by setting each list status to unsubscribed (MOVE-003). - Kit: its subscriber activate, unsubscribe, bounce and complaint webhooks plus the re-pull in, and write-back through its unsubscribe endpoint (MOVE-004). - beehiiv, Omnisend and Customer.io: their subscription webhooks, or a re-pull where they have none, in, and write-back by their subscription or attribute updates (MOVE-005). - Where an incumbent, or the buyer's plan with it, offers no write-back, the move-in page says so and the cutover checklist adds a suppression-CSV import into that incumbent. -

## MOVE-014 mechanism

Images that imported templates, campaign bodies and flow messages load from an incumbent's hosts (for Mailchimp, `mcusercontent.com` and `gallery.mailchimp.com`; for every other incumbent, the image hosts its move-in fixtures name) are re-hosted as campaign images (CAMP-012) before the incumbent account can close. - *Source:* from an account export, the gallery files it already carries, matched to each image address by file name and content; from an API move-in, or for an image the export lacks, one fetch per image under MSG-006's network inspection, within CAMP-012's type, byte and pixel limits. - *Rewrite:* each matching `img src` is rewritten to the deployment's `/media/<sha256>` address, with its alt text, size and link unchanged, and the conversion report lists each image re-hosted or failed with its reason. A failed image stays on its incumbent host and is listed for the operator to upload a replacement. - *Cutover:* the reconciliation report counts images re-hosted, failed and still on an incumbent host, and the cutover checklist (MOVE-006) confirms that no template, draft, scheduled campaign or live flow message still uses an incumbent image host before **Mark cutover complete**, naming each one that does. -

## REPORT-005 mechanism

Subscriptions, confirmations, resubscribes (CONT-027, counted apart from new subscribers) and unsubscriptions by day, form, landing page, kiosk form (FORM-009), import and integration, with the consent text version each used, so an owner can show where every subscriber came from. - The membership-history requirement applies from migration 0073 onward. Deleted, erased or merged membership history recorded before migration 0073 cannot be reconstructed and is not claimed. Retained earlier consent captures and confirmations recovered by migration 0074 are labeled as retained evidence and do not imply earlier membership changes. - This clause is done only when FORM-002 (popup and other dedicated forms), FORM-004 (landing pages), FORM-009 (kiosk capture) and CONT-027 (approved confirmed-only public-form resubscribe) are done. -

## PUB-002 mechanism

Creators offer paid tiers through Stripe Checkout and Stripe Billing on their own Stripe account (or Nectar), with US sales tax by Stripe Tax; paying subscribers join a paid topic, paid-only content is sent only to them, and cancellation or failed payment moves them back to the free topic. Mango never holds funds.

## REPORT-003 prior gap record

Flow attribution is inherited by FLOW-001/FLOW-002, which remain missing.

## MOVE-009 prior gap record

Mailchimp-format granular activity imports one durable click/open fact per accepted row, with original time, imported campaign/link and source. Reconciliation names imported/dropped counts; timeline, repeat, undo, merge, erasure and populated upgrade/restore are exercised. Per archive: 10,000 engagement rows within existing ZIP/text limits, visibly refused beyond that limit. Imported clicks govern CONT-012/AUD-008 dormancy; opens stay open-only, never engagement; no send fact, result, attribution or consent changes. API-key activity, other incumbents' history and CONT-020/SEG-005/SEG-006/EXP-006 uses are MOVE-015.

## PUB-005 prior gap record

Default ADOPTED, approved by ct 23 October 04:38Z: page only for an Owner-saved tier, displaying exact price/frequency before Checkout; newsletter consent is unchecked and separate from payment, recorded with timestamp, source and wording version when Checkout opens and authorizing only one confirmation per payer address per Checkout session. Already subscribed/confirmed needs no second confirmation. Never-confirmed payers receive no paid or free newsletters. Payment events never create or widen consent; unsubscribe and suppression win and resubscription requires the person’s own POST confirmation. Stripe hosts the card fields; Mango has none. Erasure follows the existing audit-fact rule and removes address and consent evidence. PUB-002’s restricted-key sandbox and Nectar gaps are separate; no real provider call or consent was used.

## Supporting scope, terms and policy detail

What this product does. Every clause has a stable ID and requires at least one tagged test before release. Verification must distinguish tested requirements from uncovered or intentionally amended obligations; a passing suite alone does not certify every clause. Security, privacy, and operational guarantees are in `BASELINE.md`; a clause here may supersede one of them by naming its `BASE-` ID. CONT-013 supersedes BASE-DATA-003 for contact erasure. The BASE-DATA-005 policies under "Design generation" and "Managed mail" describe explicitly selected provider dependencies. The BASE-OPS-001 policy under "Health readiness" replaces the one-second health response with a two-second response and a Queue check reused for up to 60 seconds. Capacity and rate limits are in `seed.json → limits`, which must meet the floors SCALE-001 sets for the first buyer named below. Times are p95 at those limits. Clauses marked *Policy* have a default that buyers may replace through the named extension point.

One brand's email and SMS marketing: audience and consent, growth forms and pages, segments and predictions, campaigns and the email builder, automated flows, SMS and push, experiments, deliverability, reporting and attribution, integrations, migration from the named incumbents, mobile and agents. Mango reads first-party store, payment, onsite and audience signals, lets an operator inspect and edit every recipient rule and message, sends a campaign only as the exact revision an operator approves, and runs a flow only as the exact revision an operator activates. It reports what providers actually did, keeps attribution separate from measured lift, and never presents forecasts as facts.

The newsletter profile is the current default build of the target product, not its ceiling. It ships the audience, consent, authoring, approval and delivery guarantees every later area builds on; the clauses added on 16 October 2026 extend it to the full category job, and `seed.json → nonGoals` will lose each entry (roles, landing pages, visual journeys, A/B testing, send-time models, native apps) as its clauses ship.

The default release profile is one operator-managed email newsletter, with mail

required and commerce, SMS and AI optional. This is an explicit scope amendment

to STORE-001 (connection), PROP-001 (generated Decision Desk), MSG-004/005

(SMS) and SEND-001 (channel selection), not a claim that their wider requirements

have been implemented or verified. The 78 original clause IDs and their full

flagship obligations remain below and are not waived.

An optional module is disabled when all its input names are absent; supplying

any input enables it and requires its complete configuration. Disabled adapters

must not be constructed or contacted. Missing providers are reported as

unavailable, never replaced by synthetic source facts, generated content,

forecasts or simulated deliveries. A disabled commerce module must leave every

commerce-dependent audience rule or exclusion blocked under STORE-005/006;

mail-only rules may use only real recorded contact and consent evidence.

The profile preserves CONT-001 through CONT-006 and CONT-008 through CONT-013,

AUD-001/002/004/005/006/007, exact saved-revision approval in CAMP-004/005/007,

email identity/authentication/unsubscribe requirements in MSG-001/002/003,

suppression and SEND-005/006 delivery truth. Approval, dispatch and hand-off

must each honor their existing checks. Absence of commerce never bypasses

source requirements for a rule that reads commerce. Optional SMS retains its

full consent, jurisdiction, sender and opt-out requirements whenever enabled.

AI generation, attribution and forecasts cannot claim evidence that is absent.

All baseline guarantees and the remaining clauses remain release obligations.

Local tooling, source integrity, tests and an operations input check certify

only their stated scope. Hosted newsletter acceptance additionally requires a

verified sender domain, real sign-in, one approved exact-revision campaign,

signed persisted provider webhooks and unsubscribe before acknowledgment.

**Operator** — a signed-in human running this deployment.

**Source record** — one imported commerce fact (customer, product, variant, inventory level, order, refund, cart, or browsing event) with the identifier and occurrence time the store gave it.

**Contact** — one person, identified by a canonical email address, phone number, or both, with an independent consent state per channel.

**Channel** — email or SMS.

**Proposal** — a generated, unsent recommendation for a campaign.

**Campaign** — the operator-owned object a proposal becomes. It holds one or more **steps**, each a single channel with its own content and scheduled instant.

**Revision** — an immutable snapshot of a campaign's name, channels, audience rule, content, sender identity, and schedule. Operators approve a revision, not a campaign.

**Candidate** — a contact matching an approved revision's inclusion rule before exclusions.

**Eligible contact** — a candidate that survives every exclusion in AUD-002, AUD-003, and AUD-004.

**Recipient-step** — one eligible contact paired with one step: the unit that is handed to a provider, retried, and given a terminal outcome.

**Dispatch** — the process that turns a step's recipient-steps into provider hand-offs.

**Delivery** — a provider-confirmed arrival, distinct from a hand-off and from provider acceptance (SEND-006).

**Event** — a fact about a contact from a connected source or the events API (for example Started Checkout, Placed Order, Viewed Product, Subscription Canceled, Form Submitted), with its source identity, occurrence time and properties.

**Property** — a typed value on a contact (text, number, USD money, date, boolean or list), set by import, form, integration, API, flow action or operator.

**Topic** — a named subscription category (for example Newsletter, Promotions, Product updates) inside a channel's consent scope (CONT-003); people can hold different states per topic.

**Segment** — a saved rule over properties, events, consent, engagement and predictions whose membership is recalculated as facts arrive.

**Flow** — an always-on automation: a trigger, filters, and a graph of delays, waits, splits, actions and exits. A **flow revision** is its immutable snapshot; operators activate a flow revision, not a flow.

**Enrollment** — one contact's passage through one flow revision, from trigger to exit, with its current node, timers and history.

**Variant** — one alternative in an experiment; a **holdout** is a randomly selected group deliberately sent nothing so that lift can be measured against it.

**Form** — a signup surface (embedded form, popup, flyout, full-page form or landing page) that captures consent evidence.

**Brand kit** — the saved logo, colors, fonts, button style, footer and social links new content starts from.

**Agent** — an AI routine acting on this deployment's own data under the authority an operator granted it (AGENT-010); it can propose and draft, never approve or activate.

Agents serve the whole job beyond today's up-and-comers. Every agent works only on this deployment's own data, names the evidence for every claim (PROP-006, PROP-008), records its cost (RESULT-004) and acts only under AGENT-010.

What Mango does not do, and how a US buyer gets it:

**A bulk mail delivery network or guaranteed inbox placement.** Mango sends through the owner's own email provider, which the owner connects from Settings (DELIV-001, DELIV-008), and follows Gmail, Yahoo and Microsoft sender requirements; it authenticates, records bounces and complaints, and reports outcomes. Inbox-placement seed testing and rendering previews in dozens of real mail clients come from Litmus or Email on Acid, linked from review.

**An SMS carrier, or sending without US registration.** Messages go through the owner's Twilio account under their 10DLC, toll-free or short-code registration; carrier fees and registration are on that account (SMS-002).

**A storefront, checkout or store transactional messages.** Order confirmations, shipping and account emails remain the store platform's (Stall, Shopify, WooCommerce) or a transactional provider's such as Postmark; Mango sends marketing and lifecycle messages.

**A CRM sales pipeline, help desk, website builder, survey tool or cross-app automation platform.** Those are Orbit, HappyToHelp, Pane, Pencil and Crank (or HubSpot, Zendesk, Squarespace, Typeform and Zapier); Mango integrates with them (INT-009, INT-011, SMS-004).

**Payroll, work and project management, or monitoring and observability.** Those are the RunEditRun products [Envelope](https://github.com/just-every/run-envelope) (payroll), [Pegboard](https://github.com/just-every/run-pegboard) (work and project management) and [Porthole](https://github.com/just-every/run-porthole) (metrics, logs, traces and alerts); Mango links to them and claims none of their capability.

**Running paid social or search ads, or social posting.** Mango syncs audiences to ad platforms (INT-012); campaigns themselves are run in Meta, Google and TikTok.

**An ad exchange, newsletter ad network or paid-recommendation marketplace, or holding money.** Direct sponsorships (PUB-004) and partner recommendations (PUB-003) are in; network ads come from third-party sponsorship marketplaces, and all payments run through Stripe or Nectar (PUB-002).

**Collecting product reviews, loyalty points or direct mail.** Review and loyalty apps feed events (INT-014); postcards come from a direct-mail provider triggered by a flow webhook (INT-008).

**Purchased, rented or scraped lists and cold outreach.** Mango refuses lists without consent evidence (CONT-003, DELIV-006), and the incumbent-held attestation (CONT-024) excludes them; cold B2B outreach belongs to sales tools.

**Several brands in one installation.** Each brand runs its own Mango installation; an operator can be invited to several. Agencies manage clients that way.

**Legal advice or a compliance guarantee.** Mango enforces stated product rules for CAN-SPAM, TCPA, carrier rules and US state privacy laws; the owner remains responsible for their program. Rules for other jurisdictions (EU/UK GDPR and PECR, Canada's CASL) are honored through confirmed opt-in today and need their own clauses before Mango claims them.

**Causal claims from attribution or opens.** Attributed revenue is a rule-based assignment (REPORT-003); lift is claimed only from randomized holdouts (EXP-003, EXP-004), and opens are estimates (RESULT-002).

The sections below retain the owner-approved policies and evidence notes for the current release, together with the named target amendments. Each amendment specifies required replacement behavior; its implementation status is the clause's Status row. They remain binding; target clauses that extend them (for example FLOW-008 for activation, SMS-003 for US quiet hours) add obligations and never relax these. OPER-004 replaces retained equal-product-access wording with six product roles: Owner, Admin, Manager, Author, Analyst and Support. Product authority is separate from Base's unchanged owner/admin/member roles, always protects the last product Owner and belongs to the destination installation on restore. Retained authoring and design policies apply only to product roles permitted to perform those operations; CSV export remains Owner/Admin only. The named exceptions follow. MSG-013 admits `mailto:`, `tel:` and `sms:` link destinations beside HTTPS; it amends MSG-006's HTTPS-only rule for links (README's "links and image sources must be HTTPS"), and image sources stay HTTPS only. BUILD-010 admits Mango's generated responsive block beside the unchanged authored grammar of the MSG-009 and MSG-012 policy. CONT-024 admits incumbent-held consent, under the owner's attestation, beside the unchanged CONT-003 rule for consent Mango captures; it amends the Archive move-in and Newsletter audience scope rule that a subscribed row needs its own original evidence. MOVE-012 and SCALE-001 raise the stated limits and keep every other guarantee of the Archive move-in policy. BUILD-012 replaces the historical 20,000-character body save limit in the DESIGN-004 policy of 13 October 2026 with measured UTF-8 size: at most 102,400 bytes for each of the HTML and plain-text parts (`seed.json → limits.maxEmailHtmlBytes`), and keeps every other guarantee of that policy. MOVE-011 replaces the last sentence of the MSG-009 and MSG-012 policy ("Move-in import keeps its stricter unstyled output"): move-in conversion writes the styled grammar of that policy, and the policy is otherwise unchanged. FORM-008 replaces the "Public signup and confirmation" policy's levels of five attempts per network per hour and fifty confirmation reservations globally per hour with allowances set at its intake floor, as its *Defaults* state, and returns a reservation lost to a concurrent duplicate before any hand-off. Every other rule of that policy stands, with FORM-009's server-designated hosted kiosk mode as the one authorized exception: its device label, fresh mandatory Turnstile check for every person, blank reset and separate kiosk rate partitions permit at least 300 accepted signups per hour from one network. Ordinary FORM-008 policy is otherwise unchanged. CONT-027 is approved (owner decision, 19 Oct 2026) and amends the CONT-005 public capture policy's "no reconsent route" and the CONT-005/009 concurrency rule for surviving erasure hashes: a previously unsubscribed person, including an address with a surviving unsubscribe or erasure hash, is resubscribed only by their own affirmative POST from a confirmation email sent to that address. At most three confirmations per destination address per UTC calendar day are permitted, shared across public signup surfaces. The signup form returns the same generic acknowledgment whether or not the address was suppressed, including when the allowance is exhausted. Nothing bypasses suppression: bounces, complaints, provider or operator suppressions and legal holds stay suppressed. INT-015 amends BASE-DATA-005, as Managed mail does, for the one declared Shopify connector Run Edit Run runs for the public Mango for Shopify app, which holds no shop token and stores no forwarded body; it also amends `extensions/mango-pixel/INSTALL.md`'s rule that a shared multi-shop app is unsupported, by adding the per-installation webhook address, the signed-body shop check and the forwarding signature to Shopify's HMAC. The single-shop custom app stays as the developer route. DELIV-008 amends the SendGrid guarantee section's sentence "No account-level SendGrid webhook setting change is authorized": on a connected account Mango may create one event webhook of its own at this deployment's URL, turn on its signing, read its verification key, read it back and delete it on disconnect, and changes no other account-level setting or webhook. It also replaces OPERATIONS.md's deployment-input route for the newsletter sending connection (`MARKETING_MAIL_*` on Managed, `MAIL_PROVIDER` with its key and webhook secret on Free and Assisted) as the first route, keeping it as the labeled developer route. A Settings connection is runtime data, not startup configuration: BASE-SECRET-002 still governs the deployment's required inputs, and a missing connection is a named approval blocker (`sending-connection-missing`), never a degraded mode. SMS-008 applies the same rule to Twilio. MSG-013 is implemented and exercised by `tests/go-live/contact-links.journeys.ts`; BUILD-010 remains missing and CONT-024 remains partial. Under the owner's standing rule (19 October 2026), no amendment waits on a further owner confirmation: FORM-008, INT-015, CONT-018, DELIV-008, BUILD-010 and CONT-024 each state the most conservative industry-standard default in their own text and are buildable as written. FORM-008: allowances at their floor, raised only by an Owner, the challenge on at creation. CONT-018: site tracking off until an Owner or Admin turns it on, consent only from the store's consent tool, Global Privacy Control always an opt-out, one first-party cookie, nothing anonymous reaches Mango. INT-015: Shopify's public-app, OAuth, mandatory-compliance-webhook and protected-customer-data requirements, a connector used only after an Owner or Admin chooses Connect Shopify, and fail-closed routing. DELIV-008: one signed, Mango-named event webhook, created only after the Owner consents on a screen that names it, and no other account-level change. BUILD-010: a generated block in `<head>` that degrades to the fluid layout and fails visible. CONT-024: a versioned, per-source attestation record, with the rows never imported as subscribed named in the clause. INT-015's default is that the connector serves every installation on every tier, and DELIV-008's default is that the Settings connection is offered first on every tier. CONT-018's click token amends RESULT-005's rule that the redirect adds nothing to the destination: an opaque, random, single-use token that carries no personal data and can be exchanged for 7 days after the send is added only for a connected store host whose site tracking an Owner or Admin has turned on, and never for a click RESULT-005 classes as automated or a request that carries Global Privacy Control. For INT-002’s WooCommerce plugin, main’s 22 October 19:56Z direction and ct’s 20:20Z approval authorize its shipped semantic: Ct approved the INT-002 semantic on 22 October 2026 at 20:20Z: store-admin enablement is off initially; only signed-in store customers; explicit analytics and marketing consent before the one Secure HttpOnly SameSite=Lax first-party cookie, expiring after 30 days; GPC records no observation and revokes pending eligibility; no cross-site tracking or subscription-consent widening; WordPress observations expire after 30 days. The allowlisted signup iframe uses Mango’s own confirmation. A saved tag-and-exit flow revision must be explicitly activated; it sends no marketing message. The shipped INT-002 plugin differs from CONT-018 in five respects: `mango_session` and its reused UUID rather than `mgo_s` and rotated identity; sliding 30-day observations; WP `manage_woocommerce` enablement rather than the Mango Owner/Admin switch; `window.mangoConsent` rather than the WP Consent API; and 30-day WordPress outbox retention rather than 90-day Mango onsite retention. INT-002 remains done on its approved semantic; its evidence cannot make CONT-018 done. The CONT-018 build must implement 90-day onsite retention, withdrawal deletion and explicit HTTPS enforcement before any other CONT-018 work (ct, 23 October 04:38Z). CONT-018 and FORM-008 retain their other acceptance obligations and statuses; FLOW clauses retain their graph/message obligations.

The following transport policy applies to CAMP-004, SEND-001 and SEND-008 **for SendGrid email only**; other providers retain their provider-deduplication and recovery requirements.

**CAMP-004 policy:** SendGrid may pass transport approval under its explicit single-attempt policy without claiming provider-effective deduplication or guaranteed Activity availability. All audience, consent, exact revision, identity, reputation, provider/DNS and trusted receiver authentication gates remain mandatory.

**SEND-001 policy:** Mango durably fences each recipient-step before an at-most-once SendGrid handoff. Success stores the provider message ID. A definite nonacceptance (including a rate-limit rejection) is retry-safe within the existing deadline; no accepted or uncertain handoff is automatically retried. Timeouts, connection resets, HTTP 408 and 5xx, missing message IDs, and eviction after the handoff fence remain `handoff-unknown`, presented as **uncertain · operator review required**. A correlation key is not provider deduplication.

**SEND-008 policy:** Restart, redelivered queue jobs, and resumed dispatch preserve the fence and never resubmit uncertain messages. Reconciliation correlates the submission ID with signed SendGrid event message IDs and Activity data where available. Unavailable Activity access or an expired lookup window leaves uncertainty visible for operator review rather than authorizing another send or inventing a delivery/failure. Operators review receiver evidence and provider IDs; no automatic retry control is exposed for uncertainty.

Mango's default receiving mailbox is the signed-in operator's own inbox (15 October 2026): Settings sends one diagnostic message from the configured From through the provider to that operator's address; its one-time link (32 random bytes, compared in constant time) opens a page whose Confirm POST records an `owner-confirmed` observation, never a GET. It grants authority only while the provider domain is verified and public DNS shows the provider's SPF and DKIM records and a DMARC policy with at least one aligned identity, re-inspected at every approval and handoff; it lasts 30 days and any provider, DNS, binding or credential change invalidates it. It records the owner's receipt, not receiver-added authentication results: Settings labels that evidence as checked in DNS. Security consequence: an operator, who already holds approval authority, can attest receipt for their own mailbox; nobody without that mailbox can. Optionally, the receiver is an explicitly installed HTTPS receipt connector, configured with an authenticated receipt URL and diagnostic recipient. The installation trusts its public endpoint to provide authoritative Cloudflare Email Routing authentication results and original MIME from `/receipts/<id>/raw`; URL and recipient are privileged deployment configuration, never request input. The connector requires exact nonce/body/subject/recipient correlation, receiver-authenticated SPF/DKIM/DMARC, matching DNS keys, and full DKIM body coverage. No account-level SendGrid webhook setting change is authorized, except the one Mango-created, signed event webhook DELIV-008 defines, which Mango alone reads, changes and deletes. Live provider webhooks require the signed-event proof DELIV-008's connection step records.

**CAMP-021 start-and-adopt policy:** Every signed-in operator can create a blank newsletter without AI or commerce, or select an available starter derived from this deployment's recorded store signals, and reach the same editable Review in at most three clicks from Campaigns. Decision Desk “Use this” reuses its linked campaign or atomically adopts an unlinked, unexpired proposal once. Creating, selecting and saving never approve or enqueue delivery. Incomplete drafts may be saved; approval names missing content. Rich text is the default, with an optional HTML mode preserving allowed authored markup in the canonical form saving stores (CAMP-022 policy). Rich text keeps only unstyled markup, so emails containing images or inline styles and presentational attributes use HTML editing, which also avoids fetching remote images during authoring.

**CAMP-022 canonical-save and CAMP-003 preview policy:** Draft create/save normalizes the managed unsubscribe and postal footer once, derives plain text with actual destination URLs, and persists that normalized revision for preview and approval. Create/save also stores the email body in canonical form (13 October 2026): it is parsed with the WHATWG HTML parsing algorithm (parse5) as the content of `<body>` with scripting off, as mail clients read it, and the tree is written back with the HTML fragment serialization algorithm, so every element is closed explicitly where parsers keep it, attribute values are double-quoted, character references are decoded (text escapes only `&`, `<`, `>` and no-break spaces; attribute values `&`, `"` and no-break spaces), comments stay comments and personalization tokens stay exactly as written. This is parse and serialize only: it never changes a style declaration or the value of an attribute it keeps, never removes what the checker refuses (comments, refused tags and attributes stay and are refused), and never refuses a body for how it is written. What parsers drop is absent from the stored body as it is from every recipient's tree: of an attribute written twice the first is kept, and attributes on a closing tag, or a tag parsers ignore where it stands (a cell or row outside a table, a `<body>` tag) together with its attributes, are gone; the checker then judges exactly that tree, so a hiding style is still refused, never repaired. The stored form parses back to itself, so saving it again stores the same bytes: an HTML `pre`, `textarea` or `listing` whose text starts with a line break is written with the extra one parsers drop, and nothing follows the text of an HTML `plaintext` element (neither its end tag nor its ancestors'), which parsers never close and which would turn the managed footer into its text on every save (the body is stored without the footer and refused at approval for the tag and the missing footer). Because writing a tree out and parsing it again can build a different tree (an element moved out of a table into a MathML text integration point changes namespace, and raw text becomes markup), the body is parsed and written again until its written form parses back to itself before the managed footer is placed after it, and a save is repeated on its own result until it stores what it read, so saving the stored body, or the body the editor shows (the stored body with every managed footer removed), stores the same bytes for every input. Every body tried settles within two rounds; one that has not settled after sixteen is refused with `invalid_email_body` (400) rather than stored in a form the next save would change. *Replaced behavior (13 October 2026, hardening):* the footer was appended to a body after one round of parsing and writing, so for such a body the first save placed it inside an element and the next save moved it (`<math><mtext><table><mglyph><style><li style="color:#ffffff">` stored the footer inside the list item, then after the math element), a managed footer written with single quotes ahead of the content moved to the end on the second save (now the first save stores it there), a `plaintext` inside SVG's own `plaintext` grew on every save, and an SVG or MathML element named `template` failed the save; such bodies were and remain refused at approval. *Security consequences:* none weakened: saving stays parse and serialize only, the checker judges the stored tree as before, and approval binds bytes that a later save of the same draft cannot move. *Replaced behavior (13 October 2026):* such a body was refused with a 400 instead of saved, and a draft stored before canonical saving that held one could not be saved at all. The plain-text part is derived from the same parse. The saved-revision preview renders the validated set: it shows the saved body with its styles when the approval checker passes it, and shows a failing body unstyled with its warning. Existing approval content/link checks remain strict for every stored revision. Editing inclusion and exclusion controls changes version-1 structured rules and refreshes counts from real contacts and source evidence. Missing or stale commerce blocks the result with unavailable counts; superseded requests cannot replace a newer rule's count.

**CAMP-004 policy:** Missing subject, message body, preheader or sender identity remains a named approval blocker. Optional AI/commerce absence does not block a manually authored mail-only audience; required source dependencies still block. Explicit Decision Desk generation uses configured AI and deployment-owned evidence, with unavailable/failed states and no semantic fallback. SendGrid follows the single-attempt and sender-evidence requirements above.

**MSG-009 and MSG-012 policy (13 October 2026; tightened the same day by owner decision):** Besides the unstyled tags and attributes listed under "Email authoring and preview" in README.md, operator HTML may carry a `style` attribute on any allowed tag and these presentational attributes: `table` `role="presentation"`, `width`, `cellpadding`, `cellspacing`, `border="0"`, `align` (`left` or `center`); `td`/`th` `align`, `valign`, `bgcolor`, `width`, `dir` (`ltr` or `rtl`); `div` `lang` and `dir`; `img` `border="0"`. A `style` value is at most 600 characters of `property: value` declarations drawn only from letters, digits, spaces, `#`, `%`, `.`, `,`, `:`, `;`, `-` and quotes, so no comment, escape, entity, function (`url()`, `calc()`, `expression()`), at-rule, block, custom property or `!important` can be written, and a property may appear once. Values are judged decoded, as mail clients read them, and a style or presentational attribute written with a character reference (other than the `&quot;` the canonical form writes for a quote) is refused as written. Property names are written in lower case; values are compared in lower case, as CSS keywords and hex colors are. Allowed properties (`email-style-declarations.ts`): `color` and `background-color` as hex colors (background also `transparent`); `font-family` as a stack of ordinary text faces from a fixed list (Arial, Helvetica, Verdana, Georgia, Times New Roman, Courier New and similar; no symbol or redaction fonts) ending in `serif`, `sans-serif` or `monospace`; `font-size` 10–72px; `font-weight`; `font-style`; `line-height` `normal`, unitless from 1 to 3 or 10–120px, and a pixel line height never below the text size; `letter-spacing` `normal`, `0` or −2px to 10px; `text-align`; `text-decoration`; `text-transform`; `vertical-align`; `width`, `min-width`, `max-width` and `height` in px, % or `auto`; `padding` and `margin` 0–80px (margin also `auto`); `border` as 0–8px solid, dashed or dotted with a hex color; `border-radius` 0–40px; `border-collapse`; `table-layout` `auto` only; `white-space` (normal or nowrap); `word-break`; `overflow-wrap`. Every other property and value is rejected, including `display`, `table-layout: fixed`, `position`, offsets, `z-index`, `float`, `opacity`, `visibility`, `overflow`, `max-height`, `clip`, `transform`, `filter`, `direction`, `unicode-bidi`, `text-indent`, `background`, `background-image` and `mso-hide`. *Where presentation may stand* (`email-placement.ts`; each rule is a step of the argument under *Security consequences*): (1) only a table cell (`td`, `th`) paints a background, by `background-color` or `bgcolor` (a declared `background-color: transparent` paints nothing whatever `bgcolor` says), and the email's outer wrapper, the first `div` at the top level of the body that sets a `background-color`; no other `div`, no table, row, inline element or other element may set either. A cell's background fills its box and the cell grows to hold everything in it; any other element's background covers only part of what it holds (an inline's line boxes, not the blocks inside it), which is how the last bypass hid its text. The wrapper is a block, which does not hold a line too long for the screen or a table floated out of its bottom, so text on the wrapper is judged on the white page around it too (readability below). Mango's design compiler instead writes the page color on the one cell of a full-width table around its 600px column, which needs no second color, and an author can do the same; (2) no element declares `display`, so every element keeps its native display, every cell is a table cell; (3) `width` and `min-width` only on tables, cells and images, and `max-width` only on tables and images: in automatic table layout (fixed layout is not in the grammar) a table never narrows below its content and a cell's width is only its least width, so both grow to hold what they contain, and images hold no text, while a width on any other box, or a maximum width on a cell (a real limit in browsers), could make it narrower than its text; (4) `height` only on tables, rows, cells, images and empty boxes: a table part with its own display treats a height as its least height, images hold no text and an empty box (a rule drawn as a border) holds nothing, while any other box with a height lets what it holds run out below it (text onto whatever follows its cell, an image over the text below); (5) a table or image whose width or minimum width is a percentage (style or `width` attribute) sets no left or right margin, padding or border, which would come on top of its share of the room and push it out of its cell; (6) inline elements (`span`, `strong`, `b`, `em`, `i`, `u`, `s`, `a`) set no border: an inline box's top and bottom borders take no room in its line, so a top border paints over the line above, drawn earlier (an inline element's padding paints nothing, since it has no background); (7) a cell that paints a background rounds its corners by at most its padding on the left and right, or on the top and bottom (its own style padding, else its table's `cellpadding`, else the browser's 1px), so nothing it holds sits in a corner the rounding leaves unpainted; (8) `dir="rtl"` only on a table cell or inside one: right-to-left content wider than its box runs out on the left, past the left edge of the email, where no reader can scroll, while a cell grows to hold it; for the same reason a table is not aligned `right` (a right float wider than its room runs out on the left); (9) in styled markup the cells of one table may not cover the same slot where a row span meets a column span (`email-table-slots.ts`, the HTML table processing model): browsers draw both, and the later paints its background over the other's text; (10) a pixel line height is never below the text size it sets (unitless ones are at least 1), so no line is shorter than its text and no glyph spills out of its cell; fixed table layout, where a cell keeps its width and its text runs out of it, is refused, so every table is laid out automatically. Other spacing (`padding`, `margin`, block borders, `cellpadding`, `cellspacing`) and `white-space: nowrap` stay: they take room in layout, which the cell around them grows to give. *Readability* (`email-presentation.ts`): every text run must reach 3:1 contrast against the background of its nearest ancestor table cell that paints one; outside any painted cell, against the outer wrapper's color and the page's white `#ffffff`, or the page's white alone outside the wrapper; in every color it may take: its own declared or inherited `color`, default `#000000`, or the browser's `#0000ee` for a link with an address (visited links are darker and read wherever it does; an anchor without an address inherits its parent's color, as browsers show it). Many mail clients render a body without a doctype in quirks mode, where a table does not inherit `color`, so text in a table that sets no color between the table and the text must also reach 3:1 in default black. No text renders below 10px, headings included (they scale with the text around them, and a quirks-mode table starts again from 16px; the smaller size counts); an image's styled width or height must be at least 2px; and the direction override characters U+202D and U+202E in text are refused, since they reverse the letters readers see as `unicode-bidi:bidi-override` would while screen readers, search and the plain-text part read them in written order (embeddings and isolates, U+202A to U+202C and U+2066 to U+2069, only set direction, as `dir` does, and pasted right-to-left names carry them). The unsubscribe link and the postal address are text runs under the same rule, so they are visible on their own background. Mango's design compiler aims for 4.5:1. When a body uses any of this presentation, it must be written the way HTML parsers build it: every element closed in order where parsers keep it (no implicit closing, table foster parenting, misnesting, or a tag parsers ignore or rename; a `tbody` parsers add around table rows is the one allowance), so the cell each text run is judged in is the one recipients see in quirks and standards rendering alike. The canonical form saving stores always meets this (CAMP-022 policy); the earlier unstyled grammar keeps its looser nesting. Anything outside this set is rejected, never repaired. BUILD-010's generated responsive block is the one named exception, and it is never authored text. *Replaced behavior (13 October 2026, owner decision "Tighten the style rules"):* the grammar first let any element paint a background and admitted `display` (block, inline, inline-block, table, table-cell, table-row), fixed table layout, widths and heights on any element, borders on inline elements, a table `bgcolor` and a table aligned `right`, and judged text against its nearest declared background. Keeping that sound took modeling which elements paint behind which descendants (`email-ink.ts`) and laying every body out across a 600px column with measured glyph widths to follow text that could leave its box (`email-geometry.ts`, `email-geometry-boxes.ts`, `email-glyph-widths.ts`, the generated glyph table and `scripts/measure-email-glyphs.mjs`). Each modeling round leaked a new hiding family; the last was an element set `display:inline` with a background, which paints none behind the block inside it, so white text inherited into that block was judged against a black background no browser paints and reached recipients white on white, with approval, test send, delivery and the styled preview passing. Now the grammar removes what the modeling followed, the modeling is removed with it, and readability is the one contrast check above. A rule kept from before still needs its own small model: a pixel line height is compared with the text size inherited through the tree. The narrower set refuses a background on anything but `td`/`th` and the outer wrapper (whose text must now also read on white), every `display`, `table-layout: fixed`, `width` and `min-width` outside tables, cells and images, `max-width` outside tables and images, `height` outside table parts, images and empty boxes, any border on an inline element, a table `bgcolor`, `align="right"` on a table, `dir="rtl"` outside a cell, a percentage-wide table or image with side spacing, a rounded painted cell padded less than its radius and overlapping styled cells; `dir` is newly allowed on cells. The structure rule that kept blocks out of phrasing elements and table parts in their tables for styled markup went with inline backgrounds: the parser places table parts, and the written-as-parsed rule stays. Text is no longer judged against every background it could land on, since it can land on none but its own. *Security consequences:* hiding by color has one place to happen and one check. The only painted boxes are table cells and the wrapper; a cell's background fills its whole box (rounded corners are padded clear); a cell and its table grow to hold everything inside them, and what the wrapper cannot hold lands on the page, against which its text is judged too; and nothing inside can be sized, displayed, positioned or bordered so as to leave its cell or be painted over (inline borders, overlapping cells), so the background behind every text run is read from the tree alone, in standards and quirks rendering: sound by construction rather than by modeling. This was compared with Chromium's rendering pixel by pixel (every glyph made transparent, in quirks and standards mode at 800px and 375px) on every earlier bypass family, the adversarial suite and the new grammar's edge cases: no approvable body hid a word. There is still no remote load other than `img src` and link `href`, both inspected under MSG-006; no style can express an at-rule, so no CSS tracking channel exists. *Residuals:* text that runs past the right edge of the email (a long word or a table wider than a phone) lands on the page, where it is read like any other text, but a reader must scroll to it; a large unitless `line-height: 1` can let a few pixels of tall glyphs overlap the line above, which stays readable; list markers (not authored text) can hang outside a cell when a list's padding is removed; padding on a link or cell makes a large tap target, but its visible label is still required and its destination is still inspected under MSG-006; clients render differently (classic Outlook ignores `border-radius` and `max-width`; dark mode recolors), so approval binds the exact bytes, not every client's look; a personalization value can be longer than its fallback, and its cell grows to hold it; the checker is security-critical code with adversarial tests in an executed spec that consumes `tests/support/adversarial-email.mjs` (see Evidence) (shared cases in `tests/support/adversarial-email.mjs`, which `scripts/prove-email-preview.mjs` also saves and previews in a browser). The renderer and `messageRendererVersion` are unchanged, and every revision that was valid under the earlier unstyled grammar remains valid, so no approved plain revision needs re-approval, except markup the earlier checker read differently from mail clients (parsing policy below). A revision approved under the styled grammar before it was tightened (unreleased, so in practice only on review copies) that uses what is now refused is refused at test send and delivery with the reason named and needs a new approval; a design imported before is imported again, since it was built with inline blocks, block images and a table background. Move-in import keeps its stricter unstyled output.

**MSG-009, MSG-012, MSG-016 and CAMP-022 parsing policy (13 October 2026):** One parser reads every email body: parse5, an implementation of the WHATWG HTML parsing algorithm that runs in the Worker and the browser, reading the body as the content of `<body>` with scripting off, as mail clients do, and keeping personalization tokens whole as written (`src/core/features/campaigns/email-html-parse.ts`). The approval checker (`inspectEmailHtml`, used by approval, test send and delivery), the preview sanitizer, the plain-text part and the editor's switch to HTML mode all walk that tree. *Replaced behavior:* the checker walked tags with its own tokenizer, which read `< /span>` and `</ span>` as closing tags while HTML parsers read text and a comment and keep the element open, so text styled to be hidden passed approval while recipients saw it hidden; the plain-text part was derived with regular expressions and dropped text such as `1 < 2 and 3 > 2` that the HTML part shows. Refused as written, with the place named: tag-level parse errors (malformed tags, comments and doctypes), unquoted attribute values, attributes parsers drop, any tag outside the grammar wherever parsers place, rename or ignore it (the attributes of a `<body>` tag, which a document parser applies to the whole email, included), comments, and for styled markup any difference between the markup as written and as parsed. Character-level parse errors (a missing semicolon after a character reference, a control character) are read as parsers read them, as before, and so is a `<` that starts no tag (`< p>`, `< /span>`), which every parser shows as text. Text below 10px is now refused in unstyled markup too, because the tree shows a heading nested inside a heading. Saving stores the canonical form (CAMP-022 policy), so every revision saved from now on reads the same in every HTML parser, in quirks and standards mode; markup that differed only in how it was written (an element left open, a reference in a style) is approvable once saved, because its saved form states the structure recipients see. Normalization never changes a declaration: a style that hides text is stored as written and refused. Delivery transmits the stored bytes unchanged (managed tokens substituted, tracked hrefs rewritten, as before) and never re-serializes them, so the exact approved revision is what is sent; delivery checks those bytes again with the same parser. *Revisions approved before this change* stay deliverable byte for byte and are not normalized, since that would change approved bytes: the earlier checker admitted only quoted attributes, no comments and, for styled markup, explicit in-order nesting, which the parser reads as written (the 12ui design compiled before this change, with implied table bodies and HTML-escaped quotes, is delivered unchanged under test). Refused at delivery, needing a new approval, are only revisions that used a close tag written `</ tag>`, which every parser reads as a comment, that wrote an attribute on a table cell or row outside any table, which parsers ignore together with its attributes, that set unstyled text below 10px with nested headings, or that wrote a direction override character (U+202D, U+202E). A `< tag>` or `< /tag>` the earlier reader took for a tag is text to mail clients and is delivered as approved, with the element it meant to close left open, as recipients always saw it; unstyled text has no presentation for the placement rules to refuse and no background to hide against, so the tightened MSG-012 rules refuse no earlier plain approval. Link and image addresses are judged decoded; besides the earlier rules they may not contain a literal `"`, `<`, `>` or no-break space. Drafts saved before this change are stored in canonical form on their next save, whichever fields that save changes; no draft is refused for how its body is written. *Security consequences:* the checker, preview and plain text no longer disagree with HTML parsers about structure, and saved bodies give clients that do not implement the HTML parser (classic Outlook's Word engine) explicit structure. *Residuals:* the renderer still substitutes tokens and rewrites tracked `href` values in the stored string; values are HTML-escaped and attributes in the canonical form are double-quoted, so a substitution stays inside its text or attribute value. The move-in importer keeps its own tag reader to reduce foreign HTML; its output is stored in canonical form and judged by this parser before approval. parse5 and its `entities` dependency are security-critical third-party code, pinned by the lockfile. *Dependency:* `parse5` ^8.0.1 (MIT; maintained; the parser jsdom, Angular and rehype use; passes the html5lib tree-construction tests; pure ECMAScript modules with no Node API, so it runs in workerd and browsers) adds about 154 KB minified (43 KB gzip) to the Worker and to the campaign editor's client code. The browser's own parser is unavailable in the Worker, Cloudflare's HTMLRewriter tokenizes without building the tree, and htmlparser2 does not follow the parsing algorithm.

**CAMP-006 policy:** The editor uses local dates and times in the configured IANA store zone, independent of the browser zone, shows read-only resolved UTC instants, and defaults the deadline to 23:59 on the chosen local day. UI and API reject nonexistent and ambiguous local times, including non-hour DST transitions, until the operator chooses an unambiguous time. Existing API clients supplying an explicit resolved instant and IANA zone remain compatible; local and UTC values, when both supplied, must agree.

These requirements need their own provider, deployment and release proof.

The move-in kit uses generic CSV presets and documented audience-export shapes, tested only on synthetic files. It adds no verified named importer or replacement claim. Header suggestions never treat record creation as consent; all recognized status columns independently restrict the row, and existing opt-outs remain authoritative. Preview, replay and undo preserve CONT-003/004/010; the guide does not certify real exports, SMS, AI, commerce, signed provider webhooks or hosted restore.

Archive move-in (12 October 2026, CONT-001 to CONT-004, CONT-010, CAMP-002, CAMP-004, SEND-006, DATA-001). One account export (.zip) is read structurally in the Worker within stated limits. Unsafe or oversized archives are refused with a named reason and nothing written, and the original archive with each entry's SHA-256 is kept as import custody. Audience status files use the generic status presets and the CONT-003 evidence rule, the most restrictive status wins, and CONT-004 opt-outs stay authoritative. One Preview writes nothing. Emails become read-only imported history and templates become draft starters, both under the restricted HTML policy. Foreign merge tags block approval through the personalization check, and imported content grants no schedule, approval or delivery authority. Archive reports and sent rows never become send facts or result figures. Undo removes only unchanged imported records and never erases an opt-out, suppression or send history. Tool names stay out of code, presets and seed.json. Proven on synthetic files only; no real export has been reconciled.

Hosted newsletter signup and an embeddable signup form are in scope for this release. Contact capture must preserve CONT-001 through CONT-006 and CONT-009: valid identity, explicit recorded consent, confirmation where required, independent channel status, suppression and opt-out precedence. A form submission does not authorize a marketing send.

Named saved segments and contact merge controls are included in the newsletter profile. Segments use the campaign editor's structured rule schema and review eligibility calculation, including all recorded exclusion counts. Copying a segment into a draft stores the rule itself; later segment edits or deletion cannot alter saved or approved revisions or frozen candidates (AUD-001/002/007, CAMP-004). Segment records are part of the discovered D1 export/restore inventory (DATA-001).

The contact merge control searches by address and previews the most restrictive state independently per channel (suppressed, unsubscribed, non-subscribed, pending, subscribed). Old consent links follow the survivor; queued recipients for the removed contact retain their approved identity and are excluded at dispatch with `contact-merged`. Consent, source activity, suppressions and history remain visible on the survivor (CONT-004/009/011, AUD-005).

Go-live scope (12 October 2026). SendGrid `unsubscribe` and `group_unsubscribe` events are email opt-outs under CONT-004, recorded before the webhook is acknowledged. Signed soft bounces count toward `contact.soft-bounce.v1`, and a provider-confirmed delivery correlated to a Mango recipient resets the count (CONT-006); a signed fact Mango cannot correlate may restrict an address but never relaxes one. Insights lists, per campaign, provider acceptance and each kind of provider event as separate counts (SEND-006/007); the deliverability report includes an uncertain hand-off once a provider event proves it. Settings lists what a sender needs before the first real send and marks only provider, DNS and receiving-mailbox evidence as observed. The local go-live journey proves SEND-005 to SEND-008, MSG-003, CONT-004/006/009, CAMP-008 and DATA-001 with signed facts replayed with a locally generated key, not accepted by a live provider; live signed webhook acceptance and hosted restore stay open. The destination jurisdiction is named by the owner; until then the release sends only to contacts with recorded confirmed opt-in, with the postal footer, visible and one-click unsubscribe and opt-out before acknowledgment. That is the product's rule, not legal advice.

Contact erasure admission serializes with contact merge: a missing or changed subject or an active merge is refused without creating pending work or altering contact custody. Known prior names from renames and merges remain reachable through contact history until erasure. Names already discarded by older installations cannot be reconstructed or reliably linked from unrelated saved text; operators must review any such known historical literals explicitly. Mango does not guess those identities or delete unrelated campaigns.

Contact erasure is included under CONT-013: the existing confirmation dialog leads to a resumable receipt with time, removed or anonymized record counts, retained channels and a random reference. Archive and restore copies are removed in bounded pages with atomic artifact counts; pending remains until cleanup completes. The declared cascade withdraws whole affected imports, removes original custody, redacts the contact's exact identifiers (and, in records naming the contact, their known names) and invalidates affected approvals without rewriting their historical digest identifiers. Shared or other contacts' text that only spells a name is never changed, and a single-word or under-four-character name that a kept record would still hold is refused with 409 naming the store. Independent operator login identities remain. Exact-revision release evidence must establish the five-minute bound and native interruption, import, dispatch and restore boundaries. Operator invitation management is included under OPER-002/003: native Worker/D1 invitation checks cover fresh proof, pending/active invitations, explicit confirmation, session/link revocation, retained attribution, setup self-removal, last-operator protection and cross-origin rejection, with mail substituted only at the test provider edge. Local development admits the owner automatically, suppresses authentication mail and provides no local inbox (owner decision, 15 October 2026). Local contact and operator journeys do not certify the wider commerce/SMS/AI flagship, live signed provider webhooks or hosted restore.

**CONT-009 policy:** Opening a confirmation link by GET or HEAD only previews an affirmative POST form. It never writes consent, consumes a token or changes status: mailbox scanners and link prefetchers cannot provide consent. Only a POST with explicit `confirm=true` may confirm. The original 30-day expiry, single-use token, active identity, later opt-out and suppression guards remain mandatory.

**CONT-005 public capture policy, as amended by CONT-027 (owner decision, 19 Oct 2026):** Public signup returns the same generic acknowledgment whether or not an address is suppressed. An already subscribed address receives no mail or new consent and is never downgraded. A previously unsubscribed person, including an address with a surviving unsubscribe or erasure hash, may supply new logged post-opt-out request evidence and receive a confirmation email sent to that address, at most three confirmations per destination address per UTC calendar day across public signup surfaces. Only that person's own affirmative POST from the confirmation email resubscribes them; submission, GET and HEAD do not. An exhausted allowance returns the same generic acknowledgment and sends no further confirmation. Nothing bypasses suppression: bounces, complaints, provider or operator suppressions and legal holds remain suppressed, including their surviving hashes, and receive no confirmation mail. Other explicit logged post-opt-out evidence through the ledger remains subject to confirmation and suppression resolution. The CONT-027 Status row records implementation of this approved rule.

**CONT-005/009 concurrency:** Public eligibility, contact/profile changes, consent evidence, capture IP, history and pending status commit in one guarded D1 transaction. A destination barred by current consent, suppression or identity guards at that transaction causes no new consent writes. Under the approved CONT-027 rule, a surviving erasure hash with an unsubscribe or erasure reason may recreate an unsubscribed profile holding only new request evidence and send its confirmation email within the shared UTC-day allowance; only the person's own affirmative POST can subscribe it, with no history restored. A surviving suppression hash permits neither consent nor confirmation mail. Confirmation message preparation completes before a database-authoritative handoff check, and the adapter is invoked immediately after that check. Suppression, an opt-out later than the request evidence or confirmation committed before the check prevents handoff. A provider handoff already authorized and concurrently in progress cannot be recalled by a later database transition.

**CONT-027 current implementation (partial):** The hosted and kiosk routes exercise confirmed-only return for known recipient unsubscribes, with generic acknowledgments for destination-dependent intake, allowance and failed or uncertain provider outcomes, no automatic retries, history and separate resubscribe growth counts (`tests/go-live/resubscribe.journeys.ts`). Unknown suppression reasons, including legal holds, and ambiguous legacy erasure-only hashes remain blocked (`src/core/features/audience/public-resubscribe-policy.ts`); challenge and network admission remain independent of address state. Full popup/landing, incentive/topic/flow integration, erasure-reason preservation and supersession, and expired recreated-contact cleanup remain outstanding, as the CONT-027 Status row records.

Missing or invalid sender name, from/reply-to email or physical address rejects public signup before storing even a rate allowance or signup claim. Request bodies are limited to 8192 bytes. Durable atomic allowances permit at most five attempts per network per UTC hour, three confirmation reservations per destination per UTC day, and fifty confirmation reservations globally per UTC hour. IPv4 uses the full address; IPv4-mapped IPv6 shares that address; all textual forms and interface identifiers within an IPv6 /64 share one network budget. Missing or invalid edge IP fails closed. Reservations may be consumed by a failed or concurrent duplicate attempt and are never refunded after uncertain handoff; counters persist across restart and stop incrementing at their ceiling. FORM-009's server-designated hosted kiosk mode is the one authorized exception to the ordinary levels and optional challenge: it requires a fresh Turnstile check for every person and separate kiosk rate partitions of at least 300 accepted signups per hour, with the device label and blank reset FORM-009 requires. Ordinary FORM-008 policy is otherwise unchanged. *Amendment (FORM-008):* the network and global levels become FORM-008's allowances at their floor (1,000 accepted signups an hour and 100 a minute across the installation, with traffic from forms without the challenge held to an allowance of its own at the same levels; per network, 30 accepted signups an hour, 120 when each passes the challenge, and 60 refused attempts an hour), raised only by an Owner up to the email hand-off rate; only accepted signups draw on the global allowance; and a reservation lost to a concurrent duplicate before any hand-off is returned. No owner confirmation is pending (owner direction, 19 October 2026); the levels above apply until it is built, as the FORM-008 Status row records.

An installation may configure Turnstile with both `TURNSTILE_SITE_KEY` and secret `TURNSTILE_SECRET_KEY`; one-sided configuration rejects startup. The hosted form uses action `newsletter-signup`. Server Siteverify must return success with that action and the configured public-base hostname. Missing, malformed, rejected or unavailable verification fails closed before storage. Tokens are bounded to 2048 characters and verification to five seconds. When neither key is configured, ordinary signup retains the same consent, suppression and durable rate limits without a challenge; FORM-009 kiosk capture requires a fresh mandatory challenge.

CSV imports use reviewed plans. Erasure withdraws the complete affected import custody, including no-effect rows and originals, while preserving surviving contacts and their consent. Withdrawn jobs cannot be resumed or undone.

The named target clauses authorize the following implementation changes; their Status and Gap cells retain every unbuilt sentence and pending ct default approval. The target clause text is unchanged.

**FORM-010:** address-independent network, kiosk and global allowance refusals previously returned the generic 202 acknowledgement; they now return 429 with the seconds remaining in the refusing window as `Retry-After`, preserve the visitor's entries and show the required error state. CONT-027's destination-dependent acknowledgement remains generic and grants no authority.

**FORM-008:** the former five network attempts and fifty global confirmation reservations per UTC hour are replaced by the accepted-only floor and separate challenged, unchallenged and kiosk partitions already specified in the amendment above. The build uses 1,000 accepted per hour and 100 per minute for each ordinary global partition, the 30/120 accepted network levels and a separate 60-refusal counter. Owner changes apply in the next window. The three daily confirmation reservations and non-refund after attempted or uncertain handoff remain.

**CONT-025 / `contact.opt-in.v1`:** Mango-owned email capture previously always required confirmation. Hosted, kiosk and manual entry now default to double opt-in and admit an Owner/Admin future-only single mode with full evidence and no confirmation send. Scoped API capture is fixed double opt-in: its formerly immediate subscribed upsert now enters pending and sends one confirmation. Existing subscription authority is never widened; public resubscription remains confirmed-only, and private hand entry or API capture never reverses a restriction. Connection-owned sources and the SMS channel remain as their gaps state.

**CONT-026 / CONT-009:** the former confirmation policy admitted only a URL POST with explicit `confirm=true`. For operator-recorded SMS permission, the confirmation text now asks for YES; only the authenticated Mobile Message callback POST carrying that exact reply and the original confirmation's provider identity confirms the number. A URL cannot confirm that operator-recorded SMS evidence. Email and hosted-SMS URL confirmation retain their explicit POST rule. This target amendment's conflict with CONT-009's retained link wording is named in its Gap pending ct's text ruling; no clause sentence is narrowed.

**INT-013:** tracked redirects previously added no analytics parameters. New drafts now freeze bounded static UTM defaults; previews and delivery apply them only to ordinary HTTP(S) destinations, preserve author keys and exclude managed and contact links. No contact field is interpolated. Prior approved revisions remain byte-for-byte deliverable with their original link destinations. Flow dimensions and approval of the adopted defaults remain open.

**CAMP-012 policy (13 October 2026):** `/media/` is declared in `seed.json → deploy.publicPaths`. The image is the rate-limit key declared for this public path under `BASE-ACCESS-003` (`limits.mediaRequestsPerMinutePerAsset`, twice the declared email hand-off rate), because mailbox image proxies fetch for many recipients from few addresses. Upload is `POST /api/campaign-assets` with the image as the single `file` part of a multipart/form-data body, under an operator session and the same-origin check; the response names the image's public URL, `/media/<sha256>`, and the same image is also served at `/media/<sha256>.<ext>` with its stored type's extension (`png`, `jpg` or `jpeg`, `gif`, `webp`; another extension is 404). A file must run to its format's end marker (PNG IEND, JPEG EOI, GIF trailer, WebP RIFF length), so a truncated upload is refused. In HTML mode the email editor's **Insert image** uploads one file through this route and writes `<img src width height alt>` at the cursor, sized from the server's reading of the header and scaled down to the 600px email width when wider; the description (alt text) is required. Design import (DESIGN-004) uploads its photos with `?source=design-import`, which the image record keeps (`upload` otherwise). There is no deletion route, and the database refuses to change or delete an image record. The rate counter is the only write a fetch makes, and it holds a count for the current minute, nothing about the requester; it is outside the contact-erasure write fence for that reason.

**MSG-006 policy:** an image or link whose address is exactly this deployment's `/media/<sha256>` is checked against its record and stored object directly, with no DNS lookup and no request to the deployment's own hostname (Cloudflare restricts same-zone subrequests). A missing image blocks approval and is named. Every other destination keeps the network inspection.

**Security consequences:** `/media/` is a new anonymous surface serving operator-uploaded bytes. Only the four raster types are accepted, checked by header and never decoded by Mango; they are served with the stored type, `nosniff` and `Content-Security-Policy: default-src 'none'; sandbox`, so an upload cannot be served or sniffed as HTML, SVG or script on Mango's origin. A file with a valid header is stored as uploaded; the recipient's mail client decodes it. It is not a tracking channel: every recipient gets the same URL, the route records no address, user agent, cookie, recipient or per-request time, these campaign image fetches are never counted as opens (Apple Mail Privacy Protection prefetches images anyway); the separate opt-in pixel is governed by RESULT-002. Images are public by design: the SHA-256 name is unguessable, but an image in a sent letter can be fetched by anyone holding it, and an uploaded image cannot be withdrawn in this release, so operators upload only what they would publish. Contact erasure scans every stored object, campaign images included, for an erased contact's exact id, address or phone in readable bytes such as image metadata, and removes a matching image's bytes; the record stays, `/media/` answers 410 for it and approval names it missing. Pixels are not inspected. Unknown names cost one database read and write nothing; anyone holding an image URL can spend that image's allowance for the rest of a minute, which shows a broken image to recipients fetching it then (the MSG-010 trade-off). Each fetch of a known image writes its rate counter, so anyone holding one image URL can make up to that per-minute limit of database writes for it, which counts against the deployment's D1 write quota or bill. The pixel limit is checked on the header's declared size; Mango never decodes the image, so a recipient's client may decode a larger image than the header declares. Erasure's 410 reaches only requests that come to this deployment: copies already held under the immutable year-long cache by browsers, mailbox proxies or CDNs keep the image. While a contact erasure is pending or restore mode is on, `/media/` answers 503 like the other public paths. Saved revisions keep absolute image URLs, so a restore onto another origin keeps pointing at the original origin.

**Copies running on a computer:** a local copy's public origin is `http:` (`rer dev`), so its own images are `http://<host>:<port>/media/<sha256>`. A draft may hold exactly those: saving, the editor's import and the preview pass the deployment's own origin to the MSG-009 checker, which then also admits an `img src` that is that origin plus a `/media/` image path, keeps the preview's validated styles, and after the operator opts in to images adds that origin to the preview's image policy beside `https:`. Approval, test send and delivery never pass it, so they refuse those images and name the reason: approval needs images at an HTTPS address, so a designed email is approved from an HTTPS deployment. *Security consequences:* nothing changes on an HTTPS deployment, where own images are already HTTPS; on a local copy the exception covers only the deployment's own origin and media path, never another `http:` host, and never reaches a recipient.

**Evidence and gaps:** local only. Own images are proved on a local `http:` origin (Insert image, save, styled preview loading the image after opt-in, approval naming the HTTPS requirement) and approval of own images is proved with an HTTPS public base URL, both against real local D1 and R2. Hosted serving, image-proxy behavior at the declared rate and real inbox rendering are unverified.

**DESIGN-004 policy (13 October 2026):** The operator runs `12ui draft` and `12ui convert <candidate.png> --engine api --output layerdoc --model fast` on their own machine and account, then chooses **Import 12ui design** in the draft's email editor. Mango reads only LayerDoc version `"2"` (at most 2 MB, 2,000 layers and 64 levels of nesting, counted with an explicit stack before the layer schema reads the tree, so a deeply nested file is refused by name rather than overflowing the stack; anything else is `invalid_layout`, never guessed) and a PNG whose shape matches the LayerDoc canvas. It lays the design out as a 600px centered table: header emblem and lettering, full-width or two-column photo sections (two cells of one row, vertically centered on each other as the design draws them), one bulletproof button, and the footer, all in the tightened MSG-012 grammar: the email's outer wrapper is the one cell of a full-width table and carries the design's page color (only cells paint), images keep their inline box aligned to the bottom of their line instead of a `display`, and the button's fill and rounded corners are its cell's, with the radius held to the cell's 32px side padding (at the button's height any larger radius draws the same pill). Text is HTML-escaped, and the wrapper sets `overflow-wrap:anywhere`, so a design word too long for its column wraps inside it; colors are used only when they are `#rgb`/`#rrggbb` and are moved to at least 4.5:1 against their background; type faces map to two fixed stacks (Georgia or Helvetica); sizes and spacing are Mango's own. Icons, dividers, shapes, links with no destination, a second button, footer links and any footer line with a digit (the address the design invented) are left out and listed. Design text containing `{{` or `}}` is refused, so a design cannot write personalization or managed tokens. A line counts as from the brief only when the whole line appears in the brief as whole words, ignoring case, spacing and typographic quotes; the brief starts as the draft's name, subject, preheader and sender name and the operator may edit it. Photos are cropped from the full-resolution PNG on a canvas at up to twice their displayed width, encoded as JPEG and uploaded through `POST /api/campaign-assets`; no image codec runs in the Worker. The compiled body is checked with the approval checker and BUILD-012's measured per-part UTF-8 size limit before it reaches the editor: at most 102,400 bytes for each of the HTML and plain-text parts, from `seed.json → limits.maxEmailHtmlBytes` through `src/core/features/campaigns/email-size.ts`. This supersedes this policy's historical 20,000-character save cap of 13 October 2026. The server re-measures at save, approval, test send and delivery; oversize content is refused without truncation, and a recipient whose hand-off exceeds the limit is skipped under BUILD-012. Replacing a body that already has content asks for confirmation first. The change summary beside the editor shows a thumbnail of every hosted image, loaded from its own `/media/` address, so the operator sees the pixels recipients will see (the PNG is checked only for the LayerDoc's shape, so a different candidate of the same size crops the wrong pixels), and highlights an image description (it becomes the alt text) that is not in the brief; it says whether the imported body is saved yet or has been edited since, and disappears when Discard changes restores the earlier body. The importer's code loads only when the operator opens it.

**Security consequences:** the LayerDoc and PNG are untrusted operator files. No LayerDoc value reaches the email unmatched: text is escaped, colors must match a closed hex shape and are rewritten, font names select one of two fixed stacks, and the signed 12ui URLs a LayerDoc carries are never fetched by the browser or the Worker. Import itself uses no 12ui key and makes no request to 12ui; generating designs inside Mango is the optional design module (DESIGN-001 to DESIGN-003), with its own declared external (`seed.json → externals → design-provider`) and the BASE-DATA-005 policy below. Images uploaded by an import that is then abandoned stay stored and public under CAMP-012. *Residuals:* the design's words are model-written and can make claims the operator never made; highlighting lines not in the brief and the operator's review are the safeguard, and approval never verifies marketing claims. Two-column sections stay side by side on phones, narrowing with the email: without `display` (MSG-012) only table cells hold a row of columns, and there are no media queries; until the grammar was tightened (13 October 2026) they stacked on phones as inline blocks. Real inbox rendering is unverified.

**Evidence and gaps:** proved locally against real D1, R2 and the Worker with the real orchard LayerDoc: import, save, preview, every approval check and exact-revision approval, at 1440px and 390px, with an HTTPS public base URL. After the MSG-012 grammar was tightened (13 October 2026), the orchard design (imported, and built by Design with 12ui against the stand-in 12ui server) renders pixel-identical to the earlier compile at 640px in quirks and standards mode, and at 375px only its two-column sections differ (side by side instead of stacked). On a local review copy (`rer dev`, `http:` origin) the same import compiles with the copy's own image addresses, saves, previews styled and loads its images after opt-in; approval there names the HTTPS requirement (CAMP-012, copies running on a computer). Gmail, Apple Mail and Outlook rendering through CAMP-008 test sends remains a release obligation.

**DESIGN-001 to DESIGN-003 policy (13 October 2026):** The adapter `design.provider.v1` (`src/core/platform/adapters/twelve-ui.ts`) calls 12ui's hosted `/api/v1` with plain `fetch` and `Authorization: Bearer <DESIGN_PROVIDER_API_KEY>` at `DESIGN_PROVIDER_ORIGIN` (`https://12ui.com`): `POST /api/v1/create` claims a run and buys nothing (`concept`, `aspect: portrait`, `mode: inspiration`, slots `a` to `d`); `POST /api/v1/create/<run>/candidates/<slot>` buys one image; `GET` reads the run and each candidate PNG; `POST /api/v1/convert` (multipart: the chosen PNG, `output=layerdoc`, `model=fast`) buys the layout; `GET /api/v1/convert/<id>` reads the operation and then its LayerDoc, which must match the SHA-256 12ui publishes and parse as LayerDoc version 2 (anything else is `invalid_layout`). Every `POST` carries `Idempotency-Key: mango-design-<run>-draft`, `-draft-<slot>` or `-layout-<slot>`, and `-layout-<slot>-<round>` for a layout the operator asks for again after a failed layout step (`layout_round`, migration 0042), so a new try is one new purchase and never a replay of the failure. Queue commands `design.draft` and `design.layout` carry only the run's ID; each pass makes only the requests the run's state still needs, stores each candidate PNG as it lands (read with a streamed 40 MB cap, refused unread when its declared length is larger, and at most 4,096 pixels a side, checked by its header, as campaign images are, since the editor decodes it to crop photos), and re-enqueues itself after 5 seconds until the run settles. Every JSON answer (a run, a purchase, a convert operation) is read with a streamed 64 KB cap in the same way, so no answer from 12ui is read without a limit; a larger one is `provider_invalid`. Consumers are idempotent and run under the contact-erasure write fence and restore mode like every queue command. Every request has a deadline: 30 seconds, 60 for a candidate image or LayerDoc download, and 150 for a candidate purchase, which answers once the image is drawn (past it the next run read says what happened). A 429 that names a time to ask again (`Retry-After`) delays the run that long with the same idempotency keys, recorded as its wait (`wait_code`, `retry_at`, migration 0041) and shown in the editor as a calm, muted alert with the time relative to now, kept until 12ui answers the request that follows (past that time the editor says Mango is asking again, so the panel never flips back to ordinary progress while a retried request is unanswered; once 12ui answers, the wait is cleared and the editor shows the run's ordinary progress), and fails it as `provider_quota` when that time is past its deadline; a 429 without a time (the daily allowance) or a 402 (the wallet) fails it at once as `provider_quota`; a network failure, a 5xx answer or a request past its deadline is retried on up to three passes 5 and 10 seconds apart (shown as a status line with the time, cleared in the same way), then fails as `provider_unavailable`, so a service that stops answering fails a run within about two minutes (five while a purchase is drawing); a refused key, request or unreadable answer fails at once (`provider_unauthorized`, `provider_rejected`, `provider_invalid`; a redirect is followed only by a read and only on the configured origin, so a redirect elsewhere, or one answering a purchase, is `provider_invalid` and the key never leaves for another host); a candidate or layout 12ui could not make is `provider_failed`, and an expired layout operation `provider_timeout`. The every-minute (`* * * * *`) cron fails runs past their deadline as `provider_timeout` and re-enqueues live runs that have been quiet for two minutes and are not waiting for 12ui's time to ask again; reading a draft's run applies the same deadline, so a copy without a cron also settles. A new run cannot start while another run of the draft waits on the service (a run on offer may still prepare a layout meanwhile). Starting a run never sets aside an earlier one: the status route returns the latest run and, as `earlier`, up to ten older runs whose drawn designs are still on offer (`choosing`, `preparing`, `ready`, or `failed` with designs drawn), which the editor shows, with their own **Use this design** buttons, under **Earlier designs** (the operator may fold them away), and the brief dialog says the designs already on offer stay. A `failed` run with drawn designs can still be chosen from: choosing after a failed layout step increments `layout_round`. In the editor, **Use this design** beside a candidate's image chooses it (or opens the import path for the design already prepared, buying nothing); once the layout is ready the import path opens as the continuation of that choice only if the operator has pressed no key, pointer or wheel in the tab since (the awaited design is kept per tab in sessionStorage, so a reload while preparing keeps it); otherwise the run shows a notice whose button opens it, and nothing opens or moves focus while the operator works. The run stays `ready` while its design is only an unsaved edit, and the editor records it `applied` once the draft is saved with that design (or an edit of it); closing the import path keeps the run on offer. Each candidate also links to its full-size image. Operator routes, all behind the session and same-origin checks: `GET` and `POST /api/campaigns/:id/design-jobs`, `POST /api/design-jobs/:id/choose`, `POST /api/design-jobs/:id/close` (`discarded` by the operator, `applied` by the editor once the draft is saved with the design), `GET /api/design-jobs/:id/candidates/:slot/image` and `GET /api/design-jobs/:id/layerdoc`. Records: `design_jobs` and `design_candidates` (migration 0040, with the wait columns of migration 0041 and the layout round of migration 0042) and R2 `design-jobs/<run>/`; `design_jobs` briefs are redacted by contact erasure like campaign text. Shown estimates use 12ui's list prices of 12 October 2026 (about $0.03 per candidate and $0.05 per fast layout; free within 20 images and 50 layouts a day); Mango sets no cap of its own (decision D6a). A copy running on a computer reads both inputs from `.dev.vars` (decision D8a), and its queue consumer runs design commands only; every other command is left for retry, unconsumed as on a copy before this module. `deploy.json` declares both inputs as secrets marked `"optional": true`. Mango's deploy step (`scripts/installer/deploy-declaration.mjs`) hands the unchanged rer deploy kit a declaration under `.rer/declarations/` holding the required secrets plus each optional one whose environment input is set, so `deploy` uploads them once the owner sets them (on the first deploy or a later one), never requires them, and later deploys keep them; `rer verify` serves the build without them, so the module stays off there. Setting them with `wrangler secret put` works too.

**BASE-DATA-005 policy (13 October 2026, deliberate requirement change):** 12ui's packages name Just Every as their author and Mango's public source is `just-every/run-mango`, so the literal baseline text would forbid any request to it. Replacement requirement: the deployment makes no request to the marketplace or the seed author. A design service the owner configured with the owner's own credentials in the default-off design module (DESIGN-001), contacted only for a design run an operator started, is not a request to the seed author: it is the owner's own provider, called on the owner's account at an operator's request. Those requests are the run's candidate purchases and reads, the layout of the candidate an operator chose, and the cron's resumption of those same runs, and they carry only the DESIGN-003 data. There is still no telemetry, phone-home, license check or kill switch: with the module absent Mango makes no request to 12ui at all; nothing is sent at startup, on a schedule of its own or about anything but an operator's run; and a 12ui refusal or outage fails only that run. *Security consequences:* the owner's 12ui key is a Worker secret, never sent to the browser, logged or exported; an operator whose product role permits design authoring under OPER-004 can spend from the owner's 12ui account within its wallet and daily allowance, with an estimate before each paid step and each request recorded (RESULT-004); the brief and the chosen image leave the deployment for 12ui and its sub-processors (OpenAI, fal.ai, Google, Cloudflare), and 12ui may keep them in its evaluation corpus until the account owner asks for deletion; 12ui learns that, and when, this deployment designs email. *Residual:* 12ui's terms forbid sharing a key and do not address a personal key held as a server secret that teammates use; that remains between the owner and 12ui.

**RESULT-004 policy (13 October 2026):** A design run records `external_cost_facts` rows with provider `12ui`, operation `design-draft` (tier `standard`, one billable unit per candidate image bought) or `design-layout` (tier `fast`, one unit), and the draft's campaign ID, once per idempotency key: a candidate image when 12ui answers its purchase or a later read of the run shows the slot bought (a purchase whose answer timed out counts once 12ui shows it happened, and never otherwise), and the layout when 12ui answers the convert request. 12ui's API reports no per-request price, so the reported cost stays empty; campaign and daily totals count these units with the other costs.

**Security consequences:** design generation adds one declared outbound flow (`seed.json → externals → design-provider`, BASE-DATA-004). 12ui's answers are untrusted: run and operation shapes are validated, downloads are read with a streamed size cap and follow no redirect off the configured origin, candidate images must be PNGs within the byte and pixel limits, the LayerDoc must match its published digest and pass the import parser, and its values reach the email only through the DESIGN-004 compiler and the MSG-009/MSG-012 checker. 12ui's own error text is never stored or shown; the editor shows Mango's reason for each failure code. Candidate PNGs and the layout are served only to signed-in operators; only the crops the operator uses become public `/media/` images (CAMP-012). *Residuals:* the design's words are model-written (highlighted for review, never verified); a run can buy candidates nobody uses; the 15-minute deadline can fail a slow but healthy run, whose purchase is still recorded.

**Evidence and gaps:** plain `fetch` with bearer authentication, idempotency keys, a 1.7 MB multipart upload and binary download were proved from workerd against a local server. The whole flow is proved locally against real workerd, D1, R2 and the local queue with a stand-in 12ui server at the network edge (`tests/campaign-authoring/design-generation.spec.ts`): brief, estimate, background run, candidates appearing and surviving a reload, choice, layout, the import path opening by itself, button destination, unsaved edit, the run kept on offer through Discard changes without a second layout purchase, save as a draft revision recorded as used, with nothing approved or sent; the module switched off; the exact request data, replayed purchases, cost facts, a rate-limit wait shown and resumed with the same key, a spent allowance and a failed layout failing at once, and a deadline. The optional design secrets are proved through Mango's declaration step and the deploy kit's own planning and secret steps against a stand-in provider (`operations/deploy-optional-secrets.test.mjs`). Not proved: a live run against 12ui (no paid request was made), 12ui's acceptance of a draft request without corpus references, a hosted deployment holding the secret, and 12ui's position on a server-held personal key.

**AUD-010 derived-summary and CAMP-002 saved-revision policy:** The audience rule shown in campaign review, approval checks, the scheduled page, campaign lists and audience snapshots is the plain-text summary derived from the structured inclusion and exclusion rules that select recipients. It includes every condition, comparison, value and lookback, with the same field labels as the editor and explicit all/any matching. The composer shows that summary live and does not author audience prose. Every newly saved revision stores its derived summary; caller-supplied audience text is ignored as authority. Earlier revisions display the derived summary without rewriting immutable approval records. Readiness requires valid structured rules, and approval continues to bind the exact saved rules.

**DATA-001 implementation:** Maintained Base portability archives all product D1 rows and original R2 assets, with staged restore into an empty maintenance-mode destination. Authentication credentials, sessions and transfer bookkeeping are excluded; operator profiles remain attribution only. Restore requires matching privately backed-up contact/link keys, explicit confirmation and fresh destination Base authentication. Mango adapts the journal to source-wide erasure floors (CONT-013), deliberately refusing all older archives against current authority and refusing nonempty legacy journals before staging; current post-erasure exports remain restorable with matching authority.

**HOME-001 policy:** `BASE-PUBLIC-001` to `BASE-PUBLIC-003` govern the landing as an anonymous surface and are neither satisfied nor waived by it. The root and the favicon files claim no rate limiter, so `BASE-ACCESS-003`'s rate-limit sentence is neither claimed nor waived for them. The landing is the deployment's own fixed page, not a page builder for buyers. It links only to its own sections, `/run`, `/docs` and, while the credit is on, the credit, and it does not advertise optional commerce, SMS or AI, per-reader send times or provider-neutral delivery. Its fonts are self-hosted Newsreader and Outfit under the SIL Open Font License, static files from `public/fonts` served at `/fonts/` and declared in `deploy.publicPaths`, so the server-rendered message pages load the same faces; the favicons are static files from `public/`, also declared there. Its drawings are inline and contain no raster or embedded image. Its motion is CSS-only, plays once, runs only without a reduced-motion preference, moves only drawings and never hides content.

**DOCS-001 policy:** `/docs` and `/docs/` are declared in `seed.json → deploy.publicPaths`, which `BASE-ACCESS-003` keeps as the only sessionless paths; `BASE-PUBLIC-001..003` govern these anonymous pages and are neither satisfied nor waived by them. Start renders each page per request from its prebuilt chunk; no Hono route, operator gate or Worker event handler serves them. The slug is looked up as an own property of the manifest's page table, so `__proto__`, `constructor` and every other unlisted segment is a `404`. Markdown is rendered with raw HTML disabled, a link-scheme allowlist and images restricted to `docs/media/`. No rate limiter is claimed for these paths, as for Mango's other public documents (`/`, `/signin`).

How the owner-approved scope (16 October 2026) maps to the clauses above. Incumbents: Mailchimp, Klaviyo, ActiveCampaign and Kit (ConvertKit); up-and-comers: beehiiv, Customer.io and Omnisend.

| Approved scope item | Clauses |

| Visual automation builder with triggers, waits, conditions, branches and exits for welcome series, abandoned cart and browse, post-purchase and win-back flows | FLOW-001, FLOW-002, FLOW-003, FLOW-004, FLOW-005, FLOW-006, FLOW-007, FLOW-008, FLOW-012, FLOW-015 |

| Shopify, WooCommerce, Stripe and Stall/Orbit event integrations feeding dynamic segments (purchase history, predicted next order, RFM) and product blocks | STORE-001, INT-001, INT-002, INT-004, INT-006, INT-011, INT-015, SEG-001, SEG-002, SEG-003, SEG-004, BUILD-006 |

| Drag-and-drop responsive email builder with template library, brand kit and dynamic personalized product recommendations | BUILD-001, BUILD-002, BUILD-003, BUILD-006, BUILD-010, BUILD-013, BUILD-014, BUILD-011 |

| Signup forms, popups and landing pages with double opt-in and preference center for list growth | FORM-001, FORM-002, FORM-003, FORM-004, CONT-009, CONT-015 |

| SMS marketing with TCPA consent capture, quiet hours and 10DLC registration alongside email | SMS-001, SMS-002, SMS-003, SMS-008, CONT-019, BUILD-009 |

| A/B and multivariate testing, send-time optimization, deliverability diagnostics and revenue attribution per campaign and flow | EXP-001, EXP-002, EXP-003, EXP-006, DELIV-003, DELIV-005, REPORT-003 |

| Push further: an agent finds a retention gap, proposes a journey with audience, stop rules and holdout, runs it once approved, judges it on measured repeat purchases, and diagnoses delivery and integration failures | AGENT-001, AGENT-002, AGENT-003, AGENT-004, AGENT-005, AGENT-010 |

## Original status evidence descriptions

These are the incumbent descriptions, retained verbatim as historical evidence descriptions; the current outcome audit records what each cited file asserts.

### HOME-001

`tests/local-start/local.journey.ts` · `src/site/pages.tsx`

### DOCS-001

`tests/docs.spec.ts`

### OPER-001

`tests/local-start/local.journey.ts` · `tests/production-entry.spec.ts`

### OPER-002

`tests/settings-sender/routes.spec.ts` · `src/core/features/auth/service.ts`

### OPER-003

`tests/go-live/roles.journeys.ts`

### OPER-004

`tests/go-live/roles.journeys.ts` · `src/core/features/auth/permissions.ts` · `src/core/features/auth/product-roles.ts` · `migrations/core/0076_operator_product_roles.sql`  · `tests/go-live/delivery.journeys.ts` via `tests/go-live/sending-connection-journey.ts` (Verify go-live 2/9: SendGrid Owner connection, Admin named 403 on review/connect/disconnect)  · `tests/go-live/roles.journeys.ts` flow-draft Author save, Analyst read and Support named 403 (Verify go-live 6/9; 1440/390) · `tests/go-live/contact-links.journeys.ts` via `tests/go-live/source-api-journey.ts` (Verify go-live 1/9): Manager/Author library snapshots allowed, Analyst/Support refused and anonymous denied; MSG-011 Resend extension (go-live 2/9) limits connection mutation to Owner and health notices to current Owners/Admins.

### OPER-007

`tests/go-live/sync-integrations.journeys.ts` · `src/core/features/auth/activity.ts` · `src/core/features/auth/activity-query.ts` · `src/core/features/auth/ui/activity-page.tsx` · `src/core/features/auth/activity-record.ts`

### STORE-001

`src/core/platform/adapters/shopify.ts` · `tests/shopify/connection.spec.ts` — signed carts preserve string identity, multiple lines and ordering; conflicting delivery, tenant and topics cannot mutate source facts, via `tests/store/source-export-proof.ts`, `tests/go-live/built-source-journey.ts`, `tests/go-live/store-source-journey.ts` and `tests/go-live/source-runtime.mjs`, proves every declared Shopify snapshot and observation type, every declared WooCommerce type with the plugin enabled and every declared Stripe event type through their network edges and the owner export, retaining source identifiers, connections and edge occurrence times; one address has one contact carrying both WooCommerce and Stripe customer records and the Stripe events. WooCommerce's existing Owner Settings proof is `tests/go-live/woocommerce.journeys.ts` — [INT-002] WooCommerce owner connection syncs store facts and signed replay preserves identity, consent and failed-operation recovery. Stripe's existing Owner Settings proof is `tests/go-live/roles.journeys.ts` — [PUB-005][FORM-008][FORM-010][INT-004][OPER-003][OPER-004] roles govern native requests and removal retains authors, approvers and history, via `tests/go-live/stripe-journey.ts`.

### STORE-002

`tests/shopify/connection.spec.ts`

### STORE-003

`tests/go-live/source-freshness.journeys.ts` · `src/core/features/campaigns/ui/source-freshness.tsx`

### STORE-004

`tests/go-live/source-freshness.journeys.ts` — “[STORE-003] [STORE-004] Decision Desk retains each completed sync through a later failed page and recovery”: a failed product sync records its failed operation carrying the adapter error and recovers through Store/Decision Desk at 1440/390; proposal generation refused by the failed source records one failed generation operation carrying the adapter's last error, with no proposal, cost or send; during a Shopify Admin API outage a correctly signed webhook keeps its 401 answer and records exactly one failed webhook operation carrying the adapter error per delivery (a replay adds none, a forged delivery records nothing), and Shopify's retry after recovery ingests the record once and completes the operation; failed-operation text carries no upstream diagnostic, secret, token or record payload; the Store page lists the failed generation and webhook operations at 1440 and 390 with no overflow or accessibility violations; saved draft edits, readable recorded outcomes/history and zero new mail handoffs with a scheduled campaign. `tests/go-live/roles.journeys.ts` — “[PUB-005][FORM-008][FORM-010][INT-004][OPER-003][OPER-004] roles govern native requests and removal retains authors, approvers and history” (via `tests/go-live/stripe-journey.ts`): during a Stripe API outage a correctly signed Stripe event that needs a Stripe read keeps its 422 answer and records exactly one failed webhook operation carrying the adapter error (a replay adds none, a forged event records nothing), and Stripe's retry after recovery ingests it once and completes the operation. `tests/shopify/connection.spec.ts` — “[STORE-004] native authenticated sync imports complete Shopify records and retains original purchase time through nested-page failures and retry” proves failed operation diagnostics and retry. `tests/go-live/stale-sources.journeys.ts` — “[STORE-005] [STORE-006][AUD-003] sources recover only after completed sync and review counts commerce and dormancy exclusions” retains the stored-source gate.

### STORE-005

`tests/go-live/stale-sources.journeys.ts` · `src/core/features/lifecycle/evaluate-approval.ts`

### STORE-006

`tests/go-live/stale-sources.journeys.ts` · `src/core/features/audience/source-coverage.ts` · `src/core/features/campaigns/authoring-service.ts`

### STORE-007

`src/core/features/audience/commerce-webhook-routes.ts`

### CONT-001

`tests/move-in/archive.journeys.ts`

### CONT-002

`tests/move-in/held.journeys.ts` · `tests/move-in/archive.journeys.ts`

### CONT-003

`tests/audience-import/signup.spec.ts` · `tests/campaign-authoring/import-category.spec.ts`

### CONT-004

`tests/go-live/go-live.journeys.ts` · `tests/provider-suppression-ingress.spec.ts` · `tests/move-in/held.journeys.ts` · `tests/go-live/sync-integrations.journeys.ts`

### CONT-005

`tests/provider-suppression-ingress.spec.ts` · `tests/go-live/opt-out-reasons.journeys.ts`

### CONT-006

`tests/provider-suppression-ingress.spec.ts` · `tests/go-live/go-live.journeys.ts` · `tests/go-live/sync-integrations.journeys.ts`

### CONT-007

`src/core/features/sms/inbound.ts` · `tests/audience-import/signup.spec.ts`

### CONT-008

`tests/audience-controls/contact-history.spec.ts`

### CONT-009

`tests/go-live/go-live.journeys.ts` · `tests/audience-import/signup.spec.ts`

### CONT-010

`tests/audience-import/routes.spec.ts` · `tests/move-in/archive.journeys.ts`

### CONT-011

`tests/audience-controls/merge.spec.ts`

### CONT-012

`tests/move-in/archive.journeys.ts` · `tests/go-live/stale-sources.journeys.ts`

### CONT-013

`tests/portability.spec.ts` · `tests/audience-import/erasure-merge.spec.ts`

### CONT-014

`tests/go-live/sync-integrations.journeys.ts` · `src/core/features/integrations/contacts.ts`

### CONT-015

`tests/go-live/sync-integrations.journeys.ts` · `src/core/features/integrations/contacts.ts` · `src/core/features/lifecycle/email-consent-scope.ts`

### CONT-017

`tests/audience-controls/contact-history.spec.ts` — “[CONT-008] [CONT-017] a contact profile combines identities, properties, segments and original source, consent, suppression, eligibility, delivery and operator facts with masked role views”: identities and merges, per-channel consent/topic evidence, properties and rule-derived segment membership; form, order, conversion, click, SMS-reply and consent facts in original time/source order; Analyst and Support masking, axe, overflow and hydration at 1440/390.

### CONT-018

`tests/shopify/connection.spec.ts`

### CONT-019

`src/core/features/sms/signup.ts` · `tests/audience-import/signup.spec.ts`

### CONT-021

`src/core/features/audience/erasure` · `tests/audience-import/erasure.spec.ts`

### CONT-022

`src/core/features/audience/ui/contact-merge.tsx`

### CONT-024

`tests/move-in/archive.journeys.ts` account-export registration via `tests/move-in/incumbent-journey.ts` (Verify move-in): attestation, restrictive states, native export/restore, revocation and retained audit fact; campaign review records eligible contacts relying on that evidence at 1440/390. `tests/portability.spec.ts` (Verify main 4/6 for DATA-001; main 5/6 for erasure authority) proves populated native restoration.  `tests/go-live/contact-links.journeys.ts` (Verify go-live 1/9) extends the source attestation to the three CSV source presets and both API edge exports.

### CONT-025

`tests/go-live/shared-kiosk.journeys.ts` via `tests/go-live/opt-in-journey.ts` — hosted default and single capture, accepted-only capacity, protected resubscription, Admin/Author/Manager/Support permissions, future-only mode changes, activity and Settings at 1440/390; `tests/go-live/sync-integrations.journeys.ts` — API capture fixed double mode, one confirmation and replay; `tests/portability.spec.ts` — native policy restore.

### CONT-026

`tests/go-live/sync-integrations.journeys.ts` via `tests/go-live/manual-entry-journey.ts` — Author hand entry, permission method/time/wording and properties, default confirmation, operator-recorded single mode, exact-message signed SMS YES replies, restriction reasons, Support/Analyst 403 and 1440/390 form/evidence/absent controls; `tests/portability.spec.ts` — operator evidence restore; the same hand-entry journey proves evidence, profile and SMS-sidecar erasure

### CONT-027

`tests/go-live/resubscribe.journeys.ts` · `src/core/features/audience/public-capture-writer.ts` · `src/core/features/audience/confirmation-handoff.ts`

### PROP-001

`tests/proposals-decision/decision-routes.spec.ts`

### PROP-002

`tests/proposals-decision/decision-routes.spec.ts`

### PROP-003

`tests/proposals-decision/decision-routes.spec.ts`

### PROP-004

`tests/proposals-decision/decision-routes.spec.ts`

### PROP-005

`src/core/features/campaigns/adopt-proposal.ts` · `tests/proposals-decision/decision-routes.spec.ts`

### PROP-006

`tests/proposals-decision/decision-routes.spec.ts`

### PROP-007

`tests/proposals-decision/proposal-states.spec.ts`

### PROP-008

`tests/proposals-decision/decision-routes.spec.ts`

### PROP-009

`tests/proposals-decision/proposal-states.spec.ts`

### AUD-001

`tests/audience-controls/segments.spec.ts`

### AUD-002

`src/core/features/audience/eligibility.ts` · `tests/go-live/delivery.journeys.ts`

### AUD-003

`tests/go-live/stale-sources.journeys.ts`

### AUD-004

`src/core/features/audience/eligibility.ts` · `tests/go-live/open-estimates.journeys.ts`

### AUD-005

`tests/audience-controls/merge.spec.ts` · `tests/go-live/delivery.journeys.ts`

### AUD-006

`tests/go-live/multistep.journeys.ts`

### AUD-007

`tests/audience-controls/segments.spec.ts`

### AUD-008

`tests/move-in/archive.journeys.ts` · `tests/go-live/roles.journeys.ts`

### AUD-009

`src/core/features/lifecycle/policies.ts` · `src/core/features/audience/eligibility.ts`

### CAMP-001

`tests/campaign-results/results.journeys.ts`

### CAMP-002

`tests/campaign-authoring/browser.spec.ts`

### CAMP-003

`tests/campaign-authoring/browser.spec.ts` · `tests/campaign-authoring/canonical-save.spec.ts`

### CAMP-004

`tests/campaign-authoring/browser.spec.ts` · `tests/campaign-authoring/create-api.spec.ts`

### CAMP-005

`tests/campaign-authoring/browser.spec.ts`

### CAMP-006

`tests/campaign-authoring/browser.spec.ts`

### CAMP-007

`tests/go-live/delivery.journeys.ts`

### CAMP-008

`tests/go-live/go-live.journeys.ts`

### CAMP-009

`tests/campaign-results/results.journeys.ts`

### CAMP-010

`tests/go-live/scheduler.journeys.ts`

### CAMP-011

`tests/go-live/scheduler.journeys.ts`

### CAMP-012

`tests/campaign-assets.spec.ts` · `tests/campaign-authoring/local-images.spec.ts`

### CAMP-014

`tests/go-live/pause.journeys.ts`

### CAMP-016

`tests/campaign-results/followup.journeys.ts` · `tests/portability.spec.ts`

### CAMP-018

`tests/campaign-authoring/browser.spec.ts`

### CAMP-019

`tests/go-live/typed-tests.journeys.ts` · `src/core/features/lifecycle/test-send-allowance.ts` · `src/core/features/lifecycle/test-destinations.ts`

### DESIGN-001

`tests/campaign-authoring/design-generation.spec.ts`

### DESIGN-002

`tests/campaign-authoring/design-generation.spec.ts`

### DESIGN-003

`tests/campaign-authoring/design-generation.spec.ts`

### DESIGN-004

`tests/campaign-authoring/design-import.spec.ts`

### MSG-001

`src/core/features/settings/sender-validation.ts` · `tests/settings-sender/routes.spec.ts`

### MSG-002

`tests/sender-verification/worker.spec.ts`

### MSG-003

`tests/go-live/go-live.journeys.ts` · `tests/sender-verification/worker.spec.ts`

### MSG-004

`src/core/features/sms/transport-guard.ts`

### MSG-005

`tests/go-live/content-checks.journeys.ts` · `src/core/features/sms/review-preview.ts` · `src/core/features/sms/content.ts`

### MSG-006

`tests/go-live/content-checks.journeys.ts` · `src/core/features/campaigns/link-reasons.ts` · `src/core/features/lifecycle/checks.ts`

### MSG-007

`tests/go-live/content-checks.journeys.ts`

### MSG-008

`tests/go-live/personalisation.journeys.ts`

### MSG-009

`tests/campaign-authoring/canonical-save.spec.ts`

### MSG-010

`tests/go-live/opt-out-reasons.journeys.ts` · `src/core/features/audience/unsubscribe-routes.ts`

### MSG-011

`tests/go-live/delivery.journeys.ts`

### MSG-012

`tests/campaign-authoring/canonical-save.spec.ts`

### MSG-013

`tests/go-live/contact-links.journeys.ts`

### MSG-014

`tests/go-live/content-checks.journeys.ts` — [MSG-014] content checks and allowed sources; `tests/go-live/content-hosts.ts` — blockedHostJourney (1440 and 390); `tests/portability.spec.ts` — complete native archive

### MSG-015

`tests/go-live/content-checks.journeys.ts`

### SEND-001

`tests/go-live/managed-mail.journeys.ts` · `tests/go-live/resend-delivery.journeys.ts`

### SEND-002

`src/core/features/sms/policy.ts`

### SEND-003

`tests/go-live/delivery.journeys.ts`

### SEND-004

`tests/go-live/delivery-recovery.journeys.ts` · `tests/go-live/delivery.journeys.ts`

### SEND-005

`tests/go-live/go-live.journeys.ts` · `tests/go-live/delivery-recovery.journeys.ts`

### SEND-006

`tests/go-live/go-live.journeys.ts` · `tests/go-live/scheduler.journeys.ts`

### SEND-007

`tests/go-live/go-live.journeys.ts` · `tests/campaign-results/results.journeys.ts`

### SEND-008

`tests/go-live/go-live.journeys.ts` · `tests/go-live/resend-delivery.journeys.ts`

### SEND-009

`src/core/features/lifecycle/provider-outages.ts` · `tests/go-live/delivery-recovery.journeys.ts`

### RESULT-001

`tests/campaign-results/results.journeys.ts`

### RESULT-002

`tests/go-live/open-estimates.journeys.ts`

### RESULT-003

`tests/campaign-results/performance.journeys.ts` — “[REPORT-002] [RESULT-005][RESULT-003][REPORT-003] campaign filters, exact CSV rows and optional open estimates at 1440; native commerce and cross-channel attribution at 1440 and 390” (via `tests/campaign-results/performance-fixture.ts`: signed Shopify orders, latest qualifying click across two campaigns, webhook replay and later sync without duplicate or moved attribution, expired/scanner-only/no-click exclusions, partial/full refunds and cancellation in USD/JPY, API/CSV/Insights net amounts and the existing campaign-results drill-down naming each Shopify order and seven-day window separately from forecasts; 1440/390 overflow and axe checks).

### RESULT-004

`tests/campaign-results/costs.journeys.ts`

### RESULT-005

`tests/campaign-results/performance.journeys.ts` — “[REPORT-002] [RESULT-005][RESULT-003][REPORT-003] campaign filters, exact CSV rows and optional open estimates at 1440; native commerce and cross-channel attribution at 1440 and 390” (via `tests/campaign-results/tracking-journey.ts`: actual per-recipient-step links without recipient/campaign/revision identity, exact connected-store redirect with no cookie or body, retained scanner excluded from totals/unique clicks/click map/CSV/attribution, the same delivered link still forwarding exactly with no cookie or body after its click-recording window (30 days after send-by) closes, while recording nothing for a person or a scanner, “mailto:”, “tel:” and “sms:” links in the same tracked message delivered byte for byte with no redirect and zero clicks in the API, CSV and click map, and the operator tracking-off control through delivery and destination request). `tests/go-live/contact-links.journeys.ts` — “[DELIV-002][MSG-013][RESULT-005] contact links survive authoring, exact approval and delivery without tracking” proves the same contact links through the link tool and approval with tracking off. `tests/go-live/open-estimates.journeys.ts` — “[RESULT-002][CONT-013] explicit open estimates are isolated, revocable, replay safe and erased” retains the 13 October policy. CONT-018 owns its unbuilt click token, which this redirect consumes; until it is built these redirects add nothing.

### RESULT-006

`src/core/features/insights/ui/sender-rates.tsx` · `tests/go-live/delivery.journeys.ts`

### RESULT-007

`tests/campaign-results/results.journeys.ts`, `tests/campaign-results/reporting-journey.ts`

### RESULT-008

`tests/campaign-results/performance.journeys.ts` — [RESULT-008] native commerce and cross-channel attribution; `tests/campaign-results/recipient-method-journey.ts` — link/one-click/signed reply, replay, CSV, 1440 and 390, actual erasure; `tests/campaign-results/results.journeys.ts` — recipient outcomes and totals; `tests/portability.spec.ts` — populated unsubscribe upgrade and restore

### DATA-001

`tests/portability.spec.ts` · `tests/go-live/go-live.journeys.ts` · `tests/local-start/command-data.journey.ts`

### SCALE-001

`seed.json` · `src/core/features/audience/import-limits.ts`

### FORM-001

`src/core/features/audience/signup-routes.ts` · `tests/audience-import/signup.spec.ts`

### FORM-007

`src/core/features/audience/signup-security.ts` · `tests/audience-import/signup.spec.ts`

### FORM-008

`tests/go-live/shared-kiosk.journeys.ts` via `tests/go-live/signup-capacity-journey.ts` — 600 hosted captures on 200 networks, 100-request minute bursts, 200 bot attempts, duplicate claim, shared network, unchallenged isolation, Owner/Admin settings and 1440/390; `tests/audience-import/signup-security.spec.ts`; `tests/audience-import/signup-reservation-clock.spec.ts` — actual D1 admission interval across minute rollover — global last slot, IP grouping and token replay/expiry; `tests/audience-import/signup-reservation-clock.spec.ts` — database admission clock; `tests/portability.spec.ts` — populated upgrade and capacity restore.

### FORM-009

`tests/go-live/shared-kiosk.journeys.ts` · `src/core/features/audience/signup-routes.ts` · `src/core/features/audience/ui/kiosk-signup-page.tsx` · `migrations/core/0075_kiosk_forms.sql`

### FORM-010

`tests/go-live/shared-kiosk.journeys.ts` — shared kiosk / refusal screens at 1440 and 390; `tests/go-live/signup-refusal-screens.ts`; `tests/audience-import/signup-security.spec.ts` — “security: durable global allowance advances monotonically, reserves its last slot atomically and survives restart”; `tests/audience-import/signup-reservation-clock.spec.ts` — D1 clock; `tests/go-live/resubscribe.journeys.ts` — fourth destination request; `tests/go-live/sync-integrations.journeys.ts` via `tests/go-live/activity-log.ts` — hourly summary.

### SEG-001

`tests/audience-controls/segments.spec.ts` — “AUD-001 AUD-002 AUD-007 CAMP-004 nested saved segments select exact contacts by count, event value, window and state at 1440/390; copied rules remain immutable”, via `tests/audience-controls/segment-journey.ts`: nested all/any builder, every summary condition, live estimate, exact per-contact review and approved membership at count/value/time/state boundaries; properties, tags, consent/topics, ZIP/distance, RFM and bought products through review; builder and review at 1440/390 with overflow and accessibility assertions. Collections and categories bought: `tests/audience-controls/segment-catalog.ts` (same case) syncs a Shopify catalog through the sync door (collection IDs drained across pages, taxonomy categories, uncategorized products recorded as null); before the catalog is recorded both conditions report unavailable with no count; the builder at 1440/390 nests US state with an any-group of bought collection and bought category, its plain-text summary names both and its live estimate equals review; review intersects each condition with every contact (bought from the collection on its second page, only from another collection, in the category, only in other categories, in the category only in a future order, no purchase), and after Shopify removes a product from the collection its earlier buyer leaves on recount; review at 1440/390 with overflow and accessibility assertions. `tests/audience-controls/segment-fixture.ts` supplies contacts through scoped integration and products and purchases through Shopify sync; no direct rows. `tests/campaign-results/performance.journeys.ts` — “[REPORT-002] [RESULT-005][RESULT-003][REPORT-003] campaign filters, exact CSV rows and optional open estimates at 1440; native commerce and cross-channel attribution at 1440 and 390” (via `tests/campaign-results/cross-channel-attribution.ts`) selects a contact by a human email or SMS click in the last 7 days through the campaign-authoring audience door and no longer once those clicks are older.

### SEG-003

`tests/campaign-results/results.journeys.ts`, `tests/campaign-results/retention-journey.ts`

### BUILD-001

`tests/proposals-decision/decision-routes.spec.ts` — existing PROP-004 saved-content registration via `tests/campaign-authoring/block-builder-journey.ts` (Verify main 6/7): native two-column product/button composition, uploaded image, drag and keyboard reorder, duplicate/delete, undo/redo, padding/alignment, byte-identical save/reopen and HTML-mode round trip, sent-size display, decoded uploaded image in the inert Saved Preview, stacked 375px render and approval; editor at 1440/390 with overflow, hydration and serious/critical axe checks. `tests/campaign-authoring/canonical-save.spec.ts` — existing canonical-save-tree registration via `tests/campaign-authoring/block-builder-journey.ts` and `tests/campaign-authoring/full-promotional-email-journey.ts` (Verify main 4/7): native header, hero, button, two text columns, six manually entered products, social links with deployment-owned icons beside grammar-valid text links, managed footer and mobile controls; drag/keyboard reorder, duplicate/delete for both new blocks, including a reorder while the native icon upload is held; byte-identical reopen and HTML-view round trip; 32,117 stored characters and 33,768 shown/provider-edge HTML bytes within the 102,400-byte limit; 1440/390 overflow, hydration and serious/critical axe checks; stacked 375px rendering with every image decoded and a fluid 600px product image.

### BUILD-002

`tests/campaign-authoring/browser.spec.ts` · `tests/portability.spec.ts` · `tests/move-in/archive.journeys.ts` (Verify move-in) · `tests/campaign-authoring/design-import.spec.ts` · `tests/campaign-authoring/design-generation.spec.ts` (Verify main 3/7)  `tests/go-live/contact-links.journeys.ts` (Verify go-live 1/9) imports a restricted-conversion Klaviyo template into the library; `tests/portability.spec.ts` preserves it on native restore.  `tests/campaign-authoring/canonical-save.spec.ts` — existing saved-body round-trip registration via `tests/campaign-authoring/flow-template-journey.ts` (Verify main 4/7; 1440/390) starts a Flows email node from a library template, saves its independent copy, edits the library and reloads the byte-identical flow revision.

### BUILD-004

`tests/proposals-decision/decision-routes.spec.ts` — existing PROP-004 saved-content registration via `tests/campaign-authoring/block-builder-journey.ts` and `tests/campaign-authoring/reusable-block-journey.ts` (Verify main 6/7; 1440/390): native named reusable footer save/edit, Author mutation refusals, placement in two drafts, a saved template and a FLOW-001 draft email, linked draft-body updates, unchanged approved campaign bytes and a fresh unapproved replacement, stale-version refusal, explicit independent copies and repeated edits reusing the pending replacement. `tests/portability.spec.ts` — DATA-001 complete native records registration (Verify main 5/7) retains prior data and round-trips definitions and placements through native export/restoration.

### BUILD-008

`tests/go-live/presend-checks.journeys.ts` · `tests/go-live/email-size.journeys.ts`

### BUILD-009

`src/core/features/sms/content.ts` · `src/core/features/sms/review-preview.ts`

### BUILD-010, BUILD-013 and BUILD-014

`tests/campaign-authoring/canonical-save.spec.ts` — existing saving/approval-tree registration (Verify main 4/7), via `tests/campaign-authoring/mobile-presentation-journey.ts`: all 138 `tests/support/adversarial-email.mjs` cases, generated/authored CSS and hidden-compliance refusals, exact generated bytes in sent-size accounting, eight stored-body 375/600 standards/quirks renders with/without style, nonblank inert Preview and serious-axe/overflow/hydration proof at 1440/390. `tests/campaign-authoring/canonical-save.spec.ts` — existing saving/approval-tree registration via `tests/campaign-authoring/block-builder-journey.ts` · blockMobileControlsJourney (Verify main 4/7) edits hide on mobile/desktop, font size, line height, padding and alignment through the native block editor at 1440/390, checks the saved generated body and the resulting 375px computed styles, and audits overflow, hydration and serious axe findings; shell axe runs directly to avoid sandbox child-frame discovery. `tests/campaign-authoring/design-import.spec.ts` exercises the fluid column compiler. `tests/proposals-decision/decision-routes.spec.ts` via `tests/campaign-authoring/block-builder-journey.ts` (Verify main 6/7) exercises generated column stacking.

### BUILD-011

`tests/go-live/multistep.journeys.ts` — [AUD-006] later steps reapply ordinary inclusion, custom exclusions and consent without adding new candidates via `tests/go-live/chosen-catalog-journey.ts` and `tests/go-live/chosen-catalog-edge.ts` (Verify go-live 9/9): original synthetic-mango Shopify catalog fixtures prove title/SKU/collection/vendor searches, product and grid selection with a chosen variant, identifier-only HTML round-trip, current values/read time, revision locking, changed price at provider hand-off, unpublished/deleted/out-of-stock hiding, empty hide/skip, unavailable-read skip, visible per-recipient reasons, recovery with a fresh read and campaign counts; picker, previews and outcomes at 1440/390. `tests/local-start/signin-hydration.journey.ts` — [OPER-001][BUILD-011][BUILD-012] one-click local owner sign-in works before JavaScript at 390px; chosen catalog promotions bound configured items and recheck handoff, via `tests/campaign-authoring/chosen-size-journey.ts` and `tests/go-live/chosen-catalog-edge.ts` (Verify local-start 3/3): original synthetic-mango fixtures drive the six-item Shopify picker in a full promotional email above 20,000 stored characters, unchanged reopen and approval; unpublished and out-of-stock selections remain in the save bound, seven-item grids and two-item product layouts are refused, oversize catalog diagnostics name the grid as one block, template/start/duplicate refusals preserve records, browser refusals retain unsaved HTML at 1440/390, restored six-item hand-off bytes equal the shown bound, in-limit tracked title growth sends, and oversized live title growth skips with email-too-large counted on campaign detail. `tests/local-start/signin-hydration.journey.ts` — [OPER-001][BUILD-011][BUILD-012] one-click local owner sign-in works before JavaScript at 390px; chosen catalog promotions bound configured items and recheck handoff, via `tests/campaign-authoring/catalog-guard-journey.ts` (Verify local-start 3/3): six roles and anonymous have exact search/preview permissions without denied edge reads; an Author places identifiers but cannot approve; non-canonical/overlong state, foreign or malformed gids, mismatched variants, invalid item counts/layouts/providers and extra keys refuse without storing changes, and oversized queries refuse before an edge read; markup and managed-token title payloads stay escaped and opaque, unsafe product URLs and image hosts skip catalog-blocked with campaign counts; template save/start, duplication and follow-up retain identifier-only blocks, measure hidden configured items and read fresh title, price and image values at hand-off.

### BUILD-012

`tests/go-live/email-size.journeys.ts` — large newsletters save by transmitted bytes, retain refused edits and recheck expansion at handoff (helpers `tests/go-live/email-size-imports.ts`, `tests/go-live/email-size-reuse.ts`); `tests/campaign-authoring/create-api.spec.ts`; `tests/campaign-authoring/browser.spec.ts` (helper `tests/campaign-authoring/email-size-adoption.ts`); `tests/campaign-authoring/design-import.spec.ts`  · `tests/campaign-authoring/canonical-save.spec.ts` via `tests/campaign-authoring/mobile-presentation-journey.ts` (Verify main 4/7: generated responsive bytes count in sent size) · `tests/proposals-decision/decision-routes.spec.ts` via `tests/campaign-authoring/block-builder-journey.ts` (Verify main 6/7, existing PROP-004 saved-content registration): native block-editor sent-size display and unchanged approved body at 1440/390; `tests/campaign-authoring/canonical-save.spec.ts` via `tests/campaign-authoring/block-builder-journey.ts` · blockMobileControlsJourney (Verify main 4/7) proves saved generated bytes after mobile-control edits at 1440/390 and 375px computed styles. `tests/campaign-authoring/create-api.spec.ts` — existing native create registration via `tests/campaign-authoring/reusable-size-journey.ts` (Verify main 4/7) proves an oversized reusable edit reports measured HTML/text bytes, the derived limit and largest sections, preserves the exact linked draft and saved source version, and permits a later valid edit. `tests/campaign-authoring/canonical-save.spec.ts` — existing saved-body round-trip registration via `tests/campaign-authoring/audience-size-journey.ts` (Verify main 4/7): audience-selected save and live meter at 1440/390, widened-audience refusal with measured bytes, limit and three largest blocks, unchanged saved revision, frozen approval and every provider-edge hand-off within the bound; deployment-wide fallback without a selection. The audience journey also proves refused unsaved HTML and widened rules remain in the editor at 1440/390, the 95 KB advisory is acknowledged against the same eligible email identities as approval, and a valid edit recovers. `tests/campaign-authoring/canonical-save.spec.ts` — existing canonical-save-tree registration via `tests/campaign-authoring/full-promotional-email-journey.ts` (Verify main 4/7): a complete manually populated promotional email stores 32,117 characters; the shown 33,768 HTML bytes equal the provider-edge part, including saved analytics expansion, generated responsive styles, managed footer and open-estimate pixel; plain-text bytes also match. `tests/go-live/email-size.journeys.ts` via `tests/go-live/email-size-reuse.ts` retains every reuse refusal, including a new follow-up whose cohort authority is not yet inserted. `tests/local-start/signin-hydration.journey.ts` — [OPER-001][BUILD-011][BUILD-012] one-click local owner sign-in works before JavaScript at 390px; chosen catalog promotions bound configured items and recheck handoff, via `tests/campaign-authoring/chosen-size-journey.ts` and `tests/go-live/chosen-catalog-edge.ts` (Verify local-start 3/3): original synthetic-mango fixtures drive the six-item Shopify picker in a full promotional email above 20,000 stored characters, unchanged reopen and approval; unpublished and out-of-stock selections remain in the save bound, seven-item grids and two-item product layouts are refused, oversize catalog diagnostics name the grid as one block, template/start/duplicate refusals preserve records, browser refusals retain unsaved HTML at 1440/390, restored six-item hand-off bytes equal the shown bound, in-limit tracked title growth sends, and oversized live title growth skips with email-too-large counted on campaign detail. Under ct's ruling of 25 October 2026 at 23:46Z, the existing local-start chosen catalog registration via `tests/campaign-authoring/catalog-riders-journey.ts` proves that a deleted selection remains stored and visibly removed, while unpublished and out-of-stock selections have distinct states at 1440 and 390 and still count in the save bound. Under the same ct ruling of 25 October 2026 at 23:46Z, that registration proves a catalog_unavailable save refusal names the current product and directs publication or removal before saving again, retains unsaved edits without storing changes at 1440 and 390, and re-measures the item after publication; existing email-too-large hand-off refusal proof remains unchanged.

### FLOW-001

`tests/go-live/roles.journeys.ts` via `tests/campaign-authoring/flow-journey.ts` (Verify go-live 6/9): three-message welcome graph with split, unreachable-node validation and repair, keyboard pan/zoom, saved revision reload and 1440/390 accessibility/overflow/hydration; all node-kind explanations, named loop/unended-path validation and delay-cycle acceptance; Author saves, Analyst reads, Support named 403. `tests/portability.spec.ts` (Verify main 4/6 for DATA-001; main 5/6 for erasure authority) exports/restores the draft revision with prior data.

### SMS-001

`src/core/platform/adapters/mobile-message.ts`

### SMS-003

`src/core/features/sms/policy.ts`

### SMS-004

`src/core/features/sms/inbound.ts`

### DELIV-001

`src/core/platform/adapters/sendgrid.ts` · `src/core/platform/adapters/resend.ts` · `tests/go-live/resend-delivery.journeys.ts`

### DELIV-002

`src/core/features/sender-verification/domain-setup.ts` · `src/core/features/sender-verification/setup-routes.ts` · `tests/go-live/contact-links.journeys.ts`

### DELIV-003

`src/core/features/lifecycle/reputation-guard.ts` · `tests/go-live/delivery.journeys.ts`

### DELIV-005

`tests/go-live/mailbox-provider.journeys.ts`

### DELIV-007

`tests/sender-verification/worker.spec.ts` — native Worker renewal proof (day 22/23/29/31, last confirmer and all Owners, diagnostic and reminder replay, provider evidence change, populated 0094 upgrade); `tests/go-live/managed-mail.journeys.ts` — managed relay and authenticated connector renewal, Home at 1440/390 with axe, overflow and hydration checks

### DELIV-008

`tests/go-live/delivery.journeys.ts` — MSG-011 case calls `tests/go-live/sending-connection-journey.ts` for completed Connect Activity actor/time, named Admin 403 refusals on review/connect/disconnect (also OPER-004), key scopes/account review before create, signed-or-delete failures, existing-hook preservation/reconnect, encrypted key and export secrecy, signed Owner-check delivery gate and Settings Sending at 1440/390 (Verify go-live 2/9); `tests/audience-controls/sendgrid-forwarding.spec.ts` for unsigned/stale/future signatures and replay; `tests/portability.spec.ts` for populated migration, private connection exclusion and restore without resumed sending. `tests/go-live/resend-connection-journey.ts` extends that MSG-011 registration (Verify go-live 2/9): sending-only key refusal before mutation, six-event disclosed webhook creation, encrypted secret/reconnect reuse including recovery after refused configuration confirmation, unrelated-hook preservation, unsigned/stale rejection, named 401/403/deleted-hook approval blocks and Owner/Admin mail notices, with Settings and Home at 1440/390.

### REPORT-001

`tests/campaign-results/results.journeys.ts` — “[RESULT-001] [REPORT-001][REPORT-006] campaign names come from the collection when detail requests fail and overview matches period records at 1440”, via `tests/campaign-results/overview-journey.ts`: seeded USD attribution/refunds, EUR exclusion, clicks/scanner exclusion, conversions, equal UTC previous periods, source growth, priced/unpriced costs, sender rates, top campaigns, shared detailed reads, axe/overflow/hydration and interactive period selection.

### REPORT-002

`tests/campaign-results/performance.journeys.ts` · `tests/campaign-results/results.journeys.ts`

### REPORT-003

`tests/campaign-results/performance.journeys.ts` — “[REPORT-002] [RESULT-005][RESULT-003][REPORT-003] campaign filters, exact CSV rows and optional open estimates at 1440; native commerce and cross-channel attribution at 1440 and 390”, via `tests/campaign-results/cross-channel-attribution.ts`: genuine approved email then SMS tracked delivery; latest human click wins each signed-Shopify order once; newer scanner excluded; replay and sync, refunds and cancellation; independent channel windows, widening to 30 days and narrowing to one day recalculate without changing stored click/order/source rows. `tests/campaign-results/custom-attribution.ts` proves scoped native custom conversions, replay/conflict, refunds/cancellation and metric changes. `tests/campaign-results/attribution-report-ui.ts` proves matching API/CSV, metric and windows beside revenue, Insights before/after and campaign drill-down at 1440/390 with overflow and accessibility assertions; the integration scope chooser is also inspected at both widths.

### REPORT-004

`tests/campaign-results/results.journeys.ts`, `tests/campaign-results/retention-journey.ts`

### REPORT-005

`tests/go-live/list-growth.journeys.ts` · `src/core/features/insights/list-growth.ts` · `migrations/core/0074_list_growth_retained_history.sql`

### REPORT-006

`tests/go-live/managed-mail.journeys.ts` — managed mail, sender renewal and saved reports: Owner/Admin UI save, weekly exact-figure operator email, concurrent tick/replay, Support refusal, revoked-authority refusal/activity, real export/import with no resumed mail, erasure no-op and 1440/390 axe/overflow/hydration; `tests/campaign-results/results.journeys.ts` and `tests/campaign-results/saved-report-metric-journey.ts` — seeded cost, billable-unit, human-click, conversion and USD attribution reconciliation; `tests/sender-verification/worker.spec.ts` — populated 0094/0095 upgrade

### REPORT-007

`tests/campaign-results/costs.journeys.ts` — “[RESULT-004][REPORT-007] Settings consent counts, currency-separated projection and rejected AI spend, distinct handoffs and replayed purchases retain truthful campaign and UTC-day totals”: campaign/day costs, consent counts versus contacts, independent UTC projection arithmetic, unpriced facts and no identities; Settings at 1440/390 with axe, overflow and hydration assertions.

### INT-001

`src/core/platform/adapters/shopify.ts` · `tests/shopify/connection.spec.ts`

### INT-002

`tests/go-live/woocommerce.journeys.ts` — “[INT-002] WooCommerce owner connection syncs store facts and signed replay preserves identity, consent and failed-operation recovery”: Owner connects encrypted REST/signing credentials through Settings; seeded customers, paginated products, orders and refunds sync through Store with original identity/occurrence times and financial projection; the signed order webhook replays once without duplicate facts and rejects conflicting bytes; the installed-plugin edge supplies abandoned checkouts, whose signed event enters only an explicitly activated exact flow revision, adds one contact tag and exits once. Draft, stale, purchased and opted-out cases never enroll; forged, expired, nonconsented and GPC events are refused. `tests/go-live/woocommerce-plugin-journey.ts` runs the shipped browser script against the WordPress network edge for default-deny, explicit consent and GPC withdrawal. Settings/Store are exercised at 1440/390. The real plugin source is `extensions/mango-woocommerce/mango-woocommerce.php` with `extensions/mango-woocommerce/INSTALL.md`; its shortcode uses the existing confirmed signup door proved by `tests/audience-import/signup.spec.ts` — “CONT-003/009 public signup remains pending until single-use expiring confirmation and records source time method IP”. Ct approved the INT-002 semantic on 22 October 2026 at 20:20Z: store-admin enablement is off initially; only signed-in store customers; explicit analytics and marketing consent before the one Secure HttpOnly SameSite=Lax first-party cookie, expiring after 30 days; GPC records no observation and revokes pending eligibility; no cross-site tracking or subscription-consent widening; WordPress observations expire after 30 days. The allowlisted signup iframe uses Mango’s own confirmation. A saved tag-and-exit flow revision must be explicitly activated; it sends no marketing message. CONT-018 and FORM-008 retain their other acceptance obligations and statuses; FLOW clauses retain their graph/message obligations.

### INT-004

`src/core/features/store/stripe/` · `tests/go-live/roles.journeys.ts` · `tests/portability.spec.ts`

### INT-007

`tests/go-live/sync-integrations.journeys.ts` via `tests/go-live/custom-event-journey.ts`: shipped JavaScript client records one general event on concurrent replay, rejects conflicting content, reads profile and rule-derived segment membership, refuses subscribe without evidence by name and exhausts one key without affecting another; timeline at 1440/390 passes axe, overflow and hydration checks. OpenAPI: `src/core/features/integrations/openapi.ts`; client: `src/core/features/integrations/client-source.ts`. Existing scoped profile/consent/suppression, conversion and refusal-feed journeys remain green.

### INT-011

`tests/go-live/sync-integrations.journeys.ts` · `docs/integrations.md`

### INT-013

`tests/go-live/contact-links.journeys.ts` via `tests/go-live/domain-journey.ts` — configured UTM redirect on the branded tracking host; `tests/campaign-results/performance.journeys.ts` — INT-013 / REPORT-002 at 1440 via `tests/campaign-results/tracking-journey.ts` and `tests/campaign-results/custom-attribution.ts`: sent UTM destinations, original click identity, author values, managed/contact exclusions, campaign off, Settings at 1440/390 and one idempotent Vane goal on the contact timeline; `tests/portability.spec.ts` — native settings restore.

### INT-014

`tests/go-live/sync-integrations.journeys.ts` via `tests/go-live/review-loyalty-journey.ts`; `tests/sender-verification/worker.spec.ts` — populated 0096 upgrade. Owner/Admin inbound Judge.me review, Okendo review/earned-points/tier-entry and Smile customer-profile adapters verify native signatures and use the INT-007 event writer. Existing contacts only; no consent or outbound action. Signed replay, account/timestamp refusal, concurrent unmatched count, encrypted export-excluded secrets, populated receipt restore, erasure/reconnection replay protection and Settings at 1440/390 are exercised.

### INT-015

`src/core/features/store/shopify/health.ts` · `src/core/features/store/shopify/collector.ts` · `tests/shopify/connection.spec.ts`

### MOVE-001

`src/core/features/move-in/archive-service.ts` · `tests/move-in/archive.journeys.ts` (Verify move-in: archive templates enter the library; untouched-only undo; 1440/390)

### MOVE-002

`tests/go-live/contact-links.journeys.ts` via `tests/go-live/source-csv-journey.ts` and `tests/go-live/source-api-journey.ts` (Verify go-live 1/9; 1440/390): public source preview/apply/report, restrictions and source-held evidence; no import handoff; an imported reader continues through exact campaign approval and delivery.  `tests/go-live/source-draft-journey.ts` via the existing source API journey (Verify go-live 1/9): membership-only imports preserve every prior consent row and channel state; a topic-only contact is ineligible in campaign review; imported FLOW-001 drafts at 1440/390 name unavailable steps and never enroll or send.

### MOVE-003

`tests/go-live/contact-links.journeys.ts` via `tests/go-live/source-csv-journey.ts` and `tests/go-live/source-api-journey.ts` (Verify go-live 1/9; 1440/390): public source preview/apply/report, restrictions and source-held evidence; no import handoff; an imported reader continues through exact campaign approval and delivery.  `tests/go-live/source-draft-journey.ts` via the existing source API journey (Verify go-live 1/9): membership-only imports preserve every prior consent row and channel state; a topic-only contact is ineligible in campaign review; imported FLOW-001 drafts at 1440/390 name unavailable steps and never enroll or send.

### MOVE-004

`docs/moving-in.md` · `tests/move-in/held.journeys.ts`

### MOVE-005

`tests/go-live/contact-links.journeys.ts` via `tests/go-live/source-csv-journey.ts` and `tests/go-live/source-api-journey.ts` (Verify go-live 1/9; 1440/390): public source preview/apply/report, restrictions and source-held evidence; no import handoff; an imported reader continues through exact campaign approval and delivery.

### MOVE-006

`src/core/features/move-in/archive-report.ts` · `tests/move-in/archive.journeys.ts`

### MOVE-009

`tests/move-in/archive.journeys.ts` · `tests/move-in/hostile.journeys.ts` · `tests/portability.spec.ts`

### MOVE-010

`src/core/features/move-in/archive-service.ts` · `tests/move-in/archive.journeys.ts`

### MOVE-011

`src/core/features/move-in/html-import.ts` · `tests/move-in/archive.journeys.ts` · `tests/go-live/content-checks.journeys.ts` via `tests/go-live/content-hosts.ts` and `tests/go-live/template-conversion.ts` (registered title: [MSG-014][MSG-015][MSG-006][MSG-007][MSG-005][MOVE-014] review names blocked hosts and links, allows an approver to trust them, keeps advisory safety and shows each SMS with its opt-out; Verify go-live 1/9): original synthetic-mango conversion fixtures, reports and previews at 1440/390; `tests/go-live/contact-links.journeys.ts` via `tests/go-live/source-api-journey.ts` — [DELIV-002][MSG-013][RESULT-005] contact links survive authoring, exact approval and delivery without tracking proves Klaviyo first_name through its import and template-start doors.

### MOVE-012

`src/core/features/move-in/archive-limits.ts` · `tests/move-in/archive.journeys.ts`

### MOVE-014

`tests/go-live/content-checks.journeys.ts` via `tests/go-live/template-conversion.ts` and `tests/go-live/incumbent-image-journey.ts` (registered title: [MSG-014][MSG-015][MSG-006][MSG-007][MSG-005][MOVE-014] review names blocked hosts and links, allows an approver to trust them, keeps advisory safety and shows each SMS with its opt-out; Verify go-live 1/9): three generated gallery images in templates and campaign history, byte-identical media, API-fixture network import, bounded refusals, reports and replacement, retained media after undo; conversion/reconciliation at 1440/390.

### MOBILE-001

`tests/newsletter-ui/representative-pages.journeys.ts`

### PUB-001

`tests/campaign-results/archive.journeys.ts` · `tests/audience-import/erasure.spec.ts`

### PUB-002

`tests/go-live/roles.journeys.ts` — “[PUB-005][FORM-008][FORM-010][INT-004][OPER-003][OPER-004] roles govern native requests and removal retains authors, approvers and history”, via `tests/go-live/stripe-journey.ts` and `tests/go-live/paid-tier-journey.ts` (Stripe and mail network edges faked; no real provider call or consent was used). Owner-only Settings and recurring price/Stripe Tax setup; subscription-mode Checkout with immediate-confirmation card payments; signed duplicate events remain inert; each subscription-affecting event re-reads current Stripe status; active/trialing joins and past_due, unpaid, paused, incomplete, incomplete_expired and canceled leave; invoice.payment_failed while Stripe reports active leaves membership unchanged and is recorded as payment failure. Review intersects paid membership with each reader's own confirmed channel consent. A paid-only approved issue hands off exactly one accepted recipient-step and one mail-edge send to the current paid reader, with none to the free reader; cancellation after approval hands off nothing and names audience-no-longer-matches. A canceled reader and the free reader both receive a subsequent free issue. Settings paid/consent-missing counts and contact timeline run at 1440/390 with overflow and axe assertions. The same journey distinguishes an observed invoice.payment_failed from paused/incomplete or unreadable authority: the latter says paid status could not be confirmed; conservative paid denial is unchanged (ct 23 October 05:30Z). `tests/portability.spec.ts` — “complete native records and uploaded assets round-trip without restoring login authority” preserves a populated paid-state upgrade, exports/restores the added fields, and exercises the restored generation triggers; “current erasure authority refuses an old archive on an empty restore target” removes paid rows and rejects their old archive. `tests/local-start/retained-archive.journey.ts` — “a Platform-migrated installation restores the listed version’s Platform backup without Wrangler” exercises the generated migration specification.

### PUB-005

`tests/go-live/roles.journeys.ts` — “[PUB-005][FORM-008][FORM-010][INT-004][OPER-003][OPER-004] roles govern native requests and removal retains authors, approvers and history”, via `tests/go-live/paid-signup-journey.ts`: the Owner-saved tier serves the hosted page with recurring price/frequency, Stripe Tax and unchecked consent; its button creates a real Worker Checkout session at the Stripe network edge and returns to the Mango next-steps page. A first-time payer is paid with consent missing, gets one paid-checkout confirmation despite replay, confirms by POST, then receives exactly one paid-only mail-edge send while a free reader does not. An existing subscribed/confirmed address gets no second confirmation; an unsubscribed payer stays unsubscribed through payment and GET, then resubscribes only by their own POST; a suppressed payer gets no mail and stays suppressed. Public erasure/resume removes the payer address and consent evidence. Signup and return pages at 1440/390 have no horizontal overflow or serious/critical axe finding. No real provider call, account or consent was used.

### AGENT-001

`src/core/features/proposals/forecast.ts` · `src/core/features/proposals/service.ts`

### AGENT-004

`src/core/features/store/synchronize.ts` · `src/core/features/lifecycle/provider-outages.ts`

### AGENT-007

`src/core/features/proposals/generation.ts` · `tests/proposals-decision/decision-routes.spec.ts`

### AGENT-010

`tests/proposals-decision/decision-routes.spec.ts`

### MGMT-001

`src/core/features/auth/owner-claim.ts`

### MGMT-002

`tests/local-start/editor.journey.ts`

## Activity write custody — OPER-007

Each lifecycle audit row and integration audit call is read newest first. An action's record is written with the action it records: in its own batch where the action is one (draft save, signup settings), otherwise immediately after it succeeds. The product has no approval-rejection operation, so none is recorded. The inherited FLOW-008/AGENT-010 activity obligation is recorded in RL-5; restore completion remains unfinished.

## Responsive compiler bounds — BUILD-010, BUILD-013 and BUILD-014

The per-block controls use BUILD-001's block model and generated-only style authority. The closed generated head style has an 8,192-byte bound and fail-visible desktop hiding; the byte bound is compiler mechanism, not a reduced responsive-editor requirement. RL-81 retains the Owner's 19 October conservative generated-only policy. Nested/horizontal orientation and complete editor acceptance remain owed.

## Renewal claims and authority — DELIV-007

Home/public renewal and the existing minute Cron share durable claims. Automatic renewal and reminders require the confirming native operator authority; legacy or restored confirmations need a fresh diagnostic before outbound renewal resumes. The renewal read names `sender-evidence-lapsed` and `sender-evidence-deadline`; these labels are not installed dispatch hooks. RL-6 records who receives reminders and what can renew evidence.

## Sending-connection custody — DELIV-008, DELIV-009 and DELIV-010

Request-driven read-back runs on a five-minute interval. The connection defaults disclose the account, destination, event list and signing before Owner-authorized creation, delete a newly created webhook if signing cannot be enabled, accept signed events within the five-minute timestamp window, and identify ownership only by the stored provider identifier. RL-82 retains the Owner's authorization decision. Developer-only deployment inputs retain their legacy transport authority; read-only operation without a Settings connection remains unfinished. Restricted-scope CRUD behavior is inferred from provider documentation and is not a real-provider receipt. The full fresh-install, sign-in, silent-events, daily-read-back, key-replacement, developer-authority, domain-creation and sandbox journeys remain owed.

## Branded-link proof custody — DELIV-002

A DNS CNAME does not by itself attach a branded hostname to Mango's redirect handler; branded links need both HTTPS and routing. The separately reviewed proof workflow must use the repository's existing deploy secret and always clean up; account-wide Worker/D1 credentials were declined. No credential value is recorded here. Resend retains its existing verification path.

## Reporting period and scheduling mechanism — REPORT-001, REPORT-006 and REPORT-007

Campaign attribution and engagement use the detailed performance table's scheduled-step period; costs, growth and provider facts use occurrence days, with each basis disclosed. Scheduled weekly email runs Monday at 09:00 UTC and monthly email on the first day at 09:00 UTC. Restored or revoked native authority requires explicit enable; uncertain provider outcomes never automatically resend. Projected month is the priced month-to-date UTC run rate extended linearly; currencies remain separate without conversion, and unpriced facts count rather than becoming zero. RL-7, RL-8 and RL-9 retain the adopted reporting policies. Flow and holdout work is not removed by the unavailable placeholders.

## Loyalty observation custody — INT-014

Owners/Admins use `integration.manage` with the existing encrypted credential custody. Unknown addresses are counted without storage, and this observation path creates no contact, consent or send. Yotpo's unresolved signing protocol produces `adapter_signature_protocol_unverified`. Smile `customer/updated` supplies profile/balance observations, not inferred earned-points or tier transitions. RL-10 retains the adopted authority/data-minimization policy. Review-request flow conversion and exit remain owed.

## Paid membership event accounting — PUB-002

Paid membership follows a fresh Stripe read for checkout completed, `customer.subscription.*` including paused/resumed, `invoice.payment_failed` and `invoice.paid`: active/trialing is paid; past_due, unpaid, paused, incomplete, incomplete_expired and canceled leave; a later active/trialing read rejoins. Read-start time orders overlapping reads, never the event's created second; equally fresh conflicting reads leave the paid topic. Failed Stripe reads remove paid eligibility, move the source-authority fence, record a failed operation and return a retryable refusal; the same event can recover after a successful fresh read. Cancellation ends paid membership only, while consent withdrawal stops every send on the channel. Immediate-confirmation card methods only; delayed methods are not supported. Paid writes move the source-authority fence, including a change after the final recheck. Mango stores Stripe ids, states and Stripe-reported tax, never card data or funds. The Owner connection requires a restricted test key (`rk_test_`), refusing an unrestricted key (`sk_test_`). RL-11 retains the consent decision; RL-12 preserves PUB-005's separate payer-capture obligation.
