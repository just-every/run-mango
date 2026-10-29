# Signup and consent

Mango hosts a public signup page for your newsletter and records evidence of each person's consent. A person is only subscribed once they confirm by email. This page describes what the page does, what Mango stores, and the protections around it.

## The hosted signup page

Your signup page lives at `/subscribe` on your deployment. In the app, open **Audience** and find **Hosted form and embed**. It shows the public form URL, an **Open hosted form** button, the exact consent text, and an iframe snippet you can copy with **Copy embed snippet** to place the form on your own website. Allow that website’s exact origin in the signup settings first. The persisted origin allowlist starts empty; another website cannot frame your signup page until you explicitly allow it. After upgrading from 0.1.0, add each existing embedding website under **Audience → Allowed embed origins** or its iframe will remain blocked. An origin includes its scheme, host and any non-default port, not a path or wildcard.

Two things must be in place first. Your sender identity must be fully saved in Settings; until it is, signup answers with an error and stores nothing. And the page shows how often you will write, taken from **Newsletter frequency** under **Signup-form settings** on the same Audience page (default "Occasional newsletters"). Changing it affects new requests only; people who already consented keep the exact wording they accepted.

## What a visitor sees

The page is titled "Get the newsletter". It asks for an email address, an optional name, and a required checkbox reading "I agree to receive email newsletters from" your sender name, "I can unsubscribe at any time." The button is **Request confirmation**.

Under the default double opt-in mode, Mango then sends one confirmation email. Opening the link only shows a page with a **Confirm subscription** button; the person is not subscribed until they press it, so mailbox scanners and link previewers cannot subscribe anyone. A link works once and expires after 30 days. Until confirmed, a new contact is "pending" and receives no marketing. A returning unsubscriber keeps their restricted state until confirmation, even when this form uses single opt-in. An Owner or Admin can choose single opt-in for future hosted or kiosk captures in Settings → Opt-in. A new eligible person then subscribes with the saved affirmative evidence and receives no confirmation email; repeating a subscribed address changes nothing. The acknowledgment stays generic in every mode.

## What Mango records

Each consent record on a contact (Audience, then the contact) shows:

- the sender name, message category (`newsletter`) and frequency wording shown at signup;
- the capture method (`hosted-signup-form`), the capture source (your signup page URL) and the consent version;
- the exact consent text and the time it was given;
- the capture IP address, and the confirmation time and confirmation IP address;
- whether it is confirmed, awaiting confirmation or single opt-in. The destination jurisdiction is stored as "Not provided" for hosted signups.

## Unsubscribing

Every marketing email carries a visible **Unsubscribe** link. It opens a "Confirm unsubscribe" page, and pressing **Unsubscribe** opts the person out. Opening the page changes nothing. Links stay valid for a year. An opt-out is applied before the request is acknowledged, and Mango checks it again right before each message is handed to your provider. Imports never reverse it. Signing up again changes it only after a fresh confirmation.

## Resubscribing

A person who unsubscribed can use the hosted form, an embedded copy or a shared kiosk to request a new confirmation email. The address stays unsubscribed until they press **Confirm subscription** in that email. Only that confirmation email can reach them in the meantime. Mango records the request, confirmation attempt and confirmed return in contact history, and Insights counts the return as a resubscription.

## What signup will not do

An already subscribed address gets the same acknowledgment and no mail. A suppression caused only by the recipient's unsubscribe can be resolved by their new confirmation. Hard bounces, complaints, owner suppressions and unknown suppression reasons never receive confirmation mail through this path. A legacy erasure restriction whose original reason is no longer known also stays blocked.

Every valid request has the same acknowledgment regardless of the address's state, confirmation allowance or provider outcome. A fourth confirmation request in the same UTC day sends no further mail. The operator can see refused requests and delivery problems in contact history.

## Spam protection and limits

Mango stores accepted-signup allowances durably, so restarting does not reset a window. Settings → Signup allowances shows the active level, floor, ceiling and any next-window change:

