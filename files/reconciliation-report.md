# Move-in reconciliation: account-export.zip

- Archive SHA-256: `8f33e5a521a8f6e87bb1016ea213ba22a95af89839df8ef4858f0866a0ea7b41` (5886 bytes, 21 files)
- State: undone; started 2026-11-06T03:24:05.710Z; imported 2026-11-06T03:24:06.498Z; undone 2026-11-06T03:24:12.847Z
- Source: documented format, tested on synthetic files shaped from the published help page, not on a real export.

## Audience files

Each source row has one outcome: rows = created + updated + duplicates + rejected + skipped.

| File | Treated as | Source rows | Created | Updated | Duplicates (same file) | Duplicates (other files) | Rejected | Skipped | Adds up | Unknown consent | Unsubscribed | Cleaned (suppressed) | Subscribed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| audiences/Mango Garden Letter/cleaned.csv | cleaned | 1 | 1 | 0 | 0 | 0 | 0 | 0 | yes | 0 | 0 | 1 | 0 |
| audiences/Mango Garden Letter/subscribed.csv | subscribed | 8 | 4 | 1 | 1 | 1 | 1 | 0 | yes | 0 | 1 | 0 | 4 |
| audiences/Mango Garden Letter/transactional.csv | non-subscribed | 1 | 1 | 0 | 0 | 0 | 0 | 0 | yes | 0 | 0 | 0 | 0 |
| audiences/Mango Garden Letter/unsubscribed.csv | unsubscribed | 2 | 2 | 0 | 0 | 0 | 0 | 0 | yes | 0 | 2 | 0 | 0 |

## Emails and templates

Imported history and library templates carry no schedule, approval or delivery authority, and no report figures.

| File | Kind | Source rows | Created | Held conversions | Duplicates | Rejected | Skipped | Adds up |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| emails/campaigns.csv | imported history | 4 | 2 | 0 | 1 | 1 | 0 | yes |
| templates | library templates | 2 | 1 | 0 | 0 | 1 | 0 | yes |

## Kept as raw source, not imported

These stay in the archive Mango keeps; nothing in them becomes a contact, a send fact or a report figure.

| Kind | Files | Bytes |
| --- | --- | --- |
| Appointments | 1 | 92 |
| Ecommerce products and orders | 2 | 123 |
| Custom events | 1 | 87 |
| Gallery images and files | 2 | 172 |
| Reports (opens, clicks, geography, activity) | 2 | 119 |
| SMS contacts | 1 | 155 |
| Email content with no matching row in the emails CSV | 1 | 82 |

## Unresolved consent

0 rows lacked original opt-in and confirmation times or the full consent scope, and were imported as non-subscribed.

## Every audience row

| File | Row | Email | Outcome |
| --- | --- | --- | --- |
| audiences/Mango Garden Letter/cleaned.csv | 2 | cleo@example.test | created as suppressed |
| audiences/Mango Garden Letter/subscribed.csv | 2 | ada@example.test | created as subscribed |
| audiences/Mango Garden Letter/subscribed.csv | 3 | ben@example.test | created as subscribed |
| audiences/Mango Garden Letter/subscribed.csv | 4 | cy@example.test | created as subscribed |
| audiences/Mango Garden Letter/subscribed.csv | 5 | dup@example.test | created as subscribed |
| audiences/Mango Garden Letter/subscribed.csv | 6 | dup@example.test | duplicate of a row in this file |
| audiences/Mango Garden Letter/subscribed.csv | 7 | both@example.test | duplicate of a row in audiences/Mango Garden Letter/unsubscribed.csv |
| audiences/Mango Garden Letter/subscribed.csv | 8 | optedout@example.test | updated as unsubscribed |
| audiences/Mango Garden Letter/subscribed.csv | 9 |  | rejected: Email must be a valid address. |
| audiences/Mango Garden Letter/transactional.csv | 2 | tess@example.test | created as non-subscribed |
| audiences/Mango Garden Letter/unsubscribed.csv | 2 | both@example.test | created as unsubscribed |
| audiences/Mango Garden Letter/unsubscribed.csv | 3 | uma@example.test | created as unsubscribed |

## Consent evidence

