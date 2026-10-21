# Moving in from an email tool

Use **Audience → Import contacts** to review an audience CSV before applying it. This guide covers Mailchimp and Kit as a **documented format, tested on synthetic files shaped from the published help page, not on a real export**. No real export was supplied. Review your own headers, statuses and original consent records before importing.

## Prepare and review

1. Export your email contacts, including opt-outs and suppressions. Unzip the download and keep each status file separate. Choose CSV files, not campaign reports or SMS exports.
2. Choose the generic preset shown below for each file. A preset establishes a minimum restriction. Every recognized status column can make a row more restrictive, even if you map another status column.
3. Press **Preview import**. Review the suggested field mapping, change it if needed, then refresh the preview. Suggestions ignore case, spaces and underscores; absent fields stay unmapped.
4. Check the created, updated, rejected, unsubscribed and suppressed counts and every warning. Preview saves a review plan but changes no contacts. Correct rejected rows before starting.
5. Press **Start import**. The journal shows progress and offers resume or retry after an interruption. Repeating the same reviewed file is safe. Use **Undo import** to reverse that job's changes; a later opt-out or other conflicting edit prevents undo from overwriting it.

See [Importing contacts](./importing-contacts.md) for limits, evidence requirements, resume and undo details.

## Mailchimp

Mailchimp's [export help](https://mailchimp.com/help/view-export-contacts/) describes an audience download with separate CSV files for subscribed, unsubscribed, non-subscribed and cleaned email contacts. Select the email audience files in the unzipped download, using each filename's status. Do not choose the SMS folder: its Subscription Status describes a different channel.

| Email contact file | Mango preset | Result |
| --- | --- | --- |
| Subscribed | CSV: subscribed | Non-subscribed unless full original consent evidence is supplied |
| Unsubscribed | CSV: unsubscribed | Unsubscribed |
| Non-subscribed | CSV: non-subscribed | Non-subscribed |
| Cleaned | CSV: cleaned | Suppressed |

The export help lists audience fields and the four opt-in/confirmation columns below. Mailchimp's [audience-field examples](https://mailchimp.com/help/all-the-segmenting-options/) name Email Address, First Name and Last Name; first and last names are default text fields. Map these labels when present. Audience fields vary with your audience, so inspect the file rather than assuming every field exists.

| Source column | Mango field |
| --- | --- |
| Email Address | Email |
| First Name | First name |
| Last Name | Last name |
| OPTIN_TIME | Occurred at (original opt-in time) |
| OPTIN_IP | Capture IP |
| CONFIRM_TIME | Confirmed at |
| CONFIRM_IP | Confirmation IP |

Leave unrelated fields unmapped. These exports need not contain an email status column: the separate file and its preset carry the restriction. Optional marketing-permission fields and signup timestamps alone do not establish all the original consent scope Mango requires.

The synthetic examples cover all four files. The three existing subscribed, unsubscribed and cleaned examples retain their original bytes; the non-subscribed example is `source-a-non-subscribed.csv` in the repository's audience-import fixtures. These examples are a **documented format, tested on synthetic files shaped from the published help page, not on a real export**.

## Mailchimp full account export

Mailchimp's [account export](https://mailchimp.com/help/export-back-up-data/) puts audiences, emails, templates and more into one ZIP. Mango reads that ZIP in one review: audiences by status, sent emails as imported history and templates as draft starters, with a reconciliation report and an undo. This route is a **documented format, tested on synthetic files shaped from the published help page, not on a real export**. No real export has been reconciled yet.

### Request the export

In Mailchimp, open your profile, then **Account → Settings → Manage my data**. Tick the data you want, choose a time frame and press **Export Data**. Mailchimp allows one export every 24 hours and emails you when the ZIP is ready to download from the same page. Do not unzip it.

### What the export holds and what Mango does with it

Mango recognises each part from its folder names, file names and CSV headers, never from the tool's name.

| In the export | In Mango |
| --- | --- |
| Audience folders: cleaned, subscribed, transactional (non-subscribed) and unsubscribed CSV files | Contacts, each file with its matching status preset: cleaned becomes suppressed, transactional becomes non-subscribed, unsubscribed stays unsubscribed. Subscribed rows become subscribed only with the full consent evidence below. |
| Emails CSV with a `campaigns_content` folder of HTML and TXT | Read-only **imported history**: title, subject, the send time exactly as the source states it, and the content. Each has **Copy into a new draft**. |
| Templates folder of HTML | **Draft starters**: ordinary drafts you edit, check and approve like any other. |
| `reports/granular_activity` CSV files | Historical clicks and open estimates on matching contacts, linked to imported campaign history at the original times. The CSV must name `campaign_id,email,action,timestamp`; optional `url` or `link` identifies a clicked link. |
| Other reports (aggregate activity and geography) | Kept as raw source, not imported. |
| Gallery images and files | Kept as raw source, not imported, with a count. |
| SMS, custom events, appointments, ecommerce products and orders | Kept as raw source, not imported. |
| Content files with no row in the emails CSV, or anything unrecognised | Kept as raw source, not imported. |

