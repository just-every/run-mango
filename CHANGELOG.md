# Changelog

## 0.4.0 (2026-10-21)

**Back up first.** Before upgrading, back up your source, D1 database, R2 bucket and private settings (`.dev.vars`, or `.rer/hosted.env` and the deploy receipt for a hosted copy). Stop `rer dev`, run `git pull --ff-only`, `rer install`, then `rer setup` locally or `rer deploy --environment <name>` hosted; both apply the four new migrations in filename order. Run `rer build` before taking a fresh export. A copy of 0.3.0 with contacts, an opt-out, a pending signup, a completed import and a draft upgraded with every earlier row unchanged, and a hosted copy updated in place kept its owner, contacts and sent campaign.

### What you get

- **An activity log.** Settings → Activity shows the Owner and Admins every recorded operator and integration action, newest first: drafts saved, approval requests and approvals, pause, resume and cancel, imports and exports, consent entries, opt-outs, erasures (anonymised afterwards), signup-allowance and kiosk-form changes, role changes and an hourly count of refused public signups by form and reason. Filter by operator, agent, action, object and date, page back, and download the filtered view as CSV (OPER-007, partial: a completed restore has no entry yet).
- **Removing an operator keeps their name on their work.** Their sessions end, and campaigns, approval requests, approvals, revisions and audit records still show who did what (OPER-003).
- **Review names every blocked link and image.** A malformed link, an `http:`, `javascript:`, `data:` or `file:` link, a redirect that lands on an unlisted host and an image on an unlisted host are each named with what blocks it (MSG-006). A Manager can allow an unlisted HTTPS host from review; Authors cannot, and each allowed host is recorded in the activity log (MSG-015).
- **SMS review shows what the reader gets:** your program name, `Reply STOP to unsubscribe`, the frequency disclosure, the help contact and the segment count (MSG-005).
- **Commerce and dormancy exclusions** are listed with their counts on review (AUD-003).
- **Connect Stripe (optional).** Settings keeps an encrypted Stripe connection that only the Owner manages, and records each signed payment, Checkout and subscription event once (INT-004, partial: a real Stripe subscription lifecycle is not proven yet).
- **Domain setup for SendGrid.** Mango creates the domain authentication if it is missing, shows the DNS records, checks them in public DNS and turns on branded links only once their HTTPS works (DELIV-002, partial).
- **Backups from earlier Mango builds restore.** `rer import` now restores an archive made by an earlier Mango, including the build Run Edit Run Managed lists, by replaying this copy's own migrations to place the archive in its history. A database that Run Edit Run Platform migrated restores in place, without Wrangler, once every migration file is applied there. Pinned rer is 0.2.76.
- **An oversized account export always gets the plain size message.** Mango reads such an upload to the end, keeping none of it, before answering. Before, it answered mid-upload, and the reset connection could show an error page instead (CONT-010).
- **Security:** TanStack Start 1.168.60 (GHSA-qx66-fv34-fjm8).
- CONTRACT.md: 88 of 241 clauses are done, 67 partial and 86 missing; the 87 published clauses are 75 done and 12 partial.

### Not in this release

- Everything marked missing or partial in CONTRACT.md's status table, among them visual flows, A/B tests, popups and landing pages, SMS sending for the US, single sign-on, and moving in from Klaviyo, ActiveCampaign or Kit.
- Hosted backup and restore are not built into Mango. Back up a hosted copy with Cloudflare's own `wrangler d1 export --remote` (docs/backup-and-export.md).
- Bounce, complaint and Delivered reports need a SendGrid signed Event Webhook. Without one, a hosted send shows **Accepted**.
- A real Stripe subscription lifecycle and branded tracking links over HTTPS are not proven yet.

### Known issues

- In the plain-text part, a letter's first line runs into the next paragraph when the rich-text editor leaves it outside a paragraph (for example "Hello Rae Reader,The trees…"). HTML is unaffected.
- A hosted Lobby shows **Sign in** as soon as deploy claims the owner, before sender setup is saved; HOME-001 says **Finish setup** until then. Both lead to `/setup` after sign-in.
- rer 0.2.76's restore planner stops every restore of a backup made before migration 0073 (list growth) with a "no such table" error. Mango adapts that one Base rule in `src/vendor/base/portability/backfills.mjs` until Base ships a fix. Such a backup restores every archived row exactly, but if it holds consent evidence, migration 0074's retained-evidence growth entries are not rebuilt for it.
- Migration numbers 0058 and 0059 appear twice (`0058_owner_signin`, `0058_base_provider_control`, `0059_link_host_settings`, `0059_base_provider_pins`). Migrations apply by full file name, so an upgrade applies the new ones once each; never rename them.

### Migrations

0077_signup_refusal_hours, 0078_stripe_connection, 0079_tracking_domain, 0080_portability_import_leases. All are additive; earlier migration files are unchanged.

## 0.3.0 (2026-10-19)

**Back up first.** Before upgrading, back up your source, D1 database, R2 bucket and private settings (`.dev.vars`, or `.rer/hosted.env` and the deploy receipt for a hosted copy). Stop `rer dev`, run `git pull --ff-only`, `rer install`, then `rer setup` locally or `rer deploy --environment <name> --owner-name "Your name"` hosted; both apply the new migrations in filename order. Run `rer build` before taking a fresh export. A copy of 0.2.0 with contacts, an opt-out, a pending signup, a completed import and a draft upgraded with every earlier row unchanged.

### What you get

- **Roles.** The owner gives each operator one of six roles: Owner, Admin, Manager, Author, Analyst or Support. New and existing operators start as Admin, and your existing owner becomes the Owner. Authors write and request review, Managers approve and send typed tests, and Analyst and Support see masked contact details unless the owner unmasks them. Every role change is recorded, and the last Owner cannot be removed or demoted (OPER-004, partial: flows, provider connections and installation erasure have no role journeys yet, and CSV export stays with Owner and Admin).
- **Pause and resume a campaign.** Pause stops sends that have not been handed off. Resume checks consent and frequency again and skips a send window that has expired (CAMP-014).
- **Reuse your work.** Duplicate a sent campaign into a new draft or save it as a template. Send a follow-up to the people who did not click, which needs its own approval (CAMP-016, CAMP-018).
- **Test to typed addresses.** Send a marked test of the saved draft to up to five addresses you type. A daily allowance shows what is left, and unsubscribed or suppressed addresses are refused by name (CAMP-019, partial: SMS tests are not included).
- **Better checks before approval.** Advisories you acknowledge for the exact saved letter (MSG-007), personalisation fallbacks counted per eligible reader (MSG-008), `mailto:`, `tel:` and `sms:` contact links (MSG-013), and the sent size of each part measured against a 100 KB limit, with oversized hand-offs blocked (BUILD-012, partial).
- **Later steps recheck their audience.** A second step rechecks inclusion, exclusions and consent, so someone who no longer qualifies is skipped with the reason (AUD-006).
- **One timeline per contact.** Signups, consent, imports, suppressions, sends, provider outcomes, clicks and operator actions appear in order on the contact page (CONT-008).
- **Deeper results.** Per-link clicks and clicker lists, recipients listed under each outcome, matching CSVs and segments built from them, a breakdown by mailbox provider, and list growth by consent source (DELIV-005; RESULT-007, RESULT-008 and REPORT-005 are partial).
- **A public archive of sent letters.** You can publish a sent letter as a neutral web page with an archive index and RSS, and withdraw it later. Personal details, unsubscribe links and tracked links stay out of the public copy (PUB-001).
- **Kiosk signup for events.** The hosted form can run on a shared tablet: each visitor completes a fresh check, the form resets blank, and confirmations record the kiosk as the source (FORM-009).
- **Resubscribe by confirmation only.** Someone who unsubscribed can sign up again through your public form, but they are only subscribed after their own Confirm from the email. Suppressed addresses get the same reply and are never mailed (CONT-027, partial).
- **Connect another app.** Settings can create integration credentials limited to the scopes you choose, for example so Coffer can keep subscribers and consent in sync. Every API request is logged (INT-007, INT-011, partial).
- **Optional store connection:** source freshness on the Decision Desk, approval blocked by stale or failed sources, and sources the store connection cannot supply named instead of counted as zero (STORE-003, STORE-005, STORE-006).
- **Unsubscribe stays fast and separate.** The confirmation page and one-click unsubscribe answer within two seconds locally. Each link has its own rate limit, so one busy link cannot block another reader's (MSG-010).
- **Restore checks the whole archive before applying anything.** Finalize (`POST /api/portability/imports/:id/finalize`, `rer import` and the transfer CLI) now needs the archive's closing `archiveHash` and checks it against the staged manifest and every staged part before the erasure floor is consulted. A changed archive is refused with `archive_checksum`; before, the HTTP route accepted it and could restore a contact erased after that backup. A refused finalize withdraws the staged import: nothing is restored and the job reads `aborted`. **HTTP clients must now send `archiveHash`.**
- Import contacts lets you choose the message category from the categories this Mango already uses, and says it must match the draft. **Import 12ui design** says what 12ui is and links to the guide.
- The sign-in page fills in the email address from a complete `login_hint` address; it never submits on its own. Test credentials and environment references are marked explicitly so hosted source admission accepts the fixtures.
- Start with one line: `npx -y @runeditrun/rer dev just-every/run-mango`. Pinned rer is 0.2.66. A first hosted deploy needs `--owner-name "Your name"`, and the deploy guides now show it.
- CONTRACT.md now describes the full email and SMS marketing product Mango is building towards, with a status for each clause. At this release, 83 of 241 clauses are done, 70 partial and 88 missing; the 87 published clauses are 71 done and 16 partial.

### Not in this release

- Everything marked missing or partial in CONTRACT.md's status table, among them visual flows, A/B tests, popups and landing pages, SMS sending for the US, single sign-on, a full activity log, and moving in from Klaviyo, ActiveCampaign or Kit.
- **The homepage is ahead of, or no longer matches, the code in one place.** "A team of equals: every operator has the same powers" predates roles. New operators still start as Admin with every product power, but the owner can now give narrower roles. Homepage wording is the owner's to change.
- Hosted backup and restore are not built into Mango. The release gate backed up a hosted deployment with Cloudflare's own `wrangler d1 export --remote`, removed it, redeployed, loaded the backup into the new database, signed in by email and found every contact, opt-out and campaign. That is Cloudflare tooling, not a Mango feature (docs/backup-and-export.md).
- Bounce, complaint and Delivered reports need a SendGrid signed Event Webhook. Without one, a hosted send shows **Accepted**; this release's live send showed Accepted 1. The webhook path is proven with locally signed events, not a live provider.

### Known issues

- In the plain-text part, a letter's first line runs into the next paragraph when the rich-text editor leaves it outside a paragraph (for example "Hello Rae Reader,The trees…"). HTML is unaffected.
- A hosted Lobby shows **Sign in** as soon as deploy claims the owner, before sender setup is saved; HOME-001 says **Finish setup** until then. Both lead to `/setup` after sign-in.
- OPER-003 (removing an operator keeps their attribution) is now partial: its dedicated test was removed on 15 October. Removal still revokes sessions, which is tested, and operators are soft-removed, not deleted.
- Migration numbers 0058 and 0059 appear twice (`0058_owner_signin`, `0058_base_provider_control`, `0059_link_host_settings`, `0059_base_provider_pins`). Migrations apply by full file name, so an upgrade applies the new ones once each; never rename them.

### Migrations

0058_base_provider_control, 0059_base_provider_pins, 0060_base_owner_signin, 0061_base_dependency_setup, 0062_base_dependencies, 0063_base_dependency_approval, 0064_base_idp_claim, 0065_base_import_progress, 0066_campaign_reuse, 0067_campaign_link_identity, 0068_campaign_followups, 0069_scoped_integrations, 0070_newsletter_archive, 0071_mailbox_reporting_indexes, 0072_test_send_allowance, 0073_list_growth, 0074_list_growth_retained_history, 0075_kiosk_forms, 0076_operator_product_roles. All are additive; earlier migration files are unchanged.

## 0.2.0 (2026-10-16)

- **Upgrade from 0.1.0:** back up source, D1/R2 and private settings, preserve customizations, apply migrations in filename order through 0059, and run `rer build` before a fresh post-upgrade export. Migration 0044 retires legacy transfer journals and advances erasure floors; old archives remain subject to current erasure authority. 0023 and 0046 are numbering gaps, never renumbered migrations.
- **Embedded signup forms need an upgrade step.** Migration 0057 starts with no allowed framing origins. After upgrading, add each site that embeds your form under **Audience → Allowed embed origins**; existing iframes stop loading until allowed. Direct hosted signup stays available.
- **Managed mail has separate transactional and marketing connections.** Run Edit Run supplies `MAIL_PROVIDER=rer`, `MAIL_FROM`, `MAIL_RELAY_URL` and private `MAIL_API_KEY` for sign-in and subscription confirmations. Newsletters use an optional separate owner-supplied SendGrid or Resend marketing connection (`MARKETING_MAIL_PROVIDER`, `MARKETING_MAIL_API_KEY`, and provider-specific webhook inputs) and a verified business sender. Without that connection newsletter approval stays blocked. Free and Assisted hosting retain their own-provider mail. Pinned rer is 0.2.22.
- **Shopify** is an optional single-shop connection with authenticated sync, signed webhook receipts, source-version handling and declared cart/browsing observation coverage. Missing or stale source authority blocks dependent audiences; importing customers never invents marketing consent.
- **Mobile Message SMS** is optional and requires a configured Australian two-way sender, explicit channel consent and recipient-local policy evidence. Durable confirmation/STOP/HELP messages, frozen programme wording, quiet hours and destination-wide frequency claims keep service messages separate from approved marketing.
- **Commerce attribution** follows the most recent non-automated tracked click in the seven days before purchase, once per order. Refunds and cancellations update attributed amounts even after customer links change; provider facts remain distinct from forecasts.
- **Open-estimate settings cannot change while an approved email campaign has unsent work.** Finish or cancel that work before changing the setting, so tracking cannot be added after approval.
- **Open estimates** are off by default and explicitly enabled in Insights. They are privacy-sensitive estimates, never delivery or attribution evidence, and record no IP address or user agent. Revocable generation-bound tokens keep them separate from untracked campaign images.
- **Allowed link hosts** are editable in Settings. The existing environment policy remains authoritative until saved; defaults admit the app host and approval still checks HTTPS destinations.
- **Delivery and scheduler authority** now includes durable cross-worker pacing, rolling reservations, provider holds/health and credential-bound uncertainty. Actual Worker scheduled entries supply scheduler observations; reads and deploys do not. Definite nonacceptance alone is retry-safe.
- **Test sends go to every active operator’s sign-in address**, plus explicitly allowed extra destinations. This widens who can receive unapproved draft content; it grants no audience delivery authority.
- Push **Verify** runs independent shards; slow fresh-install and README clone journeys run on release tags and nightly. The release receipt runs routine verification only; the removed capacity profile is no longer a release gate.

- **Approve and send with only Mango and a mail provider.** Settings now sends a one-time check from your From address to the address you sign in with; press **Yes, it reached my inbox** in that email and campaigns can be approved. Before, approval needed a receipt connector Mango did not ship and a command-line runner. Provider and DNS evidence (SPF, DKIM, DMARC and alignment) is still checked at every approval and send; the confirmation lasts 30 days or until those records change. The receipt connector and `scripts/sender-verification.mjs` remain as an option. Approval checks now explain sender problems in words instead of codes such as `observation-missing`, and **Approve & schedule** asks for confirmation first. No migration.
- **A SendGrid signed Event Webhook is optional.** `MAIL_WEBHOOK_SECRET` and `MAIL_WEBHOOK_ID` are optional deploy inputs with SendGrid; without them sends show **Accepted**, and adding the webhook later (`rer deploy --set-secret MAIL_WEBHOOK_SECRET`) turns on **Delivered**, bounce and complaint reports. Resend still requires both.
- **The first letter after a deploy leaves on time.** Approval queues each step due within 12 hours as a Queue message delayed to its exact time, so it no longer waits for Cloudflare to start a new Worker's Cron Trigger (one stranger's 22:20 letter left at 22:32).
- **Local copies:** the private `RER_OPEN` entry opens a native development session in the browser using the checkout dev key, without email or captured-mail pages. It is distinct from an emailed one-use sign-in link. Confirmation email uses configured hosted mail. The local scheduled job no longer answers 500 every minute; approval says sending is off on a local copy.
- Settings lists the connections this installation actually has (before it said no provider was declared while mail was sending), and a newsletter-only setup no longer shows the Store menu, the AI **Generate suggestion** button, store-order results or SMS wording on signup; the confirmation email's subject names your newsletter. Import mapping lists SMS columns only when text messages are on.
- Pinned rer 0.2.22 still prints a one-use owner grant for `rer signin`. This recovery path is not used under the owner’s no-printed-sign-in-link rule; hosted access uses delivered email, and private CLI recovery awaits a Base change.
- Docs: Node 22 or later must be installed before rer; how to remove a deployment (`rer deploy --remove --yes`), repair hosted sign-in mail through Configure, confirm your sender and add a SendGrid webhook.

- **The audience export carries every opt-out** (migration 0038). Before, an opt-out or suppression whose address had no contact any more (its import was undone or abandoned, or the contact was deleted) was left out of the export, so an installation restored from that file could import and mail the person. Each such restriction now leaves on a row of its own that names the address only by its portable hash; a Mango-preset import restores it before any contact is written and keeps it when the import is undone, and the address is unsubscribed or suppressed when it arrives later through a file, a signup or a consent capture. Every writer of an opt-out or suppression records that portable hash; restrictions written before this release whose contact was already gone cannot be exported by it.
- **Undo import** checks every contact first. Before, an Undo refused because a person had changed a contact (they unsubscribed, confirmed consent, or an operator edited it) could leave the import stuck in *undoing*, where it could be neither resumed nor abandoned. Now the import stays completed, nothing is written and the page explains the conflict; once an undo has started, a contact changed between its steps is kept as it is now and the undo finishes.
- A plain CSV row that does not opt a person out (non-subscribed, a status of `transactional`, or subscribed without complete consent fields) no longer lowers a contact whose consent the person confirmed in Mango; Preview says the contact is kept for that consent. Before, a non-subscribed file set a contact who had confirmed through Mango's link back to non-subscribed, and the next letter skipped them.
- **Start import** keeps going on its own: the Imports page continues an import step by step until it completes, a step fails, you press **Stop** or you leave the page. Before, each step of ten rows needed another press of **Resume import**. A stopped import still offers Resume and Abandon.

