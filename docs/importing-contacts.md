# Importing contacts

You can bring existing contacts into Mango with a CSV file. The import is built around one rule: a file can never create consent out of nothing, and it can never undo an opt-out. Open **Audience**, then **Import contacts**.

## Which formats exist

Mango has exactly two kinds of import:

- **Generic CSV.** You map your file's columns to Mango's fields. The presets are **CSV: subscribed**, **CSV: unsubscribed**, **CSV: cleaned**, **CSV: non-subscribed**, and the status each represents applies to the file's rows.
- **Mango audience export.** A file you downloaded from Mango's own **Download contacts CSV** button. See [Backup and export](./backup-and-export.md).

There are no named importers for other email services. Mango does not claim compatibility with any particular vendor's export; if your file is a CSV with an email column, use the generic import and review the suggested columns. The [move-in guide](./moving-in.md) explains documented file shapes tested with synthetic examples.

## Limits and file rules

Up to 10 files, 10 MB in total, and 50,000 rows per review. Files must end in `.csv`, have a header row with no empty or duplicate headers, and every row must have as many fields as the header. Give each file a different name.

## Step by step

1. **Select files and presets.** Choose each file and its preset.
2. **Field mapping.** Map your columns to **Email** (required), **Email marketing status**, **First Name**, **Last Name**, **Occurred At** (the original opt-in time), **Capture Ip**, **Confirmed At** and **Confirmation Ip**. Mango suggests matching headers, ignoring case, spaces and underscores. It recognizes `email` or `email address`; `status`, `email_status`, `email marketing`, `marketing status` or `email marketing status`; first and last names; and the original `optin_time`, `optin_ip`, `confirm_time` and `confirm_ip` fields (or the corresponding Mango field names). Missing fields stay unmapped, and your explicit choices are retained. Record creation dates are never suggested as consent.
3. **Consent evidence.** Fill in **Brand or legal sender**, **Message category**, **Disclosed frequency**, **Destination jurisdiction**, **Consent version** and **Original consent text**. These must describe what people actually saw when they opted in.
4. Press **Preview import**. Nothing is imported yet. You see counts for created, updated, rejected, unsubscribed and suppressed rows, plus a row-by-row table with warnings.
5. Press **Start import**.

## How consent is kept

A row becomes **subscribed** only if it carries an original opt-in time, a confirmation time and all six consent fields. Otherwise it is imported as **non-subscribed** with the warning "Original consent scope, opt-in time and confirmation time are required before this contact can receive marketing." A confirmation time before the opt-in time rejects the row. Times without a time zone are read as UTC.

Match the **Brand or legal sender** to your Settings sender name and the **Message category** to the category in your drafts (`newsletter` by default). If any eligible contact's consent was recorded for a different sender or category, approval is blocked.

Mango does not claim an original signup method for imported contacts. The contact's record shows the CSV file name and row as the source.

## How opt-outs are kept

Suppression and opt-out rows are applied before subscription data. Statuses `unsubscribed`, `suppressed`, `cleaned`, `bounced`, `hard-bounce`, `complained` and `blocked` all restrict the row. `transactional` becomes non-subscribed; `unconfirmed` and `pending confirmation` become pending; `confirmed` is treated as subscribed subject to the full consent-evidence requirement. `pending`, `non-subscribed` and `subscribed` are also accepted; any other status rejects the row. If a file has several status columns, or the same address appears twice, the most restrictive value wins, even if you chose "CSV: subscribed". A row that does not opt the person out never lowers a contact whose consent they confirmed in Mango (through a confirmation link). An address that is already unsubscribed or suppressed stays that way, and an address that already has a recorded opt-out is imported as unsubscribed, unless the person has since confirmed new consent in Mango (through a confirmation link) that is newer than every opt-out for the address: then their consent stands and Preview shows the row as "Kept: newer consent on" that date. Consent evidence in a file never outranks an opt-out, and an unsubscribe the person made after their consent always stands. A file's own unsubscribed or cleaned row is a new opt-out and always applies: it records an opt-out of its own (as does any row an import makes unsubscribed or suppressed), so undoing or abandoning that file, or any other, never makes the contact mailable again. A contact an earlier import still holds keeps everything else Mango has for it: an unsubscribed or cleaned row still opts it out or suppresses it, and any other row for it is skipped. Preview's warning names why it is held: the earlier import is still in progress, was undone, or was abandoned, an opt-out or suppression was applied to the contact after the earlier import, or the contact changed in Mango after it.

