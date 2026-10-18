> Integration brief baseline: the numbered rows below are Coffer’s homepage claims, supplied for the sibling integration. They are retained here at the brief’s direction; they are not Mango homepage claims. This change only reassesses row 36 and adds the Mango integration rows at the end.

# Coffer homepage claims → code

Every capability claim on the built homepage (`src/site/landing/`, branch `br/style`), checked against the code on that branch. The copy is the desk's owner-accepted copy and is not watered down; this table is what the run-site gate reads before any deploy.

The product is designed for Coffer's new contract (a nonprofit fundraising CRM replacing Bloomerang or Little Green Light). `CONTRACT.md` on main is still the first-release contract (donor records, immutable gift ledger, consent, $250 acknowledgement letters, consent-checked appeals, Stripe move-in, custody), so most giving, sending and reporting claims are contract, not yet in code.

**Totals: 61 claims · 11 in code · 18 partly · 32 contract, not yet in code.**

"Try the demo" links to /run: Coffer has no hosted demo yet (run-coffer.com is not registered).

| # | Section | Claim | Status | Backed by |
|---|---|---|---|---|
| 1 | Hero | "Coffer takes donations" | contract, not yet in code | No donation forms or payment processing; Stripe enters only through the saved-page move-in (`src/coffer/imports/`). |
| 2 | Hero | "keeps every donor's story" | in code | `src/coffer/donors.ts` `donorHistory` (gifts, pledges, consent, letters, appeals, activity) on `src/coffer/ui/donors.ts` `donorPage`. |
| 3 | Hero | "sends the receipts" | partly | `src/coffer/acknowledgements.ts` prepares, approves, exports and records letters as sent; Coffer never sends them itself. |
| 4 | Hero | "and thank-yous" | partly | Same letters (`acknowledgements.ts`, wording in `settings.ts`); sending is the charity's own mail. |
| 5 | Hero | "shows who needs a call" | contract, not yet in code | No lapsed-donor or call list; Today (`ui/home.ts`) lists letters due and waiting approvals only. |
| 6 | Hero | "100% free, open source alternative to Bloomerang, Little Green Light and Neon CRM" | partly | Free and MIT (`LICENSE`); covers donor records, gift ledger, consent, letters and appeals, not the incumbents' giving, email or reporting. |
| 7 | Hero card | Spring appeal $48,210 of $60,000, gifts and recurring donors | contract, not yet in code | Appeals (`appeals.ts`) are consent-checked audiences with no goal, totals or recurring donors. |
| 8 | Hero card | Monthly $25 · Active | contract, not yet in code | No recurring gifts. |
| 9 | Hero card | Failed card · Retried successfully | contract, not yet in code | No payment processing or retries. |
| 10 | Hero card | Receipt sent · Gift $250.00 · No goods or services provided | partly | $250 threshold, goods-or-services statement and recorded sent date exist (`acknowledgements.ts`, `settings.ts` `renderLetter`); not sent by Coffer. |
| 11 | Hero card | Call Tom Okafor · lapsed 14 months | contract, not yet in code | No lapse detection or call tasks. |
| 12 | Online giving | Donation forms and campaign pages | contract, not yet in code | None in code. |
| 13 | Online giving | monthly giving | contract, not yet in code | None in code. |
| 14 | Online giving | card, bank and Apple Pay checkout | contract, not yet in code | None in code. |
| 15 | Online giving | a portal where donors update their own card | contract, not yet in code | No donor-facing portal. |
| 16 | Donors | Households | in code | `src/coffer/donors.ts` `household()` finds or creates by name; members listed on the donor page. |
| 17 | Donors | relationships | partly | Household membership only; no other relationship types. |
| 18 | Donors | every gift | in code | `src/coffer/gifts.ts` ledger lines; `donorHistory` lists them by year. |
| 19 | Donors | every conversation in one place | contract, not yet in code | Gift notes and the audit trail only; no interaction or conversation records. |
| 20 | Donors | soft credits | contract, not yet in code | None in code. |
| 21 | Donors | tributes | contract, not yet in code | None in code (a gift note can mention one). |
| 22 | Donors | employer matches | contract, not yet in code | None in code. |
| 23 | Donors card | Lifetime giving and first gift | partly | Lifetime and yearly totals in `donorHistory` `totals`; first-gift date is not shown. |
| 24 | Payments | Gifts sync from Stripe as they happen | partly | `src/coffer/imports/` moves in saved Stripe customer and charge pages with preview, apply and undo; no live sync. |
| 25 | Payments | fees, refunds | partly | Move-in nets partial refunds and skips full refunds (`imports/snapshots.ts`); no fees. |
| 26 | Payments | failed monthly payments | contract, not yet in code | Failed charges are skipped at move-in; no recurring payments. |
| 27 | Payments | each payout matches its deposit in QuickBooks Online or Pantry | contract, not yet in code | No payouts or accounting link. |
| 28 | Payments | split by fund | partly | Every gift carries a fund (`gifts.ts`, move-in `metadata.fund`); no payout split. |
| 29 | Receipts | Thank-you letters | partly | Prepared from the charity's wording, approved, exported as CSV and recorded as sent (`acknowledgements.ts`). |
| 30 | Receipts | year-end tax receipts | contract, not yet in code | No year-end statements; letters are per gift. |
| 31 | Receipts | by email | contract, not yet in code | Coffer sends no email; letters are exported. |
| 32 | Receipts | print-ready for mail | partly | CSV export for a mail merge (`lettersCsv`); no print layout. |
| 33 | Receipts | with the right IRS language | in code | `settings.ts` requires donor, amount, date, organization and the goods-or-services statement; default 501(c)(3) wording in `migrations/core/0016_coffer.sql`. |
| 34 | Receipts | proof of delivery | partly | Sent date and method recorded per batch (`ack.markSent`); no delivery or open tracking. |
| 35 | Interlude | Thank-yous sent · 48 donors tonight | partly | Letter batches are recorded as sent; Coffer does not send them. |
| 36 | Appeals | Appeals and welcome journeys go out through Mango or Mailchimp | partly | Mango now has scoped subscriber sync, refusal events and dispatch of an owner-approved segment campaign (`src/core/features/integrations/`, `tests/go-live/integrations.journeys.ts`). The Coffer client is supplied as a patch for its writer; Coffer main adoption, appeal composition and welcome journeys are not claimed by this Mango change. |
| 37 | Appeals | welcome journeys | contract, not yet in code | None in code. |
| 38 | Appeals | Unsubscribes are honored everywhere | partly | Mango’s unsubscribe feed and durable suppression use existing send eligibility (`tests/go-live/integrations.journeys.ts`). The supplied Coffer client patch imports refusals as consent withdrawals and pushes Coffer no-email back to Mango. Coffer main adoption remains with its writer; no whole-product everywhere claim is made here. |
| 39 | Appeals | replies land with the right person | contract, not yet in code | No inbound mail. |
| 40 | Major gifts | major-gift pipeline with next steps, owners and engagement scores | contract, not yet in code | None in code. |
| 41 | Development agent | reconciles every gift | contract, not yet in code | Agent keys can only read and prepare (`auth.ts`, `commands.ts`). |
| 42 | Development agent | rescues failed monthly gifts | contract, not yet in code | None in code. |
| 43 | Development agent | sends missing receipts | partly | An agent key may run `ack.prepare`; a person approves and sends. |
| 44 | Development agent | drafts stewardship from your own history | contract, not yet in code | None in code. |
| 45 | Development agent | tracks retention donor by donor | contract, not yet in code | No retention reporting. |
| 46 | Move in | Move from Little Green Light | contract, not yet in code | Only the Stripe importer exists (`src/coffer/imports/`). |
| 47 | Move in | Bloomerang | contract, not yet in code | No importer. |
| 48 | Move in | Raiser's Edge NXT | contract, not yet in code | No importer. |
| 49 | Move in | with every donor, household and gift | partly | Stripe customers become donors and charges become gifts; no households from Stripe. |
| 50 | Move in | check the totals before you switch | partly | Preview shows donors, gifts, the total and every skip with its reason, and apply needs the reviewed fingerprint (`imports/service.ts`, `ui/move-in.ts`). |
| 51 | Ownership | Run Coffer on your own computer | in code | `rer dev` (`scripts/installer/local.mjs`, README), local D1. |
| 52 | Ownership | keep every donor record / Your donors, your database | in code | The installation's own D1 database (`wrangler.jsonc`, `migrations/`). |
| 53 | Ownership | Export everything, any time | in code | `/app/backup` and `rer export` through Base portability (`src/coffer/http.ts`, `archive-policy.mjs`). |
| 54 | Quiet details | Soft credits | contract, not yet in code | None in code. |
| 55 | Quiet details | Tribute gifts | contract, not yet in code | None in code. |
| 56 | Quiet details | Matching gifts | contract, not yet in code | None in code. |
| 57 | Quiet details | Pledges: schedules, reminders and balances kept current | partly | Pledges with due-by date, paid and remaining balance (`donors.ts`, `gifts.ts` pledge link); no schedules or reminders. |
| 58 | Quiet details | Consent: email and mail preferences honored everywhere | in code | `donors.ts` consent history per channel; enforced in `appeals.ts`. |
| 59 | Quiet details | Gift ledger: every change recorded; no gift is silently edited | in code | Database triggers refuse changes; corrections are reversals (`gifts.ts`, `migrations/core/0016_coffer.sql`); every command writes `cf_events`. |
| 60 | Closing | Open source donor management for every nonprofit | in code | MIT `LICENSE`; donor records as above. |
| 61 | Closing | Free and open source, MIT licensed | in code | `LICENSE`. |