- **No rollback or undo lifts an opt-out, and Abandon always finishes.** Before, when an address already had an older opt-out row (the person unsubscribed, then confirmed new consent), a later unsubscribe list reused that row: undoing the list, or abandoning an earlier stopped import that still held the contact, put the person back to subscribed. Now every unsubscribed or cleaned row in a file (including one for a contact another import holds), and every row an import makes unsubscribed or suppressed, records an opt-out row of its own (its own `import-unsubscribed` or `import-suppressed` reason, named for the import when the address already has one, and its own time), and a rollback keeps every status such a row explains; a raised status that no newer opt-out or suppression explains counts as a change, not a restriction. Abandon no longer refuses when a person changed a contact the import wrote, and a change made between its steps no longer leaves it stuck in rolling back: every step (Abandon or Continue abandoning) keeps each contact a person changed (unsubscribed, confirmed consent or edited) as it is now, releases the import's claim on it, records it as kept, and rolls back the rest, so the import always reaches rolled back. The page then says "Import abandoned: N rows rolled back, K kept because people changed them" and says "Rolling back…" only while it is. No migration.
- **Abandon import** drops an import that stopped partway. Before, such an import could only be resumed: Undo refused it, and its contacts stayed held, so later files could only opt them out. Abandon rolls back exactly what the import wrote through the import kit's rollback (contacts it created are removed, contacts already in Mango get their earlier details back), keeps every opt-out and suppression, releases its contacts, records who abandoned it and when, and lets the same file be imported again (also after an undo). If a person changed a contact it wrote since it stopped (confirmed consent or unsubscribed), Abandon is refused before anything is rolled back and names the contact. An opt-out or suppression alone no longer counts as a change: after a later unsubscribe or cleaned list is undone or abandoned, the earlier import can be undone too (before, it was refused with "changed in Mango"). A later plain CSV no longer re-applies an old opt-out over consent the person confirmed in Mango after it; Preview shows "Kept: newer consent on" that date. A held row's warning now says why: the earlier import is still in progress, was undone or was abandoned, a restriction was applied since, or the contact changed. An unsubscribed or cleaned row for a held contact now adds only the opt-out or suppression and raises its status, without a history line. No migration.
- **Undo import** never lifts an opt-out or suppression. Before, undoing a plain CSV unsubscribe or cleaned list put the person back to subscribed and the next letter reached them; now undo restores the other details, removes the contacts the import created and keeps every opt-out, suppression and restricted status. Imports and archives made before migration 0037 undo again (they were refused as changed in Mango). An unsubscribe list naming a contact that a still-running import has not written yet no longer leaves that import stuck. A CSV row with no name keeps the contact's own name, and a refused undo, resume or archive step now says what happened for that action, with the code kept in `code`. No migration.
- A plain CSV unsubscribe or cleaned list now opts out or suppresses a contact that an earlier import still holds (changed in Mango since, or kept by an undo); any other row for that contact is skipped with a warning in Preview. Before, Start import refused the whole file with a raw `NATIVE_EDIT_CONFLICT`, so the person stayed subscribed and was mailed. A refused start now says in words what happened. An archive move-in now leaves the name of a contact that was already in Mango, including after undo; the exported name is kept on the import record (additive migration 0037).
- Designed emails follow tighter style rules, so text can no longer be hidden in them (MSG-012). Only table cells can have a background colour (`background-color` or `bgcolor` on `td` or `th`), besides one `div` wrapping the email at its top level (text directly on that wrapper must also read on white, since a long line can run past its edge on a phone; a coloured page is best the one cell of a full-width table, as Mango's designs do), no element can change how it is displayed (`display` is refused), widths and heights stay on tables, cells and images (a height also on an empty box, such as a rule), inline elements such as `span` take no borders, a cell with a background rounds its corners only within its padding, right-to-left text (`dir="rtl"`, now also allowed on a cell) sits in a table cell, a table is aligned left or centre and laid out automatically, and styled table cells may not overlap. A table cell grows to hold everything in it, so nothing can carry text out of its cell, and approval checks one thing: every piece of text reaches 3:1 contrast against the background of the table cell it sits in (white outside any), including where a mail client without a doctype resets a table's text to black. Before, a box set to `display:inline` with a dark background let white text inside it reach recipients white on white while approval, test sends, delivery and the preview all passed, and earlier attempts to follow text through the layout (margins, padding, widths, long words measured character by character) kept missing cases; that layout modelling is gone. Designs from **Import 12ui design** and **Design with 12ui** look the same on a computer; on a phone their side-by-side sections now stay side by side instead of stacking. Text below 10px (headings shrink, and a table can start again at 16px in some clients) and the two invisible characters that reverse letters (U+202D, U+202E) are refused; direction embeddings and isolates, which pasted right-to-left names carry, are not. A link without an address is judged in its surrounding colour, as browsers show it. Plain emails, and every email approved without styles, are unaffected; a styled email approved before this update that uses what is now refused needs approving again. No migration.
- Saving an email body twice now always stores the same bytes (CAMP-003). Before, a few bodies that mail clients rebuild differently each time they read them (MathML or SVG around a table or a style element, a managed footer written with single quotes at the top, a plaintext element inside SVG) had the unsubscribe footer moved, or the body grown, by the next save, and an SVG element named `template` could not be saved at all. Mango now settles the body before adding the footer and checks that a second save would store the same thing. Such bodies are still refused at approval. A 12ui LayerDoc nested more than 64 levels deep is refused by name instead of crashing the import or the design run (DESIGN-004), and every answer Mango reads from 12ui now has a size limit, not just images and layouts (DESIGN-003). No migration.
- A malformed closing tag can no longer hide text from approval (MSG-009, MSG-012). Before, the approval check read `</ span>` and `< /span>` as closing tags, while mail clients read a comment or text and keep the element open, so text styled white on white after them passed every check and reached recipients hidden. Mango now reads email HTML with one standard HTML parser (parse5, the parser browsers follow) for approval, test sends, delivery, the preview and the plain-text part, so all of them judge what a recipient's mail client shows. Markup that mail clients read differently from how it looks (a malformed tag, an unquoted attribute, a comment) is refused with its place named. Saving now stores the body the way the parser reads it: elements closed where they end, attributes in double quotes and characters instead of character references, so the editor can show small changes after you save and every mail client reads the same email. Saving never changes a style or an attribute value, and never refuses a body for how it is written: what mail clients drop is dropped in the saved copy too (of an attribute written twice the first is kept; a table cell outside a table loses its tag and attributes), so the checks judge exactly what readers will see. The plain-text part now keeps text such as `1 < 2` that it used to drop. Emails approved before this update are sent exactly as approved; only an email with a closing tag written `</ span>` (a comment to mail clients), an attribute on a table cell outside a table, headings nested inside headings into text below 10px, or a letter-reversing direction character needs approving again. A `<` that starts no tag, such as `< p>`, is shown as the text it is, as mail clients always showed it. Saving the saved body again stores the same bytes. Adds the parse5 dependency; no migration.
- **Design with 12ui** (DESIGN-001 to DESIGN-003): with your own 12ui API key set as `DESIGN_PROVIDER_API_KEY` and `DESIGN_PROVIDER_ORIGIN=https://12ui.com` (in `.dev.vars` on your computer; for a hosted deployment `deploy.json` declares both as optional secrets, uploaded when you set them for `deploy`), a draft's email editor can ask 12ui for two to four designs from a brief Mango fills in from the draft. Mango shows an estimate before each paid step, draws the designs in the background (they appear as they land and survive a reload), and **Use this design** prepares the one you choose; when its layout is ready Mango goes on if you have been waiting for it, and otherwise the run says so and waits for its **Use design … in the email** button; either way the design is built into the email exactly like **Import 12ui design**, as an unsaved edit. Nothing opens over your work or takes your keystrokes (before, the dialog opened while you typed and took focus). The designs stay on offer until you save the draft with one or discard them, so discarding the edit, reloading, a failed layout step or starting another run loses nothing you paid for: a failed layout says which step failed and whether your 12ui wallet or allowance is the cause, and offers **Try the layout again** (a new layout) or **Choose a different design**; an earlier run's designs stay under **Earlier designs**, and the brief says so. Each design opens at full size. Nothing is saved, approved or sent by a run. When 12ui asks Mango to wait (a rate limit) the editor says so calmly, with how long until Mango asks again, and keeps saying it until 12ui answers (it no longer flips between "being drawn" and "did not answer"); a refused key, an empty wallet, a spent daily allowance, an outage, a request 12ui never answers (each has a time limit) or an overdue run fails promptly, says why in Mango's words and leaves the draft as it was. Only the brief (without personalisation tokens) and the chosen design go to 12ui; every paid request is recorded with the campaign's costs and never bought twice. Without the key the button does not appear and Mango never contacts 12ui. Mango reads 12ui's images and layouts with a size limit and follows a redirect only within 12ui's own address, so your key never goes anywhere else, and counts an image as bought once 12ui confirms it. The baseline's rule against requests to the seed author (BASE-DATA-005) now records that this owner-configured, default-off module, which calls your own design service with your own key only when an operator asks, is not such a request. Migration 0040 adds the run records, additive migration 0041 the reason and time of a wait, and additive migration 0042 the layout round that keys each new try. A secret marked `optional` in `deploy.json` is uploaded by `deploy` only when its input is set; `rer verify` checks the build without it.
- **Import 12ui design** (DESIGN-004): a draft's email editor can turn a design made with your own `12ui` command line tool into the email body. Choose the LayerDoc (`12ui convert <candidate.png> --engine api --output layerdoc --model fast`) and the PNG candidate it came from, enter the button's HTTPS link and check the brief. Your browser crops the photos, uploads them as Mango-hosted images and builds a 600px email in the same checked HTML as any other: readable colours, safe fonts, side-by-side sections, your button link and Mango's own unsubscribe link and postal address instead of the design's footer. The body changes only as an unsaved edit; a summary highlights every line the design wrote that is not in your brief and lists the images, the button and what was left out. Saving, preview and approval are unchanged. An unsupported LayerDoc, a PNG that does not match it or a non-HTTPS link is refused and the body stays as it was. The summary says when the import is saved and goes away if you discard it. Import works on a copy running on your computer too; approve the result from your hosted Mango, because local image addresses are not HTTPS. Import itself holds no 12ui key and makes no request to 12ui (only the optional **Design with 12ui** does). Inline styles may now also use `white-space`. No migration.
- Designed emails can now be approved (MSG-009 amended, MSG-012 added). HTML-mode email may carry a `style` attribute with a bounded set of inline styles (hex colours, font stacks, sizes, spacing, borders and rounded corners) and presentational table attributes (`role="presentation"`, `width`, `cellpadding`, `cellspacing`, `border="0"`, `align`, `valign`, `bgcolor`). Before, any style or presentational attribute blocked approval, so a designed email failed with one issue per attribute kind. One checker decides approval, test send, delivery and whether the preview keeps styles. It refuses, and never repairs, CSS functions such as `url()`, comments, escapes, entities, `!important`, styles that hide or move text, text below 3:1 contrast against its background, and styled markup that browsers would re-nest. Revisions that were valid before stay valid, so nothing approved needs re-approval. A styled email opens in HTML mode, as an email with images does, so rich text editing cannot drop its styling. No migration.
- Text in a table that relies on a colour set outside the table, which many mail clients drop, now blocks approval in a designed email (MSG-012); before, it passed approval while recipients saw no text. The import summary for a 12ui design now shows a thumbnail of every hosted image and highlights image descriptions not in your brief, and a design PNG of the wrong shape is named with its real size instead of 0×0.
- **Campaign images** (CAMP-012): Mango now stores and serves email images itself. A signed-in `POST /api/campaign-assets` with a JPEG, PNG, GIF or WebP file as the `file` field of a `multipart/form-data` upload stores it once under its SHA-256 and returns its public address, `/media/<sha256>`. The file's own header decides its type (the declared type and name are ignored), the file must be complete and it must stay within the byte and pixel limits in `seed.json`; anything else is refused and nothing is stored. Images are served without a session or cookie, with their exact type, `nosniff`, an immutable cache and a per-image rate limit, and Mango records nothing about who fetched them, so they cannot count opens. Images cannot be changed or deleted, except that erasing a contact removes an image whose stored bytes hold that contact's address, phone or id. Approval checks Mango's own images in storage instead of fetching its own hostname (MSG-006). Images are part of export and restore. In HTML mode, **Insert image** uploads a picture and puts it at the cursor with its size (scaled to the 600px email width when wider) and a description. The same address with the image's extension (`/media/<sha256>.png`) also works. On a copy running on your computer, where addresses are `http://`, an email with Mango's own images saves, previews with its styling and shows the images when you choose to load them; approval there says the images need an HTTPS address, so approve from your hosted Mango. Additive migration 0039.
- **Import contacts** now takes a whole account export as one .zip. One Preview, which writes nothing, covers the whole archive. The four audience status files import with their matching presets and one entry of consent evidence; the most restrictive status wins across files, and existing opt-outs stay. A contact that an earlier import still holds (changed in Mango since, or kept by an undo) keeps its own details, but an unsubscribed or cleaned status in the export still opts it out. Sent emails become read-only imported history with **Copy into a new draft**, templates become draft starters, and reports, gallery, SMS, events, appointments and ecommerce are kept as raw source, not imported. A downloadable reconciliation report accounts for every source row. **Undo this import** removes only what nobody changed since and lists what it kept and why. Unsafe archives are refused with a named reason. The **Moving in** guide explains the route. This is a documented format, tested on synthetic files shaped from the published help page, not on a real export. Additive migration 0036.
- Merge tags written for another email tool (`*|FNAME|*`) now fail the personalisation check and block approval. Before, they passed as plain text.
- Each opt-out and suppression reason is now its own record (migration 0035). Before, three soft bounces after a one-click opt-out overwrote the opt-out's reason, and a later delivered event deleted it and set the address back to subscribed. An address now returns to subscribed only when no opt-out and no suppression remains.
- Erasure now also deletes stored files named by the address plus a file extension (the address followed by `.json`, under `exports/`), while `ann@x.test.example` and `xann@x.test` are left alone.
- Hosted deploys serve built files before anything else, and `/health` reports the deploy identity. `deploy.json` declares the secrets and vars Mango reads, including `MANGO_RESTORE_MODE`, so an owner can put a hosted install into restore mode through `rer deploy`. The local command line is refreshed to Base `main` at `9ec15a6`.

- An unsubscribe made through SendGrid (unsubscribe or group unsubscribe event) now unsubscribes the contact. Before, Mango ignored these events and kept the address subscribed.
- Soft bounces reported by signed SendGrid events now count toward the three-in-a-row suppression rule, and a delivery to one of Mango's own messages resets the count. Before, only hard bounces, complaints and drops reached the contact.
- **Insights** now lists, for each campaign, how many recipients the provider accepted and how many each kind of provider event reported, one row per outcome. Before, it read a table nothing filled and always said there was nothing to show. The deliverability report also counts a hand-off whose response was lost once a provider event proves it.
- **Settings → Sender identity** lists what a sender needs before the first real send: provider domain, DNS records, a trusted receipt and passing authentication (each observed, not observed or unavailable), the built-in unsubscribe and postal footer, and the sending jurisdiction you decide. A new **Going live** guide explains each item and what Google's sender guidelines require.
- A refused `rer import` (missing private settings) no longer writes a database first, so a following `setup` works; when local data exists without its private settings, `setup` now says so instead of reporting a pnpm check failure.
- A new `go-live` verify stage sends an approved campaign through the real SendGrid adapter with only the network replaced, replays signed SendGrid events signed with a locally generated key, unsubscribes the way a mail client does, and restores the installation into an empty one. It is not acceptance by a live provider, and hosted restore remains untested.
- The local command line (`scripts/base-cli`, `scripts/base-onboarding`) and its two exported guides are refreshed byte-for-byte to Base `main` at `446d082`, which includes the local-port closure fixes (`b1ad813`). Base modules that the refreshed commands import (AI, container, dependencies, erasure, integrations, operator authentication and owner claim command copies) are carried under `scripts/base-cli/modules` exactly as Base's default seed carries them. Application vendor copies under `src/vendor/base` are unchanged.
- Erasure now finds an address inside URLs and stored-file keys (`?email=ann@x.test&src=news`, `/u/ann@x.test/prefs`, `contacts/ann@x.test/avatar.png`): only letters, digits, `_`, `@`, `.`, `+` and `-` continue an address, so xann@x.test and ann@x.test.example are still left alone. Capture and confirmation IPs are removed only in the contact's own records and records that name them, so another person who signed up from the same IP keeps their consent IP and their separate import.
- Erasing a contact no longer rewrites or deletes anyone else's data. Exact ids, addresses and phones are still removed everywhere (addresses matched whole: deleting lee@x.test leaves ann.lee@x.test), but names and notes are removed only in records that belong to the contact or name them by an exact identifier, stored files are deleted only through an exact id, address or phone, and an import's file name or capture source no longer pulls another contact's import into the deletion. A single-word or very short name that such a record would still hold is refused with a 409 naming the store.
- Previewing the same file again re-reviews it when the audience changed since an unused review, for example when a signup created one of its contacts; a review that an import already used is still returned unchanged. The Imports list shows the newest import first again.
- Erasure admission now serializes against concurrent merges and refuses changed or missing subjects without side effects. Rename and merge retain known names in existing contact history so erasure also reaches their saved and approved literals.

- Contact deletion now runs a declared resumable cascade through contact, alias, source, message, import and blob custody, with atomic restore fences and an address-free completion receipt. Accumulated archive copies are cleared in bounded pages with exact artifact counts. Additive migration 0034 preserves existing product and operator records.
- Erasure preserves secret-keyed opted-out aliases, anonymises audit references, and redacts saved literal rules/content while retaining historical digest identifiers and requiring a new reviewed approval. Reimport, sync and capture cannot use a retained opt-out to become sendable.

- Added a move-in guide for two documented audience-export formats, proven only with synthetic files; generic shared header suggestions preserve every restrictive status column and never treat record creation as consent.
- SendGrid event verification now bounds the stream and verifies its unchanged bytes before strict UTF-8 decoding. Installation docs explain forwarding an existing signed hook without a new slot and distinguish unimplemented Inbound Parse receipt/reply intake from outgoing delivery facts.

- Audience now saves named segments with the existing campaign rule editor and the same live eligibility calculation used by campaign review. Copying a segment into a draft preserves the saved rules independently of later edits or deletion.
- Contact detail offers address search, restrictive channel preview and confirmation before merging. The survivor shows both contacts' history and evidence; old consent links remain usable and queued merged identities are excluded at dispatch. Merge locking also refuses a missing partner without leaving the survivor locked.
- Additive migration 0033 stores segments in the discovered local Base export/restore inventory. Existing migration and vendored Base bytes are preserved.

- One-click unsubscribe now works (MSG-003): `List-Unsubscribe` points at `/unsubscribe/one-click/<token>`, which accepts the RFC 8058 `List-Unsubscribe=One-Click` body as urlencoded or multipart form data and shows the confirmation page on GET. The visible link stays on the `/unsubscribe/<token>` confirmation page, which also accepts the one-click body so mail already prepared with the earlier header URL still unsubscribes.
- The public root is now a hand-illustrated landing page for the newsletter profile: how a letter leaves Mango, consent, approval of the exact letter, scheduling, delivery reports and ownership, with self-hosted Newsreader and Outfit faces, Mango's mango mark in the header, footer and favicons, and the owner's name, description and optional credit in the footer (HOME-001).
- Generic CSV mapping replaces unverified named vendor presets; stored import evidence and restrictive consent/status behavior remain intact.
- Explicit credential recovery preserves verified contact authority and requires private matched backups.
- Maintained authentication, mail, import and operations copies are refreshed; the mail transport update adds validated timeouts without a schema change.
- Responsive operator navigation, linked inline form errors, and keyboard-managed dialogs improve phone use.
- Campaign history shows every step's local send time, outcome and recipient-step disposition counts; state and channel filters show their counts.
- Audience descriptions now derive from the saved structured inclusion and exclusion rules across authoring, review, campaign lists, schedule and snapshots. Legacy approval records remain unchanged.
- One-command local setup uses native development identity, and signup frequency settings persist for future consent disclosures.
- A production build with local credentials present no longer copies the local variable file into `dist/`; the Base build-safety plugin is adopted unchanged from Base `main` at `f3a4eb2`.
- Contact import review supports 50,000 rows across files within the existing request-size limit. Large reviewed plans use Base's public normalised streams; Mango retains exact originals in bounded plan chunks. Public preview/start/resume and destructive capacity evidence remain separate from routine CI and do not claim hosted throughput.
- Release metadata records 0.2.0 and its breaking upgrade steps; public tag production and deployment require their own execution evidence.
- Mango serves first-party operator documentation at `/docs`, rendered from the repository's Markdown when the app is built and shown in the landing's own header, footer and hand-drawn paper style, cookie-free and same-origin; an unknown docs address is a friendly 404 in the same frame (DOCS-001).

## 0.1.0 — newsletter candidate

- Optional commerce, SMS and AI configuration with unavailable states for absent providers.
- Operator-authored newsletters, restricted rich text/HTML, saved previews, managed unsubscribe/postal footer and structured audiences.
- Local scheduling with explicit UTC resolution and rejection of ambiguous or nonexistent wall times.
- Reviewed newsletter contact imports with bounded D1 plans and additive maintained Base chunk custody and lossless spreadsheet-safe CSV exports.
- Hosted signup and embeddable capture with explicit POST confirmation, guarded consent writes, confirmation handoff and durable abuse budgets and an optional validated Turnstile challenge.
- Installation-owned sender receipt connector with paired endpoint and diagnostic mailbox configuration.
- Native Base authentication and invitations with retained audit attribution.
- Exact-revision approval, per-send consent checks and durable SendGrid uncertainty fencing.

This candidate does not certify the wider flagship contract, production operation or live provider-webhook acceptance. See RELEASE.json and ACCEPTANCE.md.

## Contract evidence descriptions retained on 28 October 2026

These descriptions retain the original record; the current Status table and carried-done audit determine status.

### HOME-001

1. (done).
2. The local journey sees the Lobby with Finish setup before sender setup and Sign in after; the run-site build serves the landing.
3. Evidence: `tests/local-start/local.journey.ts` · `src/site/pages.tsx`.

### DOCS-001

1. (done).
2. `tests/docs.spec.ts` builds and serves every published page and fails on unlisted files, broken links and raw HTML.
3. Evidence: `tests/docs.spec.ts`.

### OPER-001

1. (done).
2. Fresh install completes sender setup after native owner sign-in at 1440 and 390; production entry refuses local bootstrap.
3. Evidence: `tests/local-start/local.journey.ts` · `tests/production-entry.spec.ts`.

### OPER-002

1. (done).
2. The invitation journey: fresh email proof, affirmative confirmation, removal with session and link revocation, setup self-only removal.
3. Evidence: `tests/settings-sender/routes.spec.ts` · `src/core/features/auth/service.ts`.

### OPER-003

1. (done).
2. The Author drafts and requests approval; the Manager approves; the Owner obtains fresh native authority and removes both.
3. Their sessions receive 401 and removed_at is set.
4. Campaign, request, approval, revision, transitions and audit records retain attribution through review/detail and activity APIs at 1440/390.
5. Evidence: `tests/go-live/roles.journeys.ts`.

### OPER-003

The Author drafts and requests approval; the Manager approves; the Owner obtains fresh native authority and removes both. Their sessions receive 401 and removed_at is set. Campaign, request, approval, revision, transitions and audit records retain attribution through review/detail and activity APIs at 1440/390.

### OPER-004

1. a route-level journey signs in one operator per role and calls each protected operation (approve, activate, import, export, erase, invite, connect integration, connect sending provider, view unmasked contact), asserting 403 with a named reason exactly where the matrix denies, at 1440 and 390 pixels for the visible controls.

### OPER-005

1. with the policy on, an Author saves a revision and a Manager approves it; the same Manager editing then approving their own revision is refused with `separation-required`.

### OPER-006

1. a journey against a test OIDC issuer and SCIM client at the network edge signs an operator in with a mapped role, deprovisions them, and shows their next request refused and their past approvals still attributed.

### OPER-007

1. a journey performs one of each action, then filters and exports the log and checks every action appears once with actor and time.
2. Activations and pauses of flows (FLOW-008) and agent actions with the agent filter's values (AGENT-010) join this log when those clauses are built; each inherits the obligation in its own text.

### STORE-001

1. (partial).
2. Each connection (INT-001 to INT-006) syncs every declared source type through its edge with source identity and occurrence time; Shopify is proved today.
3. Evidence: `src/core/platform/adapters/shopify.ts` · `tests/shopify/connection.spec.ts`.
4. Evidence: the existing signed carts identity registration in `tests/shopify/connection.spec.ts`, via `tests/store/source-export-proof.ts`, `tests/go-live/built-source-journey.ts`, `tests/go-live/store-source-journey.ts` and `tests/go-live/source-runtime.mjs`, proves every declared type of the built Shopify, WooCommerce and Stripe connections through their network edges and the owner export with source identity, connection and source occurrence time, including one contact retaining both WooCommerce and Stripe records; the existing Stripe Owner Settings proof remains in `tests/go-live/stripe-journey.ts`.

### STORE-002

1. (done).
2. Replayed and resynced Shopify records update one source record each.
3. Evidence: `tests/shopify/connection.spec.ts`.

### STORE-003

1. (done).
2. The native Worker/D1/Queue journey imports each Admin source, retains its last completed sync through a later failed page, shows the failure and unaffected sources on Decision Desk at 1440 and 390, and clears it only on completed recovery.
3. Unstarted sources show no successful sync; authoring keeps provider diagnostics private.
4. Evidence: `tests/go-live/source-freshness.journeys.ts`.

### STORE-004

1. (done).
2. Evidence: `tests/go-live/source-freshness.journeys.ts` — “[STORE-003] [STORE-004] Decision Desk retains each completed sync through a later failed page and recovery”: a failed product sync records its failed operation carrying the adapter error and recovers through Store/Decision Desk at 1440/390; proposal generation refused by the failed source records one failed generation operation carrying the adapter's last error, with no proposal, cost or send; during a Shopify Admin API outage a correctly signed webhook keeps its 401 answer and records exactly one failed webhook operation carrying the adapter error per delivery (a replay adds none, a forged delivery records nothing), and Shopify's retry after recovery ingests the record once and completes the operation; failed-operation text carries no upstream diagnostic, secret, token or record payload; the Store page lists the failed generation and webhook operations at 1440 and 390 with no overflow or accessibility violations; saved draft edits, readable recorded outcomes/history and zero new mail handoffs with a scheduled campaign.
3. `tests/go-live/roles.journeys.ts` — “[PUB-005][FORM-008][FORM-010][INT-004][OPER-003][OPER-004] roles govern native requests and removal retains authors, approvers and history” (via `tests/go-live/stripe-journey.ts`): during a Stripe API outage a correctly signed Stripe event that needs a Stripe read keeps its 422 answer and records exactly one failed webhook operation carrying the adapter error (a replay adds none, a forged event records nothing), and Stripe's retry after recovery ingests it once and completes the operation.
4. `tests/shopify/connection.spec.ts` — “[STORE-004] native authenticated sync imports complete Shopify records and retains original purchase time through nested-page failures and retry” proves failed operation diagnostics and retry.
5. `tests/go-live/stale-sources.journeys.ts` — “[STORE-005] [STORE-006][AUD-003] sources recover only after completed sync and review counts commerce and dormancy exclusions” retains the stored-source gate.
6. Failed webhook and generation operations share the failed-sync operation record; webhooks keep their existing HTTP answers so providers retry them.

### STORE-004

Failed webhook and generation operations share the failed-sync operation record (`source_sync_runs`, operation `webhook` or `generation`); a webhook keeps its existing HTTP answer so the provider retries it.

### STORE-005

1. (done).
2. The native Worker/D1/Queue journey refuses both inclusion-dependent and exclusion-dependent campaigns against aged and failed Shopify data.
3. Counts remain unavailable, approval writes no authority or recipients, and review names the source and safe cause at 1440 and 390.
4. A completed sync and explicit recheck allow the same saved revision to pass its ordinary approval checks.
5. Evidence: `tests/go-live/stale-sources.journeys.ts`.

### STORE-006

1. (done).
2. The native Shopify adapter declares cart and browsing observations unavailable without their installation.
3. Inclusion and exclusion review name the missing source at 1440 and 390, keep counts unknown and refuse approval without authority, snapshots or recipients.
4. The public AI proposal-generation door also names an unsupplied source and saves no campaign or partial audience.
5. Evidence: `tests/go-live/stale-sources.journeys.ts`.

### STORE-007

1. (partial).
2. A webhook source record is readable within 60 seconds of acknowledgment, measured at the stated limits.
3. Evidence: `src/core/features/audience/commerce-webhook-routes.ts`.

### CONT-001

1. (done).
2. Canonical identity on import and capture.
3. Evidence: `tests/move-in/archive.journeys.ts`.

### CONT-002

1. (done).
2. Independent channel states across imports and opt-outs.
3. Evidence: `tests/move-in/held.journeys.ts` · `tests/move-in/archive.journeys.ts`.

### CONT-003

1. (done).
2. Consent evidence fields on capture and import; stale disclosures cannot create evidence.
3. Incumbent-held evidence is proved under CONT-024.
4. Evidence: `tests/audience-import/signup.spec.ts` · `tests/campaign-authoring/import-category.spec.ts`.

### CONT-004

1. (done).
2. Opt-out before acknowledgment; no import, undo or merge lifts it.
3. Evidence: `tests/go-live/go-live.journeys.ts` · `tests/provider-suppression-ingress.spec.ts` · `tests/move-in/held.journeys.ts`.

### CONT-005

1. (done).
2. Resubscription only from new confirmed evidence.
3. Evidence: `tests/provider-suppression-ingress.spec.ts` · `tests/go-live/opt-out-reasons.journeys.ts`.

### CONT-006

1. (done).
2. Hard bounce, complaint and provider suppression before the next hand-off; soft-bounce policy.
3. Evidence: `tests/provider-suppression-ingress.spec.ts` · `tests/go-live/go-live.journeys.ts`.

### CONT-007

1. (partial).
2. Signed SMS replies: STOP family opts out before acknowledgment, HELP and START never subscribe; proved on the Mobile Message adapter, Twilio pending (SMS-001).
3. Evidence: `src/core/features/sms/inbound.ts` · `tests/audience-import/signup.spec.ts`.

### CONT-008

1. the native Worker/D1 contact-history journey shows those categories together at their original occurrence times, including confirmation, approved eligibility, dispatch exclusions, channel hand-offs and provider outcomes.
2. At 1440 and 390 pixels, older events remain reachable, unrelated contacts and private payloads remain absent, and each event retains its source.

### CONT-009

1. (done).
2. Pending until single-use, expiring, POST-only confirmation.
3. Single or double opt-in per form and source is proved under CONT-025.
4. Evidence: `tests/go-live/go-live.journeys.ts` · `tests/audience-import/signup.spec.ts`.

### CONT-010

1. (done).
2. Reviewed CSV import with row outcomes, idempotent reruns and undo.
3. Named-source files with incumbent-held evidence are proved under CONT-024, and review size under SCALE-001.
4. Evidence: `tests/audience-import/routes.spec.ts` · `tests/move-in/archive.journeys.ts`.

### CONT-011

1. (done).
2. Merge keeps the most restrictive state per channel.
3. Evidence: `tests/audience-controls/merge.spec.ts`.

### CONT-012

1. (done).
2. Dormant contacts are labeled and excluded, never deleted; imported clicks, orders and consent changes count at their original times, and a move-in contact without history is `no-history`, not dormant, while a dormant contact with only imported opens is labeled `open-only` (journey under AUD-008).
3. Current evidence: `tests/move-in/archive.journeys.ts` · `tests/go-live/stale-sources.journeys.ts`.
4. Imported clicks use their original times; opens never qualify.
5. The tagged move-in/review journey proves a three-month click eligible, no-history eligible from move-in completion until its window elapses, a thirteen-month click dormant, and an opens-only contact within dormant.
6. The unchanged AUD-003 native journey retains thirteen-month dormancy.
7. Inactivity never changes consent or deletes/suppresses a contact.

### CONT-012

Imported clicks use their original times; opens never qualify. The tagged move-in/review journey proves a three-month click eligible, no-history eligible from move-in completion until its window elapses, a thirteen-month click dormant, and an opens-only contact within dormant. The unchanged AUD-003 native journey retains thirteen-month dormancy. Inactivity never changes consent or deletes/suppresses a contact.

### CONT-013

1. (done).
2. Erasure within five minutes with surviving opt-out hashes.
3. Evidence: `tests/portability.spec.ts` · `tests/audience-import/erasure-merge.spec.ts`.

### CONT-006

- **2026-10-08 local authority clarification (CONT-004/006, OPER-001):** Refreshing local session/setup credentials while retaining D1 preserves the effective contact hash authority, including suppression and surviving opt-out records without contact rows. New local installations record a versioned independent contact salt in `.dev.vars`; missing, empty, unknown-version or unversioned authority fails closed. Explicit conversion of a verified legacy session-key installation retains its original effective session authority before rotating authentication credentials. An upgrade must never select a previously unused secret merely because it exists.

### HOME-001

**HOME-001 — Lobby and public landing** (done). The local journey sees the Lobby with Finish setup before sender setup and Sign in after; the run-site build serves the landing. Evidence: `tests/local-start/local.journey.ts` · `src/site/pages.tsx`.

### DOCS-001

**DOCS-001 — Public documentation** (done). `tests/docs.spec.ts` builds and serves every published page and fails on unlisted files, broken links and raw HTML. Evidence: `tests/docs.spec.ts`.

### OPER-001

**OPER-001 — Operators and the default role** (done). Fresh install completes sender setup after native owner sign-in at 1440 and 390; production entry refuses local bootstrap. Evidence: `tests/local-start/local.journey.ts` · `tests/production-entry.spec.ts`.

### OPER-002

**OPER-002 — Management** (done). The invitation journey: fresh email proof, affirmative confirmation, removal with session and link revocation, setup self-only removal. Evidence: `tests/settings-sender/routes.spec.ts` · `src/core/features/auth/service.ts`.

### OPER-003

**OPER-003 — Removal does not rewrite history** (done). The Author drafts and requests approval; the Manager approves; the Owner obtains fresh native authority and removes both. Their sessions receive 401 and removed_at is set. Campaign, request, approval, revision, transitions and audit records retain attribution through review/detail and activity APIs at 1440/390. Evidence: `tests/go-live/roles.journeys.ts`.

### OPER-004

**OPER-004 — Roles and permissions** (partial). A route-level journey signs in one operator per role and calls each protected operation (approve, activate, import, export, erase, invite, connect integration, connect sending provider, view unmasked contact), asserting 403 with a named reason exactly where the matrix denies, at 1440 and 390 pixels for the visible controls. The six product roles are separate from Base's unchanged owner/admin/member roles; the journey protects the last product Owner from removal or demotion, retains CSV export for Owner/Admin only and proves restored source assignments grant no product authority in the destination installation. Current newsletter-role evidence: `tests/go-live/roles.journeys.ts`; full flow, provider-connection and installation-erasure role journeys remain outstanding, and CSV exports stay Owner/Admin only.

### OPER-005

**OPER-005 — Separation of approval** (missing). With the policy on, an Author saves a revision and a Manager approves it; the same Manager editing then approving their own revision is refused with `separation-required`.

### OPER-006

**OPER-006 — Single sign-on and deprovisioning** (missing). A journey against a test OIDC issuer and SCIM client at the network edge signs an operator in with a mapped role, deprovisions them, and shows their next request refused and their past approvals still attributed.

### OPER-007

**OPER-007 — Activity log** (partial). Gap: actual restore completion must be recorded with actor and time and visible, filterable and exportable in Activity. A journey performs one of each action Mango performs today (drafts saved, approval requests and approvals, pause, resume and cancel, an import, an audience and an account export, a consent hand entry, an opt-out, an erasure, signup-allowance and kiosk-form changes, role changes and an hourly signup-refusal summary), then filters by operator, agent, action, object and date, exports the filtered view as CSV and checks every action appears once with actor and time; an Author is refused on the screen's API; the Activity screen is inspected at 1440 and 390 with axe. FLOW-008 (activations, pauses) and AGENT-010 (agent actions and the agent filter's values) inherit the obligation. Evidence: `tests/go-live/sync-integrations.journeys.ts`.

### STORE-001

**STORE-001 — Store and event connections** (partial). Each connection (INT-001 to INT-006) syncs every declared source type through its edge with source identity and occurrence time; Shopify is proved today. Evidence: `src/core/platform/adapters/shopify.ts` · `tests/shopify/connection.spec.ts`. Evidence: the existing signed carts identity registration in `tests/shopify/connection.spec.ts`, via `tests/store/source-export-proof.ts`, `tests/go-live/built-source-journey.ts`, `tests/go-live/store-source-journey.ts` and `tests/go-live/source-runtime.mjs`, proves every declared type of the built Shopify, WooCommerce and Stripe connections through their network edges and the owner export with source identity, connection and source occurrence time, including one contact retaining both WooCommerce and Stripe records; the existing Stripe Owner Settings proof remains in `tests/go-live/stripe-journey.ts`.

### STORE-002

**STORE-002 — Source identity** (done). Replayed and resynced Shopify records update one source record each. Evidence: `tests/shopify/connection.spec.ts`.

### STORE-003

**STORE-003 — Freshness** (done). The native Worker/D1/Queue journey imports each Admin source, retains its last completed sync through a later failed page, shows the failure and unaffected sources on Decision Desk at 1440 and 390, and clears it only on completed recovery. Unstarted sources show no successful sync; authoring keeps provider diagnostics private. Evidence: `tests/go-live/source-freshness.journeys.ts`.

### STORE-004

**STORE-004 — Source failure** (done). Evidence: `tests/go-live/source-freshness.journeys.ts` — “[STORE-003] [STORE-004] Decision Desk retains each completed sync through a later failed page and recovery”: a failed product sync records its failed operation carrying the adapter error and recovers through Store/Decision Desk at 1440/390; proposal generation refused by the failed source records one failed generation operation carrying the adapter's last error, with no proposal, cost or send; during a Shopify Admin API outage a correctly signed webhook keeps its 401 answer and records exactly one failed webhook operation carrying the adapter error per delivery (a replay adds none, a forged delivery records nothing), and Shopify's retry after recovery ingests the record once and completes the operation; failed-operation text carries no upstream diagnostic, secret, token or record payload; the Store page lists the failed generation and webhook operations at 1440 and 390 with no overflow or accessibility violations; saved draft edits, readable recorded outcomes/history and zero new mail handoffs with a scheduled campaign. `tests/go-live/roles.journeys.ts` — “[PUB-005][FORM-008][FORM-010][INT-004][OPER-003][OPER-004] roles govern native requests and removal retains authors, approvers and history” (via `tests/go-live/stripe-journey.ts`): during a Stripe API outage a correctly signed Stripe event that needs a Stripe read keeps its 422 answer and records exactly one failed webhook operation carrying the adapter error (a replay adds none, a forged event records nothing), and Stripe's retry after recovery ingests it once and completes the operation. `tests/shopify/connection.spec.ts` — “[STORE-004] native authenticated sync imports complete Shopify records and retains original purchase time through nested-page failures and retry” proves failed operation diagnostics and retry. `tests/go-live/stale-sources.journeys.ts` — “[STORE-005] [STORE-006][AUD-003] sources recover only after completed sync and review counts commerce and dormancy exclusions” retains the stored-source gate. Failed webhook and generation operations share the failed-sync operation record; webhooks keep their existing HTTP answers so providers retry them.

### STORE-005

**STORE-005 — Stale sources block approval** (done). The native Worker/D1/Queue journey refuses both inclusion-dependent and exclusion-dependent campaigns against aged and failed Shopify data. Counts remain unavailable, approval writes no authority or recipients, and review names the source and safe cause at 1440 and 390. A completed sync and explicit recheck allow the same saved revision to pass its ordinary approval checks. Evidence: `tests/go-live/stale-sources.journeys.ts`.

### STORE-006

**STORE-006 — Declared adapter capability** (done). The native Shopify adapter declares cart and browsing observations unavailable without their installation. Inclusion and exclusion review name the missing source at 1440 and 390, keep counts unknown and refuse approval without authority, snapshots or recipients. The public AI proposal-generation door also names an unsupplied source and saves no campaign or partial audience. Evidence: `tests/go-live/stale-sources.journeys.ts`.

### STORE-007

**STORE-007 — Ingestion latency** (partial). A webhook source record is readable within 60 seconds of acknowledgment, measured at the stated limits. Evidence: `src/core/features/audience/commerce-webhook-routes.ts`.

### CONT-001

**CONT-001 — Contact identity** (done). Canonical identity on import and capture. Evidence: `tests/move-in/archive.journeys.ts`.

### CONT-002

**CONT-002 — Channel status** (done). Independent channel states across imports and opt-outs. Evidence: `tests/move-in/held.journeys.ts` · `tests/move-in/archive.journeys.ts`.

### CONT-003

**CONT-003 — Consent evidence** (done). Consent evidence fields on capture and import; stale disclosures cannot create evidence. Incumbent-held evidence is proved under CONT-024. Evidence: `tests/audience-import/signup.spec.ts` · `tests/campaign-authoring/import-category.spec.ts`.

### CONT-004

**CONT-004 — Opt-out precedence** (done). Opt-out before acknowledgment; no import, undo or merge lifts it. Evidence: `tests/go-live/go-live.journeys.ts` · `tests/provider-suppression-ingress.spec.ts` · `tests/move-in/held.journeys.ts`.

### CONT-005

**CONT-005 — Resubscription** (done). Resubscription only from new confirmed evidence. Evidence: `tests/provider-suppression-ingress.spec.ts` · `tests/go-live/opt-out-reasons.journeys.ts`.

### CONT-006

**CONT-006 — Email suppression** (done). Hard bounce, complaint and provider suppression before the next hand-off; soft-bounce policy. Evidence: `tests/provider-suppression-ingress.spec.ts` · `tests/go-live/go-live.journeys.ts`.

### CONT-007

**CONT-007 — SMS compliance replies** (partial). Signed SMS replies: STOP family opts out before acknowledgment, HELP and START never subscribe; proved on the Mobile Message adapter, Twilio pending (SMS-001). Evidence: `src/core/features/sms/inbound.ts` · `tests/audience-import/signup.spec.ts`.

### CONT-008

**CONT-008 — Contact history** (done). One time-ordered contact timeline combines original source activity, consent and confirmations, suppressions, approved audience decisions, dispatch exclusions, channel handoffs and provider outcomes, clicks and attributed operator actions. The native Worker/D1 journey proves original times, contact isolation, payload privacy and access to older events at 1440 and 390 pixels. CONT-017’s wider profile obligations remain separate. Evidence: `tests/audience-controls/contact-history.spec.ts`.

### CONT-009

**CONT-009 — Confirmation** (done). Pending until single-use, expiring, POST-only confirmation. Single or double opt-in per form and source is proved under CONT-025. Evidence: `tests/go-live/go-live.journeys.ts` · `tests/audience-import/signup.spec.ts`.

### CONT-010

**CONT-010 — Import** (done). Reviewed CSV import with row outcomes, idempotent reruns and undo. Named-source files with incumbent-held evidence are proved under CONT-024, and review size under SCALE-001. Evidence: `tests/audience-import/routes.spec.ts` · `tests/move-in/archive.journeys.ts`.

### CONT-011

**CONT-011 — Merge** (done). Merge keeps the most restrictive state per channel. Evidence: `tests/audience-controls/merge.spec.ts`.

### CONT-012

**CONT-012 — Dormancy without deletion** (done). Dormant contacts are labeled and excluded, never deleted; imported clicks, orders and consent changes count at their original times, and a move-in contact without history is `no-history`, not dormant, while a dormant contact with only imported opens is labeled `open-only` (journey under AUD-008). Current evidence: `tests/move-in/archive.journeys.ts` · `tests/go-live/stale-sources.journeys.ts`. Imported clicks use their original times; opens never qualify. The tagged move-in/review journey proves a three-month click eligible, no-history eligible from move-in completion until its window elapses, a thirteen-month click dormant, and an opens-only contact within dormant. The unchanged AUD-003 native journey retains thirteen-month dormancy. Inactivity never changes consent or deletes/suppresses a contact.

### CONT-013

**CONT-013 — Erasure and surviving opt-out** (done). Erasure within five minutes with surviving opt-out hashes. Evidence: `tests/portability.spec.ts` · `tests/audience-import/erasure-merge.spec.ts`.

### PROP-001

(done).

Evidence: `tests/proposals-decision/decision-routes.spec.ts`.

### PROP-002

(done).

Evidence: `tests/proposals-decision/decision-routes.spec.ts`.

### PROP-003

(done).

Evidence: `tests/proposals-decision/decision-routes.spec.ts`.

### PROP-004

(done).

Evidence: `tests/proposals-decision/decision-routes.spec.ts`.

### PROP-005

(done).

Evidence: `src/core/features/campaigns/adopt-proposal.ts` · `tests/proposals-decision/decision-routes.spec.ts`.

### PROP-006

(done).

Evidence: `tests/proposals-decision/decision-routes.spec.ts`.

### PROP-007

(done).

Evidence: `tests/proposals-decision/proposal-states.spec.ts`.

### PROP-008

(done).

Evidence: `tests/proposals-decision/decision-routes.spec.ts`.

### PROP-009

(done).

Evidence: `tests/proposals-decision/proposal-states.spec.ts`.

### AUD-001

(done).

Evidence: `tests/audience-controls/segments.spec.ts`.

### AUD-002

(done).

Evidence: `src/core/features/audience/eligibility.ts` · `tests/go-live/delivery.journeys.ts`.

### AUD-003

(done).

Evidence: `tests/go-live/stale-sources.journeys.ts`.

### AUD-004

(done).

Evidence: `src/core/features/audience/eligibility.ts` · `tests/go-live/open-estimates.journeys.ts`.

### AUD-005

(done).

Evidence: `tests/audience-controls/merge.spec.ts` · `tests/go-live/delivery.journeys.ts`.

### AUD-006

(done).

Evidence: `tests/go-live/multistep.journeys.ts`.

### AUD-007

(done).

Evidence: `tests/audience-controls/segments.spec.ts`.

### CAMP-001

(done).

Evidence: `tests/campaign-results/results.journeys.ts`.

### CAMP-002

(done).

Evidence: `tests/campaign-authoring/browser.spec.ts`.

### CAMP-003

(done).

Evidence: `tests/campaign-authoring/browser.spec.ts` · `tests/campaign-authoring/canonical-save.spec.ts`.

### CAMP-004

(done).

Evidence: `tests/campaign-authoring/browser.spec.ts` · `tests/campaign-authoring/create-api.spec.ts`.

### CAMP-005

(done).

Evidence: `tests/campaign-authoring/browser.spec.ts`.

### CAMP-006

(done).

Evidence: `tests/campaign-authoring/browser.spec.ts`.

### CAMP-007

(done).

Evidence: `tests/go-live/delivery.journeys.ts`.

### CAMP-008

(done).

Evidence: `tests/go-live/go-live.journeys.ts`.

### CAMP-009

(done).

Evidence: `tests/campaign-results/results.journeys.ts`.

### CAMP-010

(done).

Evidence: `tests/go-live/scheduler.journeys.ts`.

### CAMP-011

(done).

Evidence: `tests/go-live/scheduler.journeys.ts`.

### CAMP-012

(done).

Evidence: `tests/campaign-assets.spec.ts` · `tests/campaign-authoring/local-images.spec.ts`.

### DESIGN-001

(done).

Evidence: `tests/campaign-authoring/design-generation.spec.ts`.

### DESIGN-002

(done).

Evidence: `tests/campaign-authoring/design-generation.spec.ts`.

### DESIGN-003

(done).

Evidence: `tests/campaign-authoring/design-generation.spec.ts`.

### DESIGN-004

(done).

Evidence: `tests/campaign-authoring/design-import.spec.ts`.

### AUD-003

One Shopify-backed product review lists recent-product-purchase (seven days), unresolved-refund, unresolved-return and dormant (twelve months), each with its count, at 1440/390. Resolved commerce and eleven-month activity stay eligible; thirteen-month activity is dormant. AUD-008 states how an operator turns the dormancy exclusion off for one campaign and retains that switch.

### Design and image evidence

**Evidence and gaps:** local only. Own images are proved on a local `http:` origin (Insert image, save, styled preview loading the image after opt-in, approval naming the HTTPS requirement) and approval of own images is proved with an HTTPS public base URL, both against real local D1 and R2. Hosted serving, image-proxy behavior at the declared rate and real inbox rendering are unverified.

### Design and image evidence