## Dormant contacts

Mango excludes contacts with no click, order or consent change in the last 12 months. For an imported contact the opt-in time counts, so a list whose opt-ins are older than a year shows up as excluded "dormant" in campaign checks.

## Progress, resume and undo

The **Imports** list shows each import's state and rows processed. A started import keeps writing on its own, step by step, until it completes; press **Stop** to pause it after the current step (leaving the page also stops it, and a step that fails stops it with the reason). Use **Resume import**, **Retry incomplete import** or **Continue undo** when an import stops partway, and **Undo import** (then **Confirm undo**) to reverse a completed one.

To drop an import that stopped partway instead of finishing it, use **Abandon import** (then **Confirm abandon**). Mango rolls back exactly what that import wrote: contacts it created are removed and contacts that were already here get their earlier details back. Opt-outs and suppressions stay, including any another file applied to its contacts while it was stopped, and its contacts are no longer held, so the same file can be previewed and imported again. The Imports list shows who abandoned it and when; **Continue abandoning** finishes a large one. A contact a person changed since the import wrote it (they unsubscribed or confirmed consent, or an operator edited it) is kept as it is now and is no longer held by the import; everything else rolls back, so Abandon always finishes, even when someone changes a contact between its steps. When it finishes, the page says how many rows were rolled back and how many were kept because people changed them.

Undo puts back each contact's other details and removes the contacts the import created, but it never lifts an opt-out or suppression: one the import applied or found stays, and so does the contact's unsubscribed or suppressed status. Undo first checks every contact the import wrote: if a person changed one since (they unsubscribed or confirmed consent, or an operator edited it), Undo changes nothing, the import stays completed, and the page explains the conflict. Once an undo has started, a contact someone changes between its steps is kept as it is now and the undo finishes. Later opt-outs and suppressions stay in place. An opt-out or suppression alone does not count as a change: after a later unsubscribe or cleaned list is undone, the earlier import can be undone too, and every restriction stays. After an undo, the same file can be previewed and imported again. A row with no name leaves the contact's name as it is. While an import is still running, another file's unsubscribed or cleaned row for a contact it has not written yet records the opt-out at once, and the running import then writes that contact unsubscribed or suppressed; any other row for it is skipped with a warning.

Deleting a contact withdraws every affected original file and its import custody, including duplicate and rejected source rows. Its import can no longer be resumed or undone; other imported contacts keep their current records and consent. Larger reviewed files use bounded normalized import pages, while Mango keeps the exact original file in its reviewed-plan chunks until withdrawal.

> **Tip:** Import a small file of your own addresses first, and open one contact to confirm that its consent evidence reads the way you expect before you import the full list.

### Names retained for erasure

Changing a contact name through capture, sync or import keeps the previous name in contact history. Merging also keeps the merged contact’s name there. Deleting the survivor uses those known names to redact saved rules and campaign content that also hold one of the contact's exact addresses, phones or IDs, then removes the history. A name alone never changes unrelated text. Affected approved content requires a new reviewed approval; its original approval digest, time and operator remain historical attribution.

Older installations may already have discarded names during a rename or merge. Mango cannot infer who an unlinked historical name refers to. Review saved literals you know belong to that person explicitly. If a merge is in progress, deletion asks you to retry after it finishes.