- challenged traffic has its own 1,000 accepted signups per UTC hour and 100 per UTC minute;
- unchallenged traffic has a separate pool at those same floors, so it cannot use challenged capacity;
- each ordinary network has one accepted count per UTC hour: an unchallenged request is admitted below 30, and a verified request below 120 (IPv6 addresses share a /64);
- a separate network counter admits up to 60 refused attempts per UTC hour; after that, unchallenged requests are refused, while a freshly verified request can still proceed;
- each destination keeps three confirmation reservations per UTC day;
- kiosks have independent 300-per-network and 300-installation-wide hourly pools and never spend the ordinary pools.

Only an Owner changes an allowance, never below its floor or above the email hand-off ceiling (3,000 per minute, or its hourly equivalent). An Admin receives a named refusal. A change starts with the next UTC window and records the operator and effective time in Activity.

Sender, body, challenge, honeypot, field, disclosure and destination checks precede accepted admission. A bot, invalid request, protected destination or pending duplicate spends no accepted allowance. The unique request claim and all its counters are atomic: concurrent duplicates spend one reservation. A capture that loses before hand-off is refunded in its original windows; an attempted or uncertain hand-off remains spent. Requests over 8,192 bytes are refused.

Every existing form defaults to requiring verification. An Owner or Admin may turn it off under Signup-form settings; Authors and Managers cannot, and kiosks always require it. Set `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` together for the hostname in `MANGO_PUBLIC_BASE_URL`. The script loads only after a trusted interaction. Mango sends the token and visitor IP to Cloudflare once, verifies action, hostname and challenge time within five minutes, and fails closed for missing, reused, expired or unverifiable tokens. One-sided configuration fails startup. Without keys, ordinary forms use their unchallenged partition and Home shows a warning; kiosks remain blocked.

An address-independent allowance refusal returns 429 with `Retry-After` in seconds to that window's end. Hosted and kiosk forms retain the visitor's entries and show “Too many signups right now. Please try again in a few minutes.” They show no success or incentive. Destination-dependent confirmation refusals retain the same generic acknowledgment, without mail or subscription authority. Settings lists refusals by UTC hour, form and reason; Home shows the rolling-hour allowance count with links, and Activity records one address-free summary per closed hour. A wider form report is not built yet.

> **Tip:** Open your own signup page before you share it, check that the consent text names the right sender, and sign yourself up once to see the confirmation email.

## Saved segments

In **Audience**, choose **Create segment**, give it a name and use the same audience conditions as the campaign editor. Choose **All conditions** or **Any condition**, add exclusions, and inspect the live candidates, eligible contacts and exclusion reasons for the selected preview channel. These counts use campaign review's eligibility calculation. Unsubscribed, suppressed, pending and non-subscribed contacts cannot become eligible through a segment. Commerce conditions remain unavailable without their required store evidence.

Choose **Save segment**. **Edit** lets you rename it or change its conditions. **Delete** opens a confirmation dialog. Changes and deletion affect the reusable segment only: a campaign keeps the conditions already copied into its saved revision, and approval keeps its exact snapshot.

## Merge duplicate contacts

Open a contact, choose **More actions**, then **Merge into another contact**. Search by the email address of the contact to keep, select it and inspect the resulting Email and SMS states before choosing **Confirm merge**. The order is suppressed, unsubscribed, non-subscribed, pending, then subscribed: the more restrictive state wins independently on each channel.

Mango opens the survivor and records the merge in its history. Both records' consent evidence, source activity, import observations, suppressions and campaign history remain visible there. Existing confirmation and unsubscribe links follow the survivor and retain their consent protections. An unsubscribe stops the channel on its merged address aliases. A queued campaign recipient for the removed identity is excluded at dispatch as `contact-merged`; the merge never transfers an approval to the survivor.


## Delete a contact

