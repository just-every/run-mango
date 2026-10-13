# Signup and consent

Mango hosts a public signup page for your newsletter and records evidence of each person's consent. A person is only subscribed once they confirm by email. This page describes what the page does, what Mango stores, and the protections around it.

## The hosted signup page

Your signup page lives at `/subscribe` on your deployment. In the app, open **Audience** and find **Hosted form and embed**. It shows the public form URL, an **Open hosted form** button, the exact consent text, and an iframe snippet you can copy with **Copy embed snippet** to place the form on your own website.

Two things must be in place first. Your sender identity must be fully saved in Settings; until it is, signup answers with an error and stores nothing. And the page shows how often you will write, taken from **Newsletter frequency** under **Signup-form settings** on the same Audience page (default "Occasional newsletters"). Changing it affects new requests only; people who already consented keep the exact wording they accepted.

## What a visitor sees

The page is titled "Get the newsletter". It asks for an email address, an optional name, and a required checkbox reading "I agree to receive email newsletters from" your sender name, "I can unsubscribe at any time." The button is **Request confirmation**.

Mango then sends one confirmation email. Opening the link only shows a page with a **Confirm subscription** button; nothing is recorded until the person presses it, so mailbox scanners and link previewers cannot subscribe anyone. A link works once and expires after 30 days. Until confirmed, the contact is "pending" and receives no marketing.

## What Mango records

Each consent record on a contact (Audience, then the contact) shows:

- the sender name, message category (`newsletter`) and frequency wording shown at signup;
- the capture method (`hosted-signup-form`), the capture source (your signup page URL) and the consent version;
- the exact consent text and the time it was given;
- the capture IP address, and the confirmation time and confirmation IP address;
- whether it is "Confirmed" or "Awaiting confirmation". The destination jurisdiction is stored as "Not provided" for hosted signups.

## Unsubscribing

Every marketing email carries a visible **Unsubscribe** link. It opens a "Confirm unsubscribe" page, and pressing **Unsubscribe** opts the person out. Opening the page changes nothing. Links stay valid for a year. An opt-out is applied before the request is acknowledged, and Mango checks it again right before each message is handed to your provider. Imports and later signups never reverse it.

## What signup will not do

Public signup never changes someone who is already subscribed, unsubscribed or suppressed, and it never emails them. The visitor sees the same acknowledgement either way, so the form does not reveal anyone's status. This also means an unsubscribed person cannot resubscribe through the form.

## Spam protection and limits

Mango stores these limits, so a restart does not reset them:

- five signup attempts per network per UTC hour (IPv6 addresses are grouped by /64);
- three confirmation requests per email address per UTC day;
- fifty confirmation requests across the whole deployment per UTC hour.

Failed or duplicate attempts can use up capacity. Requests over 8,192 bytes are rejected, and the form includes a hidden field that quietly discards bot submissions.

Optional Cloudflare Turnstile adds a challenge. Set `TURNSTILE_SITE_KEY` (a plain variable) and `TURNSTILE_SECRET_KEY` (a secret) together, and configure the widget for the hostname in `MANGO_PUBLIC_BASE_URL`. Mango verifies the action `newsletter-signup`, the hostname and a five-second timeout, and rejects the signup if verification fails. Setting only one key makes startup fail. With neither, the form has no challenge but keeps the consent, suppression and rate limits above.

> **Tip:** Open your own signup page before you share it, check that the consent text names the right sender, and sign yourself up once to see the confirmation email.

## Saved segments

In **Audience**, choose **Create segment**, give it a name and use the same audience conditions as the campaign editor. Choose **All conditions** or **Any condition**, add exclusions, and inspect the live candidates, eligible contacts and exclusion reasons for the selected preview channel. These counts use campaign review's eligibility calculation. Unsubscribed, suppressed, pending and non-subscribed contacts cannot become eligible through a segment. Commerce conditions remain unavailable without their required store evidence.

Choose **Save segment**. **Edit** lets you rename it or change its conditions. **Delete** opens a confirmation dialog. Changes and deletion affect the reusable segment only: a campaign keeps the conditions already copied into its saved revision, and approval keeps its exact snapshot.

## Merge duplicate contacts

Open a contact and choose **Merge into another contact**. Search by the email address of the contact to keep, select it and inspect the resulting Email and SMS states before choosing **Confirm merge**. The order is suppressed, unsubscribed, non-subscribed, pending, then subscribed: the more restrictive state wins independently on each channel.

Mango opens the survivor and records the merge in its history. Both records' consent evidence, source activity, import observations, suppressions and campaign history remain visible there. Existing confirmation and unsubscribe links follow the survivor and retain their consent protections. An unsubscribe stops the channel on its merged address aliases. A queued campaign recipient for the removed identity is excluded at dispatch as `contact-merged`; the merge never transfers an approval to the survivor.


## Delete a contact

Open the contact and choose **Delete contact**. The confirmation explains the addresses, consent evidence, history, source records, delivery details and import copies that will be removed. Deletion includes known merged identities. Other contacts from an affected import keep their current consent and records, but the whole original file and its import undo history are withdrawn. Surviving records keep their filenames, capture descriptions and notes; only the deleted contact's exact address, phone, ID or IP is redacted from them.

If any known channel identity has opted out, Mango retains one non-readable hash for that identity and channel, keyed with your installation's private contact secret. This includes opted-out aliases. A later signup, import or sync cannot use that address to bypass the opt-out. An address erased while subscribed keeps no erasure opt-out and must follow the ordinary consent process if captured again. Operator login identities serve a separate purpose and remain.

The receipt shows an opaque reference, completion time, counts of removed or anonymised records by kind and retained opt-out channels. Archive and restore artifact counts include discarded snapshot/staging rows and transfer records; state-only approval or dispatch invalidation does not inflate removal counts. It never repeats the deleted address. Keep the receipt open until **Contact deleted** appears. While deletion is pending, other product writes pause. Operator sign-in remains available, including the protected local development outbox. If interrupted, sign in again, reopen the receipt URL and choose **Continue deletion** if prompted; completion is recorded only after the remaining data and owned transfer objects are removed.

Saved segments and campaign content may contain a contact's address, phone, ID or name. Mango redacts the exact address, phone, ID and IP wherever they appear; an address is matched whole, so deleting lee@x.test leaves ann.lee@x.test and lee@x.test.example alone. A record that names the contact by one of those exact values also loses the contact's known names and notes. A name on its own never changes anything: "Mark your calendar" or "Marketing" stay as written when Mark is deleted, and a stored file is removed only when its key, metadata or readable content holds the contact's exact ID, address or phone. A name shorter than four characters or a single word is too common to match safely: if a record that names the contact still contains it, deletion is refused and names the store holding that record; edit it, then delete again. Mango retains an anonymised audit entry for each redaction. An affected campaign approval becomes invalid: its historical digest remains as a history identifier, and queued sends stop. Review the redacted content and create a new campaign draft for a new approval. Deletion does not recall a message whose provider handoff was already authorised.

Mango controls its current installation data. Previously downloaded files, provider-held messages and events, external logs, and Cloudflare database backups are outside this operation; manage those copies separately. See [Backup and export](./backup-and-export.md) before restoring older data.