Mailchimp's export does not contain deleted audiences, billing receipts, third-party data, or website, landing-page and ad content, so none of these can move in.

Imported history and draft starters carry no schedule, approval or delivery authority. Reports and "sent" rows stay source records: they never create a delivery, acceptance, campaign count, result figure or revenue in Mango.

Imported clicks count for dormancy at their original times. Imported opens are estimates and never engagement. The contact timeline labels both as imported and names their source file. Unknown addresses, invalid times, unsupported actions, malformed rows, invalid links and missing campaign identities are counted and dropped by named reason in reconciliation. The importer never creates Mango send facts, results or attribution, and never changes consent from activity rows. The Mailchimp API activity pull and other incumbents’ history remain unimplemented. Scoring, activity segments, sunsetting and send-time optimization still owe consumption of these facts.

### Preview, import and undo

1. Under **Audience → Import contacts**, choose the ZIP. The file list shows it as a whole account export.
2. Enter the consent evidence once for the whole archive: brand or legal sender, message category, disclosed frequency, destination jurisdiction, consent version and the original consent text. Supply only what people actually saw. A subscribed row also needs its own opt-in and confirmation times (`OPTIN_TIME`, `CONFIRM_TIME`); a row missing any of it imports as non-subscribed with the standard warning.
3. Press **Preview import**. Preview writes nothing. Per audience file it shows created, updated, duplicates in that file and across files, rejected rows with reasons, unknown consent, unsubscribed and cleaned. It also lists every content change and every folder kept as raw source, not imported.
4. Press **Import archive**. Mango keeps the original ZIP as the import's raw source, with a content hash of the archive and of every entry; the import record lists each entry with its hash. Contacts, content and engagement then advance in bounded steps (at most 50 engagement/coverage writes per continuation); **Continue import** resumes an interrupted one.
5. **Undo this import** removes the imported contacts, drafts and history records that nobody has changed. It keeps and lists, with the reason, any contact or draft edited after the import, any contact who unsubscribed or was suppressed since, any contact who existed before, and anything scheduled or sent since. It never erases an opt-out, a suppression or send history.

Undo removes the archive’s imported engagement facts and its no-history coverage, including facts on contacts it keeps. Repeating an applied archive creates no duplicate facts. Contact merges move these records to the survivor; erasure removes the erased contact’s facts; installation backup and restore carry both facts and move-in completion times.

An address in two files takes the most restrictive status, so an address that is both subscribed and unsubscribed imports as unsubscribed. An address already opted out in Mango stays opted out. A contact that was already in Mango keeps its name; the name in the export is kept on the contact's import record. Cleaned and unsubscribed contacts are never sendable. Importing the same archive with the same consent evidence a second time changes nothing; after an undo, it applies again cleanly and keeps every opt-out. The order of files inside the ZIP does not change the result.

### HTML and merge tags

All imported HTML is reduced to Mango's restricted email HTML. Document heads, scripts, styles, comments, forms, and unsupported tags and attributes are removed. Links without an HTTPS address lose the link but keep their text, and images without an HTTPS address and explicit width and height are removed. Each change is listed in Preview and on the record. Mailchimp merge tags such as `*|FNAME|*` and `*|UNSUB|*` (documented on its [merge tag cheat sheet](https://mailchimp.com/help/all-the-merge-tags-cheat-sheet/)) are left as written. Mango does not guess their meaning: a draft that still contains one fails the personalisation check, which blocks approval until you replace the tag with a Mango field or delete it.

### Reading the reconciliation report

After an import, **Download reconciliation report** gives a Markdown file with no secrets. For each audience file, source rows equal created + updated + duplicates + rejected + skipped, and the **Adds up** column says whether they do. The emails CSV and templates follow the same rule. The report also lists the kinds kept as raw source, rows with unresolved consent, every audience row with its outcome, every rejected row with its reason, each history record and draft with its state and, after undo, every contact kept with its reason. Check that each file's source rows match the row count in your own copy of the export.

### Limits for a full export

One archive is read inside a single Worker request (128 MB memory). These limits come from measuring the reader on generated archives under a capped heap:

| Limit | Value | Why |
| --- | --- | --- |
| Uploaded ZIP | 16 MB | The ZIP is held in memory and stored as custody. A 14 MB ZIP holding 15 MB of gallery images peaked at about 31 MB. |
| Entries | 5,000 | Bounds directory checks and per-entry hashing. |
| Engagement rows per archive | 10,000 | A larger granular-activity export is refused visibly before import; request a shorter time frame. The existing 12 MB retained-text and ZIP limits also apply. |
| One expanded entry / all entries | 64 MB / 160 MB | Entries stream through inflate and hashing and are never written to disk; only text kept for review stays in memory. 124 MB of expanded reports peaked at about 115 MB of heap and buffers (70 MB of process growth), down from 193 MB before streaming. |
| Expanded text read for review | 12 MB | Audience CSVs, the emails CSV, content and templates are held as text. The worst case measured, 5,000 rows plus 600 HTML files and 11.25 MB of text, peaked at about 75 MB. |
| Audience rows | 5,000 per archive | Each reviewed row holds a snapshot: 5,000 rows peaked at about 81 MB, and 10,000 ran out of memory under a 150 MB heap. A larger audience imports as individual CSV files, up to 50,000 rows per review. |
| Compression ratio | 100 to 1 for entries over 1 MB | Refuses expansion bombs before inflating them. |
| History records / draft starters | 500 / 100 per archive | Content is written in pages of 20 after the import starts; a larger export is refused with a request to export a shorter time frame. |

Mango refuses an archive, saving nothing and naming the reason, when it is not a ZIP or is truncated, split or ZIP64, or when an entry has an absolute or `..` path, a duplicate name, a symbolic link or encryption. Entries that overlap, use an unknown compression method, fail their CRC, disagree with their header or exceed a limit are refused the same way. Archives nested inside the export are never opened: they are skipped and counted as kept as raw source. A larger export gets a plain message: unzip it and import the audience CSV files individually above, or export again with a shorter time frame and without the gallery.

The synthetic archive is built by `tests/move-in/archive.ts` from the files in `tests/move-in/fixtures/account-export`, which use reserved addresses only.

## Kit

Use Kit's [subscriber CSV export](https://help.kit.com/en/articles/2502489-how-to-export-subscribers-in-kit), filtering by status so each file can use the matching generic preset. Its [subscriber status guide](https://help.kit.com/en/articles/2502651-the-subscriber-profile-page-and-status) documents the statuses below.

| Source Status | Mango preset | Result |
| --- | --- | --- |
| Confirmed | CSV: subscribed | Non-subscribed without full original consent evidence |
| Unconfirmed | CSV: subscribed | Pending, because the Status column restricts the preset |
| Unsubscribed | CSV: unsubscribed | Unsubscribed |
| Complained | CSV: cleaned | Suppressed |
| Bounced | CSV: cleaned | Suppressed |
| Blocked | CSV: cleaned | Suppressed |

For an Unconfirmed file, keep **Status** mapped and confirm **Pending** in the preview. If the column is missing, use **CSV: non-subscribed**; never infer confirmation from the file's name. Cold describes engagement among confirmed subscribers, not a separate subscription status.

| Source column | Mango field |
| --- | --- |
| Email address | Email |
| First name | First name |
| Status | Email marketing status |
| Created date and time | Leave unmapped |
| Tags, location, attribution and custom fields | Leave unmapped unless you have deliberately prepared a supported field |

Created date and time records creation of the profile, not original opt-in or confirmation. Confirmed can include automatic confirmation when double opt-in was disabled. Neither supplies Mango's original consent evidence. A plain Confirmed export therefore imports as non-subscribed with the standard missing-evidence warning.

The six `source-b-*.csv` examples cover these six statuses. They are a **documented format, tested on synthetic files shaped from the published help page, not on a real export**.

## Keep permission intact

A subscribed candidate needs valid original opt-in and confirmation timestamps, with confirmation at or after opt-in, and the six original scope fields: brand or legal sender, message category, disclosed frequency, destination jurisdiction, original consent text and consent version. Supply only evidence you actually hold. Capture IPs are provenance; they cannot replace timestamps or scope. Record creation dates are never suggested as consent timestamps.

Across presets, status columns and duplicate rows, the most restrictive state wins: **suppressed → unsubscribed → non-subscribed → pending → subscribed**. Cleaned, bounced, hard-bounce, complained and blocked become suppressed; transactional becomes non-subscribed; unconfirmed and pending confirmation become pending. Unknown status words reject the row for review. Existing opt-outs remain opted out, including when the address has an erasure opt-out record.

Only contacts with confirmed consent can enter a send. Campaign review excludes opted-out contacts, and dispatch checks their status again. Importing a file or choosing a preset never grants permission to send.