| File | Evidence kind | Rows |
| --- | --- | --- |
| audiences/Mango Garden Letter/cleaned.csv | none | 1 |
| audiences/Mango Garden Letter/subscribed.csv | incumbent-held | 7 |
| audiences/Mango Garden Letter/subscribed.csv | confirmed | 1 |
| audiences/Mango Garden Letter/transactional.csv | none | 1 |
| audiences/Mango Garden Letter/unsubscribed.csv | none | 2 |

| File | Reason | Rows |
| --- | --- | --- |
| audiences/Mango Garden Letter/subscribed.csv | Duplicate destination combined with its most restrictive channel statuses in this import. | 2 |

## Imported engagement

3 engagement rows imported; 2 dropped of 5 source rows. Opens are estimates and never engagement.

| Drop reason | Rows |
| --- | --- |
| address-not-in-move-in | 1 |
| invalid-timestamp | 1 |

## Rejected rows

| File | Row | Reason |
| --- | --- | --- |
| audiences/Mango Garden Letter/subscribed.csv | 9 | Email must be a valid address. |
| emails/campaigns.csv | 5 | The row has no title, subject or matching content file. |
| templates | 1 | templates/StylesOnly.html: no content remains after removing unsupported markup. |

## History and templates

| Kind | Source | Title | State | Outcome |
| --- | --- | --- | --- | --- |
| imported history | emails/campaigns.csv row 2 | Spring letter | removed | Removed: unchanged since the import. |
| imported history | emails/campaigns.csv row 3 | Winter letter | removed | Removed: unchanged since the import. |
| library template | templates/Welcome.html | Welcome letter | kept | Kept: template edited after the import. |

## Template conversion reports

### emails/campaigns.csv

- Mapped *\|FNAME\|* to {{displayName \| fallback: "there"}} at source character 217
- Mapped *\|UNSUB\|* to {{unsubscribe_url}} at source character 627
- Unmapped *\|FOO\|* at source character 228
- Dropped background:#fff at <table> source line 3: Style property background is not allowed.
- Removed class body at <td> source line 3
- Dropped color:green at style 1:1: Style value "green" is not allowed for color. (4)
- HTML comment
- onclick attribute
- Link with an address that is not HTTPS (its text is kept)
- Image without an HTTPS address and explicit width and height
- <center> tag (its text is kept)
- Outside host garden.example.test: 2 uses
- Sent size: HTML 1.1 KB (1106 bytes); plain text 0.5 KB (482 bytes); limit 100.0 KB (102400 bytes) per part. Largest blocks: body/img[4]: 327 bytes; body/table[2]/tbody[1]/tr[1]/td[1]/p[10]: 285 bytes; body/table[2]/tbody[1]/tr[1]/td[1]/p[4]: 99 bytes.
- MSG-012 checker: pass; personalization: blocked
- Unrecognised merge tag *\|FOO\|*
- *\|FOO\|*

### emails/campaigns.csv

- Outside host garden.example.test: 1 uses
- Sent size: HTML 0.8 KB (870 bytes); plain text 0.4 KB (399 bytes); limit 100.0 KB (102400 bytes) per part. Largest blocks: body/img[7]: 327 bytes; body/p[6]: 285 bytes; body/div[1]: 90 bytes.
- MSG-012 checker: pass; personalization: pass

### templates/Welcome.html

- Outside host garden.example.test: 1 uses
- Sent size: HTML 0.9 KB (929 bytes); plain text 0.4 KB (408 bytes); limit 100.0 KB (102400 bytes) per part. Largest blocks: body/img[6]: 327 bytes; body/p[5]: 285 bytes; body/table[2]/tbody[1]/tr[1]/td[1]/p[2]: 91 bytes.
- MSG-012 checker: pass; personalization: pass

## Outside hosts across templates and campaigns

| Host | Uses |
| --- | --- |
| garden.example.test | 4 |

## Incumbent images

0 re-hosted; 0 failed; 0 still on an incumbent host in templates, drafts and scheduled campaigns.

| Location | Name | Image |
| --- | --- | --- |

This list is not a cutover checklist. Mark cutover complete and flow-message checks remain unavailable.

## Undo

6 imported contacts were removed. Opt-out and suppression records are never removed by undo.

| Contact kept | Reason |
| --- | --- |
| optedout@example.test | Existed before this import; left as it is now. |
| cy@example.test | Edited after the import. |
| ben@example.test | Unsubscribed after the import. |