Open the contact, choose **More actions**, then **Delete contact**. The confirmation explains the addresses, consent evidence, history, source records, delivery details and import copies that will be removed. Deletion includes known merged identities. Other contacts from an affected import keep their current consent and records, but the whole original file and its import undo history are withdrawn. Surviving records keep their filenames, capture descriptions and notes; only the deleted contact's exact address, phone, ID or IP is redacted from them.

If any known channel identity has opted out or been suppressed, Mango retains an opt-out record for that identity and channel, including opted-out aliases. Its local destination hash is keyed with your installation's private contact secret. Mango also retains a mapping from that local hash to an unsalted portable SHA-256 hash of the destination with the fixed prefix `mango-audience-export-v1:`. Contacts CSV exports use that portable hash to carry the restriction to another installation, including after the contact has been deleted.

These hashes contain no readable address, but the portable hash is not anonymous: anyone with the mapping or export can hash guessed addresses or a dictionary of addresses and compare the results, without your installation secret. The same destination also has the same portable hash across installations and exports, allowing records to be linked. Treat the retained mapping and exports as sensitive personal data. A later signup, import or sync cannot use that address to bypass the opt-out. An address erased while subscribed keeps no erasure opt-out and must follow the ordinary consent process if captured again. Operator login identities serve a separate purpose and remain.