**Evidence and gaps:** proved locally against real D1, R2 and the Worker with the real orchard LayerDoc: import, save, preview, every approval check and exact-revision approval, at 1440px and 390px, with an HTTPS public base URL. After the MSG-012 grammar was tightened (13 October 2026), the orchard design (imported, and built by Design with 12ui against the stand-in 12ui server) renders pixel-identical to the earlier compile at 640px in quirks and standards mode, and at 375px only its two-column sections differ (side by side instead of stacked). On a local review copy (`rer dev`, `http:` origin) the same import compiles with the copy's own image addresses, saves, previews styled and loads its images after opt-in; approval there names the HTTPS requirement (CAMP-012, copies running on a computer). Gmail, Apple Mail and Outlook rendering through CAMP-008 test sends remains a release obligation.

### Design and image evidence

**Evidence and gaps:** plain `fetch` with bearer authentication, idempotency keys, a 1.7 MB multipart upload and binary download were proved from workerd against a local server. The whole flow is proved locally against real workerd, D1, R2 and the local queue with a stand-in 12ui server at the network edge (`tests/campaign-authoring/design-generation.spec.ts`): brief, estimate, background run, candidates appearing and surviving a reload, choice, layout, the import path opening by itself, button destination, unsaved edit, the run kept on offer through Discard changes without a second layout purchase, save as a draft revision recorded as used, with nothing approved or sent; the module switched off; the exact request data, replayed purchases, cost facts, a rate-limit wait shown and resumed with the same key, a spent allowance and a failed layout failing at once, and a deadline. The optional design secrets are proved through Mango's declaration step and the deploy kit's own planning and secret steps against a stand-in provider (`operations/deploy-optional-secrets.test.mjs`). Not proved: a live run against 12ui (no paid request was made), 12ui's acceptance of a draft request without corpus references, a hosted deployment holding the secret, and 12ui's position on a server-held personal key.

### AUD-003

One Shopify-backed product review lists recent-product-purchase (seven days), unresolved-refund, unresolved-return and dormant (twelve months), each with its count, at 1440/390. Resolved commerce and eleven-month activity stay eligible; thirteen-month activity is dormant. AUD-008 states how an operator turns the dormancy exclusion off for one campaign and retains that switch.

### AUD-006

| AUD-006 | Every later step rechecks saved inclusion, custom exclusions and current consent; skipped contacts have a named reason and newly matching contacts stay outside the frozen audience. | in code | `src/core/features/audience/eligibility.ts`, `tests/go-live/multistep.journeys.ts` |

### CAMP-019

| CAMP-019 | Saved-draft email tests show remaining allowance and atomically refuse an over-quota batch before any hand-off. Configured and typed destinations share the default 100 attempted hand-offs per UTC day; uncertainty counts and midnight resets. Restrictions and recorded destination/actor history remain, with typed fields hidden and refused for Authors. Manager/Author email test controls are exercised by the roles journey; the Activity log includes each destination with actor/time, action/object filtering, CSV and erasure redaction at 1440/390. Typed SMS and full role acceptance remain outstanding. | partial | `src/core/features/lifecycle/test-send-allowance.ts`, `src/core/features/lifecycle/test-destinations.ts`, `src/core/features/campaigns/ui/test-send-history.tsx`, `tests/go-live/typed-tests.journeys.ts` |

### AUD-003

| AUD-003 | One Shopify-backed product review lists recent-product-purchase (seven days), unresolved-refund, unresolved-return and dormant (twelve months), each with its count, at 1440/390. Resolved commerce and eleven-month activity stay eligible; thirteen-month activity is dormant. AUD-008 states how an operator turns the dormancy exclusion off for one campaign and retains that switch. | done | `tests/go-live/stale-sources.journeys.ts` |

### MSG-001

- **MSG-001 — Sender identity** (partial). Email identity is proved; per-country registered SMS senders await SMS-001 and SMS-002. Evidence: `src/core/features/settings/sender-validation.ts` · `tests/settings-sender/routes.spec.ts`.

Original Status evidence: `src/core/features/settings/sender-validation.ts` · `tests/settings-sender/routes.spec.ts`

Original Gap: acceptance not yet met: Email identity is proved; per-country registered SMS senders await SMS-001 and SMS-002.

### MSG-002

- **MSG-002 — Email authentication** (done). SPF, DKIM and DMARC alignment gate scheduling. Evidence: `tests/sender-verification/worker.spec.ts`.

Original Status evidence: `tests/sender-verification/worker.spec.ts`

### MSG-003

- **MSG-003 — Email unsubscribe** (done). One-click and visible unsubscribe behave as mail clients send them. Evidence: `tests/go-live/go-live.journeys.ts` · `tests/sender-verification/worker.spec.ts`.

Original Status evidence: `tests/go-live/go-live.journeys.ts` · `tests/sender-verification/worker.spec.ts`

### MSG-004

- **MSG-004 — SMS permission** (partial). SMS eligibility needs subscribed scope and an approved sender; US registration pending. Evidence: `src/core/features/sms/transport-guard.ts`.

Original Status evidence: `src/core/features/sms/transport-guard.ts`

Original Gap: acceptance not yet met: SMS eligibility needs subscribed scope and an approved sender; US registration pending.

### MSG-005

- **MSG-005 — SMS opt-out** (done). On the Mobile Message edge, review of an SMS step for a confirmed SMS contact shows the rendered example with the configured program identity, `Reply STOP to unsubscribe`, the configured frequency disclosure, the help contact and the exact segment count at 1440 and 390. Evidence: `tests/go-live/content-checks.journeys.ts`, `src/core/features/sms/review-preview.ts`.

Original Status evidence: `tests/go-live/content-checks.journeys.ts` · `src/core/features/sms/review-preview.ts` · `src/core/features/sms/content.ts`

Original Gap: On the Mobile Message edge, review of an SMS step for a confirmed SMS contact shows the rendered example with the configured program identity, `Reply STOP to unsubscribe`, the configured frequency disclosure, the help contact and the exact segment count at 1440 and 390. Mobile Message is the proved adapter; Twilio acceptance stays with SMS-008.

### MSG-006

- **MSG-006 — Links** (done). One draft with a malformed link, `http:`, `javascript:`, `data:` and `file:` links, a redirect to an unlisted host, an `http:` image and an HTTPS image on an unlisted host is blocked at review and approval; every blocked link is named with its scheme, fault or host, only unlisted HTTPS hosts offer Allow this host, and `mailto:`/`tel:` links never need it, at 1440 and 390. FLOW-008 and RESULT-005 inherit the rule. Evidence: `tests/go-live/content-checks.journeys.ts`, `src/core/features/campaigns/link-reasons.ts`.

Original Status evidence: `tests/go-live/content-checks.journeys.ts` · `src/core/features/campaigns/link-reasons.ts` · `src/core/features/lifecycle/checks.ts`

Original Gap: One draft carries a malformed link, `http:`, `javascript:`, `data:` and `file:` links, a link whose redirect lands on an unlisted host, an `http:` image and an HTTPS image on an unlisted host, with `mailto:` and `tel:` contact links beside them. Review and approval block it and name every blocked link with the scheme, fault or host that blocks it; only the unlisted HTTPS hosts (the redirect's and the image's) offer Allow this host, never a scheme, at 1440 and 390. Contact links never need it. FLOW-008 (flow activation) and RESULT-005 (tracking) inherit this one rule in their own text.

### MSG-007

- **MSG-007 — Content checks** (done). The native Worker/D1 journey shows advisory and blocking findings, acknowledges only the exact saved advisory, retains its actor and time across reload and replay, invalidates it after an edit, refuses safety-check acknowledgments and still blocks approval until the content is corrected. Review is exercised at 1440 and 390 pixels. Evidence: `tests/go-live/content-checks.journeys.ts`.

Original Status evidence: `tests/go-live/content-checks.journeys.ts`

### MSG-008

- **MSG-008 — Personalization** (done). The native Worker/D1 journey refuses tokens without fallbacks even on an audience where every eligible contact resolves the token, counts eligible fallback recipients rather than token occurrences, excludes pending contacts from those counts and preserves the counts on approval. Names render escaped in HTML and unchanged in text; a contact labeled only by their destination uses the saved fallback. Preview supplies an illustrative value only for `displayName`, the name field available to delivery; `first_name`, `name` and other unavailable properties use their saved fallbacks in preview and provider output. Editor, preview and review are exercised at 1440 and 390 pixels, then the provider payloads are checked. Evidence: `tests/go-live/personalisation.journeys.ts`.

Original Status evidence: `tests/go-live/personalisation.journeys.ts`

### MSG-009

- **MSG-009 — Email body** (done). One parser and checker decide approval, test send and delivery; the size limit is proved under BUILD-012. Evidence: `tests/campaign-authoring/canonical-save.spec.ts`.

Original Status evidence: `tests/campaign-authoring/canonical-save.spec.ts`

### MSG-010

- **MSG-010 — Unsubscribe availability** (done). The native Worker journey measures complete confirmation GET and one-click POST responses below 2 seconds, exhausts one token's shared GET/POST allowance from `seed.json`, and receives 429 without affecting another recipient's token from the same client IP. Confirmation and success pages fit 1440 and 390; both opt-outs prevent already-approved deliveries and survive provider reconciliation. This is a local measured path, not a hosted latency measurement. Evidence: `tests/go-live/opt-out-reasons.journeys.ts`.

Original Status evidence: `tests/go-live/opt-out-reasons.journeys.ts` · `src/core/features/audience/unsubscribe-routes.ts`

### MSG-011

- **MSG-011 — Sending reputation** (done). Complaint and bounce-rate blocks with named figures. Evidence: `tests/go-live/delivery.journeys.ts`.

Original Status evidence: `tests/go-live/delivery.journeys.ts`

### MSG-012

- **MSG-012 — Hidden or deceptive presentation** (done). Hidden or low-contrast text blocks approval. Evidence: `tests/campaign-authoring/canonical-save.spec.ts`.

Original Status evidence: `tests/campaign-authoring/canonical-save.spec.ts`

### MSG-013

- **MSG-013 — Contact links (`mailto:`, `tel:`, `sms:`)** (done). A draft with `mailto:hello@myshop.example?subject=Order%20question`, `tel:+15555550123` and `sms:+15555550123?body=Hi` approves; review lists each decoded, and the delivered HTML and plain text carry each unchanged and unrewritten. `mailto:a@x.example,b@x.example`, `mailto:a@x.example?bcc=c@x.example`, `tel:call-me`, `javascript:alert(1)` and `http://myshop.example` each block with the reason named. The journey exercises the Web, Email, Phone and Text link tool and authored HTML through saved review, exact-revision approval and provider-edge delivery, with no tracked-link or click fact for contact links. Evidence: `tests/go-live/contact-links.journeys.ts`.

Original Status evidence: `tests/go-live/contact-links.journeys.ts`

### MSG-014

- **MSG-014 — Allowed link and image hosts** (partial). Fresh installations expose deployment, conservative social defaults and genuine configured connection hosts with source labels; operator removal is durable across a real catalog sync. The existing exact/wildcard, deceptive-suffix, review allowance and audit assertions remain. Evidence: `tests/go-live/content-checks.journeys.ts` / `tests/go-live/content-hosts.ts` (1440 and 390), `tests/portability.spec.ts` (populated upgrade, exclusion restore). Gap: Shopify storefront/additional/image host data is not stored; product/social blocks, brand kit, flow activation and Shopify disconnect remain unproved. Existing explicit policies are preserved. The store-owned editor help about subdomains needs its owner's correction; approval of the closed social vocabulary is pending. No real provider call or consent was used.

Original Status evidence: `tests/go-live/content-checks.journeys.ts` — [MSG-014] content checks and allowed sources; `tests/go-live/content-hosts.ts` — blockedHostJourney (1440 and 390); `tests/portability.spec.ts` — complete native archive

Original Gap: Fresh installations list deployment, conservative social defaults and genuine configured connection hosts with sources. Exact and explicit wildcard matching stays shared; durable operator removals survive catalog sync, review allowances retain source/operator/campaign, and source changes are audited. Existing explicit policies remain explicit. Acceptance remains unmet: Shopify does not store primary/additional storefront or catalog image domains; product/social blocks (BUILD-001), brand kit (BUILD-003), Shopify disconnect and flow activation are absent. The existing store-owned editor help incorrectly describes implicit subdomain matching and is not changed in this writer. Social vocabulary approval is pending.

### MSG-015

- **MSG-015 — Allow a blocked host from review** (done). Review names each blocked host and its links, including redirect hosts. Authors see no allow action and receive 403; a Manager allows a host, the stored list appends it, checks rerun and approval passes. The append-only row names operator, host and campaign through Owner/Admin GET /api/activity, newest first with operator/action/object filters. An imported Mailchimp template lists three outside hosts with allow actions at 1440/390. Exact and explicit wildcard matching agree across approval, inspection and tracking; deceptive suffixes remain blocked. OPER-007 inherits the full cross-product screen, CSV and every action type (ct pattern 2, c4 authorized default). Evidence: `tests/go-live/content-checks.journeys.ts`.

Original Status evidence: `tests/go-live/content-checks.journeys.ts`

Original Gap: Review names each blocked host and its links, including redirect hosts. Authors see no allow action and receive 403; a Manager allows a host, the stored list appends it, checks rerun and approval passes. The append-only row names operator, host and campaign through Owner/Admin GET /api/activity, newest first with operator/action/object filters. An imported Mailchimp template lists three outside hosts with allow actions at 1440/390. Exact and explicit wildcard matching agree across approval, inspection and tracking; deceptive suffixes remain blocked. OPER-007 inherits the full cross-product screen, CSV and every action type (ct pattern 2, c4 authorized default).

### SEND-001

- **SEND-001 — Provider hand-off** (done). Hand-off fencing and idempotency. Evidence: `tests/go-live/managed-mail.journeys.ts` · `tests/go-live/resend-delivery.journeys.ts`.

Original Status evidence: `tests/go-live/managed-mail.journeys.ts` · `tests/go-live/resend-delivery.journeys.ts`

### SEND-002

- **SEND-002 — Quiet hours** (partial). Recipient-local SMS windows; US defaults in SMS-003. Evidence: `src/core/features/sms/policy.ts`.

Original Status evidence: `src/core/features/sms/policy.ts`

Original Gap: acceptance not yet met: Recipient-local SMS windows; US defaults in SMS-003.

### SEND-003

- **SEND-003 — Throttling and progress** (done). Paced hand-offs with live progress. Evidence: `tests/go-live/delivery.journeys.ts`.

Original Status evidence: `tests/go-live/delivery.journeys.ts`

### SEND-004

- **SEND-004 — Transport failure** (done). Increasing retries within the hour and terminal reasons. Evidence: `tests/go-live/delivery-recovery.journeys.ts` · `tests/go-live/delivery.journeys.ts`.

Original Status evidence: `tests/go-live/delivery-recovery.journeys.ts` · `tests/go-live/delivery.journeys.ts`

### SEND-005

- **SEND-005 — Provider-event identity** (done). Signed provider facts stored once. Evidence: `tests/go-live/go-live.journeys.ts` · `tests/go-live/delivery-recovery.journeys.ts`.

Original Status evidence: `tests/go-live/go-live.journeys.ts` · `tests/go-live/delivery-recovery.journeys.ts`

### SEND-006

- **SEND-006 — Delivery truth** (done). Delivered only from a provider delivery fact. Evidence: `tests/go-live/go-live.journeys.ts` · `tests/go-live/scheduler.journeys.ts`.

Original Status evidence: `tests/go-live/go-live.journeys.ts` · `tests/go-live/scheduler.journeys.ts`

### SEND-007

- **SEND-007 — Partial completion** (done). Completion needs terminal dispositions; totals stay separate. Evidence: `tests/go-live/go-live.journeys.ts` · `tests/campaign-results/results.journeys.ts`.

Original Status evidence: `tests/go-live/go-live.journeys.ts` · `tests/campaign-results/results.journeys.ts`

### SEND-008

- **SEND-008 — Resumable dispatch and reconciliation** (done). Resumable dispatch and reconciliation. Evidence: `tests/go-live/go-live.journeys.ts` · `tests/go-live/resend-delivery.journeys.ts`.

Original Status evidence: `tests/go-live/go-live.journeys.ts` · `tests/go-live/resend-delivery.journeys.ts`

### SEND-009

- **SEND-009 — Provider outage** (done). Outage pause and probe-driven resume. Evidence: `src/core/features/lifecycle/provider-outages.ts` · `tests/go-live/delivery-recovery.journeys.ts`.

Original Status evidence: `src/core/features/lifecycle/provider-outages.ts` · `tests/go-live/delivery-recovery.journeys.ts`

### RESULT-001

- **RESULT-001 — Campaign history** (done). Campaign history by state and channel. Evidence: `tests/campaign-results/results.journeys.ts`.

Original Status evidence: `tests/campaign-results/results.journeys.ts`

### RESULT-002

- **RESULT-002 — Engagement** (done). Opens off by default and labeled estimates when enabled. Evidence: `tests/go-live/open-estimates.journeys.ts`.

Original Status evidence: `tests/go-live/open-estimates.journeys.ts`

### RESULT-003

- **RESULT-003 — Attribution** (done). Evidence: `tests/campaign-results/performance.journeys.ts` — “[REPORT-002] [RESULT-005][RESULT-003][REPORT-003] campaign filters, exact CSV rows and optional open estimates at 1440; native commerce and cross-channel attribution at 1440 and 390” (via `tests/campaign-results/performance-fixture.ts`: signed Shopify orders, latest qualifying click across two campaigns, webhook replay and later sync without duplicate or moved attribution, expired/scanner-only/no-click exclusions, partial/full refunds and cancellation in USD/JPY, API/CSV/Insights net amounts and the existing campaign-results drill-down naming each Shopify order and seven-day window separately from forecasts; 1440/390 overflow and axe checks).

Original Status evidence: `tests/campaign-results/performance.journeys.ts` — “[REPORT-002] [RESULT-005][RESULT-003][REPORT-003] campaign filters, exact CSV rows and optional open estimates at 1440; native commerce and cross-channel attribution at 1440 and 390” (via `tests/campaign-results/performance-fixture.ts`: signed Shopify orders, latest qualifying click across two campaigns, webhook replay and later sync without duplicate or moved attribution, expired/scanner-only/no-click exclusions, partial/full refunds and cancellation in USD/JPY, API/CSV/Insights net amounts and the existing campaign-results drill-down naming each Shopify order and seven-day window separately from forecasts; 1440/390 overflow and axe checks).

### RESULT-004

- **RESULT-004 — Cost** (done). Provider and AI costs by campaign and UTC day. Evidence: `tests/campaign-results/costs.journeys.ts`.

Original Status evidence: `tests/campaign-results/costs.journeys.ts`

### RESULT-005

- **RESULT-005 — Link tracking** (done). Evidence: `tests/campaign-results/performance.journeys.ts` — “[REPORT-002] [RESULT-005][RESULT-003][REPORT-003] campaign filters, exact CSV rows and optional open estimates at 1440; native commerce and cross-channel attribution at 1440 and 390” (via `tests/campaign-results/tracking-journey.ts`: actual per-recipient-step links without recipient/campaign/revision identity, exact connected-store redirect with no cookie or body, retained scanner excluded from totals/unique clicks/click map/CSV/attribution, the same delivered link still forwarding exactly with no cookie or body after its click-recording window (30 days after send-by) closes, while recording nothing for a person or a scanner, “mailto:”, “tel:” and “sms:” links in the same tracked message delivered byte for byte with no redirect and zero clicks in the API, CSV and click map, and the operator tracking-off control through delivery and destination request). `tests/go-live/contact-links.journeys.ts` — “[DELIV-002][MSG-013][RESULT-005] contact links survive authoring, exact approval and delivery without tracking” proves the same contact links through the link tool and approval with tracking off. `tests/go-live/open-estimates.journeys.ts` — “[RESULT-002][CONT-013] explicit open estimates are isolated, revocable, replay safe and erased” retains the 13 October policy. CONT-018 owns its unbuilt click token, which this redirect consumes; until it is built these redirects add nothing.

Original Status evidence: `tests/campaign-results/performance.journeys.ts` — “[REPORT-002] [RESULT-005][RESULT-003][REPORT-003] campaign filters, exact CSV rows and optional open estimates at 1440; native commerce and cross-channel attribution at 1440 and 390” (via `tests/campaign-results/tracking-journey.ts`: actual per-recipient-step links without recipient/campaign/revision identity, exact connected-store redirect with no cookie or body, retained scanner excluded from totals/unique clicks/click map/CSV/attribution, the same delivered link still forwarding exactly with no cookie or body after its click-recording window (30 days after send-by) closes, while recording nothing for a person or a scanner, “mailto:”, “tel:” and “sms:” links in the same tracked message delivered byte for byte with no redirect and zero clicks in the API, CSV and click map, and the operator tracking-off control through delivery and destination request). `tests/go-live/contact-links.journeys.ts` — “[DELIV-002][MSG-013][RESULT-005] contact links survive authoring, exact approval and delivery without tracking” proves the same contact links through the link tool and approval with tracking off. `tests/go-live/open-estimates.journeys.ts` — “[RESULT-002][CONT-013] explicit open estimates are isolated, revocable, replay safe and erased” retains the 13 October policy. CONT-018 owns its unbuilt click token, which this redirect consumes; until it is built these redirects add nothing.

### RESULT-006

- **RESULT-006 — Deliverability reporting** (partial). Per-domain rates shown; SMS sender rates await SMS-001. Evidence: `src/core/features/insights/ui/sender-rates.tsx` · `tests/go-live/delivery.journeys.ts`.

Original Status evidence: `src/core/features/insights/ui/sender-rates.tsx` · `tests/go-live/delivery.journeys.ts`

Original Gap: acceptance not yet met: Per-domain rates shown; SMS sender rates await SMS-001.

### RESULT-007

- **RESULT-007 — Click map, per-link clicks and clicker lists** (partial). A seeded send has three links; some recipients click one link twice, and a known scanner requests every link. The report shows each link's total and unique clicks, with the scanner excluded. One link's clicker list equals the seeded clickers and exports as CSV with the same rows, and a segment started from it holds exactly those contacts. Evidence: `tests/campaign-results/results.journeys.ts` · `tests/campaign-results/reporting-journey.ts`. Current scope and remaining work: Campaign links show human totals, unique identified clickers, automated requests, a saved-revision click map, matching clicker CSV and exact saved ID cohorts. Gap: repeated positions with one destination share counts; legacy clicks without destination identity remain unassigned; erased click facts are removed rather than retained as anonymous link counts; campaign-wide unique rollups, flow reports and role masking are absent; very large saved cohorts require CSV.

Original Status evidence: `tests/campaign-results/results.journeys.ts`, `tests/campaign-results/reporting-journey.ts`

Original Gap: Campaign links show human totals, unique identified clickers, automated requests, a saved-revision click map, matching clicker CSV and exact saved ID cohorts. Gap: repeated positions with one destination share counts; legacy clicks without destination identity remain unassigned; erased click facts are removed rather than retained as anonymous link counts; campaign-wide unique rollups, flow reports and role masking are absent; very large saved cohorts require CSV.

### RESULT-008

- **RESULT-008 — Recipients per outcome** (partial). Message-bound visible link, RFC 8058 one-click and authenticated SMS marketing reply retain their method and first time. Replays do not change attribution. The recipient list and CSV agree, and actual erasure keeps anonymous unsubscribe counts equal to campaign performance. Historical methods remain unrecorded. Evidence: `tests/campaign-results/performance.journeys.ts`, `tests/campaign-results/recipient-method-journey.ts` (1440 and 390), `tests/campaign-results/results.journeys.ts`, `tests/portability.spec.ts` (populated upgrade and restore). Gap: flow messages, role masking and very large saved cohorts beyond CSV. No real provider call or consent was used.

Original Status evidence: `tests/campaign-results/performance.journeys.ts` — [RESULT-008] native commerce and cross-channel attribution; `tests/campaign-results/recipient-method-journey.ts` — link/one-click/signed reply, replay, CSV, 1440 and 390, actual erasure; `tests/campaign-results/results.journeys.ts` — recipient outcomes and totals; `tests/portability.spec.ts` — populated unsubscribe upgrade and restore

Original Gap: Message-bound link, one-click and signed SMS reply methods are retained with their first recorded time, shown in the recipient list and CSV and preserved as anonymous counts after erasure. Historical methods remain unknown. Flow messages and role masking remain absent; very large saved cohorts require CSV.

### DATA-001

- **DATA-001 — Export contents** (done). Complete export and restore into an empty installation. Evidence: `tests/portability.spec.ts` · `tests/go-live/go-live.journeys.ts` · `tests/local-start/command-data.journey.ts`.

Original Status evidence: `tests/portability.spec.ts` · `tests/go-live/go-live.journeys.ts` · `tests/local-start/command-data.journey.ts`

### MGMT-001

- **MGMT-001 — Signed first-owner admission** (partial). Signed first-owner admission once per installation; hosted proof pending. Evidence: `src/core/features/auth/owner-claim.ts`.

Original Status evidence: `src/core/features/auth/owner-claim.ts`

Original Gap: acceptance not yet met: Signed first-owner admission once per installation; hosted proof pending.

### MGMT-002

- **MGMT-002 — Native owner editor** (done). The native owner editor mounts for the native owner only. Product authority follows OPER-004's six roles separately from Base's unchanged owner/admin/member roles, with last-product-Owner protection, destination-owned authority on restore and CSV export restricted to Owner/Admin. Evidence: `tests/local-start/editor.journey.ts`.

Original Status evidence: `tests/local-start/editor.journey.ts`

### SCALE-001

1. a generated installation of 250,000 contacts with a year of order and activity events passes the MOVE-012 move-in, an exact review count within 60 seconds, a complete hand-off to the provider edge at the declared rate with no duplicate (SEND-001), and a segment update within SEG-002's time, with wall time and peak memory recorded against `seed.json → limits`.
2. The intake floor is proved by FORM-008's volume journey.

### REPORT-001

1. with a seeded month of sends, orders and holdout data, each figure on the page matches the underlying records and the incremental figure is labeled separately from attribution.

### REPORT-002

1. the CSV export of the table equals the on-screen rows for the same filter; with open estimates on, the estimated open-rate column appears on screen and in the CSV labeled as an estimate, and is absent with them off.

### REPORT-003

1. an order following an SMS click and an earlier email click is attributed once, to the most recent qualifying click; changing the window to one day recalculates the report.

### REPORT-004

1. on a seeded order history, the cohort table and repeat-purchase rate match an independent calculation.

### REPORT-005

1. growth by source over a seeded period from migration 0073 onward sums to the change in subscribed contacts, and each source links to its consent text version.
2. The period includes captures and confirmations, resubscribes counted separately, unsubscriptions, suppression and removal, across forms, landing pages, kiosk forms, imports and integrations.
3. Opening membership plus the recorded deltas equals closing membership.
4. Deleted, erased or merged membership history recorded before migration 0073 cannot be reconstructed and is not claimed; retained earlier consent evidence is labeled without inferred membership changes.
5. Anonymous counts survive erasure while the erased evidence links do not.

### REPORT-006

1. a weekly scheduled report is delivered once at its time through the mail edge with the same figures as the saved report.

### REPORT-007

1. `tests/campaign-results/costs.journeys.ts` for campaign and day totals; a flow's costs appear under that flow.

### MOVE-001

1. `tests/move-in/archive.journeys.ts` runs on synthetic exports, extended with checked-in Mailchimp-format fixtures for a saved segment with a campaign-activity condition, a classic automation, a `granular_activity` file, two overlapping audiences with conflicting statuses and a template with merge tags and a `<style>` block.
2. Each fixture shows its expected lines in the reconciliation report (MOVE-007 to MOVE-011).
3. The CONT-024 subscribed-file fixture and the MOVE-012 full-scale export run through the same journey.
4. The same journey also runs on one real, owner-supplied Mailchimp export with its reconciliation report.

### MOVE-002

1. an edge journey against a Klaviyo API fixture imports profiles with consent, a segment definition and an abandoned-cart flow as a draft with its unsupported steps listed.

### MOVE-003

1. an API fixture import keeps an unsubscribed contact unsubscribed and produces a draft flow for a seeded automation.

### MOVE-004

1. the move-in journey's Kit-format synthetic files (`docs/moving-in.md`) keep every restrictive state, plus a sequence fixture becomes a draft sequence.

### MOVE-005

1. one synthetic export per product imports with every unsubscribed or suppressed row restricted.

### MOVE-006

1. after a move-in, the report's counts reconcile to the files and contact table, and no campaign or flow is scheduled or live.

### MOVE-007

1. a Mailchimp API fixture has two saved segments.
2. One, "clicked campaign X and engagement is often", is recreated as a draft segment whose membership over the imported history equals the fixture's expected members.
3. The other has an unsupported condition, which is named in the segment and the report.

### MOVE-008

1. a Mailchimp API fixture with one classic two-email welcome automation yields a draft flow with both emails' converted content and named delays.
2. A journey fixture whose two emails name an abandoned-cart journey yields an abandoned-cart draft flow with those emails, and a report line names its unreadable branch.
3. Neither flow is live.

### MOVE-009

1. a `granular_activity` fixture with clicks and opens for three contacts and one unknown address imports one click or open fact per row on the right contacts at their original times.
2. The reconciliation report counts imported and dropped rows, the contacts' timelines show the facts as imported, and no campaign result figure changes.

### MOVE-010

1. a fixture has two audiences that share addresses: one address subscribed in A and unsubscribed in B, one cleaned in B, and one with a different first name in each.
2. Each address becomes one contact.
3. The first is subscribed to topic A and unsubscribed from topic B, the cleaned one is suppressed on email, and the first-name conflict is listed.
4. The report counts each audience and their overlap.

### MOVE-011

1. a Mailchimp template fixture contains `*|FNAME|*`, `*|UNSUB|*`, `*|LIST:ADDRESS|*`, `*|ARCHIVE|*`, an unknown `*|FOO|*`, and a `<style>` block with class rules, a `display: none` rule and a media query.
2. It becomes a template whose tokens resolve in preview and whose inlined colors and sizes match the source.
3. Its report names the unknown tag, the dropped `display: none` rule and the mapped mobile rule.
4. The template passes the checker apart from the unknown-tag block.
5. A second fixture with links to three outside hosts lists them in its report and in the reconciliation report, and a campaign built from it reaches review with the three hosts and their allow actions (MSG-015).
6. Mailchimp's `base_boxed_3column_query.html` blueprint, filled with fixture content, converts to a template whose report states its sent size, and it starts a draft that saves and reaches approval (BUILD-012).
7. A fixture inflated past the limit is listed with its size as a held conversion, not dropped.
8. A fixture whose footer is `#999999` on white converts with that text at `#767676`, listed in its report, and passes the checker.

### MOVE-012

1. a generated Mailchimp account export with 250,000 contacts across the subscribed, unsubscribed, non-subscribed and cleaned files and 52 weekly campaigns with `granular_activity` moves in through the journey.
2. It is interrupted once by a forced worker restart during the activity import and resumes to completion with no re-upload.
3. Its reconciliation report adds up per file, evidence kind and activity rows.
4. A campaign to the whole subscribed audience then reaches review with an eligible count equal to an independent count over the generated files.
5. The run records its wall time and peak memory.
6. A generated API-pull fixture of the same size completes the same way.

### MOVE-013

1. after a Mailchimp API-fixture move-in, the Mailchimp edge emits three webhook events: an unsubscribe for contact A, a cleaned event for B and a subscribe for new address C.   - A Mango campaign approved and dispatched straight afterwards excludes A as `unsubscribed` and B as `suppressed`.
2. C is subscribed with incumbent-held evidence and enters the live welcome flow.   - With the webhooks dropped, the same three changes made at the edge are applied by the 15-minute re-pull before the next dispatch.
3. An event sent to a URL with the wrong secret changes nothing.   - An unsubscribe from a Mango email appears as an unsubscribed member at the Mailchimp edge.
4. A forced edge failure shows the write-back retried and then failed on the move-in page.   - Marking the cutover complete deletes the webhooks at the edge, and a later Mailchimp event changes nothing in Mango.   - An export-only move-in shows the approval advisory once the imported history holds a send after the import.   - A Klaviyo API fixture and a Kit webhook fixture each carry one unsubscribe in and one write-back out.

### MOVE-014

1. a Mailchimp account-export fixture with three gallery images used by a template and a campaign moves in, and every image source is rewritten to `/media/`, serving the same bytes.
2. An API-fixture template's image is fetched from the edge and re-hosted the same way.
3. An image the edge answers 404 for is listed as failed and blocks the cutover checklist item until replaced, and the checklist names the template using it.

### MOVE-015

1. a Mailchimp API fixture at the network edge with email activity for three contacts across two sent campaigns and one unknown address imports one click or open fact per activity on the right contacts at their original times, with MOVE-009's reconciliation, timeline and no-result-change checks; each other incumbent's fixture, where its export or API carries engagement, does the same; and the imported-history acceptance of CONT-020, SEG-005, SEG-006 and EXP-006 passes.
2. Provider acceptance repeats the API-key import with a real Mailchimp account.

### MOBILE-001

1. the representative-pages journey (`tests/newsletter-ui/representative-pages.journeys.ts`) extended to every operator page at 390 pixels with axe and overflow checks.

### MOBILE-002

1. an app test against a test installation signs in, approves a revision with the same checks the web app shows, receives an outage alert from the push edge, and a role without approval rights sees no approve control and is refused by the server.

### PUB-001

1. publishing a sent campaign creates a page and feed item with no recipient token or personal value.

### PUB-002

1. a Stripe test-mode checkout journey subscribes a reader to the paid topic, a paid-only campaign reaches them and not free readers, and a cancellation webhook moves them back.

### PUB-003

1. ticking a partner at signup posts to the partner's signup edge with the consent text and records one recommendation.

### PUB-004

1. a booked slot inserts the sponsor block into that issue's draft, and the sponsor report lists the issue's tracked clicks.

### PUB-005

