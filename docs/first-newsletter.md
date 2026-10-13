# Write your first newsletter

Everything you write in Mango starts as a draft. Saving a draft does not approve it, schedule it or send it, and you can save incomplete work at any time. This page covers writing and previewing; [Approval and sending](./approval-and-sending.md) covers the rest.

## Start a draft

Open **Campaigns**, choose **New campaign**, then **Blank newsletter**. The panel says "Write your own email. No AI or store connection needed." Mango creates a draft called "Untitled campaign" and opens it for review and editing. The other entries in that panel, such as store signals and saved suggestions, belong to optional modules and can be ignored.

## Fill in the message

The draft editor ("Edit draft") has these fields. Those marked "(required for approval)" can stay empty while you work.

- **Campaign name**: for your own reference.
- **Consent message category**: starts as `newsletter`. It must match the category your subscribers agreed to. Signups from the hosted form use `newsletter`.
- **Email subject** and **Email preheader**: up to 250 characters each.
- **Email body**: the message itself, up to 20,000 characters of HTML.
- **Sender name**, **From email**, **Reply-to email** and **Physical postal address**: copied from your saved sender identity (see [Team and settings](./team-and-settings.md)). Approval requires them to match Settings exactly.

You may also see fields for SMS. Ignore them; they only matter if a step uses the SMS channel.

## Rich text or HTML mode

The email body opens in **Rich text** mode, with **Bold**, **Italic** and **Bullet list** buttons. Choose **HTML mode** to edit the markup directly. Mango accepts a deliberately small set of HTML:

- paragraphs, `div`, `span`, line breaks, rules, headings, bold, italic, underline, lists, blockquotes, tables, links and images;
- attributes limited to `title`, link `href`, image `src`, `alt`, `width` and `height`, and table `colspan` and `rowspan`;
- quoted attributes only; links and image sources must be HTTPS;
- images need explicit `width` and `height` of at least 2 pixels.

Scripts, forms, styles, event handlers and malformed markup are not allowed, and they block approval. An email that contains images stays in HTML mode until you remove them, so editing never loads remote images.

## Links

Add a link with **Add a link to the message** (link text and an HTTPS URL), or write an `<a>` tag in HTML mode. Every link appears under **Saved links** with a label and a destination, and you can add or remove destinations there. The destination's host must be on your `MANGO_ALLOWED_LINK_HOSTS` list or approval is blocked.

## The unsubscribe and postal footer

You do not write the footer. When you save, Mango adds a rule, your postal address and an **Unsubscribe** link to the end of the message, once. If you already placed `{{unsubscribe_url}}` or `{{physical_address}}` in the body, Mango adds only what is missing. The plain-text version is generated from the HTML with the real link addresses, and it is shown read-only under **Plain-text email**.

## Personalization

Text may include a name token with a mandatory fallback, for example `{{displayName | fallback: "friend"}}`. A token without a fallback blocks approval. Only `displayName` is filled in when real messages go out. A contact with no saved name has their email address as their display name, so the token prints the address rather than the fallback.

## Who receives it

Under **Who should receive this?** the default is "Email subscription status is subscribed". You can add inclusion conditions and exclusions, such as an email address that contains a domain. Options that mention products, carts or orders need the optional store module and block approval without it. Consent, suppression and frequency protections always apply. A live line shows candidates, eligible contacts and excluded contacts. Contacts with no consent change or other activity in the last 12 months are excluded as "dormant". A contact who received a marketing email in the last 24 hours is excluded as "frequency-window".

To reuse conditions, select a **Saved segment** under **Start from a saved segment**, then choose **Copy segment into draft**. This replaces the draft's inclusion and exclusion conditions. Review the live counts and save the draft. Later edits or deletion of the segment cannot change that saved or approved revision. Create and manage segments in [Audience](./signup-and-consent.md#saved-segments).

## Preview and save

Press **Save full draft** (or **Save changes** at the top). Saving refreshes the preview and the approval checks, and it discards any earlier checks. Under "Saved revision content" you can switch between **Desktop email** and **Mobile email**. Links in the preview are inactive, the recipient is an example ("Alex Example"), and remote images stay blocked until you choose **Load N remote images**. Unsaved edits are flagged, and leaving the page asks first.

> **Tip:** Under **Send a test** you can send the saved draft to an address on your `MANGO_TEST_EMAIL_ALLOWLIST`. The subject is marked "[MANGO TEST — NOT A CAMPAIGN SEND]". It needs a configured mail provider.
