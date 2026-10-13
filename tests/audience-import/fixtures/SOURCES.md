The three original Mailchimp CSV fixtures were authored as documentation-shaped examples, not downloaded customer exports. Their bytes are preserved unchanged. They exercise the generic CSV mapping and status rules only; no real vendor export importer is advertised or established by these fixtures. All addresses and IPs are reserved documentation values.

- https://mailchimp.com/help/view-export-contacts/ documents audience fields in exports, separate email-status files, and the OPTIN_TIME, OPTIN_IP, CONFIRM_TIME and CONFIRM_IP headers.
- https://mailchimp.com/help/all-the-segmenting-options/ supplies the common audience-field labels Email Address, First Name and Last Name in its Text fields section, which also says first and last names are included by default. These labels inform the synthetic examples; inspect each export's actual audience fields before mapping.

The generic preset does not infer permission from a subscribed filename alone. Native send eligibility also requires the original consent scope and confirmed evidence. Cleaned/bounced values map to suppression; unsubscribed values map to opt-out. Customer-specific audience fields, optional marketing permissions and billing data are not covered.

Capture provenance identifies the CSV filename with capture_method csv-export and capture_source CSV import. It never claims an original signup method or a verified vendor source. Previously persisted provenance remains unchanged, including when exported and restored through Mango's lossless ledger.

The move-in guide now covers two documented formats. For each: documented format, tested on synthetic files shaped from the published help page, not on a real export. No customer export was supplied. These files demonstrate public field shapes and restrictive status handling; their invented timestamps do not establish consent.

| Source | Synthetic file | Generic preset | Expected state without original scope |
| --- | --- | --- | --- |
| Mailchimp subscribed | mailchimp-subscribed.csv (unchanged) | csv-subscribed | non-subscribed; missing-evidence warning |
| Mailchimp unsubscribed | mailchimp-unsubscribed.csv (unchanged) | csv-unsubscribed | unsubscribed |
| Mailchimp cleaned | mailchimp-cleaned.csv (unchanged) | csv-cleaned | suppressed |
| Mailchimp non-subscribed | source-a-non-subscribed.csv | csv-non-subscribed | non-subscribed |
| Kit Confirmed | source-b-confirmed.csv | csv-subscribed | non-subscribed; missing-evidence warning |
| Kit Unconfirmed | source-b-unconfirmed.csv | csv-subscribed | pending |
| Kit Unsubscribed | source-b-unsubscribed.csv | csv-unsubscribed | unsubscribed |
| Kit Complained | source-b-complained.csv | csv-cleaned | suppressed |
| Kit Bounced | source-b-bounced.csv | csv-cleaned | suppressed |
| Kit Blocked | source-b-blocked.csv | csv-cleaned | suppressed |

Anonymous public help retrieval on 2026-10-11, retained with raw bytes in the task evidence `m2-research/`:

| Help page | SHA-256 | Bytes |
| --- | --- | --- |
| https://mailchimp.com/help/view-export-contacts/ | 0e69bb9bb5837407a47c292aedeed387a002a8bcfe38afb18e1295aedef7dff4 | 296733 |
| https://mailchimp.com/help/all-the-segmenting-options/ | 478b7c3702c18c6b62585d866f23ff89c100ac699d1f56366632882741a13f85 | 317503 |
| https://help.kit.com/en/articles/2502489-how-to-export-subscribers-in-kit | c012169fe7168db0c91d9e19ce0e258d8b57f8a8a9369489917efda6981538ba | 194726 |
| https://help.kit.com/en/articles/2502651-the-subscriber-profile-page-and-status | a9b2b668b511fbe492eec5a371d264c2475715638650da486c7a038c72676150 | 248445 |

Mailchimp's export help documents separate email-status files, audience fields in general and the four opt-in/confirmation headers; the separate audience-field help names the three common labels used in the guide. This is evidence for published field shapes, not confirmation of any real export's exact columns. Kit documents First name, Email address, Created date and time, Status and Tags among its export columns. Its separate status help supplies the six words in the matrix. Created date and time is deliberately not a consent mapping. Cold is an engagement classification, not a status fixture. The preview/transaction/undo fixture loop exercises all ten files through authenticated public routes against real D1; send eligibility is also checked at campaign review and dispatch.

## Full account export (tests/move-in/fixtures/account-export)

The files under `tests/move-in/fixtures/account-export` are a synthetic Mailchimp full account export: documented format, tested on synthetic files shaped from the published help page, not on a real export. `tests/move-in/archive.ts` zips them at test time. The folder layout follows the export help: audience folders with separate cleaned, subscribed, transactional and unsubscribed CSV files, an emails CSV with a `campaigns_content` folder of HTML and TXT, a templates folder, reports (`aggregate_activity`, `geo_data`, `granular_activity`), gallery, SMS, events, appointments and ecommerce. The help page does not publish the emails CSV's columns or the report files' columns, so those headers are invented and Mango finds them by header aliases, not fixed names. The content uses `*|FNAME|*` and `*|UNSUB|*` from the merge tag cheat sheet so that the unrecognised-tag check is exercised. Addresses are `example.test`, IPs are `192.0.2.x`, and the SMS number is from the ACMA fictional range.

Anonymous public help retrieval on 2026-10-12 (raw bytes in the task evidence `help-page/`):

| Help page | SHA-256 | Bytes |
| --- | --- | --- |
| https://mailchimp.com/help/export-back-up-data/ | b18d974b0cd2f06b5707be97a4f2600b57c05c625bd1d169c69edd315ad09858 | 284260 |
| https://mailchimp.com/help/all-the-merge-tags-cheat-sheet/ | 7a6e7cb817a18d5d5346994d664b2fe8f91fe3b58f35474982bfd9e942029a5a | 314904 |