1. a first-time payer completes checkout from the page, appears as “paid, consent missing”, receives one confirmation at the mail edge and, after confirming, the next paid-only send; an unsubscribed payer stays unsubscribed until their own confirmation.

## Capability inventory retained from 28 October 2026

# Mango claims → code

This inventory records Mango’s scoped integration and daily-use capabilities against the code in this repository. The wider product requirements and their acceptance status remain in CONTRACT.md and ACCEPTANCE.md.

**Totals: 44 claims · 44 in code.**

## Mango integration claims

These rows describe the scoped integration delivered in Mango. The broader target clauses retain their own partial status in CONTRACT.md.

| Row | Claim | Status | Evidence |
| --- | --- | --- | --- |
| M1 | An owner can create a named credential with selected scopes, copy it once, inspect activity and revoke it; it cannot sign in as an operator. | in code | `src/core/features/integrations/credentials.ts`, `src/core/features/integrations/routes.ts`, `src/core/features/store/ui/settings-integrations.tsx`, `tests/go-live/sync-integrations.journeys.ts` |
| M2 | A scoped client upserts by normalized email, keeps fields/tags in a saved list, records consent source and cannot lift an opt-out. | in code | `src/core/features/integrations/contacts.ts`, `tests/go-live/sync-integrations.journeys.ts` |
| M3 | A no-email suppression blocks an approved send at handoff; unsubscribe, bounce and complaint events have replayable cursors. | in code | `migrations/core/0069_scoped_integrations.sql`, `src/core/features/integrations/service.ts`, `tests/go-live/sync-integrations.journeys.ts` |
| M4 | One integrator page explains credentials, contact sync, suppression, event replay and approved-segment sending with curl examples. | in code | `docs/integrations.md`, `docs/site.json` |
| M5 | RER Managed integration provider calls say “not available yet”; self-hosted approved-segment dispatch retains ordinary sender and consent gates. | in code | `src/core/features/integrations/service.ts`, `scripts/installer/deploy-declaration.mjs`, `docs/integrations.md`, `tests/go-live/sync-integrations.journeys.ts` |

## Mango daily-use claims

| Clause | Claim | Status | Evidence |
| --- | --- | --- | --- |
| MSG-013 | Operators insert Web, Email, Phone and Text links, inspect decoded contact destinations in review, and deliver contact links unchanged without click tracking. Invalid contact destinations block approval; images remain HTTPS-only. | in code | `src/core/features/campaigns/contact-links.ts`, `src/core/features/campaigns/ui/message-link-tool.tsx`, `tests/go-live/contact-links.journeys.ts` |
| AUD-006 | Every later step rechecks saved inclusion, custom exclusions and current consent; skipped contacts have a named reason and newly matching contacts stay outside the frozen audience. | in code | `src/core/features/audience/eligibility.ts`, `tests/go-live/multistep.journeys.ts` |
| PUB-001 | Operators publish sent email revisions as neutral public issues, with an archive index, RSS, search metadata and withdrawal. Draft and unsent campaigns cannot publish; recipient personalisation, unsubscribe links, tracked redirects and remote images do not enter the public copy. | in code | `src/core/features/archive/`, `tests/campaign-results/archive.journeys.ts`, `tests/audience-import/erasure.spec.ts` |
| DELIV-005 | Insights groups signed delivered, bounced and complained outcomes and human clicks by the mailbox domain recorded for each send, with six bounce categories. Replays do not add counts, scanners are excluded, custom domains stay Other and missing historical diagnostics are labelled. | in code | `src/core/features/insights/mailbox-report.ts`, `src/core/features/insights/mailbox-taxonomy.ts`, `tests/go-live/mailbox-provider.journeys.ts` |
| MSG-007 | Review distinguishes advisory findings from blockers. Acknowledgements record the operator and time for the exact saved revision, survive replay and reload, and never bypass safety checks; changed content needs a new acknowledgement. | done | `src/core/features/lifecycle/advisory-acknowledgements.ts`, `src/core/features/campaigns/ui/approval-check-list.tsx`, `tests/go-live/content-checks.journeys.ts` |
| MSG-008 | Review counts eligible contacts using fallback text, invalid tokens block approval, and escaped names and saved fallbacks reach the provider. Destination-only display labels do not substitute for names; preview uses the same supported fields and fallbacks. | done | `src/core/features/audience/contact-personalisation.ts`, `src/core/features/campaigns/message-content.ts`, `tests/go-live/personalisation.journeys.ts` |
| STORE-003 | Decision Desk shows every source’s last successful sync and later failure, retains the completion through partial-page failure, and marks it fresh only after recovery completes. Unstarted sources are visible and operational diagnostics stay on Store. | done | `src/core/features/campaigns/ui/source-freshness.tsx`, `src/core/features/store/service.ts`, `tests/go-live/source-freshness.journeys.ts` |
| STORE-005 | Campaign inclusion and exclusion rules cannot approve against stale or failed sources. Review names the safe cause with a sync link and recheck; unavailable counts stay unknown, and completed recovery still needs ordinary exact-revision approval. | done | `src/core/features/audience/eligibility.ts`, `src/core/features/lifecycle/evaluate-approval.ts`, `src/core/features/campaigns/ui/campaign-review.tsx`, `tests/go-live/stale-sources.journeys.ts` |
| STORE-006 | An unsupplied source makes inclusion, exclusion and generated proposal audiences unavailable. Review names the missing source, counts stay unknown and no partial audience or approval authority is saved. | done | `tests/go-live/stale-sources.journeys.ts`, `src/core/features/campaigns/authoring-service.ts`, `src/core/features/lifecycle/approval.ts` |
| MSG-010 | The measured local unsubscribe confirmation and one-click paths answer within 2 seconds. Requests consume only their token's allowance; an exhausted token returns 429 while another token from the same IP still works. | done | `tests/go-live/opt-out-reasons.journeys.ts`, `src/core/features/audience/unsubscribe-routes.ts` |
| BUILD-012 | Newsletter saves measure UTF-8 sent-size bounds and retain oversize edits; approval, test send and actual delivery enforce the per-part limit. Full builder, product, flow and imported-blueprint acceptance remain outstanding. | partial | `src/core/features/campaigns/email-size.ts`, `src/core/features/campaigns/saved-email-size.ts`, `tests/go-live/email-size.journeys.ts` |
| BUILD-008 | Saved-contact previews use the same name and fallbacks as delivery in desktop, mobile, dark approximation and plain text. Located content and size advisories retain exact-revision acknowledgements; safety blockers remain mandatory. | done | `src/core/features/campaigns/email-advisories.ts`, `src/core/features/campaigns/ui/revision-previews.tsx`, `tests/go-live/presend-checks.journeys.ts`, `tests/go-live/email-size.journeys.ts` |
| CAMP-019 | Saved-draft email tests show remaining allowance and atomically refuse an over-quota batch before any hand-off. Configured and typed destinations share the default 100 attempted hand-offs per UTC day; uncertainty counts and midnight resets. Restrictions and recorded destination/actor history remain, with typed fields hidden and refused for Authors. Manager/Author email test controls are exercised by the roles journey; the Activity log includes each destination with actor/time, action/object filtering, CSV and erasure redaction at 1440/390. Typed SMS and full role acceptance remain outstanding. | partial | `src/core/features/lifecycle/test-send-allowance.ts`, `src/core/features/lifecycle/test-destinations.ts`, `src/core/features/campaigns/ui/test-send-history.tsx`, `tests/go-live/typed-tests.journeys.ts` |
| REPORT-005 | Daily subscribed-membership totals reconcile with source/version disclosures, confirmed hosted/embed/kiosk captures and anonymous counts after erasure. Upgrade recovers retained pre-baseline consent facts as labelled evidence without inventing historical membership. The history requirement starts at migration 0073; hosted/kiosk confirmed public resubscriptions are counted separately. Popup/landing attribution and full incentive/topic/flow and erasure-expiry resubscribe acceptance remain outstanding. | partial | `src/core/features/insights/list-growth.ts`, `migrations/core/0074_list_growth_retained_history.sql`, `tests/go-live/list-growth.journeys.ts`, `tests/go-live/resubscribe.journeys.ts` |
| FORM-009 | A shared tablet uses the marked hosted kiosk, resets blank after success, requires a fresh challenge for each visitor, accepts 300 signups/hour from one network and retains device-labelled consent and marking audits. Ordinary intake limits remain; kiosk resubscription uses the same confirmed-only path and destination allowance as the hosted form. | done | `tests/go-live/shared-kiosk.journeys.ts`, `src/core/features/audience/ui/kiosk-signup-page.tsx`, `migrations/core/0075_kiosk_forms.sql` |
| OPER-004 | Six assigned roles enforce current newsletter operations on the server, with immediate request checks, masked Analyst/Support contacts, Owner-controlled unmasking, Author approval requests and configured tests, Manager typed tests/approval, Support restrictions and recorded changes. Full flow/provider/installation-erasure acceptance and masked CSV export remain open. | partial | `tests/go-live/roles.journeys.ts`, `src/core/features/auth/permissions.ts`, `migrations/core/0076_operator_product_roles.sql` |
| CONT-027 | A past unsubscriber requests confirmation through the hosted or kiosk form, remains restricted until recipient POST and then subscribes with new evidence and history. All destination states receive the generic acknowledgment; the fourth daily confirmation reservation sends no mail. Hard bounces, complaints and owner/unknown suppressions never dispatch. Popup/incentive/topic/flow and erasure-expiry requirements remain open. | partial | `tests/go-live/resubscribe.journeys.ts`, `src/core/features/audience/public-capture-writer.ts`, `src/core/features/audience/confirmation-handoff.ts` |
| OPER-003 | The Author drafts and requests approval; the Manager approves; the Owner obtains fresh native authority and removes both. Their sessions receive 401 and removed_at is set. Campaign, request, approval, revision, transitions and audit records retain attribution through review/detail and activity APIs at 1440/390. | done | `tests/go-live/roles.journeys.ts` |
| AUD-003 | One Shopify-backed product review lists recent-product-purchase (seven days), unresolved-refund, unresolved-return and dormant (twelve months), each with its count, at 1440/390. Resolved commerce and eleven-month activity stay eligible; thirteen-month activity is dormant. AUD-008 states how an operator turns the dormancy exclusion off for one campaign and retains that switch. | done | `tests/go-live/stale-sources.journeys.ts` |
| MSG-015 | Review names each blocked host and its links, including redirect hosts. Authors see no allow action and receive 403; a Manager allows a host, the stored list appends it, checks rerun and approval passes. The append-only row names operator, host and campaign through Owner/Admin GET /api/activity, newest first with operator/action/object filters. An imported Mailchimp template lists three outside hosts with allow actions at 1440/390. Exact and explicit wildcard matching agree across approval, inspection and tracking; deceptive suffixes remain blocked. OPER-007 inherits the full cross-product screen, CSV and every action type (ct pattern 2, c4 authorized default). | done | `tests/go-live/content-checks.journeys.ts` |
| MSG-006 | A draft with a malformed link, `http:`, `javascript:`, `data:` and `file:` links, a redirect to an unlisted host and images over `http:` or on an unlisted host is blocked at review and approval. Every blocked link is named with the scheme, fault or host that blocks it; only unlisted HTTPS hosts offer Allow this host, and contact links never need it. | done | `tests/go-live/content-checks.journeys.ts` |
| MSG-005 | Review of an SMS step shows each rendered example with the program identity, `Reply STOP to unsubscribe`, the frequency disclosure and the exact segment count. Mobile Message is the proved adapter. | done | `tests/go-live/content-checks.journeys.ts` |
| OPER-007 | Owner and Admin read Activity under Settings: every recorded operator action and integration call, newest first, filtered by operator, agent, action, object and date, with a CSV of the filtered view. Drafts saved, approvals, pauses, imports, exports, erasures, consent edits, signup and kiosk changes, role changes and hourly signup-refusal summaries each appear once with actor and time; Authors are refused. Actual restore-completion actor/time and Activity view/filter/export proof remain open. | partial | `tests/go-live/sync-integrations.journeys.ts` |
| INT-004 | Owner-only Stripe connection, encrypted export-excluded secrets, exact-byte signed ingestion and source-identified contact timeline events. Real-provider lifecycle acceptance remains blocked by test-clock metadata rejection; no live-provider completion is claimed. | partial | `src/core/features/store/stripe/`, `tests/go-live/roles.journeys.ts`, `tests/portability.spec.ts` |
| DELIV-002 | Owner-only SendGrid domain creation and validation, returned DNS records with independent per-record checks, DMARC/BIMI guidance and branded tracking gated by CNAME and HTTPS. Real authentication/DNS round trip and cleanup passed; real branded-host HTTPS/rewrite acceptance remains open. | partial | `src/core/features/sender-verification/domain-setup.ts`, `src/core/features/sender-verification/setup-routes.ts`, `src/core/features/sender-verification/tracking-domain.ts`, `tests/go-live/contact-links.journeys.ts` |
| INT-002 | Owner-connected WooCommerce REST sync, encrypted keys, signed idempotent order/plugin ingress and explicitly activated abandoned-checkout tag-and-exit flow. Real WordPress plugin source includes consent/GPC gates, onsite observations and the native signup iframe. Ct approved the stated privacy and activation semantics on 22 October. | done | `tests/go-live/woocommerce.journeys.ts`, `tests/go-live/woocommerce-plugin-journey.ts`, `extensions/mango-woocommerce/INSTALL.md` |

| FORM-010 | Hosted and kiosk allowance refusals retain entries, show the error state and return 429 with Retry-After. Settings exposes hourly counts; Home links a rolling-hour alert to form and allowances. Destination-dependent confirmation refusals remain generic. FORM-005 report remains open. | partial | `tests/go-live/shared-kiosk.journeys.ts`, `tests/audience-import/signup-security.spec.ts`, `tests/go-live/sync-integrations.journeys.ts` |
| FORM-008 | Accepted-only atomic intake uses separate challenged, unchallenged and kiosk partitions, durable floors and next-window Owner changes. Verification defaults on, is mandatory for kiosks, and uses five-minute one-use tokens. Popup/report carriers and ct approval remain open; single opt-in is exercised under CONT-025. | partial | `tests/go-live/shared-kiosk.journeys.ts`, `tests/go-live/signup-capacity-journey.ts`, `tests/audience-import/signup-security.spec.ts`, `tests/audience-import/signup-reservation-clock.spec.ts`, `tests/portability.spec.ts` |
| INT-013 | New drafts freeze editable static UTM defaults, sent links and previews retain author keys and managed exclusions, campaign tagging can be disabled, and one scoped replay-safe Vane goal appears on a known contact timeline. Flow dimensions and approval of adopted defaults remain open. | partial | `tests/go-live/domain-journey.ts`, `tests/campaign-results/performance.journeys.ts`, `tests/campaign-results/tracking-journey.ts`, `tests/campaign-results/custom-attribution.ts`, `tests/portability.spec.ts` |

| CONT-025 | Settings saves future-only Owner/Admin email modes for hosted, kiosk and manual points. Single captures retain full evidence and spend accepted capacity without confirmation reservations; public resubscription stays confirmed-only and API capture is fixed double. Connection-owned and absent sources remain partial. | partial | `tests/go-live/shared-kiosk.journeys.ts`, `tests/go-live/opt-in-journey.ts`, `tests/go-live/sync-integrations.journeys.ts`, `tests/portability.spec.ts` |

| CONT-026 | Authors and above record hand-entry consent and properties; email uses the manual mode and labels the operator. SMS requires express written evidence and a signed reply to its exact confirmation; prior restrictions and Support refusal remain enforced. Topic scope and legacy API attestation remain open. | partial | `tests/go-live/sync-integrations.journeys.ts`, `tests/go-live/manual-entry-journey.ts`, `tests/portability.spec.ts` |
| MSG-014 | Fresh source-labelled deployment and social defaults, genuine connection hosts, durable removal across sync and audited review allowances. Existing explicit policies remain explicit; Shopify storefront/image data, builder sources and disconnect acceptance remain open. | partial | `tests/go-live/content-checks.journeys.ts`, `tests/go-live/content-hosts.ts`, `tests/portability.spec.ts` |
| RESULT-008 | Message-bound link, one-click and signed SMS reply methods retain their first time, appear in list and CSV, and survive actual erasure as anonymous counts matching campaign totals. Historical methods, flows and role masking remain open. | partial | `tests/campaign-results/performance.journeys.ts`, `tests/campaign-results/recipient-method-journey.ts`, `tests/campaign-results/results.journeys.ts`, `tests/portability.spec.ts` |

| CONT-017 | Contact profiles show stored identities, merges, channel/topic evidence, properties, segment membership and one original-source timeline, with masked Analyst/Support views at desktop and phone widths. Flow and prediction panels state their availability; the text carve remains pending. | partial | `src/core/features/audience/contact-profile.ts`, `src/core/features/audience/ui/contact-detail.tsx`, `tests/audience-controls/contact-history.spec.ts` |

| REPORT-007 | Settings shows contacts by channel consent state, provider-reported campaign/day costs and a labeled UTC month run-rate projection. Currencies stay separate and unpriced facts stay counted; flow grouping awaits flows. | partial | `src/core/features/insights/usage-report.ts`, `src/core/features/insights/ui/settings-usage.tsx`, `tests/campaign-results/costs.journeys.ts` |

| REPORT-001 | Insights opens with equal-period UTC comparisons of USD campaign attribution, human engagement, source growth, reported costs, sender health and top campaigns, composed from existing report reads. Holdout lift and flows are explicitly unavailable. | partial | `src/core/features/insights/overview-report.ts`, `src/core/features/insights/ui/overview-dashboard.tsx`, `tests/campaign-results/overview-journey.ts`, `tests/campaign-results/results.journeys.ts` |

| DELIV-007 | Home exposes day-23 renewal, day-31 lapse and invalidating evidence changes. Durable claims send operator-only reminders and one diagnostic per evidence period; configured authenticated receiver renewal needs no human click. The existing minute Cron shares those durable claims; native confirming authority prevents restored reminders from resuming. Lifecycle hold/resume/deadline hooks and live flows remain outstanding. | partial | `src/core/features/sender-verification/renewal.ts`, `src/core/features/sender-verification/ui/renewal-card.tsx`, `tests/sender-verification/worker.spec.ts`, `tests/go-live/managed-mail.journeys.ts` |

| REPORT-006 | Owner/Admin save aggregate provider-cost/unit or campaign-engagement reports and schedule operator-only weekly/monthly email. The shared report read supplies immutable delivery figures, durable replay claims, recorded refusals and restore-paused activation. Slack, other report families and middleware refusal activity remain outstanding. | partial | `src/core/features/insights/saved-report-read.ts`, `src/core/features/insights/report-scheduler.ts`, `src/core/features/insights/ui/saved-reports.tsx`, `tests/go-live/managed-mail.journeys.ts`, `tests/campaign-results/saved-report-metric-journey.ts` |

| INT-007 | Versioned scoped profiles and general custom events retain key attribution, immutable replay and per-key limits. The delivered JavaScript client and OpenAPI description exercise identify/properties, membership reads and named consent refusal; contact event timeline at 1440/390. Website keys remain server-held behind the website's authenticated proxy. | done | `tests/go-live/sync-integrations.journeys.ts`, `tests/go-live/custom-event-journey.ts`, `docs/integrations.md` |

| INT-014 | Owner/Admin inbound Judge.me review, Okendo review/earned-points/tier-entry and Smile customer-profile adapters verify native signatures and use the INT-007 event writer. Existing contacts only; no consent or outbound action. Signed replay, account/timestamp refusal, concurrent unmatched count, encrypted export-excluded secrets, populated receipt restore, erasure/reconnection replay protection and Settings at 1440/390 are exercised. Yotpo and full Smile event coverage, live payload confirmation and FLOW-* review-request exits remain open. | partial | `tests/go-live/sync-integrations.journeys.ts`, `tests/go-live/review-loyalty-journey.ts`, `tests/sender-verification/worker.spec.ts` |

## Adopted target defaults (23 October 2026)

The text-only adoption changes no implementation status. No real provider call or consent was used.

| Clause | Status | Adopted default and remaining gap |
| --- | --- | --- |
| CONT-018 | partial | Default in force (owner direction 19 Oct 2026), written into the clause: site tracking off per site until an Owner or Admin turns it on (Manager may turn it off; OPER-007); consent only from the store's consent tool (Shopify Customer Privacy API, WP Consent API, Stall, the snippet's consent call), none or no decision = refused; GPC (`Sec-GPC: 1` or `navigator.globalPrivacyControl`), sale-or-share opt-outs and CONT-021 do-not-share always refuse; one cookie `mgo_s` (Secure, SameSite=Lax, Path=/, no Domain, at most 30 days, HttpOnly where server-set, at most 2,048 bytes; no other browser storage); nothing sent to or held by Mango for an unidentified visitor (up to 20 events wait in the cookie until identification); `mgo_c` is 32 random bytes, single-use, host-bound, digest-only, 7 days, never for automated clicks, GPC or tracking off; identified onsite events kept 90 days; erasure under CONT-013. ct approval of the landed default: pending. Built and exercised: Shopify signed pixel ingest and current privacy controls (`tests/shopify/connection.spec.ts`); the separately approved INT-002 plugin semantic stays DONE. Acceptance not yet met: the snippet and Stall surfaces; the shared site switch, click-token journey and exchange on every surface; consent buffering, cookie parity, anonymous-request refusal, 90-day retention, erasure, segment-window and cross-site browser assertions on each surface. The Shopify pixel and WooCommerce plugin have not run this expanded acceptance. RESULT-005's redirect consumes this clause's click token: it adds `mgo_c` to connected-store destinations once the token is built; until then the redirect adds nothing.  ct 23 October 04:38Z: INT-002 stays done on its approved semantic, not evidence for this expanded acceptance. Before other CONT-018 work, implement 90-day onsite retention, withdrawal deletion and explicit HTTPS enforcement. |
| FORM-008 | partial | Adopted floors, accepted-only pools, network and kiosk partitions, Owner-only next-window settings and per-form verification are built and exercised. Popup/report carriers and ct approval remain open; single opt-in is exercised under CONT-025. Evidence: `tests/go-live/shared-kiosk.journeys.ts`, `tests/audience-import/signup-security.spec.ts`, `tests/audience-import/signup-reservation-clock.spec.ts`, `tests/portability.spec.ts`. |
| INT-015 | partial | Connector not built; conservative default (opt-in per installation, Shopify OAuth/HMAC/state checks, fail-closed 401 routing, compliance topics acknowledged after installation receipt, connector state deleted on disconnect, removed subscriptions re-created) named in the clause, awaiting ct approval as landed. |
| DELIV-008 | partial | SendGrid installation-side connection only, against synthetic SendGrid, WooCommerce and mail network edges; no real provider call, account or consent was used. Resend, a fresh installation without deployment mail inputs, Free sign-in through the connection, daily read-back, revoke/replace alerts and emails, handoff-unknown key replacement, complete developer-route labelling and DELIV-002 domain creation through this connection remain unproved. Restricted scope CRUD behavior is inferred from SendGrid documentation, not real-provider evidence. Conservative disclosed-before-create Owner authorization, signed-or-delete, five-minute timestamp window and id-only ownership defaults are adopted; Default ADOPTED; sandbox proof pending. |
| BUILD-010 | partial | Per-block controls in the real editor, nested/horizontal orientation and the complete editor acceptance remain unbuilt or unproved; BR question posted. Per-block controls depend on BUILD-001's block model. Preview names hide on mobile/desktop, font size, line height, padding and alignment as dependent on the generated block. Conservative generated-only head style, 8192-byte bound and fail-visible desktop hiding defaults ADOPTED. No registration, timeout, shard count or cap was added or raised. Evidence: `tests/campaign-authoring/canonical-save.spec.ts`, Verify main 4/6, via `tests/campaign-authoring/mobile-presentation-journey.ts`. |
| CONT-024 | partial | Mailchimp archive and named CSV/API source attestation and incumbent-held email evidence are exercised through the public preview, apply, campaign-review, native export/restore, revocation and erasure doors at 1440/390. Store connections (INT-001 to INT-006), five-year expiry and positive SMS evidence (A2P hold) remain unproved. A source without a row time requires an explicitly supplied export creation time. No real provider call or consent was used. |
| PUB-005 | done | Hosted paid signup and return pages show price/frequency, Stripe Tax and explicit consent. The Worker checkout, one paid-checkout confirmation, paid-only send after own confirmation, protected opt-outs/suppression and erasure are exercised in `tests/go-live/paid-signup-journey.ts` via the roles journey at 1440/390. Defaults approved by ct 23 October 04:38Z. Stripe and mail are faked only at the network edge; no real provider call or consent was used. |

| PUB-002 | partial | Fresh Stripe-reported status orders paid membership; paid-only and free-topic delivery after cancellation are exercised at the network edge, with consent/suppression and the paid-state hand-off fence. Settings distinguishes observed payment failure from non-paid or unverified status at 1440/390; the latter says paid status could not be confirmed. Restricted-key sandbox proof and Nectar remain open. Evidence: `tests/go-live/paid-tier-journey.ts`, `tests/go-live/stripe-journey.ts`, `tests/portability.spec.ts`. No real provider call or consent was used. |


<!-- Historical c17 source-base claims, superseded by current paid-capture claims above:
| PUB-005 | missing | Hosted paid-signup and return pages, paid-checkout evidence and one confirmation are not implemented. |
| PUB-002 | partial | Fresh Stripe-reported status orders paid membership; paid-only and free-topic delivery after cancellation are exercised at the network edge, with consent/suppression and the paid-state hand-off fence. Restricted-key sandbox proof and Nectar remain open. Evidence: `tests/go-live/paid-tier-journey.ts`, `tests/go-live/stripe-journey.ts`, `tests/portability.spec.ts`. No real provider call or consent was used. |
-->
| FORM-010 | Hosted and kiosk allowance refusals retain entries, show the error state and return 429 with Retry-After. Settings exposes hourly counts; Home links a rolling-hour alert to form and allowances. Destination-dependent confirmation refusals remain generic. FORM-005 report remains open. | partial | `tests/go-live/shared-kiosk.journeys.ts`, `tests/audience-import/signup-security.spec.ts`, `tests/go-live/sync-integrations.journeys.ts` |
| FORM-008 | Accepted-only atomic intake uses separate challenged, unchallenged and kiosk partitions, durable floors and next-window Owner changes. Verification defaults on, is mandatory for kiosks, and uses five-minute one-use tokens. Popup carriers, single opt-in and ct approval remain open. | partial | `tests/go-live/shared-kiosk.journeys.ts`, `tests/go-live/signup-capacity-journey.ts`, `tests/audience-import/signup-security.spec.ts`, `tests/portability.spec.ts` |


| CONT-026 | Authors and above record hand-entry consent and properties; email uses the manual mode and labels the operator. SMS requires express written evidence and a signed reply to its exact confirmation; prior restrictions and Support refusal remain enforced. Topic scope and legacy API attestation remain open. | partial | `tests/go-live/sync-integrations.journeys.ts`, `tests/go-live/manual-entry-journey.ts`, `tests/portability.spec.ts` |

| MSG-014 | Fresh source-labelled deployment and social defaults, genuine connection hosts, durable removal across sync and audited review allowances. Existing explicit policies remain explicit; Shopify storefront/image data, builder sources and disconnect acceptance remain open. | partial | `tests/go-live/content-checks.journeys.ts`, `tests/go-live/content-hosts.ts`, `tests/portability.spec.ts` |

| RESULT-008 | Message-bound link, one-click and signed SMS reply methods retain their first time, appear in list and CSV, and survive actual erasure as anonymous counts matching campaign totals. Historical methods, flows and role masking remain open. | partial | `tests/campaign-results/performance.journeys.ts`, `tests/campaign-results/recipient-method-journey.ts`, `tests/campaign-results/results.journeys.ts`, `tests/portability.spec.ts` |

| FLOW-001 | partial | Draft revisions only. Trigger enrolment, including the INT-004 renewal reminder (FLOW-002), and activation (FLOW-008) remain unbuilt. All node kinds have plain explanations; unavailable transports/actions are identified. No flow is enrolled, activated or sent. Evidence: `tests/go-live/roles.journeys.ts` via `tests/campaign-authoring/flow-journey.ts` (Verify go-live 6/9): three-message welcome graph with split, unreachable-node validation and repair, keyboard pan/zoom, saved revision reload and 1440/390 accessibility/overflow/hydration; all node-kind explanations, named loop/unended-path validation and delay-cycle acceptance; Author saves, Analyst reads, Support named 403. `tests/portability.spec.ts` (Verify main 4/6 for DATA-001; main 5/6 for erasure authority) exports/restores the draft revision with prior data. |

## Prior judgement and candidate history (retained 28 October 2026)

The sd-mango-c31 candidate carries the reusable-block changes and repairs the native round-trip timing. BUILD-012 retains partial with measured reusable-source refusals. BUILD-004 is proposed partial, uncounted pending exact-SHA verification and landing; its live-flow and template-copy gaps remain stated below. The sd-mango-c26b candidate adds inert FLOW-001 draft revisions, CONT-024 source attestation and review reliance counts, and partial MOVE-002/003/005 import paths; the scoped evidence and gaps below describe the candidate, pending exact-SHA branch Verify and Mac publication/landing checks. PUB-005 moved to done with its hosted paid signup page, Worker Checkout and payer-consent journey. INT-002 moved to done with its Owner connection, store sync, signed replay and activated plugin checkout-flow journey; DELIV-002 and PUB-002 remain partial. SEG-001, STORE-004 and PUB-002 were reviewed at `4c4749cf2b4fb6584483bd1fc95f7af964b12335`: SEG-001 moved to done with its collection and category purchase conditions, STORE-004 moved to done with failed webhook and generation operations carrying the adapter's error, and PUB-002 moved to partial with its paid tier proved at the Stripe network edge (sandbox proof pending); REPORT-003 was reviewed at `2ecfa8e031c3a91bfc04bfd1bef2a26bb5d15bea` (22 October 2026); other rows retain their prior review boundaries. MOVE-009, CONT-012 and AUD-008 were reviewed against the candidate source based on `b40be01dcfcf8d793a92780252859eeccdaeb754` on 21 October 2026; their evidence and gaps below supersede only those earlier status entries. Published clause wording and the issued v0.4.0 release envelope are unchanged. MOVE-009 moved to done at d21d9e2b; its unproved remainder became MOVE-015 (missing), 22 October 2026. The sd-mango-c28 candidate adds hosting hygiene, consent-neutral source draft outlines, immutable flow template copies, Resend Settings connection monitoring and native block/mobile authoring; scoped evidence below remains subject to exact-SHA Verify and Mac publication/landing checks. The sd-mango-c32 candidate adds audience-specific name bounds, native social links and a manual six-item product grid, and the provider-edge promotional-email journey. BUILD-001 and BUILD-012 remain partial and UNCOUNTED pending exact-SHA verification and Mac publication/landing checks. The sd-mango-c37 continuation proposes conservative incumbent conversion and identifier-only Shopify catalog authoring with fresh hand-off reads; MOVE-011 remains partial and BUILD-011 is proposed partial, both UNCOUNTED pending exact-SHA Verify and Mac publication/landing checks. sd-mango-c38 proposes MOVE-014 missing to partial for inspected image import and live incumbent-host diagnostics; its cutover, flow and other-host gaps remain, and this proposal is UNCOUNTED until ct reads the landing line. sd-mango-c39 extends BUILD-011 and BUILD-012 evidence for configured chosen-item size bounds, the Shopify six-item promotion, catalog authorization and adversarial payloads, and identifier-only template/start/duplicate/follow-up doors, with both clauses remaining partial and UNCOUNTED pending exact-SHA Verify and Mac publication/landing checks. This round records and proves ct's two BUILD-012 catalog save riders and STORE-001 source identity, connection and occurrence time across the built connections without changing clause statuses or counts.

## Original acceptance and evidence record (retained 28 October 2026)

This is historical source text. CONTRACT.md and its generated ACCEPTANCE.md are the current acceptance; old statuses below are not current claims.

# Mango acceptance boundaries

The newsletter profile permits manual email authoring without commerce, SMS or AI. All original stable clause IDs in CONTRACT.md remain release obligations. Disabled optional modules are unavailable, never certified satisfied. Commerce-dependent rules remain blocked without suitable current recorded sources.

The implemented local acceptance surface includes native authenticated operator access, persisted contact and consent evidence, exclusion-aware audience review, saved previews, immutable saved-revision approval, durable dispatch and provider uncertainty. Checks must cover approval, sender identity, suppression, erasure, consent and replay; tests belong to the behavior change and redundant checks may be replaced. Creation, editing and saving grant no delivery authority.

Local credential refresh tests run the actual setup/development commands, persistent D1 and native browser sign-in. They cover retained contact and absent-contact suppressions, surviving opt-outs, repeated refresh, migration-failure restoration, prior-session invalidation and reviewed import outcomes at 1440 and 390. The existing fresh-install journey remains separate. These checks are included in `pnpm exec rer verify` and make no hosted/provider claim.

Email previews use saved content, escaped personalization and an inert sandbox. Authored HTML has a restricted tag and attribute set. Unsafe markup blocks approval. Preview links cannot navigate, small or underspecified images are removed, and other remote images require explicit permission. Declared image dimensions do not establish tracking intent. Managed unsubscribe links and actual destinations must agree with saved plain text.

SendGrid's single-attempt guarantee distinguishes definite nonacceptance from uncertain responses. Only definite nonacceptance is retry-safe; uncertain responses retain durable fencing for operator review. Signed events and available provider Activity may correlate accepted message identities; unavailable evidence never invents an outcome.

Durable source synchronization preserves source identities, saved cursors, failures and history. Fenced SQL writes reject stale leases. Only completed ingestion advances freshness; queue acknowledgment requires a terminal outcome or durable acceptance of continuation work. Stale or unavailable required sources block approval.