Deletion advances a source-wide restore epoch without retaining row hashes. A subscribed contact with no surviving restriction leaves no address-derived mapping or journal entry. Known local or supplied current matching source authority refuses every older archive, including archives without the erased contact. Upgrade 0044 retires legacy row journals and transfer custody; archives containing a legacy row journal are refused before staging. See [Backup and export](./backup-and-export.md#erasure-and-older-archives) for the retention limits.

The receipt shows an opaque reference, completion time, counts of removed or anonymised records by kind and retained opt-out channels. Archive and restore artifact counts include discarded snapshot/staging rows and transfer records; state-only approval or dispatch invalidation does not inflate removal counts. It never repeats the deleted address. Keep the receipt open until **Contact deleted** appears. While deletion is pending, other product writes pause. Operator sign-in remains available. Local operators use native development identity through the private `RER_OPEN` entry; no captured-mail page is exposed. If interrupted, sign in again, reopen the receipt URL and choose **Continue deletion** if prompted; completion is recorded only after the remaining data and owned transfer objects are removed.

Saved segments and campaign content may contain a contact's address, phone, ID or name. Mango redacts the exact address, phone, ID and IP wherever they appear; an address is matched whole, so deleting lee@x.test leaves ann.lee@x.test and lee@x.test.example alone. A record that names the contact by one of those exact values also loses the contact's known names and notes. A name on its own never changes anything: "Mark your calendar" or "Marketing" stay as written when Mark is deleted, and a stored file is removed only when its key, metadata or readable content holds the contact's exact ID, address or phone. A name shorter than four characters or a single word is too common to match safely: if a record that names the contact still contains it, deletion is refused and names the store holding that record; edit it, then delete again. Mango retains an anonymised audit entry for each redaction. An affected campaign approval becomes invalid: its historical digest remains as a history identifier, and queued sends stop. Review the redacted content and create a new campaign draft for a new approval. Deletion does not recall a message whose provider handoff was already authorised.

Mango controls its current installation data. Previously downloaded files, provider-held messages and events, external logs, and Cloudflare database backups are outside this operation; manage those copies separately. See [Backup and export](./backup-and-export.md) before restoring older data.

### SMS signup and compliance

SMS is optional and fails closed until every SMS configuration input is present.
Set `SMS_PROGRAMME_POLICY` to JSON containing `brand`, `programme`, `category`,
`frequency`, `jurisdiction` (`AU`), `support`, `providerAlreadyReplies`,
`policySource` (HTTPS account/provider evidence), `policyVerifiedAt` and
`policyExpiresAt` (UTC ISO timestamps). Supply `providerWindows`,
`jurisdictionWindows`, and `recipientWindows` as arrays of
`{days:[0,1,2,3,4,5,6],startMinute:540,endMinute:1200}`. Sunday is zero; endpoints
are recipient-local minutes, with the end exclusive. These are intersected with
Mango's 09:00–20:00 preference. Populate the actual applicable account, carrier
and jurisdiction constraints, including excluded days; the example is a schema
illustration, not legal advice or provider qualification. Dated policy evidence
expires after 180 days or earlier policy expiry. Recipient location evidence
expires after 30 days under Mango’s existing freshness preference.
Only Australian destinations and recorded `Australia/*` recipient zones are
supported. Never substitute the business's time zone.

`SMS_CONFIRMATION_SENDER` must be the active dedicated two-way number for that
programme. The native Subscribe page exposes SMS only when configured; it shows
programme, sender, frequency and jurisdiction and requires affirmative consent
and a recipient-provided time zone. SMS confirmation uses the production sender
and its opaque link. Opening it previews; submitting Confirm consumes it once.
It expires after 30 days. Existing email signup remains independent.

SMS service messages wait durably for permitted windows and provider pacing.
Cron resumes queued messages. An expired deadline stops delivery. Every attempt
is fenced before transport; an interrupted or ambiguous provider handoff is
visible as unconfirmed and is never automatically repeated. Operators can inspect
`GET /api/audience/sms-services`; payloads are encrypted at rest, never returned
by that endpoint, and removed after handoff. Service records are erased with the
contact. Missing configuration, sender changes and policy changes require review.

Configure the signed Mobile Message inbound webhook at
`/webhooks/sms/mobile-message`. Its documented `to`, `sender`, `message`,
`received_at`, `type`, `original_message_id`, and `original_custom_ref` fields
are checked against the configured sender. HELP/START require the exact original
recipient handoff. A valid signed STOP also works with empty original-message
fields, as the provider documents for phones without earlier outbound traffic.
An unknown originating phone receives a durable portable opt-out without creating
a contact, so later imports remain restricted. Forged or wrong-sender replies
cannot update contacts. STOP,
STOPALL, END, QUIT, CANCEL, UNSUBSCRIBE, OPTOUT and REVOKE restrict immediately
before acknowledgement. HELP/INFO return programme and support details.
START/UNSTOP return the fresh signup form; neither grants consent. Durable event
and response identities prevent duplicate replies after webhook replay/restart.
Set `providerAlreadyReplies` only if verified provider automations already send
these compliance replies. No universal service quiet-window exemption was established in the reviewed
provider documentation, so confirmation and compliance replies also obey all
configured windows. No marketing bypass is exposed.

The [provider webhook schema](https://help.mobilemessage.com.au/api/setting-up-webhooks)
and [signature procedure](https://help.mobilemessage.com.au/api/verifying-webhook-signatures)
are the transport references. Its [unsubscribe documentation](https://help.mobilemessage.com.au/sending-receiving-sms/how-unsubscribes-work)
permits expected transactional messages to opted-out destinations while
marketing remains blocked. The [API specification](https://mobilemessage.com.au/api-documentation.php)
selects GSM-7 or Unicode as required; review counts extension septets and UTF-16
units. Review shows exact segment counts for up to three rendered eligible
recipient examples, including their actual personalisation, opaque tracked-link
format, and the managed compliance block. Links in previews are inactive; other
recipient values may produce different counts. Transport counts the final body
again before reserving capacity and refuses more than ten parts.

Programme frequency accepts `Daily`, `Weekly`, or `Monthly`. Marketing uses a
minimum interval of 1, 7, or 31 days respectively, intersected with Mango’s existing
72-hour SMS preference. Thus `Daily` remains limited to one message per 72 hours;
`Monthly` conservatively means at least 31 days. Other frequency descriptions are
rejected for sending; imported original consent evidence is preserved unchanged.
Approval, audience selection and final transport share this rule. A destination
can have only one marketing handoff reserved at a time across campaigns. A
proven refusal before acceptance releases that reservation; an ambiguous handoff
retains it through the send deadline plus the frequency interval. Requested
confirmation and compliance replies are service messages, outside the marketing
frequency counter, while still subject to transport pacing and quiet windows.

Mango appends the structured brand, programme, category, frequency, dedicated
sender, jurisdiction and STOP/HELP instructions to each SMS. Author text cannot
satisfy or replace these disclosures with partial word matches. Approval freezes
this policy and sender atomically with the revision. A changed policy or sender
requires a new review; queued service messages also stop on policy drift. The
final transport checks current destination consent scope and repeats the window
check after provider sender reads and after budget reservation immediately before
handoff. Service replies obey those same windows. Live credentials, dedicated sender,
webhook setup, carrier policy and account-specific reconciliation retention
remain owner/provider inputs; offline route proofs do not qualify a live account.

When the shared email transport rejects an attempt before handoff for pacing or a
provider hold, the public form keeps its generic acknowledgment. The
contact history records that no message was handed off and the earliest next
attempt. Its handoff claim is released; the original pending confirmation and
signup rate reservation remain, so a public resubmission may also have to wait
for its current hourly reservation to end. The operator sees the failed attempt in contact history; it is never described as a queued email. A later fresh signup may request new confirmation;
ambiguous email handoffs retain their claim and are never automatically replayed.

## Shared tablets and event kiosks

In Audience → Hosted form and embed, turn on **Kiosk or event form**, name the device or event and save. Open the hosted form on the shared tablet. Configure the Turnstile site and secret keys first: a kiosk refuses signups without verification, and every person must complete a fresh challenge.

After a successful request, the form clears within two seconds. It does not remember or pre-fill a previous visitor, set an identifying cookie or store a visitor in browser storage. Every signup still needs affirmative consent and follows its capture-point opt-in mode; returning unsubscribers always need email confirmation. Returning unsubscribers use the same confirmed-only resubscribe path; other suppressions stay blocked. The kiosk has separate allowances of 300 accepted requests per network and globally per hour; ordinary forms use their separate challenged or unchallenged allowances, and confirmation requests retain the per-destination daily allowance. Insights shows confirmed subscriptions under the kiosk device label and retains their consent disclosure. Kiosk setting changes are recorded with the operator and time.

## Opt-in policy by capture point

Settings → Opt-in records `contact.opt-in.v1` separately for hosted signup, kiosk forms and manual entry. Owner and Admin changes affect later captures, appear once in Activity and never downgrade an existing subscription. Single opt-in never overrules an unsubscribe or suppression. Public resubscription still requires the recipient’s confirmation; hand entry and API capture cannot reverse an existing restriction. SMS keeps its express-written-consent and carrier-confirmation requirements.

API keys are shown at fixed double mode: a consent-bearing subscriber write creates a pending capture, sends one confirmation, and subscribes only after the recipient confirms. Identical replay sends no second message. Connected stores and move-in sources remain read-only here and are set by their connection or move-in. Popup/landing, Zapier/Crank and editable SMS modes are not built.

### Contact added by hand

Audience → Add a contact by hand records email, phone, name and properties. For each selected channel, record how and when permission was given, the wording shown and the affirmative permission declaration. The manual-entry email mode defaults to double opt-in; Owner/Admin may change future captures to single opt-in. Evidence is labeled `operator-recorded` and names the operator, including on the contact page, portable exports and source reporting. An unsubscribe or suppression is never reversed by hand entry. Support and Analyst cannot submit it.

Manual SMS also requires express written permission and recipient location evidence. Mango sends a Mobile Message confirmation asking for **YES**. A provider-signed reply must identify that exact accepted confirmation, destination, sender and current programme; its first valid reply confirms once. A link cannot confirm this manual SMS evidence, and STOP always retains precedence. Hosted SMS keeps its existing confirmation path. No real provider call or consent was used in testing. Topic-specific permissions and strict new-field enforcement for legacy email API clients remain open.