## Mango integration claims

These rows describe the scoped integration delivered in Mango. The broader target clauses retain their own partial status in CONTRACT.md.

| Row | Claim | Status | Evidence |
| --- | --- | --- | --- |
| M1 | An owner can create a named credential with selected scopes, copy it once, inspect activity and revoke it; it cannot sign in as an operator. | in code | `src/core/features/integrations/credentials.ts`, `src/core/features/integrations/routes.ts`, `src/core/features/store/ui/settings-integrations.tsx`, `tests/go-live/integrations.journeys.ts` |
| M2 | A scoped client upserts by normalized email, keeps fields/tags in a saved list, records consent source and cannot lift an opt-out. | in code | `src/core/features/integrations/contacts.ts`, `tests/go-live/integrations.journeys.ts` |
| M3 | A no-email suppression blocks an approved send at handoff; unsubscribe, bounce and complaint events have replayable cursors. | in code | `migrations/core/0069_scoped_integrations.sql`, `src/core/features/integrations/service.ts`, `tests/go-live/integrations.journeys.ts` |
| M4 | One integrator page explains credentials, contact sync, suppression, event replay and approved-segment sending with curl examples. | in code | `docs/integrations.md`, `docs/site.json` |
| M5 | RER Managed integration provider calls say “not available yet”; self-hosted approved-segment dispatch retains ordinary sender and consent gates. | in code | `src/core/features/integrations/service.ts`, `scripts/installer/deploy-declaration.mjs`, `docs/integrations.md`, `tests/go-live/integrations.journeys.ts` |

## Mango daily-use claims

| Clause | Claim | Status | Evidence |
| --- | --- | --- | --- |
| MSG-013 | Operators insert Web, Email, Phone and Text links, inspect decoded contact destinations in review, and deliver contact links unchanged without click tracking. Invalid contact destinations block approval; images remain HTTPS-only. | in code | `src/core/features/campaigns/contact-links.ts`, `src/core/features/campaigns/ui/message-link-tool.tsx`, `tests/go-live/contact-links.journeys.ts` |
| AUD-006 | Every later step rechecks saved inclusion, custom exclusions and current consent; skipped contacts have a named reason and newly matching contacts stay outside the frozen audience. | in code | `src/core/features/audience/eligibility.ts`, `tests/go-live/multistep.journeys.ts` |