Release evidence records verification, clean-clone, CI and publication/export outcomes against the tested revision outside the product. A passing source package, local behavior journey or publication scan alone does not establish hosted operation.

The full flagship proposal/commerce/SMS/AI integration, live signed provider-webhook acceptance, complete contract/baseline reporting, hosted deployment backup/restore and flagship scale evidence remain open. The local go-live journey below covers signed facts replayed with a locally generated key and a local restore with real history; neither is acceptance by a live provider or a hosted restore. Publication and production deployment are separate outcomes. See RELEASE.json for clause amendments and upgrade instructions.

Hosted signup and embeddable capture are included in the newsletter profile and must retain explicit consent, confirmation and suppression guarantees. Contact import must report row outcomes without inventing consent. Saved segments and contact merge controls are included: the shared editor and eligibility calculation preserve consent exclusions and immutable campaign copies, and merge previews restrictive states while retaining links and history. Contact erasure is included under CONT-013 with bounded durable continuations, secret-keyed opt-out aliases, anonymized receipts/audits, complete affected import-custody withdrawal and explicit approval invalidation for redacted literals. Local release evidence verifies a fully applied public 50,000-row import with 429 original chunks and 5,000 additional history rows: deletion completed in 163,152 ms, with at most 858 native D1 statements per request. It also verifies native interrupted receipt recovery, accumulated public archive cleanup with reconciled counts and bounded invocation cost, and old-archive refusal with current authority. The external evidence binds these measurements to the tested runtime; full CI and hosted outcomes remain separate. Operator invitations are covered by the native rer/browser journey: pending/active states, affirmative confirmation, fresh email proof, removal with session and unused-link revocation, retained campaign/approval/audit attribution, setup self-only removal, last-active protection and foreign-origin rejection.

## Current feature acceptance status

The current source includes a route-aware operator menu that collapses on narrow screens, linked inline field errors and keyboard-managed dialogs. The scheduled campaign view lists every active-revision step with its local time and zone, state and D1 aggregate recipient-step outcomes, including missed windows. Campaign history filters by state and channel, keeps filter state in the URL, and shows counts. Campaign audience text derives from the structured inclusion and exclusion rules, including for legacy revisions, while stored approvals and their digests remain unchanged. Local setup provides an empty workspace and native browser admission without a captured-mail page, and signup frequency wording is persisted for new consent disclosures.

Native local journeys exercise mobile navigation and keyboard behavior, inline form feedback, dialogs, schedule states and stored D1 counts, URL-backed campaign filters, and derived audience summaries for current and legacy revisions. This states the behavior those local checks cover; it is not an acceptance verdict by itself. Bind verification, clean-clone, CI, publication/export and hosted outcomes to receipts for the exact revision tested. Each receipt establishes only its named scope, and local behavior evidence does not establish hosted operation. The earlier hosted receipts above support only the journey and revision they name.

Live signed provider-webhook acceptance, the wider commerce/SMS/AI flagship contract, hosted backup/restore and scale evidence remain open. The destination jurisdiction is the owner's to name before activation; until then the product's rule is confirmed opt-in only, with the postal footer, visible and one-click unsubscribe, and opt-out recorded before acknowledgment, which the product enforces. This is the product's rule, not legal advice. Public source publication at `just-every/run-mango` was authorized on 13 October 2026. The source is public; package.json's `private: true` prevents npm package publication and does not describe repository visibility. Version 0.2.0 and its release record are dated 16 October 2026. The release record alone establishes neither a completed tag nor a live application deployment. Production deployment and future release actions require their separately authorized steps.

Native local authority journeys cover both verified historical session-key and independent-contact installations through two forced credential rotations. They assert suppression and detached opt-out retention, unchanged prior D1 records, expired old sessions, fresh native browser sign-in, restrictive generic CSV import and public signup behavior. Fresh-copy checks cover empty startup and production-build credential isolation. These checks remain local evidence, subject to the exact-revision receipts required above.

The newsletter visual proof is one representative axe/overflow pass on ten pages, with screenshots for review; main user-facing Playwright flows remain. The native fresh-install journey proves the shared Base owner/browser path; domain authority and credential-isolation checks remain. Module-source checks prove copied bytes, while the maintained Base repository owns tests excluded from its seed exports.

The DATA-001 native flow checks complete discovered D1 inventory, record and original R2 asset round-trip through Mango's authenticated routes and Base CLI, a wrong private-key refusal before writes, preserved fresh destination authentication, rejected source sessions and maintenance-mode isolation. Hosted restore remains unverified. Native Base bootstrap is exercised by rer setup, auth and portability flows.

Contact controls use additive migration 0033 for named audience segments. The upgrade journey starts at the populated pre-change source with an operator, import, contacts, draft and approved campaign, then checks direct app sign-in and unchanged records after migration. Local Base export/restore discovers `audience_segments` and restores its rules with matching private authority. Segment and merge journeys cover the existing UI at 1440 and 390 pixels; authenticated route checks cover copied-rule immutability, consent exclusions, restrictive merges, old links, concurrent pair locking and merged-recipient dispatch exclusion. Exact tested revision and command results are recorded with the release evidence.

The stock hosted installation required adjustments and a manual Queue dispatch. Normal cron delivery remains unproven; the SendGrid account's two event-webhook slots were occupied. No live account change or new webhook slot is assumed by this local acceptance.

The invitation journey preserves native local approval's 409 unavailable-sender response. Its retained-approval attribution proof uses the real production sender verifier and approval route against that same persisted D1 and native operator session, substituting only provider HTTP, DNS, authenticated-receipt and queue edges. This proves attribution and revocation without claiming native development marketing capability or live provider acceptance.

Existing signed Event Webhook forwarding is locally checked with the real public route and cryptographic verifier: unchanged bytes ingest once, replay retains one inbox/suppression fact, and reserialization, tampering, wrong keys, stale timestamps, invalid UTF-8 and oversized bodies are rejected. Unmatched events do not invent delivered facts. Signed Inbound Parse is a separate receipt/reply surface with no Mango intake. This does not certify a live receiver, account scope or normal cron delivery.

The move-in guide describes two documented audience-export formats tested with synthetic files only; no real export was supplied or certified. The fixture-loop routes cover exact preview counts without contact changes, durable apply/resume, repeat idempotence, reversal to prior contact state, missing-evidence warnings, existing opt-outs, and campaign exclusion at review and dispatch. The native browser journey covers a documented pending file and the guide at 1440 and 390 pixels. Generic presets and seed replacement claims stay unchanged. Command results establish execution; this scope does not certify SMS, AI, commerce, signed provider webhooks or hosted restore.

The full account-export route is proven on synthetic files only: documented format, tested on synthetic files shaped from the published help page, not on a real export. One real export is still unreconciled. The `move-in` verify stage builds the synthetic archive from fixtures and runs it through the running Import page and routes. It proves that Preview leaves every table's row count unchanged, per-file reconciliation adds up, statuses are restrictive across files, existing and later opt-outs survive, imported content creates no delivery or result figures and its foreign merge tags block approval, undo keeps edited, unsubscribed and pre-existing records, re-runs and repeats change nothing, and two entry orders give the same result. A hostile-archive journey shows each unsafe archive refused or skipped with nothing written and `/health` still answering. These are local runs; hosted Worker memory for a 16 MB archive is measured only under a capped Node heap.

Contact erasure uses the native app and D1 public routes. Requests admitted before deletion retain a generation fence after the pending lock clears. Pending recipients are excluded; a provider handoff durably authorized before deletion cannot be recalled, and its later response cannot repopulate erased local data or cause a resend. In the supported local restore workflow, the dev process is stopped; the restore-mode app refuses deletion and the ordinary app refuses restore finalization. Ordinary exports store their temporary snapshots in D1. Downloaded archives, already released responses, external provider records and independent Cloudflare backups remain outside Mango's erasure custody. A fresh installation unaware of the current erasure journal cannot infer later deletions from an old archive. Hosted restore, ordinary hosted cron and stock deployment remain uncertified.

Erasure admission atomically checks the selected contact, its merged identity set and all active merge locks. A refused request creates no pending receipt, opt-out, blob cleanup or import invalidation. Merge releases its pair of locks together. Existing contact history retains known names across capture, sync, import and merge for later redaction in records that name the contact by an exact identifier. This does not reconstruct names discarded before the migration; see DIVERGENCE.md.

The go-live journey (`tests/go-live`, verify stage `go-live`) runs one installation on the Vite and Cloudflare runtime that rer dev uses, with Mango's real SendGrid adapter, sender verification, queue dispatch, webhook, unsubscribe and portability routes. Only network calls are substituted: SendGrid's HTTP API and DNS-over-HTTPS answer from a local edge, and a test receiving mailbox reports the authentication results of the sender check's message. It confirms opt-in contacts through the emailed link, sends an approved two-recipient campaign whose second hand-off loses its response, and posts SendGrid Event Webhook batches signed with a locally generated key to `/webhooks/mail/sendgrid`: delivered, deferred, soft and hard bounce, provider unsubscribe, spam complaint, a redelivered batch, an older event after a newer one, a mutated body, a forged signature, a stale timestamp and a message ID Mango never issued. Valid facts are stored once; invalid batches store nothing; the uncertain recipient stays waiting for confirmation until a signed bounce names it; the campaign page, results page and Insights keep accepted, delivered, bounced, complained and suppressed apart; the next campaign excludes the complained and bounced addresses. The one-click URL taken from the message handed to SendGrid is unaffected by GET, HEAD, mutated or cross-purpose tokens, unsubscribes before its 200 without a cookie, is idempotent, and excludes the contact from the next review and at dispatch. The installation is then exported with Base's portability CLI and restored into an empty installation with its own origin and provider key: every archived row matches apart from the destination's own operator profile, a wrong private key is refused before any write, the source session is refused, sending stays blocked until the destination observes its own sender evidence, and replayed batches add no fact. These are replays with a locally generated key, not acceptance by a live provider.

The 0.2.0 upgrade record includes every shipped migration through 0059. Existing embed forms require each framing site in Audience → Allowed embed origins after 0057, and upgrades run `rer build` before the fresh export. Managed transactional relay mail and owner-supplied marketing mail have distinct credentials and authority; absent marketing configuration blocks newsletter approval. Test-send destinations include every active operator, which permits them to receive unapproved draft content. Release receipts run routine verification only; no capacity profile is implied. Push Verify uses shards, with slow fresh-install/README journeys on tags and nightly; actual timings and hosted activation require separate evidence.

Health readiness follows CONTRACT.md's BASE-OPS-001 policy (ct deadline ruling and sd two-send decision, 21 October 2026): through the production Worker entry, `/health` answers within 2,000 ms. Every request observes D1, R2 and Queue concurrently against its own 1,500 ms deadlines; 200 needs three successful observations, an acknowledgment of 800 ms or more is `queue.slow`, and a rejection or deadline answers 503 naming each failed dependency without provider error text. D1 and R2 are read on every request. Concurrent requests share one Queue check; `executionCtx.waitUntil` keeps both its bounded observation and the underlying send's slot-release handler alive independently of its originator, including after cancellation. Queue success and failure are reused for 60 seconds from the check's start per binding per isolate, marked `queue.cached`. After expiry a new send starts even while an older one remains unresolved, up to two outstanding sends. At that cap the latest timeout remains cached beyond 60 seconds, without another send or an extended expiry; once either send settles, the next read starts a fresh check. Late settlement never overwrites an observation. Cached failure can delay showing recovery for 60 seconds, or indefinitely while both slots stay occupied; cached success can hide a failure for 60 seconds. `tests/production-entry.spec.ts` retains one BASE-OPS-001 contract case and exercises slow acknowledgment, sequential and concurrent reuse, each dependency's rejection and deadline, binding isolation, D1/R2 freshness, expiry, cap, late settlement, recovery after slot release and timer drain in Node with binding and clock fakes. Real-window workerd checks and cancelled-originator behavior require one-off receipts at the candidate revision. Not proved: fresh observation or recovery while both slots remain unresolved (the explicit cap exception), real Queue latency, several hosted isolates and RER's deploy probe. Queue acceptance is not consumer processing or delivery (SEND-006 and BASE-OPS-004). This records no BASE-OPS-001 status.

## Clause acceptance (target contract, 16 October 2026)

CONTRACT.md now describes the complete email and SMS marketing product Mango is building towards. Each clause below names the journey or test, through a public door (route, command, transport or built page) with fakes only at the provider or network edge, that proves it, and its current status: **98 done, 65 partial, 80 missing** of 243 clauses (23 October 2026; SEG-001 done with collection and category purchase conditions; STORE-004 done with failed webhook and generation operations; PUB-002 partial pending its Stripe sandbox receipt). A clause becomes done only when its named evidence runs in `rer verify` and is tagged with the clause ID through `tests/contract.js`. Partial and missing clauses are release obligations of the target, not waivers; the newsletter profile above remains the current release boundary until they ship.

<!-- Historical c17 source-base counts (before main paid capture):
CONTRACT.md now describes the complete email and SMS marketing product Mango is building towards. Each clause below names the journey or test, through a public door (route, command, transport or built page) with fakes only at the provider or network edge, that proves it, and its current status: **96 done, 63 partial, 84 missing** of 243 clauses (23 October 2026; SEG-001 done with collection and category purchase conditions; STORE-004 done with failed webhook and generation operations; PUB-002 partial pending its Stripe sandbox receipt). A clause becomes done only when its named evidence runs in `rer verify` and is tagged with the clause ID through `tests/contract.js`. Partial and missing clauses are release obligations of the target, not waivers; the newsletter profile above remains the current release boundary until they ship.
-->

### Home

- **HOME-001 — Lobby and public landing** (done). The local journey sees the Lobby with Finish setup before sender setup and Sign in after; the run-site build serves the landing. Evidence: `tests/local-start/local.journey.ts` · `src/site/pages.tsx`.
- **DOCS-001 — Public documentation** (done). `tests/docs.spec.ts` builds and serves every published page and fails on unlisted files, broken links and raw HTML. Evidence: `tests/docs.spec.ts`.

### Operators

- **OPER-001 — Operators and the default role** (done). Fresh install completes sender setup after native owner sign-in at 1440 and 390; production entry refuses local bootstrap. Evidence: `tests/local-start/local.journey.ts` · `tests/production-entry.spec.ts`.
- **OPER-002 — Management** (done). The invitation journey: fresh email proof, affirmative confirmation, removal with session and link revocation, setup self-only removal. Evidence: `tests/settings-sender/routes.spec.ts` · `src/core/features/auth/service.ts`.
- **OPER-003 — Removal does not rewrite history** (done). The Author drafts and requests approval; the Manager approves; the Owner obtains fresh native authority and removes both. Their sessions receive 401 and removed_at is set. Campaign, request, approval, revision, transitions and audit records retain attribution through review/detail and activity APIs at 1440/390. Evidence: `tests/go-live/roles.journeys.ts`.
- **OPER-004 — Roles and permissions** (partial). A route-level journey signs in one operator per role and calls each protected operation (approve, activate, import, export, erase, invite, connect integration, connect sending provider, view unmasked contact), asserting 403 with a named reason exactly where the matrix denies, at 1440 and 390 pixels for the visible controls. The six product roles are separate from Base's unchanged owner/admin/member roles; the journey protects the last product Owner from removal or demotion, retains CSV export for Owner/Admin only and proves restored source assignments grant no product authority in the destination installation. Current newsletter-role evidence: `tests/go-live/roles.journeys.ts`; full flow, provider-connection and installation-erasure role journeys remain outstanding, and CSV exports stay Owner/Admin only.
- **OPER-005 — Separation of approval** (missing). With the policy on, an Author saves a revision and a Manager approves it; the same Manager editing then approving their own revision is refused with `separation-required`.
- **OPER-006 — Single sign-on and deprovisioning** (missing). A journey against a test OIDC issuer and SCIM client at the network edge signs an operator in with a mapped role, deprovisions them, and shows their next request refused and their past approvals still attributed.
- **OPER-007 — Activity log** (partial). Gap: actual restore completion must be recorded with actor and time and visible, filterable and exportable in Activity. A journey performs one of each action Mango performs today (drafts saved, approval requests and approvals, pause, resume and cancel, an import, an audience and an account export, a consent hand entry, an opt-out, an erasure, signup-allowance and kiosk-form changes, role changes and an hourly signup-refusal summary), then filters by operator, agent, action, object and date, exports the filtered view as CSV and checks every action appears once with actor and time; an Author is refused on the screen's API; the Activity screen is inspected at 1440 and 390 with axe. FLOW-008 (activations, pauses) and AGENT-010 (agent actions and the agent filter's values) inherit the obligation. Evidence: `tests/go-live/sync-integrations.journeys.ts`.

### Store signals

- **STORE-001 — Store and event connections** (partial). Each connection (INT-001 to INT-006) syncs every declared source type through its edge with source identity and occurrence time; Shopify is proved today. Evidence: `src/core/platform/adapters/shopify.ts` · `tests/shopify/connection.spec.ts`. Evidence: the existing signed carts identity registration in `tests/shopify/connection.spec.ts`, via `tests/store/source-export-proof.ts`, `tests/go-live/built-source-journey.ts`, `tests/go-live/store-source-journey.ts` and `tests/go-live/source-runtime.mjs`, proves every declared type of the built Shopify, WooCommerce and Stripe connections through their network edges and the owner export with source identity, connection and source occurrence time, including one contact retaining both WooCommerce and Stripe records; the existing Stripe Owner Settings proof remains in `tests/go-live/stripe-journey.ts`.
- **STORE-002 — Source identity** (done). Replayed and resynced Shopify records update one source record each. Evidence: `tests/shopify/connection.spec.ts`.
- **STORE-003 — Freshness** (done). The native Worker/D1/Queue journey imports each Admin source, retains its last completed sync through a later failed page, shows the failure and unaffected sources on Decision Desk at 1440 and 390, and clears it only on completed recovery. Unstarted sources show no successful sync; authoring keeps provider diagnostics private. Evidence: `tests/go-live/source-freshness.journeys.ts`.
- **STORE-004 — Source failure** (done). Evidence: `tests/go-live/source-freshness.journeys.ts` — “[STORE-003] [STORE-004] Decision Desk retains each completed sync through a later failed page and recovery”: a failed product sync records its failed operation carrying the adapter error and recovers through Store/Decision Desk at 1440/390; proposal generation refused by the failed source records one failed generation operation carrying the adapter's last error, with no proposal, cost or send; during a Shopify Admin API outage a correctly signed webhook keeps its 401 answer and records exactly one failed webhook operation carrying the adapter error per delivery (a replay adds none, a forged delivery records nothing), and Shopify's retry after recovery ingests the record once and completes the operation; failed-operation text carries no upstream diagnostic, secret, token or record payload; the Store page lists the failed generation and webhook operations at 1440 and 390 with no overflow or accessibility violations; saved draft edits, readable recorded outcomes/history and zero new mail handoffs with a scheduled campaign. `tests/go-live/roles.journeys.ts` — “[PUB-005][FORM-008][FORM-010][INT-004][OPER-003][OPER-004] roles govern native requests and removal retains authors, approvers and history” (via `tests/go-live/stripe-journey.ts`): during a Stripe API outage a correctly signed Stripe event that needs a Stripe read keeps its 422 answer and records exactly one failed webhook operation carrying the adapter error (a replay adds none, a forged event records nothing), and Stripe's retry after recovery ingests it once and completes the operation. `tests/shopify/connection.spec.ts` — “[STORE-004] native authenticated sync imports complete Shopify records and retains original purchase time through nested-page failures and retry” proves failed operation diagnostics and retry. `tests/go-live/stale-sources.journeys.ts` — “[STORE-005] [STORE-006][AUD-003] sources recover only after completed sync and review counts commerce and dormancy exclusions” retains the stored-source gate. Failed webhook and generation operations share the failed-sync operation record; webhooks keep their existing HTTP answers so providers retry them.
- **STORE-005 — Stale sources block approval** (done). The native Worker/D1/Queue journey refuses both inclusion-dependent and exclusion-dependent campaigns against aged and failed Shopify data. Counts remain unavailable, approval writes no authority or recipients, and review names the source and safe cause at 1440 and 390. A completed sync and explicit recheck allow the same saved revision to pass its ordinary approval checks. Evidence: `tests/go-live/stale-sources.journeys.ts`.
- **STORE-006 — Declared adapter capability** (done). The native Shopify adapter declares cart and browsing observations unavailable without their installation. Inclusion and exclusion review name the missing source at 1440 and 390, keep counts unknown and refuse approval without authority, snapshots or recipients. The public AI proposal-generation door also names an unsupplied source and saves no campaign or partial audience. Evidence: `tests/go-live/stale-sources.journeys.ts`.
- **STORE-007 — Ingestion latency** (partial). A webhook source record is readable within 60 seconds of acknowledgment, measured at the stated limits. Evidence: `src/core/features/audience/commerce-webhook-routes.ts`.

### Contacts and consent

