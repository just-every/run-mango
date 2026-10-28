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