- **CONT-001 — Contact identity** (done). Canonical identity on import and capture. Evidence: `tests/move-in/archive.journeys.ts`.
- **CONT-002 — Channel status** (done). Independent channel states across imports and opt-outs. Evidence: `tests/move-in/held.journeys.ts` · `tests/move-in/archive.journeys.ts`.
- **CONT-003 — Consent evidence** (done). Consent evidence fields on capture and import; stale disclosures cannot create evidence. Incumbent-held evidence is proved under CONT-024. Evidence: `tests/audience-import/signup.spec.ts` · `tests/campaign-authoring/import-category.spec.ts`.
- **CONT-004 — Opt-out precedence** (done). Opt-out before acknowledgment; no import, undo or merge lifts it. Evidence: `tests/go-live/go-live.journeys.ts` · `tests/provider-suppression-ingress.spec.ts` · `tests/move-in/held.journeys.ts`.
- **CONT-005 — Resubscription** (done). Resubscription only from new confirmed evidence. Evidence: `tests/provider-suppression-ingress.spec.ts` · `tests/go-live/opt-out-reasons.journeys.ts`.
- **CONT-006 — Email suppression** (done). Hard bounce, complaint and provider suppression before the next hand-off; soft-bounce policy. Evidence: `tests/provider-suppression-ingress.spec.ts` · `tests/go-live/go-live.journeys.ts`.
- **CONT-007 — SMS compliance replies** (partial). Signed SMS replies: STOP family opts out before acknowledgment, HELP and START never subscribe; proved on the Mobile Message adapter, Twilio pending (SMS-001). Evidence: `src/core/features/sms/inbound.ts` · `tests/audience-import/signup.spec.ts`.
- **CONT-008 — Contact history** (done). One time-ordered contact timeline combines original source activity, consent and confirmations, suppressions, approved audience decisions, dispatch exclusions, channel handoffs and provider outcomes, clicks and attributed operator actions. The native Worker/D1 journey proves original times, contact isolation, payload privacy and access to older events at 1440 and 390 pixels. CONT-017’s wider profile obligations remain separate. Evidence: `tests/audience-controls/contact-history.spec.ts`.
- **CONT-009 — Confirmation** (done). Pending until single-use, expiring, POST-only confirmation. Single or double opt-in per form and source is proved under CONT-025. Evidence: `tests/go-live/go-live.journeys.ts` · `tests/audience-import/signup.spec.ts`.
- **CONT-010 — Import** (done). Reviewed CSV import with row outcomes, idempotent reruns and undo. Named-source files with incumbent-held evidence are proved under CONT-024, and review size under SCALE-001. Evidence: `tests/audience-import/routes.spec.ts` · `tests/move-in/archive.journeys.ts`.
- **CONT-011 — Merge** (done). Merge keeps the most restrictive state per channel. Evidence: `tests/audience-controls/merge.spec.ts`.
- **CONT-012 — Dormancy without deletion** (done). Dormant contacts are labeled and excluded, never deleted; imported clicks, orders and consent changes count at their original times, and a move-in contact without history is `no-history`, not dormant, while a dormant contact with only imported opens is labeled `open-only` (journey under AUD-008). Current evidence: `tests/move-in/archive.journeys.ts` · `tests/go-live/stale-sources.journeys.ts`. Imported clicks use their original times; opens never qualify. The tagged move-in/review journey proves a three-month click eligible, no-history eligible from move-in completion until its window elapses, a thirteen-month click dormant, and an opens-only contact within dormant. The unchanged AUD-003 native journey retains thirteen-month dormancy. Inactivity never changes consent or deletes/suppresses a contact.
- **CONT-013 — Erasure and surviving opt-out** (done). Erasure within five minutes with surviving opt-out hashes. Evidence: `tests/portability.spec.ts` · `tests/audience-import/erasure-merge.spec.ts`.
- **CONT-014 — Custom properties** (partial). An operator creates a date and a money property, imports a CSV that maps both, sets one through the events API, and sees a segment on the date property and a personalized preview using the money value, with history showing each source. Scoped integration coverage: `tests/go-live/sync-integrations.journeys.ts`. Current scope and remaining work: The scoped API persists contact fields with contact identity and consent source. Typed property definitions, UI editing, date/money semantics, segments and personalization remain unimplemented.
- **CONT-015 — Topics and tags** (partial). A contact unsubscribes from one topic through the preference center; the next campaign on that topic excludes them with `topic-unsubscribed` while a campaign on another topic still reaches them; adding a tag changes no eligibility. Evidence: `tests/go-live/sync-integrations.journeys.ts` · `src/core/features/integrations/contacts.ts` · `src/core/features/lifecycle/email-consent-scope.ts` · `tests/campaign-authoring/import-category.spec.ts`. Current scope and remaining work: Scoped subscriber sync stores deduplicated tags without granting consent, and maintains saved integration lists. Topic preference-center acceptance and general tag-driven segmentation remain unmet.
- **CONT-016 — Preference center** (missing). A journey opens the preference link from a sent message, confirms a topic change and a 30-day pause, and the next two campaigns exclude the contact with `topic-unsubscribed` and `paused-by-recipient`; a GET from a link scanner changes nothing.
- **CONT-017 — Contact profile and event timeline** (partial). `tests/audience-controls/contact-history.spec.ts` — “[CONT-008] [CONT-017] a contact profile combines identities, properties, segments and original source, consent, suppression, eligibility, delivery and operator facts with masked role views” proves email/phone and merged identities, channel/topic consent evidence, persisted properties/tags and saved-rule segment membership, and a source-ordered timeline with form capture, orders, conversions, clicks, SMS replies, consent changes and operator actions. The native page and API exercise both masked roles (Analyst and Support), 1440/390, no horizontal overflow, serious axe finding or hydration error. Gap: ct’s 22 October 17:12Z ruling assigns flow enrollments/current node to FLOW-002 and predictions to SEG-004, but the clause text still carries both. Default ADOPTED: row stays PARTIAL pending ct’s text carve; both panels remain visible with honest unavailable statements. Topic evidence reads the current channel ledger; independent topic withdrawal awaits CONT-015/016.
- **CONT-018 — Onsite behavior** (partial). A browser journey clicks a tracked link to the store, views two products and adds one to the cart; the contact timeline shows the three events labeled `click-identified`, and the address bar no longer shows `mgo_c`. An anonymous visitor views a product and then submits a form, and the earlier view appears on their timeline. A second browser using the same token after the exchange identifies nobody, and a link to a host outside the store hosts carries no token. The same journey with Global Privacy Control set records none. Also, on each surface (the snippet and the Shopify pixel, then the WooCommerce plugin and the Stall integration once INT-002 and INT-006 build them; the Status row names any surface not yet run): Switch: on a newly connected store, Settings → Site tracking at 1440 and 390 pixels shows the site off, with the cookie, purpose and retention text. The tracked-link journey then gets no `mgo_c` from the redirect, sets no cookie and records nothing. Manager, Author, Analyst and Support requests to turn it on get 403 with a named reason, and neither width shows them an enabled control. An Owner turns it on, and the activity log shows the change once, with actor and time. After a Manager turns it off, the next event from that site is refused; after an Admin turns it on again, the browser identified before is not identified. Consent: with the store's consent tool reporting no decision, the landing page's address bar loses `mgo_c`, no cookie is set and nothing is recorded; accepting the banner on that page view exchanges the token and identifies the visitor. The browser then holds one cookie from Mango's code, `mgo_s`, with `Secure`, `SameSite=Lax`, `Path=/`, no `Domain`, a lifetime of at most 30 days (`HttpOnly` on the plugin and Stall) and a value under 2,048 bytes that holds no address, name or ID. Mango's code has written nothing to localStorage, sessionStorage or IndexedDB. Withdrawing consent deletes the cookie, records nothing more and removes that contact's onsite events from that surface. Opt-out signals: with the banner accepted, a journey sending only `Sec-GPC: 1` gets no `mgo_c` from the redirect, and one where only `navigator.globalPrivacyControl` is true drops the token unexchanged. Neither sets a cookie or records anything. A contact with a CONT-021 do-not-share request who logs in to the store records nothing. Nothing anonymous leaves the browser: before the anonymous visitor above submits the form, no request from Mango's onsite code carries an event, and the observations API and the timeline show nothing for that browser. A cookie that has held 25 views carries only the 20 most recent. Token: two clicks by the same recipient get two unrelated tokens of 43 base64url characters, and a click classed as automated gets none. An exchange through another store's surface, or after the 7 days, identifies nobody. Retention and erasure: with the installation clock 91 days later, an identified view is gone from the timeline, and at 1440 and 390 the segment builder offers no onsite window over 90 days and says why. Erasing the contact removes their onsite events, sessions and token digests within five minutes, and the same browser records nothing until it identifies again. No cross-site tracking: after the journey, the browser holds no cookie for the deployment or the tracking host, and every request Mango's onsite code made went to the store's origin or, without credentials, to the deployment. Evidence: `tests/shopify/connection.spec.ts`. RESULT-005's redirect consumes this clause's click token: it adds `mgo_c` to connected-store destinations once the token is built; until then the redirect adds nothing. Gap: Default in force (owner direction 19 Oct 2026), written into the clause: site tracking off per site until an Owner or Admin turns it on (Manager may turn it off; OPER-007); consent only from the store's consent tool (Shopify Customer Privacy API, WP Consent API, Stall, the snippet's consent call), none or no decision = refused; GPC (`Sec-GPC: 1` or `navigator.globalPrivacyControl`), sale-or-share opt-outs and CONT-021 do-not-share always refuse; one cookie `mgo_s` (Secure, SameSite=Lax, Path=/, no Domain, at most 30 days, HttpOnly where server-set, at most 2,048 bytes; no other browser storage); nothing sent to or held by Mango for an unidentified visitor (up to 20 events wait in the cookie until identification); `mgo_c` is 32 random bytes, single-use, host-bound, digest-only, 7 days, never for automated clicks, GPC or tracking off; identified onsite events kept 90 days; erasure under CONT-013. ct approval of the landed default: pending. Built and exercised: Shopify signed pixel ingest and current privacy controls (`tests/shopify/connection.spec.ts`); the separately approved INT-002 plugin semantic stays DONE. Acceptance not yet met: the snippet and Stall surfaces; the shared site switch, click-token journey and exchange on every surface; consent buffering, cookie parity, anonymous-request refusal, 90-day retention, erasure, segment-window and cross-site browser assertions on each surface. The Shopify pixel and WooCommerce plugin have not run this expanded acceptance. RESULT-005's redirect consumes this clause's click token: it adds `mgo_c` to connected-store destinations once the token is built; until then the redirect adds nothing. ct 23 October 04:38Z: INT-002 stays done on its approved semantic, not evidence for this expanded acceptance. Before other CONT-018 work, implement 90-day onsite retention, withdrawal deletion and explicit HTTPS enforcement.
- **CONT-019 — US SMS consent capture** (partial). A form with phone capture shows the disclosure, the submission stores every evidence field, the confirmation text is sent once through the provider edge, and only a signed confirming reply subscribes; a pre-checked or missing disclosure blocks the form from publishing. Evidence: `src/core/features/sms/signup.ts` · `tests/audience-import/signup.spec.ts`.
- **CONT-020 — Engagement-based sunsetting** (missing). With imported engagement history, a review shows the unengaged count and exclusion; approving a sunset suppresses exactly those contacts and records the operator; no contact row is removed. Imported clicks and orders count at their original times, imported opens never count, and the no-history window starts at move-in completion (MOVE-009, CONT-012).
- **CONT-021 — US privacy requests** (partial). A Support operator records an access request and a do-not-share request; the export contains every record type for that contact and no other contact; the next ad-audience sync omits the contact. Evidence: `src/core/features/audience/erasure` · `tests/audience-import/erasure.spec.ts`.
- **CONT-022 — Contact search and bulk actions** (partial). A search for a property value returns the matching contacts; a bulk tag of 5,000 contacts completes as a job with a receipt; a bulk "add to topic" refuses contacts without covering evidence and names them. Evidence: `src/core/features/audience/ui/contact-merge.tsx`.
- **CONT-023 — Custom objects** (missing). An API journey creates a subscription object related to a contact, a flow triggers 14 days before its renewal date and personalizes with its plan name, and erasing the only related contact removes the object.
- **CONT-024 — Incumbent-held consent** (partial). A Mailchimp subscribed-file fixture has rows with both `OPTIN_TIME` and `CONFIRM_TIME`, rows with only `CONFIRM_TIME`, and rows with neither but with `LAST_CHANGED`. With the owner's attestation, all import as subscribed with incumbent-held evidence and reach the first campaign's review as eligible, with no confirmation message at the mail edge. The reconciliation report counts each evidence kind, and an unsubscribed row and a cleaned row in the same move-in stay unsubscribed and suppressed. Without the attestation, the same rows import as non-subscribed with a named reason. Revoking the attestation makes them non-subscribed, and an SMS row without a collection point stays non-subscribed for SMS. Evidence: `tests/move-in/archive.journeys.ts` account-export registration via `tests/move-in/incumbent-journey.ts` (Verify move-in): attestation, restrictive states, native export/restore, revocation and retained audit fact; campaign review records eligible contacts relying on that evidence at 1440/390. Current sandbox-safe account-export journey passed locally in 4.1 minutes. `tests/portability.spec.ts` (Verify main 4/6 for DATA-001; main 5/6 for erasure authority) proves populated native restoration. An attestation with one statement answered "not sure" subscribes no row of that move-in. A `postmaster@` row and a row whose country is outside the attested jurisdiction import non-subscribed with their named reasons. The DATA-001 export carries the attestation record with its operator, time, wording hash and answers, and each incumbent-held contact names that record. Erasing one such contact leaves the attestation record in place. Gap: Mailchimp archive source attestation and incumbent-held email evidence are exercised through the public preview, apply, campaign-review, native export/restore, revocation and erasure doors at 1440/390. Store connections (INT-001 to INT-006), five-year expiry and positive SMS evidence (A2P hold) remain unproved. A source without a row time requires an explicitly supplied export creation time. No real provider call or consent was used.
- **CONT-025 — Opt-in mode per form and source** (partial). `tests/go-live/shared-kiosk.journeys.ts` via `tests/go-live/opt-in-journey.ts` proves default double and single hosted captures with full evidence, no single-mode confirmation or destination reservation, one accepted capacity charge, confirmed-only public resubscription, future-only Owner/Admin mode changes with activity, denied Author/Manager/Support changes and Settings at 1440/390. `tests/go-live/sync-integrations.journeys.ts` proves the API capture path uses fixed double mode and one replay-safe confirmation. `tests/portability.spec.ts` covers policy restore. Default ADOPTED: Owner/Admin authority governs manual entry too. Store/move-in mode enforcement and the Shopify acceptance sentences, popup/landing sources, Zapier/Crank, SMS mode editing and ct approval remain open. No real provider call or consent was used.
- **CONT-026 — Contact added by hand** (partial). `tests/go-live/sync-integrations.journeys.ts` through `manual-entry-journey.ts` exercises Author entry, default email confirmation, operator-recorded single opt-in with named operator, properties, per-channel consent records, SMS pending until an exact-message authenticated YES reply, replay safety, protected destination refusal, Support/Analyst 403 and form/evidence screens at 1440/390. `tests/portability.spec.ts` covers the operator evidence round-trip; the hand-entry journey covers evidence, profile and SMS-sidecar removal. Gap: topic-specific permission, legacy email API attestation enforcement, the signed-out 403 wording (Base retains 401) and ct approval of Owner/Admin manual-mode authority. Named CONT-009 amendment: a signed provider reply POST confirms hand-entered SMS; no URL can confirm it. No real provider call or consent was used.
- **CONT-027 — Resubscribe through a public form** (partial). Acceptance for the approved rule (owner decision, 19 Oct 2026) must use the public signup and confirmation routes. A contact imported as unsubscribed from the Mailchimp fixture submits the popup with an incentive. They see the same generic acknowledgment as any visitor, and the mail edge receives one confirmation email sent to that destination address. Before confirming, they stay unsubscribed and receive no code and no campaign. GET and HEAD of the link, a POST without affirmative `confirm=true`, and an expired link leave them unsubscribed. Only their own affirmative POST from that confirmation email subscribes them with the new evidence for the form's topics; the code is emailed once, the next campaign includes them, their history shows the request and the confirmation, and REPORT-005 counts one resubscribe. Replaying the consumed link cannot subscribe again or reverse a later opt-out. Hard-bounced, complained, provider-suppressed, operator-suppressed and legally held destinations, including surviving suppression hashes, get the same generic acknowledgment as unsuppressed addresses, send nothing and change no consent or suppression state; a previously issued confirmation POST after suppression also cannot subscribe or release an incentive. At most three confirmation reservations and emails are allowed per destination address per UTC calendar day across public forms and kiosk capture, even from different networks: a fourth sends no further mail and returns the same generic acknowledgment; at 00:00 UTC the next day the allowance resets with confirmation and suppression guards intact. An erased contact's address submits and confirms, and becomes a new subscribed contact with no prior history. An unconfirmed request for another erased address is removed after expiry, leaving its opt-out record unchanged. An unsubscribed contact submitting a single opt-in form still receives the confirmation email and stays unsubscribed until their affirmative POST. `tests/go-live/resubscribe.journeys.ts` proves the approved hosted/kiosk path, same generic acknowledgment including the silently refused fourth request, hard-bounce/complaint/owner suppression refusal, later restriction precedence, history and separate list-growth resubscribe counts, with browser screens at 1440/390. Full popup/incentive/topic/flow acceptance and erased-contact supersession/expiry cleanup remain outstanding; ambiguous legacy erasure-only blocks remain refused.

### Proposals

- **PROP-001 — Decision Desk** (done). Decision Desk orders proposed suggestions by revenue then deadline. Evidence: `tests/proposals-decision/decision-routes.spec.ts`.
- **PROP-002 — Evidence** (done). Proposal detail shows observed values, event IDs, lookback, rules, as-of and methods. Evidence: `tests/proposals-decision/decision-routes.spec.ts`.
- **PROP-003 — Counts** (done). Counts apply real consent exclusions. Evidence: `tests/proposals-decision/decision-routes.spec.ts`.
- **PROP-004 — Content** (done). Generated content and sender are previewable and editable as a saved draft. Evidence: `tests/proposals-decision/decision-routes.spec.ts`.
- **PROP-005 — Owner control** (done). A proposal schedules nothing until a saved revision is approved. Evidence: `src/core/features/campaigns/adopt-proposal.ts` · `tests/proposals-decision/decision-routes.spec.ts`.
- **PROP-006 — Grounded generation** (done). Fabricated claims are rejected even with valid citations. Evidence: `tests/proposals-decision/decision-routes.spec.ts`.
- **PROP-007 — Generation failure** (done). Provider rejection yields a failed proposal with no substitute. Evidence: `tests/proposals-decision/proposal-states.spec.ts`.
- **PROP-008 — Forecast provenance** (done). Forecasts use only owned mature history and refuse thin history. Evidence: `tests/proposals-decision/decision-routes.spec.ts`.
- **PROP-009 — Proposal states** (done). Decisions record actor and time once. Evidence: `tests/proposals-decision/proposal-states.spec.ts`.

### Audiences

- **AUD-001 — Review snapshot** (done). Review snapshot counts per exclusion reason. Evidence: `tests/audience-controls/segments.spec.ts`.
- **AUD-002 — Consent and suppression** (done). Non-subscribed states are excluded regardless of rule. Evidence: `src/core/features/audience/eligibility.ts` · `tests/go-live/delivery.journeys.ts`.
- **AUD-003 — Commerce and dormancy exclusions** (done). One Shopify-backed product review lists recent-product-purchase (seven days), unresolved-refund, unresolved-return and dormant (twelve months), each with its count, at 1440/390. Resolved commerce and eleven-month activity stay eligible; thirteen-month activity is dormant. AUD-008 states how an operator turns the dormancy exclusion off for one campaign and retains that switch. Evidence: `tests/go-live/stale-sources.journeys.ts`.
- **AUD-004 — Frequency protection** (done). Frequency-window exclusions recorded, never deferred. Evidence: `src/core/features/audience/eligibility.ts` · `tests/go-live/open-estimates.journeys.ts`.
- **AUD-005 — Dispatch recheck** (done). Eligibility rechecked at dispatch and before each hand-off. Evidence: `tests/audience-controls/merge.spec.ts` · `tests/go-live/delivery.journeys.ts`.
- **AUD-006 — Multi-step exit** (done). Each later step re-applies its audience and exclusion rules; a contact who converts or becomes ineligible after an earlier step receives no later step. The two-step journey changes inclusion, a custom exclusion and consent after the first send, verifies named skip reasons at the second step, sends only to the still-eligible control, and keeps newly matching contacts outside the frozen audience. Evidence: `tests/go-live/multistep.journeys.ts`.
- **AUD-007 — Frozen candidate set** (done). Approval freezes the candidate set. Evidence: `tests/audience-controls/segments.spec.ts`.
- **AUD-008 — Inactivity rules in review** (partial). A Mailchimp move-in fixture of contacts subscribed two years ago reaches the first campaign's review with no `dormant` exclusion, both for contacts whose `granular_activity` shows a click three months ago and for contacts with no activity rows (counted as `no-history`); a contact whose last imported click is 13 months old is excluded as `dormant`; turning the exclusion off for that campaign includes them, and the approved revision and activity log record the choice and its approver. The review also counts `open-only` contacts within `dormant` and includes them in one action, and an Owner or Admin's installation-wide default is recorded in the activity log. Current evidence: `tests/move-in/archive.journeys.ts` · `tests/go-live/roles.journeys.ts`. Review shows dormant/open-only and included no-history counts. An approver can include open-only or disable dormancy for the campaign, with the restored count saved; Owner/Admin defaults under audience.exclusions.v1 copy into new drafts. The immutable approved policy, actor audit and dispatch recheck are exercised. Gap: unengaged (CONT-020), dormant precedence over unengaged, and flow-message inactivity controls remain owed. Existing fieldset, checkbox, numeric input and action patterns suffice; no new design pattern is introduced.
- **AUD-009 — Frequency protection: one policy and a recorded override** (partial). Two campaigns to the same audience are approved four hours apart. With the default, the second excludes everyone the first emailed, with `frequency-window`. With the override recorded at the second's approval, it hands off to them, the override and its approver appear in the activity log, and a contact who unsubscribed between the two sends is still excluded. A contact emailed a campaign in the morning still receives that afternoon's abandoned-cart message from the library flow, a draft flow made from a Mailchimp journey fixture carries the same setting, and its activation shows the 30-day skip count from seeded sends. Evidence: `src/core/features/lifecycle/policies.ts` · `src/core/features/audience/eligibility.ts`.

### Campaigns

- **CAMP-001 — States** (done). Campaign state transitions with actor and time. Evidence: `tests/campaign-results/results.journeys.ts`.
- **CAMP-002 — Draft editing** (done). Draft editing persists every field; the body size limit is proved under BUILD-012. Evidence: `tests/campaign-authoring/browser.spec.ts`.
- **CAMP-003 — Revision preview** (done). Previews render from the saved revision. Evidence: `tests/campaign-authoring/browser.spec.ts` · `tests/campaign-authoring/canonical-save.spec.ts`.
- **CAMP-004 — Approval checks** (done). Approval names every blocking check. Evidence: `tests/campaign-authoring/browser.spec.ts` · `tests/campaign-authoring/create-api.spec.ts`.
- **CAMP-005 — Idempotent approval** (done). Repeated approval produces one schedule. Evidence: `tests/campaign-authoring/browser.spec.ts`.
- **CAMP-006 — Schedule** (done). DST-invalid local times are rejected. Evidence: `tests/campaign-authoring/browser.spec.ts`.
- **CAMP-007 — Scheduled edits** (done). Replacement approval wins a forced D1 ordering without mixing revisions. Evidence: `tests/go-live/delivery.journeys.ts`.
- **CAMP-008 — Test send** (done). Test sends reach only operator addresses and change no reporting. Evidence: `tests/go-live/go-live.journeys.ts`.
- **CAMP-009 — Cancellation** (done). Cancellation stops unsent recipient-steps within 30 seconds. Evidence: `tests/campaign-results/results.journeys.ts`.
- **CAMP-010 — Step deadline** (done). Missed deadlines skip with `deadline-passed`. Evidence: `tests/go-live/scheduler.journeys.ts`.
- **CAMP-011 — Dispatch punctuality** (done). Each step dispatches once within 60 seconds. Evidence: `tests/go-live/scheduler.journeys.ts`.
- **CAMP-012 — Campaign images** (done). Image upload, immutable serving and erasure. Evidence: `tests/campaign-assets.spec.ts` · `tests/campaign-authoring/local-images.spec.ts`.
- **CAMP-013 — Recipient-local send time** (missing). A campaign approved for 10:00 recipient-local hands off New York, Chicago and Los Angeles recipients at their own 10:00 in the scheduler journey, and an unknown-zone recipient at 10:00 store time with review showing that count.
- **CAMP-014 — Pause and resume** (done). The two-step Worker/Queue journey pauses before dispatch and at a handoff fence, resumes with current consent and frequency checks, preserves accepted handoffs and actor history, and skips an expired send window, at 1440 and 390 pixels. Evidence: `tests/go-live/pause.journeys.ts`.
- **CAMP-015 — Marketing calendar** (missing). The calendar shows a scheduled campaign, a sent campaign and a live flow's estimate on the right days; dragging the scheduled one opens a new draft revision while the approved one stays active.
- **CAMP-016 — Follow-up to non-engaged recipients** (done). A follow-up created 48 hours after a send targets exactly the non-clickers minus those excluded at review, and requires its own approval. The journey also covers labeled non-open estimates, scanner-only readers, current consent and frequency exclusions, independent approval, source revision preservation and portability. Evidence: `tests/campaign-results/followup.journeys.ts` · `tests/portability.spec.ts`.
- **CAMP-017 — Recurring and RSS-to-email campaigns** (missing). An RSS campaign with two new feed items builds a draft containing both, and under standing approval the next instance sends while a changed template holds it for review.
- **CAMP-018 — Duplicate a campaign** (done). Duplicating last week's sent campaign yields a draft with no schedule or approval, whose stored body re-parses to the source revision's bytes and whose audience rule and sender match; editing and approving the copy leaves the source's approved revision and results unchanged. Evidence: `tests/campaign-authoring/browser.spec.ts` · `tests/campaign-authoring/reuse-journey.ts`.
- **CAMP-019 — Test send to typed addresses** (partial). A Manager types two addresses and both receive the marked test at the mail edge; a third, unsubscribed address is refused and named; an Author has no typed-address field and the route answers 403; the activity log lists the typed addresses. Before sending, the owner sees the allowance remaining; a two-recipient test reduces it by two, and a hand-off with an uncertain provider outcome still consumes one unit. With one unit left, a two-recipient test is refused before either hand-off and names the remaining one. Crossing 00:00 UTC restores the configured allowance without carrying the prior day's attempts forward. Configured-address tests and typed-address tests draw from the same count. This clause is done only when OPER-004 (Manager/Author assignment), OPER-007 (general activity UI), SMS-001 (typed SMS transport) and CONT-019 (typed SMS consent) are done. Evidence for the implemented email scope: `tests/go-live/typed-tests.journeys.ts` · `src/core/features/lifecycle/test-send-allowance.ts` · `src/core/features/lifecycle/test-destinations.ts`. Up to five typed email recipients receive marked saved-draft tests with opt-out/suppression refusal and destination/actor history. Remaining allowance is visible; whole-request quota admission is atomic and names the remaining count on refusal. Configured and typed attempts share the UTC-day count, including uncertain outcomes, with midnight reset exercised. Authors see configured destinations only and typed requests receive 403; assigned Manager typed tests and Author configured tests are exercised by `tests/go-live/roles.journeys.ts`. Activity actor/time, action/object filters, CSV and erased-contact destination redaction are exercised in that same go-live 8/9 registration at 1440/390. Typed SMS consent/transport and full role acceptance remain outstanding.

### Designs

- **DESIGN-001 — Optional design module** (done). Disabled design module offers nothing and refuses runs. Evidence: `tests/campaign-authoring/design-generation.spec.ts`.
- **DESIGN-002 — Draft-only design generation** (done). A brief becomes an unsaved body through the import path. Evidence: `tests/campaign-authoring/design-generation.spec.ts`.
- **DESIGN-003 — Design data and records** (done). A run sends only the brief, never buys twice and records costs. Evidence: `tests/campaign-authoring/design-generation.spec.ts`.
- **DESIGN-004 — Design import** (done). A LayerDoc imports as an unsaved body that passes approval and BUILD-012's measured per-part UTF-8 size check: at most 102,400 bytes for each of the HTML and plain-text parts (`seed.json → limits.maxEmailHtmlBytes`, `src/core/features/campaigns/email-size.ts`), replacing the historical 20,000-character cap of the 13 October 2026 policy. Evidence: `tests/campaign-authoring/design-import.spec.ts`.

### Message safety

- **MSG-001 — Sender identity** (partial). Email identity is proved; per-country registered SMS senders await SMS-001 and SMS-002. Evidence: `src/core/features/settings/sender-validation.ts` · `tests/settings-sender/routes.spec.ts`.
- **MSG-002 — Email authentication** (done). SPF, DKIM and DMARC alignment gate scheduling. Evidence: `tests/sender-verification/worker.spec.ts`.
- **MSG-003 — Email unsubscribe** (done). One-click and visible unsubscribe behave as mail clients send them. Evidence: `tests/go-live/go-live.journeys.ts` · `tests/sender-verification/worker.spec.ts`.
- **MSG-004 — SMS permission** (partial). SMS eligibility needs subscribed scope and an approved sender; US registration pending. Evidence: `src/core/features/sms/transport-guard.ts`.
- **MSG-005 — SMS opt-out** (done). On the Mobile Message edge, review of an SMS step for a confirmed SMS contact shows the rendered example with the configured program identity, `Reply STOP to unsubscribe`, the configured frequency disclosure, the help contact and the exact segment count at 1440 and 390. Evidence: `tests/go-live/content-checks.journeys.ts`, `src/core/features/sms/review-preview.ts`.
- **MSG-006 — Links** (done). One draft with a malformed link, `http:`, `javascript:`, `data:` and `file:` links, a redirect to an unlisted host, an `http:` image and an HTTPS image on an unlisted host is blocked at review and approval; every blocked link is named with its scheme, fault or host, only unlisted HTTPS hosts offer Allow this host, and `mailto:`/`tel:` links never need it, at 1440 and 390. FLOW-008 and RESULT-005 inherit the rule. Evidence: `tests/go-live/content-checks.journeys.ts`, `src/core/features/campaigns/link-reasons.ts`.
- **MSG-007 — Content checks** (done). The native Worker/D1 journey shows advisory and blocking findings, acknowledges only the exact saved advisory, retains its actor and time across reload and replay, invalidates it after an edit, refuses safety-check acknowledgments and still blocks approval until the content is corrected. Review is exercised at 1440 and 390 pixels. Evidence: `tests/go-live/content-checks.journeys.ts`.
- **MSG-008 — Personalization** (done). The native Worker/D1 journey refuses tokens without fallbacks even on an audience where every eligible contact resolves the token, counts eligible fallback recipients rather than token occurrences, excludes pending contacts from those counts and preserves the counts on approval. Names render escaped in HTML and unchanged in text; a contact labeled only by their destination uses the saved fallback. Preview supplies an illustrative value only for `displayName`, the name field available to delivery; `first_name`, `name` and other unavailable properties use their saved fallbacks in preview and provider output. Editor, preview and review are exercised at 1440 and 390 pixels, then the provider payloads are checked. Evidence: `tests/go-live/personalisation.journeys.ts`.
- **MSG-009 — Email body** (done). One parser and checker decide approval, test send and delivery; the size limit is proved under BUILD-012. Evidence: `tests/campaign-authoring/canonical-save.spec.ts`.
- **MSG-010 — Unsubscribe availability** (done). The native Worker journey measures complete confirmation GET and one-click POST responses below 2 seconds, exhausts one token's shared GET/POST allowance from `seed.json`, and receives 429 without affecting another recipient's token from the same client IP. Confirmation and success pages fit 1440 and 390; both opt-outs prevent already-approved deliveries and survive provider reconciliation. This is a local measured path, not a hosted latency measurement. Evidence: `tests/go-live/opt-out-reasons.journeys.ts`.
- **MSG-011 — Sending reputation** (done). Complaint and bounce-rate blocks with named figures. Evidence: `tests/go-live/delivery.journeys.ts`.
- **MSG-012 — Hidden or deceptive presentation** (done). Hidden or low-contrast text blocks approval. Evidence: `tests/campaign-authoring/canonical-save.spec.ts`.
- **MSG-013 — Contact links (`mailto:`, `tel:`, `sms:`)** (done). A draft with `mailto:hello@myshop.example?subject=Order%20question`, `tel:+15555550123` and `sms:+15555550123?body=Hi` approves; review lists each decoded, and the delivered HTML and plain text carry each unchanged and unrewritten. `mailto:a@x.example,b@x.example`, `mailto:a@x.example?bcc=c@x.example`, `tel:call-me`, `javascript:alert(1)` and `http://myshop.example` each block with the reason named. The journey exercises the Web, Email, Phone and Text link tool and authored HTML through saved review, exact-revision approval and provider-edge delivery, with no tracked-link or click fact for contact links. Evidence: `tests/go-live/contact-links.journeys.ts`.
- **MSG-014 — Allowed link and image hosts** (partial). Fresh installations expose deployment, conservative social defaults and genuine configured connection hosts with source labels; operator removal is durable across a real catalog sync. The existing exact/wildcard, deceptive-suffix, review allowance and audit assertions remain. Evidence: `tests/go-live/content-checks.journeys.ts` / `tests/go-live/content-hosts.ts` (1440 and 390), `tests/portability.spec.ts` (populated upgrade, exclusion restore). Gap: Shopify storefront/additional/image host data is not stored; product/social blocks, brand kit, flow activation and Shopify disconnect remain unproved. Existing explicit policies are preserved. The store-owned editor help about subdomains needs its owner's correction; approval of the closed social vocabulary is pending. No real provider call or consent was used.
- **MSG-015 — Allow a blocked host from review** (done). Review names each blocked host and its links, including redirect hosts. Authors see no allow action and receive 403; a Manager allows a host, the stored list appends it, checks rerun and approval passes. The append-only row names operator, host and campaign through Owner/Admin GET /api/activity, newest first with operator/action/object filters. An imported Mailchimp template lists three outside hosts with allow actions at 1440/390. Exact and explicit wildcard matching agree across approval, inspection and tracking; deceptive suffixes remain blocked. OPER-007 inherits the full cross-product screen, CSV and every action type (ct pattern 2, c4 authorized default). Evidence: `tests/go-live/content-checks.journeys.ts`.

### Delivery

- **SEND-001 — Provider hand-off** (done). Hand-off fencing and idempotency. Evidence: `tests/go-live/managed-mail.journeys.ts` · `tests/go-live/resend-delivery.journeys.ts`.
- **SEND-002 — Quiet hours** (partial). Recipient-local SMS windows; US defaults in SMS-003. Evidence: `src/core/features/sms/policy.ts`.
- **SEND-003 — Throttling and progress** (done). Paced hand-offs with live progress. Evidence: `tests/go-live/delivery.journeys.ts`.
- **SEND-004 — Transport failure** (done). Increasing retries within the hour and terminal reasons. Evidence: `tests/go-live/delivery-recovery.journeys.ts` · `tests/go-live/delivery.journeys.ts`.
- **SEND-005 — Provider-event identity** (done). Signed provider facts stored once. Evidence: `tests/go-live/go-live.journeys.ts` · `tests/go-live/delivery-recovery.journeys.ts`.
- **SEND-006 — Delivery truth** (done). Delivered only from a provider delivery fact. Evidence: `tests/go-live/go-live.journeys.ts` · `tests/go-live/scheduler.journeys.ts`.
- **SEND-007 — Partial completion** (done). Completion needs terminal dispositions; totals stay separate. Evidence: `tests/go-live/go-live.journeys.ts` · `tests/campaign-results/results.journeys.ts`.
- **SEND-008 — Resumable dispatch and reconciliation** (done). Resumable dispatch and reconciliation. Evidence: `tests/go-live/go-live.journeys.ts` · `tests/go-live/resend-delivery.journeys.ts`.
- **SEND-009 — Provider outage** (done). Outage pause and probe-driven resume. Evidence: `src/core/features/lifecycle/provider-outages.ts` · `tests/go-live/delivery-recovery.journeys.ts`.

### Results

- **RESULT-001 — Campaign history** (done). Campaign history by state and channel. Evidence: `tests/campaign-results/results.journeys.ts`.
- **RESULT-002 — Engagement** (done). Opens off by default and labeled estimates when enabled. Evidence: `tests/go-live/open-estimates.journeys.ts`.
- **RESULT-003 — Attribution** (done). Evidence: `tests/campaign-results/performance.journeys.ts` — “[REPORT-002] [RESULT-005][RESULT-003][REPORT-003] campaign filters, exact CSV rows and optional open estimates at 1440; native commerce and cross-channel attribution at 1440 and 390” (via `tests/campaign-results/performance-fixture.ts`: signed Shopify orders, latest qualifying click across two campaigns, webhook replay and later sync without duplicate or moved attribution, expired/scanner-only/no-click exclusions, partial/full refunds and cancellation in USD/JPY, API/CSV/Insights net amounts and the existing campaign-results drill-down naming each Shopify order and seven-day window separately from forecasts; 1440/390 overflow and axe checks).
- **RESULT-004 — Cost** (done). Provider and AI costs by campaign and UTC day. Evidence: `tests/campaign-results/costs.journeys.ts`.
- **RESULT-005 — Link tracking** (done). Evidence: `tests/campaign-results/performance.journeys.ts` — “[REPORT-002] [RESULT-005][RESULT-003][REPORT-003] campaign filters, exact CSV rows and optional open estimates at 1440; native commerce and cross-channel attribution at 1440 and 390” (via `tests/campaign-results/tracking-journey.ts`: actual per-recipient-step links without recipient/campaign/revision identity, exact connected-store redirect with no cookie or body, retained scanner excluded from totals/unique clicks/click map/CSV/attribution, the same delivered link still forwarding exactly with no cookie or body after its click-recording window (30 days after send-by) closes, while recording nothing for a person or a scanner, “mailto:”, “tel:” and “sms:” links in the same tracked message delivered byte for byte with no redirect and zero clicks in the API, CSV and click map, and the operator tracking-off control through delivery and destination request). `tests/go-live/contact-links.journeys.ts` — “[DELIV-002][MSG-013][RESULT-005] contact links survive authoring, exact approval and delivery without tracking” proves the same contact links through the link tool and approval with tracking off. `tests/go-live/open-estimates.journeys.ts` — “[RESULT-002][CONT-013] explicit open estimates are isolated, revocable, replay safe and erased” retains the 13 October policy. CONT-018 owns its unbuilt click token, which this redirect consumes; until it is built these redirects add nothing.
- **RESULT-006 — Deliverability reporting** (partial). Per-domain rates shown; SMS sender rates await SMS-001. Evidence: `src/core/features/insights/ui/sender-rates.tsx` · `tests/go-live/delivery.journeys.ts`.
- **RESULT-007 — Click map, per-link clicks and clicker lists** (partial). A seeded send has three links; some recipients click one link twice, and a known scanner requests every link. The report shows each link's total and unique clicks, with the scanner excluded. One link's clicker list equals the seeded clickers and exports as CSV with the same rows, and a segment started from it holds exactly those contacts. Evidence: `tests/campaign-results/results.journeys.ts` · `tests/campaign-results/reporting-journey.ts`. Current scope and remaining work: Campaign links show human totals, unique identified clickers, automated requests, a saved-revision click map, matching clicker CSV and exact saved ID cohorts. Gap: repeated positions with one destination share counts; legacy clicks without destination identity remain unassigned; erased click facts are removed rather than retained as anonymous link counts; campaign-wide unique rollups, flow reports and role masking are absent; very large saved cohorts require CSV.
- **RESULT-008 — Recipients per outcome** (partial). Message-bound visible link, RFC 8058 one-click and authenticated SMS marketing reply retain their method and first time. Replays do not change attribution. The recipient list and CSV agree, and actual erasure keeps anonymous unsubscribe counts equal to campaign performance. Historical methods remain unrecorded. Evidence: `tests/campaign-results/performance.journeys.ts`, `tests/campaign-results/recipient-method-journey.ts` (1440 and 390), `tests/campaign-results/results.journeys.ts`, `tests/portability.spec.ts` (populated upgrade and restore). Gap: flow messages, role masking and very large saved cohorts beyond CSV. No real provider call or consent was used.

### Data

- **DATA-001 — Export contents** (done). Complete export and restore into an empty installation. Evidence: `tests/portability.spec.ts` · `tests/go-live/go-live.journeys.ts` · `tests/local-start/command-data.journey.ts`.

### Capacity

- **SCALE-001 — Capacity for the first buyer** (partial). A generated installation of 250,000 contacts with a year of order and activity events passes the MOVE-012 move-in, an exact review count within 60 seconds, a complete hand-off to the provider edge at the declared rate with no duplicate (SEND-001), and a segment update within SEG-002's time, with wall time and peak memory recorded against `seed.json → limits`; the per-email size floor is proved under BUILD-012, and the intake floor under FORM-008. Evidence: `seed.json` · `src/core/features/audience/import-limits.ts`.

### Growth: forms, popups and landing pages

- **FORM-001 — Hosted and embedded signup** (done). `tests/audience-import/signup.spec.ts` (public signup stays pending until the single-use confirmation; embed origins enforced). Evidence: `src/core/features/audience/signup-routes.ts` · `tests/audience-import/signup.spec.ts`.
- **FORM-002 — Popups, flyouts and full-page forms** (missing). A browser journey on a test storefront page shows an exit-intent popup once, submits it, sees the success state, and on reload is not shown again; an axe pass on the open popup has no serious violations.
- **FORM-003 — Multi-step capture and incentives** (missing). A two-step submission creates pending email and SMS states; the code is shown and emailed only after confirmation, and a second submission with the same address issues no second code.
- **FORM-004 — Landing pages** (missing). An operator publishes a waitlist page on a custom subdomain, a visitor signs up and confirms, and the file link works once confirmed and answers 404 before.
- **FORM-005 — Form performance and tests** (missing). Two variants each shown to half the sessions in a journey report their own views, submissions and confirmations, and no winner is named below the declared evidence threshold.
- **FORM-006 — Referral program** (missing). Three confirmed referrals unlock the milestone and send the reward email once; an unconfirmed fourth and a self-referral do not count.
- **FORM-007 — Abuse resistance** (done). `tests/audience-import/signup.spec.ts` security cases (allowances, Turnstile fail-closed, status-free acknowledgment). Evidence: `src/core/features/audience/signup-security.ts` · `tests/audience-import/signup.spec.ts`.
- **FORM-008 — Signup intake capacity** (partial). Evidence: `tests/go-live/shared-kiosk.journeys.ts` via `tests/go-live/signup-capacity-journey.ts` exercises 600 captures across 200 networks, full 100-request minute bursts, 200 bot attempts without accepted charge, one reservation for concurrent duplicates, 30/120 on the same network, separate unchallenged flood and challenged capacity, Owner-only next-window changes, floor/ceiling refusals, challenge permissions and Settings at 1440/390. `tests/audience-import/signup-security.spec.ts` and `tests/audience-import/signup-reservation-clock.spec.ts` preserve restart, address grouping, database clock, one-use/expired challenge and last-slot concurrency. `tests/portability.spec.ts` preserves populated settings through upgrade and restores capacity revisions without resuming sends; the existing erased-optout case removes linked refused-network state. Gap/default ADOPTED: hosted form substitutes for the absent popup carrier; FORM-002 to FORM-004, FORM-005's report wording, CONT-025 single opt-in and ct approval of the landed capacity default remain pending. No real provider call or consent was used. The existing `tests/audience-import/signup-reservation-clock.spec.ts` measures the actual D1 admission interval for the new minute partition; destination-dependent daily refusals retain their status-free 202 acknowledgement.
- **FORM-009 — Kiosk and event forms** (done). 30 signups from one network address to a form marked as a kiosk form are all accepted, each after its own challenge. After each success, the form is blank within 5 seconds, and the next submission carries no field, cookie or identity from the one before. A submission without a passed challenge is refused. Evidence: `tests/go-live/shared-kiosk.journeys.ts` · `src/core/features/audience/signup-routes.ts` · `src/core/features/audience/ui/kiosk-signup-page.tsx` · `migrations/core/0075_kiosk_forms.sql`. The native journey exercises server-owned marking and the device label, 300 accepted signups from one network, a fresh mandatory challenge for each person, a blank reset within two seconds, no visitor cookies/storage, operator attribution and confirmed kiosk-source reporting in Insights. Turnstile provisioning and ordinary-form intake remain FORM-008 obligations; the hosted/kiosk resubscribe path is exercised separately under CONT-027.
- **FORM-010 — Refused signups are never silent** (partial). Hosted and kiosk capacity refusals answer 429 with `Retry-After`, show the required error with entries retained and no success, and appear in Settings by UTC hour/form/reason and in Home's rolling-hour alert. The fourth destination confirmation retains the generic acknowledgment and sends no further mail. Evidence: `tests/go-live/shared-kiosk.journeys.ts` via `tests/go-live/signup-refusal-screens.ts` (1440/390, overflow and axe), `tests/audience-import/signup-security.spec.ts` (durable global last slot), `tests/audience-import/signup-reservation-clock.spec.ts` (database clock), `tests/go-live/resubscribe.journeys.ts` (destination daily allowance), `tests/go-live/sync-integrations.journeys.ts` via `tests/go-live/activity-log.ts` (one summary per closed hour). Gap/default ADOPTED: counts are on Settings; FORM-005's form report remains unbuilt and no clause sentence is changed. Network-edge fixtures only; no real provider call or consent was used.

### Segments and predictions

- **SEG-001 — Segment builder** (done). A saved segment over an event count with a value filter and a US state condition returns exactly the matching seeded contacts in review, and its summary names every condition. Evidence: `tests/audience-controls/segments.spec.ts` — “AUD-001 AUD-002 AUD-007 CAMP-004 nested saved segments select exact contacts by count, event value, window and state at 1440/390; copied rules remain immutable”, with `tests/audience-controls/segment-journey.ts`, `tests/audience-controls/segment-catalog.ts` and `tests/audience-controls/segment-fixture.ts`; `tests/campaign-results/performance.journeys.ts` — “[REPORT-002] [RESULT-005][RESULT-003][REPORT-003] campaign filters, exact CSV rows and optional open estimates at 1440; native commerce and cross-channel attribution at 1440 and 390” (via `tests/campaign-results/cross-channel-attribution.ts`) for human email and SMS clicks in the last N days. Proven: a saved nested all/any segment with Placed Order count, a same-event value/currency filter and US state returns exactly the matching contacts in review, including count, value, time-window and state boundary cases. The builder live estimate and plain-text summary name every condition; review recomputes membership and approval freezes the same exact IDs. Recorded properties, tags, consent/topics, bought products, ZIP/distance and RFM also pass through review. Collections and categories bought: Shopify product sync records each product's collection IDs (every page drained) and taxonomy category (null when uncategorized); before the catalog is recorded both conditions are unavailable rather than empty; a builder segment nesting US state with an any-group of bought collection and bought category shows both in its summary and a live estimate equal to review, and review selects exactly the contacts who bought from the collection or in the category (not those who bought only from another collection, only in other categories, only in a future order, or nothing); when Shopify removes a product from the collection, recount drops its earlier buyer. Builder and review are exercised at 1440 and 390 with no overflow or accessibility violations (sandboxed authored email preview is asserted directly). Contacts use the integration door; products and orders use the Shopify sync door; no direct rows. Inherited: campaign/link/flow activity by SEG-006, predictions by SEG-004, and products, collections and categories viewed by CONT-018. Collection and category membership is the synced catalog's current placement; ZIP distance uses Census ZIP-area representative points.
- **SEG-002 — Live membership** (missing). A Placed Order event moves a contact into a "repeat buyer" segment within five minutes, emits one entry event, and a flow triggered by that entry enrolls them once.
- **SEG-003 — RFM and lifecycle stages** (done). With a seeded order history, the stage distribution and one contact's scores match an independent calculation of the documented method. Evidence: `tests/campaign-results/results.journeys.ts` · `tests/campaign-results/retention-journey.ts`.
- **SEG-004 — Predictions** (missing). On a seeded history above the minimum, predictions appear with method and back-test error; on a history below it, the segment builder marks prediction conditions unavailable.
- **SEG-005 — Engagement and lead scoring** (missing). A contact who clicks twice and submits a form reaches the configured score, which decays after the configured period. Imported clicks (MOVE-009) count at their original times for both the score and its decay; imported opens never change the score.
- **SEG-006 — Campaign and flow activity conditions** (missing). After a seeded campaign X with known recipients and clickers, "received campaign X and did not click" returns exactly the seeded non-clickers, and "clicked link 2 of campaign X" returns exactly that link's clickers. "Did not click any of the last 5 campaigns" returns exactly the seeded contacts with no clicks across five seeded sends. The same conditions over an imported Mailchimp campaign return the contacts its `granular_activity` file names, using original click times and imported campaign/link identities; imported opens never satisfy engagement conditions (MOVE-009).

### Email builder and content

- **BUILD-001 — Drag-and-drop email builder** (partial). A browser journey builds a two-column email with product and button blocks, saves, reopens it unchanged, previews at desktop and mobile widths with the columns stacked at 375 pixels (BUILD-010) and approves it; the stored body re-parses to the same bytes (CAMP-003 policy). A full promotional email saves, reopens and approves within BUILD-012's limit, with its sent size shown throughout. Evidence: existing PROP-004 registration in `tests/proposals-decision/decision-routes.spec.ts` via `tests/campaign-authoring/block-builder-journey.ts` (Verify main 6/7; 1440/390 and stacked 375px); full promotional-email acceptance remains unproved.
- **BUILD-002 — Template library** (partial). An operator saves a draft as a template, starts a second campaign from it, edits the template, and the first campaign's approved revision is unchanged. Evidence: `tests/campaign-authoring/browser.spec.ts` · `tests/campaign-authoring/reuse-journey.ts`; flow-library byte custody is in `tests/campaign-authoring/canonical-save.spec.ts` via `tests/campaign-authoring/flow-template-journey.ts` in the existing saved-body round-trip registration (Verify main 4/7; 1440/390). Current scope and remaining work: Starter and saved templates create independent unscheduled campaigns; updating a template preserves existing drafts and approvals. Gap: flow-message use and automatic placement of imported/generated/migrated designs in the library await their owning integrations. Evidence: `tests/go-live/contact-links.journeys.ts` (Verify go-live 1/9) imports the Klaviyo template through the public source review; `tests/portability.spec.ts` preserves it. Gap: full importer coverage, executable migrated flows and real-provider sandbox proof remain.
- **BUILD-003 — Brand kit** (missing). Proposing a kit from a test storefront page at the network edge yields its logo and two colors for review, and accepting it styles a new template.
- **BUILD-004 — Reusable blocks** (partial). Editing a reusable footer updates two drafts and creates a new draft revision of one live flow message, while the live revision keeps sending the old footer until activation. Evidence: existing PROP-004 registration in `tests/proposals-decision/decision-routes.spec.ts` via `tests/campaign-authoring/block-builder-journey.ts` and `tests/campaign-authoring/reusable-block-journey.ts` (Verify main 6/7; 1440/390) proves linked draft updates, a new unapproved campaign revision with approved bytes retained, and a FLOW-001 draft email; DATA-001 in `tests/portability.spec.ts` (Verify main 5/7) proves native restoration. Gap: live flow revisions and activation (FLOW-008 unbuilt) and template-library sync beyond BUILD-002's copy rule.
- **BUILD-005 — Conditional content** (missing). A VIP-only block appears in the preview as a VIP contact and not as another, and both recipients' plain-text parts match their HTML.
- **BUILD-006 — Dynamic product content** (missing). An abandoned-cart message for a contact with two items renders both items with current prices; marking one out of stock before hand-off removes it; a personalized grid excludes products the contact already bought. Its `cdn.shopify.com` images and storefront links pass MSG-006 with no settings change (MSG-014).
- **BUILD-007 — Coupons** (missing). A flow message hands off with a unique Shopify code per recipient at the store edge; a store-side failure records `coupon-unavailable` and sends nothing for that recipient.
- **BUILD-008 — Previews and pre-send checks** (done). The native Worker/D1 journey shows located alt, heading, link-text, wording and 95 KB size advisories with the limit and largest blocks; acknowledgments bind the exact revision, stale acknowledgments fail and contrast still blocks. Saved-contact names render escaped in desktop, mobile, dark approximation and plain text with delivery fallbacks; review and approved views work at 1440 and 390. A 110 KB multibyte body is refused without losing edits. Evidence: `tests/go-live/presend-checks.journeys.ts` · `tests/go-live/email-size.journeys.ts`.
- **BUILD-009 — SMS and MMS composer** (partial). A message with an emoji switches to UCS-2 and shows the new segment count and cost; the preview shows the short link and STOP text that will be sent. Evidence: `src/core/features/sms/content.ts` · `src/core/features/sms/review-preview.ts`.
- **BUILD-010 — Mobile layout the checker can prove** (partial). A browser journey builds a two-column email with one block set to hide on mobile and a mobile font size on another, saves it, and renders the stored body at 375 and 600 pixels in standards and quirks mode. At 375 the columns are stacked, the hidden block is absent and the mobile size applies. At 600 the columns sit side by side and the block is present. With the `<style>` element stripped, the columns still stack at 375. The stored body passes the MSG-012 checker in both trees. A hand-written `<style>` element or class in HTML view is refused with the reason named. A block set to hide on desktop is absent at 600 pixels and present at 375, and with the `<style>` element stripped it is present at both widths. The stored `<style>` sits in `<head>`, every generated declaration carries `!important`, and a hand-written `!important` in a `style` attribute is still refused. A configuration whose generated block would exceed 8,192 bytes is refused at save with the size named. Evidence: `tests/campaign-authoring/canonical-save.spec.ts` — existing saving/approval-tree registration (Verify main 4/7), via `tests/campaign-authoring/mobile-presentation-journey.ts`: all 138 `tests/support/adversarial-email.mjs` cases, generated/authored CSS and hidden-compliance refusals, exact generated bytes in sent-size accounting, eight stored-body 375/600 standards/quirks renders with/without style, nonblank inert Preview and serious-axe/overflow/hydration proof at 1440/390. The same registration includes `tests/campaign-authoring/block-builder-journey.ts` · blockMobileControlsJourney for native hide, font, line-height, padding and alignment controls at 1440/390 and 375px computed styles, under its unchanged 180-second cap; shell axe runs directly to avoid sandbox child-frame discovery. `tests/campaign-authoring/design-import.spec.ts` exercises the fluid column compiler. Gap: nested/horizontal orientation and the complete editor acceptance remain unbuilt or unproved. Per-block controls use BUILD-001's block model. Preview names hide on mobile/desktop, font size, line height, padding and alignment as dependent on the generated block. Conservative generated-only head style, 8192-byte bound and fail-visible desktop hiding defaults ADOPTED. No registration, timeout, shard count or cap was added or raised.
- **BUILD-011 — Chosen catalog products** (partial). An operator picks two products from the Shopify edge catalog, one with a chosen variant, and preview shows their current images and prices. The edge raises one price before hand-off and the delivered email carries the new price; marking the other unpublished hides it and campaign detail counts it. Evidence: `tests/go-live/multistep.journeys.ts` via `tests/go-live/chosen-catalog-journey.ts` exercises the Shopify edge picker, current previews, changed hand-off price, item availability and campaign outcome counts at 1440/390; partial proposal, with WooCommerce and exact-SHA landing evidence pending. Evidence: `tests/local-start/signin-hydration.journey.ts` — [OPER-001][BUILD-011][BUILD-012] one-click local owner sign-in works before JavaScript at 390px; chosen catalog promotions bound configured items and recheck handoff via `tests/campaign-authoring/chosen-size-journey.ts` proves the six-item Shopify promotional email, configured hidden-item size bounds, saved-copy refusals, browser edit retention at 1440/390, exact provider-edge bytes and live growth send/skip outcomes. Evidence: `tests/local-start/signin-hydration.journey.ts` — [OPER-001][BUILD-011][BUILD-012] one-click local owner sign-in works before JavaScript at 390px; chosen catalog promotions bound configured items and recheck handoff via `tests/campaign-authoring/catalog-guard-journey.ts` proves catalog role/anonymous denials without edge reads, named malformed-state refusals without writes, escaped opaque values and counted unsafe hand-off skips, and identifier-only template/start/duplicate/follow-up copies with configured-item bounds and fresh title, price and image reads; imported and flow authoring remain unproved.
- **BUILD-012 — Email size the builder and imported templates fit in** (partial). The Worker/D1/provider-edge journey saves and reopens a newsletter above the historical 20,000-character cap of the 13 October 2026 DESIGN-004 policy, enforces the 102,400-byte UTF-8 limit separately for HTML and plain text (`seed.json → limits.maxEmailHtmlBytes`, `src/core/features/campaigns/email-size.ts`), measures escaped names and rewritten links, refuses multibyte oversize content while retaining browser edits at 1440 and 390, sends the saved message and skips a later message enlarged by a changed contact name. Evidence: `tests/go-live/email-size.journeys.ts` (including `tests/go-live/email-size-imports.ts` and `tests/go-live/email-size-reuse.ts`), `tests/campaign-authoring/create-api.spec.ts`, `tests/campaign-authoring/browser.spec.ts` (including `tests/campaign-authoring/email-size-adoption.ts`) and `tests/campaign-authoring/design-import.spec.ts`. Native editor sent-size display and immutable approved bytes are proved by the PROP-004 registration via `tests/campaign-authoring/block-builder-journey.ts` (Verify main 6/7); generated mobile-control bytes and 375px computed styles are proved by the existing canonical presentation registration via the same helper (Verify main 4/7). The existing native API registration in `tests/campaign-authoring/create-api.spec.ts` via `tests/campaign-authoring/reusable-size-journey.ts` (Verify main 4/7) also proves the standard measured-size refusal for an oversized reusable edit, unchanged linked draft and source version, and recovery with a valid edit. Current-door refusal proof covers draft/create, store-signal starter, template save/replace/start, duplication, replacement-schedule copy, follow-up, imported-history copy, design import and proposal adoption, retaining edits, selected files or source snapshots at 1440 and 390. Oversized archive template conversions are held with their measured size, limit and largest available sections, retain the original archive, allow other content to finish, appear in reconciliation, and undo without a campaign or approval. Existing `tests/move-in/archive.journeys.ts` preserves source custody, repeat, erasure and undo guarantees. Remaining work: audience-specific maxima, full block-builder/mobile/product/flow and Mailchimp-blueprint acceptance await BUILD-001/006/010/011, FLOW-008 and MOVE-011. The generated-design application shares the imported-design compiler; no real generation or provider acceptance is claimed. Evidence: `tests/local-start/signin-hydration.journey.ts` — [OPER-001][BUILD-011][BUILD-012] one-click local owner sign-in works before JavaScript at 390px; chosen catalog promotions bound configured items and recheck handoff via `tests/campaign-authoring/chosen-size-journey.ts` proves the six-item Shopify promotional email, configured hidden-item size bounds, saved-copy refusals, browser edit retention at 1440/390, exact provider-edge bytes and live growth send/skip outcomes. Evidence: ct's BUILD-012 riders of 25 October 2026 at 23:46Z are proved by the existing local-start chosen catalog registration via `tests/campaign-authoring/catalog-riders-journey.ts`: saved deleted identifiers remain visibly removed, unpublished and out-of-stock selections remain measured, and the named catalog_unavailable refusal retains unsaved edits at 1440 and 390 until publication permits a freshly measured save.

### Automated flows

- **FLOW-001 — Visual flow builder** (partial). A browser journey builds a three-message welcome flow with a split, sees a validation error for an unconnected node, fixes it and saves a draft flow revision, at 1440 pixels and readable at 390. Inherits INT-004: enrol on Stripe subscription events (renewal reminder) when this flow capability is built. Evidence: `tests/go-live/roles.journeys.ts` via `tests/campaign-authoring/flow-journey.ts` (Verify go-live 6/9): three-message welcome graph with split, unreachable-node validation and repair, keyboard pan/zoom, saved revision reload and 1440/390 accessibility/overflow/hydration; all node-kind explanations, named loop/unended-path validation and delay-cycle acceptance; Author saves, Analyst reads, Support named 403. `tests/portability.spec.ts` (Verify main 4/6 for DATA-001; main 5/6 for erasure authority) exports/restores the draft revision with prior data. Gap: Draft revisions only. Trigger enrolment, including the INT-004 renewal reminder (FLOW-002), and activation (FLOW-008) remain unbuilt. All node kinds have plain explanations; unavailable transports/actions are identified. No flow is enrolled, activated or sent.
- **FLOW-002 — Triggers** (missing). Each trigger kind, fed through the events API or a store adapter at the network edge, enrolls a matching contact once and no other; a Clicked trigger filtered to one link of a campaign enrolls a contact who clicked that link and not one who clicked another link of it. Inherits INT-004: enrol on Stripe subscription events (renewal reminder) when this flow capability is built.
- **FLOW-003 — Entry filters and re-entry** (missing). A contact triggering Started Checkout three times in an hour under "once per 7 days" holds one enrollment; a contact who orders mid-flow exits at the next action with `filter-exit`.
- **FLOW-004 — Delays and waits** (missing). A durable-timer journey sets delays of five minutes and two days (with a controlled clock), restarts the runtime between, and each fires once within 60 seconds of its instant; a wait-until for Placed Order takes the event path when the order arrives and the timeout path otherwise.
- **FLOW-005 — Splits** (missing). Two contacts with cart values of $80 and $150 take different branches, and each enrollment shows the evaluated condition.
- **FLOW-006 — Actions** (missing). A flow with a property update, a tag and a webhook action applies each once per enrollment even when the job is redelivered, and an "add topic" action without evidence records `consent-missing`.
- **FLOW-007 — Exits and goals** (missing). In an abandoned-checkout flow, a contact who orders after the first message receives no second message and is counted as converted with the order's value.
- **FLOW-008 — Reviewed activation** (missing). Activation is refused naming each failing check; after activation a matching event sends the approved message; an edited message does not send until the new revision is activated, and the migration choice is recorded. Inherits OPER-007: activation, pause and archive each appear in the Activity log with operator and time.
- **FLOW-009 — Per-send rechecks** (missing). A contact who unsubscribes between two flow messages receives neither the second nor any later one, and the enrollment shows `unsubscribed` at that node. Lapsed sender evidence holds the next message under DELIV-007.
- **FLOW-010 — Exactly-once execution** (missing). A journey replays the same Started Checkout webhook three times and kills the runtime mid-dispatch; one enrollment and one hand-off result; a backlog of eight-day-old carts released after an outage skips with `stale-trigger`.
- **FLOW-011 — Pause, manual review and stop** (missing). Stop all sending during an active flow and campaign leaves no hand-off after 30 seconds; resuming continues both under their rechecks; a manual-mode message waits for review and sends only once approved.
- **FLOW-012 — Flow library** (missing). Installing the abandoned-checkout flow creates a draft with three messages, an order goal and a seven-day relevance window, and shows an expected volume computed from seeded checkout events.
- **FLOW-013 — Flow analytics and path inspection** (missing). After a seeded run, node counts reconcile (entered equals waiting plus sent plus skipped plus exited at each node) and one contact's path lists each decision with its inputs.
- **FLOW-014 — Priority and cross-message frequency** (missing). A contact eligible for a campaign and a win-back message on the same day receives only the higher-priority one and the other records `frequency-cap`.
- **FLOW-015 — Sequences** (missing). A five-email weekday-only sequence entered on a Friday sends its first email on Monday at the chosen hour.
- **FLOW-016 — Flow portability** (missing). The portability journey exports a live flow with waiting enrollments, restores it, finds it paused with the same enrollments, and resuming sends each waiting message once.

### Experiments and optimization

- **EXP-001 — Campaign A/B tests** (missing). A three-variant subject test sends to the test portion, picks the winner by the declared rule, and sends it to the remainder before the step deadline; a test with no clear winner sends the default and says why.
- **EXP-002 — Multivariate tests** (missing). A 2×2 test on a 40,000-contact audience sends four cells and reports each cell and each factor's effect with intervals.
- **EXP-003 — Flow splits and flow holdouts** (missing). With a 10 per cent holdout, the flow report shows conversion and revenue for messaged and held-out groups with the difference and interval.
- **EXP-004 — Global holdout** (missing). A review excludes the holdout members with `global-holdout`, and the overview report shows revenue per contact for holdout and messaged groups.
- **EXP-005 — Honest test statistics** (missing). An experiment with too few conversions reports "no reliable difference" with its interval rather than a winner.
- **EXP-006 — Send-time optimization** (missing). In the scheduler journey, contacts with seeded click histories receive their own best hours, others the default time, and the report shows the control comparison. Imported clicks (MOVE-009) use their original hours; imported opens provide no send-time evidence and leave contacts without qualifying history at the default.

### SMS, push and other channels

- **SMS-001 — US SMS through Twilio** (partial). The go-live journey with a Twilio edge sends an approved SMS step, ingests signed delivered and undelivered callbacks once each, and a replayed callback adds no fact, run on a connection made through SMS-008; done only once SMS-008 is done. Evidence: `src/core/platform/adapters/mobile-message.ts`.
- **SMS-002 — Carrier registration status** (missing). From Settings an Owner submits the brand and campaign registration to the Twilio edge with no Twilio console step, and the edge receives the pre-filled sample messages and opt-in description. With the Twilio edge reporting the campaign as pending, SMS approval names `sender-unregistered`; a rejection shows its reason on the form and a resubmission reaches the edge; reporting it approved clears the block.
- **SMS-003 — US quiet hours and state rules** (partial). A step scheduled at 19:30 Eastern hands off to New York recipients and defers Los Angeles recipients only if 19:30 Eastern is outside their window; a fourth same-subject text to a Florida number in 24 hours is skipped with `state-frequency-limit`. A phone-only subscriber with a 305 number and no address hands off at 10:00 Eastern with zone source `area-code`, and is deferred at 20:30 Eastern. Evidence: `src/core/features/sms/policy.ts`.
- **SMS-004 — Two-way SMS inbox** (partial). An inbound signed reply appears in the inbox and contact timeline; the operator's answer hands off through Twilio once; an inbound STOP opts the number out before the webhook is acknowledged and shows in the thread. Evidence: `src/core/features/sms/inbound.ts`.
- **SMS-005 — Branded short links and MMS** (missing). A sent SMS's short link records one click for that recipient and redirects to the original URL; a click from a known link-preview bot is retained as automated and excluded from engagement.
- **SMS-006 — SMS cost control** (missing). A step whose estimate exceeds the cap shows a blocking finding at review; with a cap reached mid-dispatch, remaining recipient-steps skip with `sms-budget-reached`.
- **SMS-007 — WhatsApp marketing messages** (missing). A template campaign to an opted-in contact hands off through the provider edge, records the delivered fact, and an opt-out reply excludes the contact from the next send.
- **SMS-008 — Twilio connection an owner makes in Settings** (missing). Against a Twilio edge, an Owner on a fresh installation with no SMS deployment input connects by pasting the Account SID and Auth Token, with no redeploy. The edge records the Messaging Service Mango created with its callback and inbound URLs, and an existing service at the edge is unchanged. Before the test text's signed callback, SMS approval names `sms-events-missing`; after it, the step passes. An inbound STOP signed by the edge opts the number out. A rotated Auth Token at the edge raises the Home alert and blocks SMS approval. An Admin calling the connect route is refused with 403.
- **PUSH-001 — Web push** (missing). A browser journey grants permission, receives a push from an approved campaign through a test push service, and after revoking permission the next send skips with `push-unsubscribed`.
- **PUSH-002 — Mobile app push and in-app messages** (missing). A test app registers a device; a flow push reaches it through the APNs and FCM edges; an in-app message shows once on next open and records its view.

### Deliverability

- **DELIV-001 — Sending providers** (partial). The go-live journey runs against each adapter's edge and shows the declared capability on the campaign page; an SMTP relay without events never shows a delivered count; run on a connection made through DELIV-008, and done only once DELIV-008 is done. Evidence: `src/core/platform/adapters/sendgrid.ts` · `src/core/platform/adapters/resend.ts` · `tests/go-live/resend-delivery.journeys.ts`.
- **DELIV-002 — Domain setup** (partial). The existing contact-links journey is extended and retitled [DELIV-002][MSG-013], without adding a case: Owner-only create-if-missing and reuse, Admin/Manager/Author refusal, account-returned SPF/return-path and both DKIM records, a separately labelled DMARC policy recommendation, per-record public-DNS pass/fail, inbox reconfirmation after setup, branded links only with both CNAME and HTTPS passing, the ordinary host when either fails, and a branded public redirect that grants no operator API access. The setup guide is inspected at 1440/390. Real-provider proof (20 October 2026, sd-mango-c6b): confirmed the run-mango.com zone belongs to the RunEditRun account before any write; Mango's new create route created one throwaway SendGrid authentication; all four records initially failed public DNS, then the returned SPF/return-path CNAME, two DKIM CNAMEs and recommended DMARC TXT all passed, and SendGrid validation returned 200 with valid=true. Tracking CNAME passed; HTTPS transport failed because the cloud proxy could not resolve the throwaway hostname upstream (the local proof bridge returned its transport-error status 599, not a provider HTTP response), so Mango reported HTTPS Fail and disabled branded rewriting. Gap: no successful real branded-host HTTPS/certificate and rewrite proof. Read-only Cloudflare inspection on 22 October confirmed active wildcard certificates but no zone Worker routes; live hosted branded-link proof pending a disposable deployment. Main requires a separately reviewed workflow using the existing repository deploy secret and always-cleanup; agent-held account-wide Worker/D1 credentials are refused. c11 created/deleted/remaining provider objects: 0/0/0; this setup guide operates on SendGrid, while Resend retains its existing verification path. A second independent throwaway-host proof repeated the authenticated-domain round trip and allowed the tracking check its full 20-minute DNS window: CNAME remained Pass, HTTPS remained Fail, branded rewrite remained disabled. Cleanup across both proofs: two authentications and ten Cloudflare DNS records deleted; after each proof the SendGrid exact-host list remaining=0 and DNS lists for every created name remaining=0. No existing domain, DNS record or event webhook was changed. Real guide results inspected at 1440/390. Evidence: `src/core/features/sender-verification/domain-setup.ts` · `src/core/features/sender-verification/setup-routes.ts` · `src/core/features/sender-verification/tracking-domain.ts` · `tests/go-live/contact-links.journeys.ts`.
- **DELIV-003 — Bulk-sender compliance dashboard** (partial). With seeded provider facts at a 0.25 per cent complaint rate, the dashboard warns; at 0.3 per cent the MSG-011 block shows the same figures. With no signed event received yet, the complaint rate reads `delivery events not connected`. Evidence: `src/core/features/lifecycle/reputation-guard.ts` · `tests/go-live/delivery.journeys.ts`.
- **DELIV-004 — Domain warm-up** (missing). With warm-up on and a 2,000-a-day cap, a 10,000-recipient campaign hands off 2,000 most-engaged recipients on day one and continues the next day within the step deadline or skips with `warmup-cap`.
- **DELIV-005 — Mailbox-provider breakdown** (done). Seeded signed bounce facts for Gmail and Outlook addresses appear under the right providers and reasons. Evidence: `tests/go-live/mailbox-provider.journeys.ts`.
- **DELIV-006 — Address quality at intake** (missing). An import with each kind of flagged row reports them separately; keeping them records the operator's decision.
- **DELIV-007 — Sender evidence renewal without stopping live flows** (partial). `tests/sender-verification/worker.spec.ts` — native Worker renewal proof (day 22/23/29/31, last confirmer and all Owners, diagnostic and reminder replay, provider evidence change, populated 0094 upgrade); `tests/go-live/managed-mail.journeys.ts` — managed relay and authenticated connector renewal, Home at 1440/390 with axe, overflow and hydration checks. PARTIAL: lifecycle approval/hand-off, deadline skip and ordered resume hooks remain in concurrent writers’ lifecycle files; `sender-evidence-lapsed`/`sender-evidence-deadline` are named by the renewal read only, not installed dispatch hooks. Live welcome-flow history waits on FLOW-*. Home/public renewal and the existing minute Cron share the same durable claims. Automatic renewal/reminders require the confirming native operator authority; legacy or restored confirmations need a fresh diagnostic before outbound renewal resumes. Default ADOPTED: last confirmer and every Owner receive reminders, once per evidence period; renewal never confirms on their behalf; configured connector renews only from authenticated diagnostic results. No provider account was used.
- **DELIV-008 — Sending connection an owner makes in Settings** (partial). Against a SendGrid edge and a Resend edge: on a fresh Managed installation with no `MARKETING_MAIL_*` input, and on a fresh Free installation with no `MAIL_PROVIDER_API_KEY` or `MAIL_WEBHOOK_SECRET` input, an Owner connects the SendGrid edge by pasting a key in Settings, with no redeploy, and no route, page, log line or export contains the key afterwards; on the Free installation an invited operator's sign-in email arrives through the edge. The edge records one webhook Mango created at this deployment's URL with the listed events and signing on; a pre-existing webhook is unchanged and reconnecting creates no second one. Before the first signed event, approval and flow activation name `delivery-events-missing`; the sender check's signed delivered event passes the webhook step. A signed hard bounce suppresses the address under CONT-006 before the next hand-off, and a delivered event shows **Delivered**. A SendGrid key without the event webhook scopes, and a sending-only Resend key, are named as missing that permission and no webhook is created. An account with no free webhook slot shows the limit and the forwarding route and nothing at the edge changes. Revoking the key, and separately deleting Mango's webhook, each raise the Home alert and email and block approval with the named cause; replacing the key leaves a `handoff-unknown` recipient-step unsent. The same journey on the Resend edge stores the returned `signing_secret`. An Admin, Manager or Author calling the connect, replace and disconnect routes is refused with 403. Today the SendGrid health probe reads the key's scopes and requires `mail.send`, sender verification reads domain authentication from the account, and signed SendGrid events are verified and stored. Evidence: `tests/go-live/delivery.journeys.ts` — MSG-011 case calls `tests/go-live/sending-connection-journey.ts` for completed Connect Activity actor/time, named Admin 403 refusals on review/connect/disconnect (also OPER-004), key scopes/account review before create, signed-or-delete failures, existing-hook preservation/reconnect, encrypted key and export secrecy, signed Owner-check delivery gate and Settings Sending at 1440/390 (Verify go-live 2/9); `tests/audience-controls/sendgrid-forwarding.spec.ts` for unsigned/stale/future signatures and replay; `tests/portability.spec.ts` for populated migration, private connection exclusion and restore without resumed sending. the Settings screen names the URL, events and signing before the edge receives any create call. An edge that refuses to enable signing ends with no Mango webhook at the edge and the step failed. An unsigned event and a signed event whose timestamp is 10 minutes old each change nothing. a full-access SendGrid key connects and is labeled broader than needed, with the restricted scope list shown. Gap: SendGrid installation-side connection only, against synthetic SendGrid, WooCommerce and mail network edges; no real provider call, account or consent was used. Resend, a fresh installation without deployment mail inputs, Free sign-in through the connection, daily read-back, revoke/replace alerts and emails, handoff-unknown key replacement, complete developer-route labelling and DELIV-002 domain creation through this connection remain unproved. Restricted scope CRUD behavior is inferred from SendGrid documentation, not real-provider evidence. Conservative disclosed-before-create Owner authorization, signed-or-delete, five-minute timestamp window and id-only ownership defaults are adopted; Default ADOPTED; sandbox proof pending.

### Reporting and attribution

- **REPORT-001 — Overview dashboard** (partial). `tests/campaign-results/results.journeys.ts` — “[RESULT-001] [REPORT-001][REPORT-006] campaign names come from the collection when detail requests fail and overview matches period records at 1440”, via `tests/campaign-results/overview-journey.ts`, proves a seeded month and equal-length preceding UTC days: net attributed USD with refunds and EUR excluded from the USD total, human clicks with scanners excluded, conversions, source growth, provider costs with unpriced facts retained, per-domain complaint/bounce rates and top campaigns. Revenue, clicks, conversions and growth equal the existing detailed report reads. The chosen period is applied through the screen, which has no overflow, serious axe finding or hydration error at either width; date controls wait for component hydration. Default ADOPTED: incremental revenue is separately labeled no holdout configured pending EXP-003/004, flows say no flows yet and no forecast is displayed as a result. Gap: actual holdout and flow results. Period bases are disclosed: scheduled campaign steps for performance, occurrence days for growth/cost/provider evidence.
- **REPORT-002 — Campaign and flow performance tables** (partial). The CSV export of the table equals the on-screen rows for the same filter; with open estimates on, the estimated open-rate column appears on screen and in the CSV labeled as an estimate, and is absent with them off. Evidence: `tests/campaign-results/results.journeys.ts`. Current scope and remaining work: Campaign revision/channel tables, sorting, topic/channel/UTC date filters, matched CSV, optional open-rate estimates, per-link detail and net attributed revenue by currency are exercised. Gap: flow and flow-message performance awaits the flow engine.
- **REPORT-003 — Attribution for campaigns, flows and SMS** (done). A real approved SMS click after an earlier email click wins each signed-Shopify order once; newer scanner requests cannot win. Separate email/SMS windows default to seven days, and changing either window reselects the most recent qualifying click. One-day windows remove these conversions; restoring seven days restores them, while widening to 30 days includes an order outside the old fixed window. Refunds and cancellations subtract; replay and sync do not duplicate orders. A scoped native integration records custom conversion metrics and their reversals, and the same Insights selector recalculates them. Stored click, order, amount and source rows remain unchanged across policy edits. The API and CSV match Insights and campaign drill-down; metric and applicable windows appear beside revenue at 1440 and 390, with no page overflow or serious accessibility finding. Evidence: `tests/campaign-results/performance.journeys.ts` — “[REPORT-002] [RESULT-005][RESULT-003][REPORT-003] campaign filters, exact CSV rows and optional open estimates at 1440; native commerce and cross-channel attribution at 1440 and 390”, via `tests/campaign-results/cross-channel-attribution.ts`, `tests/campaign-results/custom-attribution.ts` and `tests/campaign-results/attribution-report-ui.ts`. New contact, click, order and conversion facts enter through consent, approved delivery, tracked redirects, signed Shopify webhook/sync and scoped integration doors; no new direct-row seeds. Flow attribution is inherited by FLOW-001/FLOW-002, which remain missing.
- **REPORT-004 — Customer and retention analytics** (done). On a seeded order history, the cohort table and repeat-purchase rate match an independent calculation. Evidence: `tests/campaign-results/results.journeys.ts` · `tests/campaign-results/retention-journey.ts`.
- **REPORT-005 — List growth and consent sources** (partial). Growth by source over a seeded period from migration 0073 onward sums to the change in subscribed contacts, and each source links to its consent text version. The period includes captures and confirmations, resubscribes counted separately, unsubscriptions, suppression and removal, across forms, landing pages, kiosk forms, imports and integrations; opening membership plus daily deltas equals closing membership. This clause is done only when FORM-002 (popup and other dedicated forms), FORM-004 (landing pages), FORM-009 (kiosk capture) and CONT-027 (approved confirmed-only public-form resubscribe; owner decision, 19 Oct 2026) are done. `tests/go-live/list-growth.journeys.ts` exercises native hosted and embedded capture/confirmation, consumed-link replay, unsubscribe, signed suppression and erasure, with source/version disclosures at 1440 and 390. Anonymous counts survive erasure and its evidence links do not. Migration 0074 recovers retained earlier consent captures and confirmations, labeled as retained evidence with zero inferred membership change; imported dates do not invent earlier local growth. Deleted, erased or merged membership history recorded before migration 0073 cannot be reconstructed and is not claimed; the membership-history requirement applies from 0073 onward. `tests/go-live/shared-kiosk.journeys.ts` also exercises kiosk capture and confirmation as a separate source in Insights. `tests/go-live/resubscribe.journeys.ts` exercises hosted/kiosk public-form resubscribe attribution separately from new subscriptions. Dedicated popup/landing-page attribution and the remaining full CONT-027 incentive/topic/flow and erasure-expiry journeys remain outstanding.
- **REPORT-006 — Scheduled and custom reports** (partial). `tests/go-live/managed-mail.journeys.ts` — managed mail, sender renewal and saved reports: Owner/Admin UI save, weekly exact-figure operator email, concurrent tick/replay, Support refusal, revoked-authority refusal/activity, real export/import with no resumed mail, erasure no-op and 1440/390 axe/overflow/hydration; `tests/campaign-results/results.journeys.ts` and `tests/campaign-results/saved-report-metric-journey.ts` — seeded cost, billable-unit, human-click, conversion and USD attribution reconciliation; `tests/sender-verification/worker.spec.ts` — populated 0094/0095 upgrade. PARTIAL: Slack requires an unavailable webhook; scheduling currently covers saved provider cost/units and campaign click/conversion/USD attribution reports plus the built-in cost and engagement reports, not every report family or dimension. Default ADOPTED: Owner/Admin only, existing active operator IDs only, email only, no contact identities or per-contact rows, no currency conversion; weekly Monday 09:00 UTC / monthly first-day 09:00 UTC. Delivery refusals and sends are durable/audited; authorization/input refusals intercepted by the existing shared middleware are not yet activity records. Restored or revoked native authority requires explicit enable; uncertain provider outcomes never automatically resend.
- **REPORT-007 — Usage and cost transparency** (partial). `tests/campaign-results/costs.journeys.ts` — “[RESULT-004][REPORT-007] Settings consent counts, currency-separated projection and rejected AI spend, distinct handoffs and replayed purchases retain truthful campaign and UTC-day totals” preserves campaign/day totals and proves Settings contact consent counts against the actual contact rows, no identities, USD/EUR kept separate, one unpriced fact retained and the linear UTC month projection against independent arithmetic over seeded provider facts. Settings is exercised at 1440/390 with overflow, serious axe and hydration assertions. Default ADOPTED: month-to-date priced run rate extended over the UTC month, labeled projection; currencies never converted or added together; unpriced never means zero. Mango adds no contact-count billing or sending restriction. Gap: a flow’s costs under that flow await the flow engine.

### Integrations

- **INT-001 — Shopify** (partial). Done only once INT-015 is done. `tests/shopify/connection.spec.ts` (native sync, signed carts, signed pixel), run on a connection made through INT-015's install journey, plus a consent write-back journey: a Mango unsubscribe appears as unsubscribed in the Shopify edge's customer record; and the CONT-025 Shopify opt-in journey. Evidence: `src/core/platform/adapters/shopify.ts` · `tests/shopify/connection.spec.ts`.
- **INT-002 — WooCommerce** (done). Evidence: `tests/go-live/woocommerce.journeys.ts` — “[INT-002] WooCommerce owner connection syncs store facts and signed replay preserves identity, consent and failed-operation recovery”: Owner connects encrypted REST/signing credentials through Settings; seeded customers, paginated products, orders and refunds sync through Store with original identity/occurrence times and financial projection; the signed order webhook replays once without duplicate facts and rejects conflicting bytes; the installed-plugin edge supplies abandoned checkouts, whose signed event enters only an explicitly activated exact flow revision, adds one contact tag and exits once. Draft, stale, purchased and opted-out cases never enroll; forged, expired, nonconsented and GPC events are refused. `tests/go-live/woocommerce-plugin-journey.ts` runs the shipped browser script against the WordPress network edge for default-deny, explicit consent and GPC withdrawal. Settings/Store are exercised at 1440/390. The real plugin source is `extensions/mango-woocommerce/mango-woocommerce.php` with `extensions/mango-woocommerce/INSTALL.md`; its shortcode uses the existing confirmed signup door proved by `tests/audience-import/signup.spec.ts` — “CONT-003/009 public signup remains pending until single-use expiring confirmation and records source time method IP”. Ct approved the INT-002 semantic on 22 October 2026 at 20:20Z: store-admin enablement is off initially; only signed-in store customers; explicit analytics and marketing consent before the one Secure HttpOnly SameSite=Lax first-party cookie, expiring after 30 days; GPC records no observation and revokes pending eligibility; no cross-site tracking or subscription-consent widening; WordPress observations expire after 30 days. The allowlisted signup iframe uses Mango’s own confirmation. A saved tag-and-exit flow revision must be explicitly activated; it sends no marketing message. CONT-018 and FORM-008 retain their other acceptance obligations and statuses; FLOW clauses retain their graph/message obligations.
- **INT-003 — BigCommerce** (missing). A BigCommerce edge journey syncs a seeded store and enrolls a contact from an abandoned-cart webhook.
- **INT-004 — Stripe** (partial). The existing roles journey is extended with signed subscription-start/cancellation, customer, payment, Checkout, renewal, past-due and refund-to-charge/customer fixtures, replay, forged and expired signatures, mode mismatch, Owner-only connection and contact timelines at 1440/390; the existing account round-trip test proves the private connection is excluded from exports. FLOW-001 and FLOW-002 inherit enrolment on Stripe subscription events (renewal reminder), with no status change (ct pattern 1 default). Gap: the real-provider lifecycle proof cannot start as written: Stripe test-clock creation rejects `metadata[mango_c6]` with HTTP 400 `parameter_unknown` (parameter `metadata`). No object was created; real event types seen: none; created/deleted objects: 0/0. The test-mode test-clock read succeeded (HTTP 200). No renewal, refund, cleanup search or real-payload replay evidence is claimed. A ruling allowing the clock name as its run marker is needed before proceeding with that proof. Evidence: `src/core/features/store/stripe/` · `tests/go-live/roles.journeys.ts` · `tests/portability.spec.ts`.
- **INT-005 — Square** (missing). A Square edge journey syncs a seeded location's orders into contact timelines.
- **INT-006 — Stall and Orbit** (missing). A journey against Stall's event edge enrolls a Started Checkout contact into the abandoned-checkout flow and stops it when Stall reports the order.
- **INT-007 — Events and profiles API** (done). An API journey tracks a custom event with an idempotency key twice (one event stored), refuses a subscribe call without evidence with a named error, and returns 429 past the key's limit. Evidence: `tests/go-live/sync-integrations.journeys.ts` via `tests/go-live/custom-event-journey.ts`: shipped JavaScript client records one general event on concurrent replay, rejects conflicting content, reads profile and rule-derived segment membership, refuses subscribe without evidence by name and exhausts one key without affecting another; timeline at 1440/390 passes axe, overflow and hydration checks. OpenAPI: `src/core/features/integrations/openapi.ts`; client: `src/core/features/integrations/client-source.ts`. Existing scoped profile/consent/suppression, conversion and refusal-feed journeys remain green.
- **INT-008 — Outbound webhooks** (missing). An endpoint that fails twice then succeeds receives each event once with a valid signature, and the log shows the attempts.
- **INT-009 — Zapier and Crank** (missing). A Zapier platform test run of each trigger and action succeeds against a test installation.
- **INT-010 — Segment** (missing). Segment-format identify and track payloads at the edge create one contact and one event, and Mango events are delivered to a test Segment source.
- **INT-011 — CRM sync** (partial). An edge journey changes a mapped field in the CRM and sees it in Mango, unsubscribes in Mango and sees the CRM marked opted out, and a flow creates one CRM task. Scoped integration coverage: `tests/go-live/sync-integrations.journeys.ts`. Current scope and remaining work: Scoped subscriber sync and a cursor-paged refusal feed support a sibling CRM client. The Coffer client is supplied as a patch in the integration round, not landed in Coffer here. Full CRM field mapping UI and flow-created CRM tasks remain unmet.
- **INT-012 — Ad audiences** (missing). An edge journey syncs a segment, then removes a contact who made a do-not-share request, and the next sync deletes them from the audience.
- **INT-013 — Web analytics tagging** (partial). `tests/campaign-results/performance.journeys.ts` (INT-013 / REPORT-002) proves saved UTM values at sent link destinations, author values, managed/contact exclusions, original click identity, campaign tagging off, Settings at 1440/390 and one replay-safe Vane goal on a known contact timeline through the scoped custom-conversion API. `tests/portability.spec.ts` covers native settings restore. Default ADOPTED: source mango, channel medium, campaign slug, message id, bounded static HTTP/HTTPS tagging, no managed links or contact interpolation, author keys win. ct approval, flow dimensions and general INT-007 tracking remain open; no Vane or real provider call was used. `tests/go-live/contact-links.journeys.ts` via `tests/go-live/domain-journey.ts` also checks the configured tagged destination through the branded tracking host, including HEAD without a human click.
- **INT-014 — Reviews and loyalty apps** (partial). A review-submitted fixture exits the contact from the review-request flow as converted. Evidence: `tests/go-live/sync-integrations.journeys.ts`, `tests/go-live/review-loyalty-journey.ts`, `tests/sender-verification/worker.spec.ts`. Owner/Admin inbound Judge.me review, Okendo review/earned-points/tier-entry and Smile customer-profile adapters verify native signatures and use the INT-007 event writer. Existing contacts only; no consent or outbound action. Signed replay, account/timestamp refusal, concurrent unmatched count, encrypted export-excluded secrets, populated receipt restore, erasure/reconnection replay protection and Settings at 1440/390 are exercised. Remaining: PARTIAL: Yotpo stays disabled with adapter_signature_protocol_unverified because its signing protocol could not be verified from this VM; Smile customer/updated supports profile/balance observations, not inferred points earned or tier transitions. Live provider payload confirmation remains open. Review-request flow conversion/exit waits on FLOW-*. Default ADOPTED: Owner/Admin under integration.manage, existing encrypted credential custody, no new contact/consent/send, unknown addresses counted without storage. No provider account was used.
- **INT-015 — Shopify connection a merchant installs** (partial). Against a Shopify edge providing OAuth, the Admin API, bulk operations, webhooks, app proxy and a theme: an Owner on a fresh installation with no `COMMERCE_*` input chooses Connect Shopify, enters the edge's shop domain, approves the edge's OAuth screen and returns connected, with no deployment variable set and no redeploy. The edge records the webhook subscriptions and the activated pixel Mango created; the granted scopes include `write_discounts` and `write_customers`; Settings shows each step as passed, and turning the edge theme's embed on passes the theme step. A seeded store of 250,000 customers and a year of orders syncs with progress and an estimated finish, survives one forced restart and completes within 2 hours with no duplicate; before it completes, a purchase segment shows as syncing and cannot be approved. An edge pixel cart event enrolls an identified contact in the abandoned-checkout flow, a flow message's unique code is created at the edge (BUILD-007), and a Mango unsubscribe is written back. A webhook to another installation's routing token, a bad HMAC, an app-level delivery whose signed body names another shop and a bad forwarding signature each change nothing, and a captured connector response leaves no token at the connector. An `app/uninstalled` delivery disconnects the store on Home and blocks a store-dependent campaign at approval while its synced data stays. A `customers/redact` delivery erases that customer under CONT-013, and `customers/data_request` creates the access request. Evidence: `src/core/features/store/shopify/health.ts` · `src/core/features/store/shopify/collector.ts` · `tests/shopify/connection.spec.ts`. An OAuth callback with a bad `hmac`, a reused or expired `state`, or a non-`myshopify.com` shop completes no exchange. A compliance delivery with a bad HMAC is answered 401. A delivery for a disconnected shop is answered with an error and reaches no installation. After a disconnect, the connector holds no routing token, forwarding key or counts for that shop. Deleting a Mango subscription at the edge is re-created by the next installation check and shown on Settings → Shopify. Gap: Connector not built; conservative default (opt-in per installation, Shopify OAuth/HMAC/state checks, fail-closed 401 routing, compliance topics acknowledged after installation receipt, connector state deleted on disconnect, removed subscriptions re-created) named in the clause, awaiting ct approval as landed.

### Migration from incumbents

- **MOVE-001 — From Mailchimp** (partial). `tests/move-in/archive.journeys.ts` runs on synthetic exports, extended with checked-in Mailchimp-format fixtures for a saved segment with a campaign-activity condition, a classic automation, a `granular_activity` file, two overlapping audiences with conflicting statuses and a template with merge tags and a `<style>` block. Each fixture shows its expected lines in the reconciliation report (MOVE-007 to MOVE-011). The CONT-024 subscribed-file fixture and the MOVE-012 full-scale export run through the same journey. The same journey also runs on one real, owner-supplied Mailchimp export with its reconciliation report. Evidence: `src/core/features/move-in/archive-service.ts` · `tests/move-in/archive.journeys.ts` (Verify move-in: archive templates enter the library; untouched-only undo; 1440/390).
- **MOVE-002 — From Klaviyo** (partial). An edge journey against a Klaviyo API fixture imports profiles with consent, a segment definition and an abandoned-cart flow as a draft with its unsupported steps listed. Evidence: `tests/go-live/contact-links.journeys.ts` via `tests/go-live/source-csv-journey.ts` and `tests/go-live/source-api-journey.ts` (Verify go-live 1/9; 1440/390): public source preview/apply/report, restrictions and source-held evidence; no import handoff; an imported reader continues through exact campaign approval and delivery. Current scope and remaining work: Owner/Admin one-time Klaviyo API read and CSV preset retain email source method/time, restrictive suppressions, properties, list/segment review snapshots, library templates and original-time order/engagement history. Unsupported conditions and abandoned-cart action steps are named in the report. `tests/portability.spec.ts` preserves these records on native restore. Gap: the flow as a draft (FLOW-001/002), parallel-run sync (MOVE-013) and real-provider sandbox proof. Positive incumbent SMS remains held under CONT-024/A2P; missing row time or collection point never grants SMS consent. Snapshot membership grants no additional category consent.
- **MOVE-003 — From ActiveCampaign** (partial). An API fixture import keeps an unsubscribed contact unsubscribed and produces a draft flow for a seeded automation. Evidence: `tests/go-live/contact-links.journeys.ts` via `tests/go-live/source-csv-journey.ts` and `tests/go-live/source-api-journey.ts` (Verify go-live 1/9; 1440/390): public source preview/apply/report, restrictions and source-held evidence; no import handoff; an imported reader continues through exact campaign approval and delivery. Current scope and remaining work: Owner/Admin one-time ActiveCampaign API read and CSV preset retain contacts, list membership as review topics, tags, custom fields, unsubscribes and bounces. The key is used only in bounded declared-host HTTPS reads and is not stored or logged. Automation names/statuses form a readable report outline; unavailable trigger/action definitions are named. Gap: automations as draft flows (FLOW-001/002), parallel-run sync (MOVE-013) and real-provider sandbox proof. Review topics grant no additional category consent.
- **MOVE-004 — From Kit (ConvertKit)** (partial). The move-in journey's Kit-format synthetic files (`docs/moving-in.md`) keep every restrictive state, plus a sequence fixture becomes a draft sequence. Evidence: `docs/moving-in.md` · `tests/move-in/held.journeys.ts`.
- **MOVE-005 — From beehiiv, Omnisend and Customer.io** (partial). One synthetic export per product imports with every unsubscribed or suppressed row restricted. Evidence: `tests/go-live/contact-links.journeys.ts` via `tests/go-live/source-csv-journey.ts` and `tests/go-live/source-api-journey.ts` (Verify go-live 1/9; 1440/390): public source preview/apply/report, restrictions and source-held evidence; no import handoff; an imported reader continues through exact campaign approval and delivery. Current scope and remaining work: beehiiv, Omnisend and Customer.io documented CSV presets retain source status, tiers, attributes and tags; explicit source attestation carries incumbent-held email evidence and reconciliation counts evidence kinds. Unsubscribed, bounced and suppressed rows remain restricted. Gap: API pulls and parallel-run sync (MOVE-013); real-provider export proof pending. Missing or unfamiliar subscription states remain non-subscribed.
- **MOVE-006 — Reconciliation and cutover** (partial). After a move-in, the report's counts reconcile to the files and contact table, and no campaign or flow is scheduled or live. The report counts consent per evidence kind (CONT-024) and names the attestation each relies on. The cutover checklist shows the parallel-run sync (MOVE-013), or the re-import advice for an export-only move-in, and **Mark cutover complete** ends the sync. The checklist names any template or live message still loading images from an incumbent host (MOVE-014). Evidence: `src/core/features/move-in/archive-report.ts` · `tests/move-in/archive.journeys.ts`.
- **MOVE-007 — Mailchimp saved segments** (missing). A Mailchimp API fixture has two saved segments. One, "clicked campaign X and engagement is often", is recreated as a draft segment whose membership over the imported history equals the fixture's expected members. The other has an unsupported condition, which is named in the segment and the report.
- **MOVE-008 — Mailchimp automations and Customer Journeys** (missing). A Mailchimp API fixture with one classic two-email welcome automation yields a draft flow with both emails' converted content and named delays. A journey fixture whose two emails name an abandoned-cart journey yields an abandoned-cart draft flow with those emails, and a report line names its unreadable branch. Neither flow is live.
- **MOVE-009 — Incumbent engagement history** (done). A `granular_activity` fixture with clicks and opens for three contacts and one unknown address imports one click or open fact per row on the right contacts at their original times. The reconciliation report counts imported and dropped rows, the contacts' timelines show the facts as imported, and no campaign result figure changes. Current evidence: `tests/move-in/archive.journeys.ts` · `tests/portability.spec.ts`. Mailchimp-format granular activity imports one durable click/open fact per accepted row, with original time, imported campaign/link and source. Reconciliation names imported/dropped counts; timeline, repeat, undo, merge, erasure and populated upgrade/restore are exercised. Per archive: 10,000 engagement rows within existing ZIP/text limits, visibly refused beyond that limit.
- **MOVE-010 — Several audiences** (partial). A fixture has two audiences that share addresses: one address subscribed in A and unsubscribed in B, one cleaned in B, and one with a different first name in each. Each address becomes one contact. The first is subscribed to topic A and unsubscribed from topic B, the cleaned one is suppressed on email, and the first-name conflict is listed. The report counts each audience and their overlap. Evidence: `src/core/features/move-in/archive-service.ts` · `tests/move-in/archive.journeys.ts`.
- **MOVE-011 — Incumbent template conversion** (partial). A Mailchimp template fixture contains `*|FNAME|*`, `*|UNSUB|*`, `*|LIST:ADDRESS|*`, `*|ARCHIVE|*`, an unknown `*|FOO|*`, and a `<style>` block with class rules, a `display: none` rule and a media query. It becomes a template whose tokens resolve in preview and whose inlined colors and sizes match the source. Its report names the unknown tag, the dropped `display: none` rule and the mapped mobile rule. The template passes the checker apart from the unknown-tag block. A second fixture with links to three outside hosts lists them in its report and in the reconciliation report, and a campaign built from it reaches review with the three hosts and their allow actions (MSG-015). Mailchimp's `base_boxed_3column_query.html` blueprint, filled with fixture content, converts with its sent size reported and starts a draft that saves and reaches approval (BUILD-012); a fixture inflated past the limit is listed with its size as a held conversion, not dropped. A fixture whose footer is `#999999` on white converts with that text at `#767676`, listed in its report, and passes the checker. Evidence: `src/core/features/move-in/html-import.ts` · `tests/move-in/archive.journeys.ts`. Evidence: the existing imported-host registration in `tests/go-live/content-checks.journeys.ts` via `tests/go-live/template-conversion.ts` adds original synthetic-mango conversion fixtures, preview/report checks at 1440/390, measured held conversion and manual color-undo blocking; the remaining gaps are recorded in CONTRACT.md.
- **MOVE-012 — Move-in at the buyer's scale** (partial). A generated Mailchimp account export with 250,000 contacts across the subscribed, unsubscribed, non-subscribed and cleaned files and 52 weekly campaigns with `granular_activity` moves in through the journey. It is interrupted once by a forced worker restart during the activity import and resumes to completion with no re-upload. Its reconciliation report adds up per file, evidence kind and activity rows. A campaign to the whole subscribed audience then reaches review with an eligible count equal to an independent count over the generated files. The run records its wall time and peak memory. A generated API-pull fixture of the same size completes the same way. Evidence: `src/core/features/move-in/archive-limits.ts` · `tests/move-in/archive.journeys.ts`.
- **MOVE-013 — Two-way sync during the parallel run** (missing). After a Mailchimp API-fixture move-in, the edge emits an unsubscribe for A, a cleaned event for B and a subscribe for new C. A campaign approved and dispatched straight afterwards excludes A as `unsubscribed` and B as `suppressed`; C is subscribed with incumbent-held evidence and enters the live welcome flow. With the webhooks dropped, the 15-minute re-pull applies the same changes before the next dispatch, and an event to a URL with the wrong secret changes nothing. A Mango unsubscribe appears as an unsubscribed member at the edge, and a forced edge failure shows the write-back retried, then failed, on the move-in page. Marking the cutover complete deletes the edge webhooks, and a later event changes nothing. An export-only move-in shows the approval advisory once the imported history holds a send after the import. A Klaviyo API fixture and a Kit webhook fixture each carry one unsubscribe in and one write-back out.
- **MOVE-014 — Incumbent images brought home** (partial). A Mailchimp account-export fixture with three gallery images used by a template and a campaign moves in, and every image source is rewritten to `/media/`, serving the same bytes. An API-fixture template's image is fetched from the edge and re-hosted the same way. An image the edge answers 404 for is listed as failed and blocks the cutover checklist item until replaced, and the checklist names the template using it. Evidence: the existing imported-host registration in `tests/go-live/content-checks.journeys.ts` via `tests/go-live/incumbent-image-journey.ts` proves generated gallery and inspected network images, refusals and replacement, retained media after undo and conversion/reconciliation at 1440/390; the cutover checklist and remaining gaps stay in CONTRACT.md.
- **MOVE-015 — Incumbent engagement history beyond the Mailchimp export** (missing). a Mailchimp API fixture at the network edge with email activity for three contacts across two sent campaigns and one unknown address imports one click or open fact per activity on the right contacts at their original times, with MOVE-009's reconciliation, timeline and no-result-change checks; each other incumbent's fixture, where its export or API carries engagement, does the same; and the imported-history acceptance of CONT-020, SEG-005, SEG-006 and EXP-006 passes. Provider acceptance repeats the API-key import with a real Mailchimp account.

### Mobile

- **MOBILE-001 — Responsive operator app** (partial). The representative-pages journey (`tests/newsletter-ui/representative-pages.journeys.ts`) extended to every operator page at 390 pixels with axe and overflow checks. Evidence: `tests/newsletter-ui/representative-pages.journeys.ts`.
- **MOBILE-002 — Native iOS and Android app** (missing). An app test against a test installation signs in, approves a revision with the same checks the web app shows, receives an outage alert from the push edge, and a role without approval rights sees no approve control and is refused by the server.

### Publishing and monetization

- **PUB-001 — Web archive** (done). Publishing a sent campaign creates a page and feed item with no recipient token or personal value. Evidence: `tests/campaign-results/archive.journeys.ts` · `tests/audience-import/erasure.spec.ts`.
- **PUB-002 — Paid newsletters** (partial). A Stripe test-mode checkout journey subscribes a reader to the paid topic, a paid-only campaign reaches them and not free readers, and a cancellation webhook moves them back. Evidence: `tests/go-live/roles.journeys.ts` — “[PUB-005][FORM-008][FORM-010][INT-004][OPER-003][OPER-004] roles govern native requests and removal retains authors, approvers and history”, via `tests/go-live/stripe-journey.ts` and `tests/go-live/paid-tier-journey.ts` (Stripe and mail network edges faked; no real provider call or consent was used). Owner-only Settings and recurring price/Stripe Tax setup; subscription-mode Checkout with immediate-confirmation card payments; signed duplicate events remain inert; each subscription-affecting event re-reads current Stripe status; active/trialing joins and past_due, unpaid, paused, incomplete, incomplete_expired and canceled leave; invoice.payment_failed while Stripe reports active leaves membership unchanged and is recorded as payment failure. Review intersects paid membership with each reader's own confirmed channel consent. A paid-only approved issue hands off exactly one accepted recipient-step and one mail-edge send to the current paid reader, with none to the free reader; cancellation after approval hands off nothing and names audience-no-longer-matches. A canceled reader and the free reader both receive a subsequent free issue. Settings paid/consent-missing counts and contact timeline run at 1440/390 with overflow and axe assertions. The same journey distinguishes an observed invoice.payment_failed from paused/incomplete or unreadable authority: the latter says paid status could not be confirmed; conservative paid denial is unchanged (ct 23 October 05:30Z). `tests/portability.spec.ts` — “complete native records and uploaded assets round-trip without restoring login authority” preserves a populated paid-state upgrade, exports/restores the added fields, and exercises the restored generation triggers; “current erasure authority refuses an old archive on an empty restore target” removes paid rows and rejects their old archive. `tests/local-start/retained-archive.journey.ts` — “a Platform-migrated installation restores the listed version’s Platform backup without Wrangler” exercises the generated migration specification. Gap: Sandbox proof pending: the acceptance's Stripe test-mode checkout needs a held restricted test key (`rk_test_`) for Mango's Owner connection; the held test keys are unrestricted (`sk_test_`), which the connection refuses by design. Stripe Tax's test-account state is ct's 23 October source read, not a live-provider receipt from this round. The Nectar rail is not connected (INT-004). Policy ruled by ct (22 October 20:05Z): payment never creates or widens consent; a paid topic needs the reader's own confirmed channel consent, opt-out and suppression win, and a payer without it is counted as paid, consent missing and never mailed. Paid membership follows a fresh Stripe read for checkout completed, customer.subscription.* including paused/resumed, invoice.payment_failed and invoice.paid: active/trialing is paid; past_due, unpaid, paused, incomplete, incomplete_expired and canceled leave; a later active/trialing read rejoins. Read-start time orders overlapping reads, never the event's created second; equally fresh conflicting reads leave the paid topic. Failed Stripe reads remove paid eligibility, move the source-authority fence, record a failed operation and return a retryable refusal; the same event can recover after a successful fresh read. Cancellation ends paid membership only, while consent withdrawal stops every send on the channel. Immediate-confirmation card methods only; delayed methods are not supported. Paid writes move the source-authority fence, including a change after the final recheck. Mango stores Stripe ids, states and Stripe-reported tax, never card data or funds. Payer signup/consent capture is PUB-005's separate obligation under ct's approved 23 October 04:38Z defaults; its implementation status is PUB-005's own row. No real provider call, store, account or consent was used.
- **PUB-003 — Recommendations** (missing). Ticking a partner at signup posts to the partner's signup edge with the consent text and records one recommendation.
- **PUB-004 — Direct sponsorships** (missing). A booked slot inserts the sponsor block into that issue's draft, and the sponsor report lists the issue's tracked clicks.
- **PUB-005 — Paid signup page and payer consent** (done). a first-time payer completes checkout from the page, appears as “paid, consent missing”, receives one confirmation at the mail edge and, after confirming, the next paid-only send; an unsubscribed payer stays unsubscribed until their own confirmation. Evidence: `tests/go-live/roles.journeys.ts` — “[PUB-005][FORM-008][FORM-010][INT-004][OPER-003][OPER-004] roles govern native requests and removal retains authors, approvers and history”, via `tests/go-live/paid-signup-journey.ts`: the Owner-saved tier serves the hosted page with recurring price/frequency, Stripe Tax and unchecked consent; its button creates a real Worker Checkout session at the Stripe network edge and returns to the Mango next-steps page. A first-time payer is paid with consent missing, gets one paid-checkout confirmation despite replay, confirms by POST, then receives exactly one paid-only mail-edge send while a free reader does not. An existing subscribed/confirmed address gets no second confirmation; an unsubscribed payer stays unsubscribed through payment and GET, then resubscribes only by their own POST; a suppressed payer gets no mail and stays suppressed. Public erasure/resume removes the payer address and consent evidence. The same registration proves paid capture spends the shared accepted network allowance, subscribed/replayed requests do not spend it, and paid and free intake both refuse its exhaustion with no further Stripe hand-off; the paid refusal names its reason and returns Retry-After. Signup and return pages at 1440/390 have no horizontal overflow or serious/critical axe finding. No real provider call, account or consent was used. Gap/defaults: Default ADOPTED, approved by ct 23 October 04:38Z: page only for an Owner-saved tier, displaying exact price/frequency before Checkout; newsletter consent is unchecked and separate from payment, recorded with timestamp, source and wording version when Checkout opens and authorizing only one confirmation per payer address per Checkout session. Already subscribed/confirmed needs no second confirmation. Never-confirmed payers receive no paid or free newsletters. Payment events never create or widen consent; unsubscribe and suppression win and resubscription requires the person’s own POST confirmation. Stripe hosts the card fields; Mango has none. Erasure follows the existing audit-fact rule and removes address and consent evidence. PUB-002’s restricted-key sandbox and Nectar gaps are separate; no real provider call or consent was used.

### Agents

- **AGENT-001 — Retention-gap finder** (partial). On a seeded store history with a missing post-purchase flow and a lapsed cohort, the agent's findings name both with counts that match the data, and cite the queries behind them. Evidence: `src/core/features/proposals/forecast.ts` · `src/core/features/proposals/service.ts`.
- **AGENT-002 — Journey proposal with holdout and stop rules** (missing). The agent's proposal for the seeded lapsed cohort arrives as a draft flow with a holdout, metric, period and stop rules; it cannot be activated by the agent, and an operator activates it through the normal checks.
- **AGENT-003 — Outcome judge** (missing). With seeded outcomes where the holdout converts as well as the messaged group, the agent reports no supported lift at the checkpoint and recommends retirement; with a breached complaint threshold it pauses the flow and notifies operators.
- **AGENT-004 — Lifecycle failure diagnosis and repair** (partial). With a simulated six-hour Shopify webhook outage, the agent reports the gap, lists the 37 missed checkouts, and its approved replay enrolls only those still relevant and not already messaged, sending nothing twice. Evidence: `src/core/features/store/synchronize.ts` · `src/core/features/lifecycle/provider-outages.ts`.
- **AGENT-005 — Deliverability diagnostician** (missing). With seeded Outlook policy-block bounces following a send to unengaged contacts, the diagnosis names the campaign, provider and segment, and its proposals are drafts that change nothing until applied.
- **AGENT-006 — Account audit** (missing). On a seeded account with three known issues, the audit lists all three with links, and each fix opens as a draft.
- **AGENT-007 — Grounded content drafting** (partial). A drafted abandoned-cart email names only products and prices present in the catalog; a draft containing a claim not in the evidence is rejected as PROP-007 requires. Evidence: `src/core/features/proposals/generation.ts` · `tests/proposals-decision/decision-routes.spec.ts`.
- **AGENT-008 — Natural-language segments and questions** (missing). The example request becomes a rule whose summary names the state, order count and recency conditions and whose count matches the builder's.
- **AGENT-009 — Standing routines with memory** (missing). A routine with a revenue-drop alert fires once on a seeded drop, stays within its cost limit, and a memory note excluding a product line keeps that line out of the next drafted content.
- **AGENT-010 — Agent authority and guardrails** (partial). Attempts by an agent to approve, activate, send and change consent are each refused server-side with a named reason and logged; disabling the agent stops its next scheduled run. Evidence: `tests/proposals-decision/decision-routes.spec.ts`. Inherits OPER-007: every agent action appears in the Activity log under its grant, and the agent filter lists those grants.
- **AGENT-011 — Migration agent** (missing). On a Klaviyo fixture the agent proposes mappings for every field, flags a consent-upgrading column, and nothing is written until the operator approves the plan. On a Mailchimp fixture it proposes the MOVE-007 segment and MOVE-008 journey mappings, with each unsupported condition or step explained.

### Managed installation and editor

- **MGMT-001 — Signed first-owner admission** (partial). Signed first-owner admission once per installation; hosted proof pending. Evidence: `src/core/features/auth/owner-claim.ts`.
- **MGMT-002 — Native owner editor** (done). The native owner editor mounts for the native owner only. Product authority follows OPER-004's six roles separately from Base's unchanged owner/admin/member roles, with last-product-Owner protection, destination-owned authority on restore and CSV export restricted to Owner/Admin. Evidence: `tests/local-start/editor.journey.ts`.

The PUB-001 journey (`tests/campaign-results/archive.journeys.ts`) exercises publication from a completed campaign, neutral anonymous SSR and browser reading, search metadata, RSS, idempotent publication and withdrawal at 1440 and 390. Draft and no-handoff campaigns, anonymous mutations and foreign-origin mutations are refused. The contact erasure cascade includes published reading copies; the existing native erasure journey includes an attributed public copy. This is local Worker/D1 evidence, not hosted or live-provider acceptance.

The DELIV-005 journey (`tests/go-live/mailbox-provider.journeys.ts`) sends a native approved campaign through the provider edge, applies cryptographically signed Gmail, Outlook, Yahoo, iCloud and custom-domain outcomes, and verifies each bounce category, overlapping delivery/complaint counts, repeated human clicks, scanner exclusion, replay and the absence of recipient identities in the report. Insights is exercised at 1440 and 390, including the no-events state. The existing Resend reconciliation journey remains green after bounded diagnostic preservation. These are locally signed-edge outcomes, not acceptance from a live provider account.

Typed email tests are exercised through the real saved-draft route and provider edge by `tests/go-live/typed-tests.journeys.ts`, including two recipients, opt-out and suppression refusal, competing requests at the daily allowance, recorded destinations, no campaign send authority, and review at 1440 and 390. Typed SMS and the target Manager/Author controls and general activity log remain open.
