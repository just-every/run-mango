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
- quoted attributes only; web links and image sources must be HTTPS, while contact links may use `mailto:`, `tel:` or `sms:`;
- images need explicit `width` and `height` of at least 2 pixels;
- a `style` attribute with simple inline styles: hex colours, font stacks such as `Georgia, serif`, font sizes from 10 to 72 pixels, spacing, borders and rounded corners;
- on tables, `role="presentation"`, `width`, `cellpadding`, `cellspacing`, `border="0"` and `align` (`left` or `center`); on table cells, `width`, `align`, `valign`, `dir` and a hex `bgcolor`.

Backgrounds go on table cells: a coloured band or button is a table cell with `bgcolor` or `background-color`, and a coloured page around your email is the one cell of a full-width table. The one exception is a single `div` at the top of the email wrapping it, which may set `background-color`; text sitting directly on that wrapper must also read on white, because on a narrow screen a long line can run past its edge. Widths go on tables, cells and images, heights on tables, rows, cells, images and empty boxes (such as a thin rule), and right-to-left text (`dir="rtl"`) on a table cell or inside one. Layout comes from tables: `display` is not allowed, and a row of cells is how you set things side by side.

Scripts, forms, stylesheets, classes, event handlers and malformed markup are not allowed, and they block approval. So do styles that hide text (`display:none`, tiny fonts, clipping, transparency, positioning, reversed text) and text whose colour is too close to its background. CSS functions such as `url()`, comments and `!important` are refused, and so is markup that mail clients read differently from how it looks, such as a closing tag written `</ span>`. Saving stores your HTML the way mail clients read it: elements are closed where they end, attributes get double quotes and character references become the characters they stand for, so the editor can show small changes after you save, and every mail client then reads the same email. Saving never changes a style or an attribute value: if mail clients would drop something you wrote (the second copy of an attribute written twice, or a table cell outside a table), the saved copy leaves it out too, so the checks judge exactly what your readers see. Each piece of text must be readable on the background of the table cell it sits in, or on white outside any cell: light text needs a dark cell around it. Because a cell grows to hold whatever it contains, nothing can push text out of its cell, so that is the only colour it is checked against. A rounded cell with a background needs at least as much padding as its corner radius, so no words sit in a corner the rounding leaves unpainted. A long word or web address in plain text simply runs on across the page, as it always has. Approval names each problem; Mango never rewrites a style to make it pass. An email that contains images or styles stays in HTML mode, so editing never loads remote images or drops your styling.

## Links

Add a link with **Add a link to the message**: choose Web, Email, Phone or Text, enter its label and destination, and optionally add an email subject or an email/text message. You can also write an `<a>` tag in HTML mode. Email links admit one address, with only `subject` and `body` parameters; phone and text links admit one E.164 or 10-digit US number, with visual separators. Contact links need no allowed host, are listed decoded in review, and are never rewritten or counted as clicks. Every link appears under **Saved links** with a label and a destination, and you can add or remove destinations there. A web destination's host must be in **Settings → Allowed link hosts** or approval is blocked. This starts with your app’s own host; add your website or shop there when you need it.

## Images

Mango can host your email images, so you do not need another image host. In HTML mode, choose **Insert image**, pick a JPEG, PNG, GIF or WebP file of at most 10 MB and 4096 pixels on each side, describe it (the description is shown when images are off and read by screen readers) and choose **Upload and insert**. Mango gives the image a permanent public address on your own domain, `/media/` followed by a long code, and puts an `<img>` tag with that address, its description and its size at the cursor; an image wider than the 600px email is shown at 600px. Every reader receives the same address, and Mango records nothing about who loads an image, so images never count opens.

Treat an uploaded image as published: anyone holding its address can load it, and it cannot be changed or deleted (only erasing a contact removes an image whose file holds that contact's address or phone), which is what guarantees that an approved letter's pictures stay exactly as approved. Approval checks that each of your own images is stored. A design import uploads its own photos for you. Scripts can upload too: while signed in, send the file as the `file` field of a form upload (`multipart/form-data`) to `POST /api/campaign-assets`, and the answer holds the image's address.

On a copy running on your computer, image addresses start with `http://`. A letter with your own images saves there and previews with its styling, and loading remote images in the preview shows them; approval and test sends say the images need an HTTPS address, so approve the letter from your hosted Mango.

## Import a 12ui design

If you design with [12ui](https://12ui.com), you can turn a design into the email body. Importing makes no request to 12ui and needs no 12ui key in Mango: you run the `12ui` command line tool with your own account, then import its files.

1. Draft designs from a brief. Describe the email, including the words it must say:

   ```sh
   12ui draft --concept "A newsletter email for Hilltop Orchard: single column, 600px wide, a hero photo, two short stories, one button and a footer" --aspect portrait --candidates 2
   ```

   It prints a run folder; the candidate images are in its `candidates` folder, for example `candidates/B.png`. If that folder is still empty, `12ui next <run-folder> --wait` finishes the download.
2. Convert the candidate you like into a LayerDoc, the structured description of the design:

   ```sh
   12ui convert <run-folder>/candidates/B.png --engine api --output layerdoc --model fast --out-dir ./orchard
   ```

   This writes `B.layerdoc.json`. Both commands spend from your 12ui account.
3. In the draft's email editor, choose **Import 12ui design**. Pick the `.layerdoc.json` file and the same PNG, enter where the design's button should link (an HTTPS address on your allowed link hosts), and check the **Brief**: it starts as the draft's name, subject, preheader and sender name, and you can paste in your own copy. Choose **Import design**. If the body already has content, Mango asks before replacing it.

Your browser cuts the photos out of the PNG, uploads them as Mango-hosted images and builds a 600px email from the layout: the design's colours (made darker or lighter where text would be hard to read), safe fonts, side-by-side photo and text sections, the button with your link, and Mango's own unsubscribe link and postal address in place of the design's footer. The body switches to HTML mode as an unsaved edit, and a summary lists:

- **Not in your brief**: every line the design wrote that does not appear word for word in your brief, highlighted. The image model writes its own copy and can invent claims, so read each one.
- **Images added**, with their descriptions and sizes.
- **Button**: its label and your link.
- **Left out**: icons, ornaments, the design's own unsubscribe link and any address it invented.

Nothing is saved until you choose **Save full draft**, and the summary says when the import is saved; **Discard changes** restores the saved body and removes the summary. Then preview and approve as usual: every approval check applies to the imported email. Mango refuses a LayerDoc version other than 2, a PNG that does not match the LayerDoc, a button link that is not HTTPS and a design too long for the 20,000-character body, and leaves the body unchanged. On a copy running on your computer the import, save and preview work the same, with `http://` image addresses; approve the email from your hosted Mango, where its images are HTTPS.

## Design with 12ui

If your Mango holds your own 12ui API key (see [Install and deploy](./install.md#optional-email-design-with-12ui)), the email editor also shows **Design with 12ui**, so you can make a design without leaving Mango. Without that key the button does not appear and Mango never contacts 12ui.

1. Choose **Design with 12ui**. The **Brief** starts as the draft's name, subject, preheader, sender name and current text; add the words the email must say and a note on style. Personalisation such as `{{first_name}}` is removed before anything is sent: 12ui receives only Mango's description of an email layout and your brief, never your contacts. Pick 2 to 4 designs and read the estimate, then choose **Generate designs**.
2. The designs appear under the editor as 12ui draws them, usually within a minute. You can keep editing or leave the page; the run belongs to the draft and is there when you come back.
3. Choose **Use this design** under the design you like. Mango asks 12ui for that design's layout, which usually takes one to two minutes and costs a little more; the estimate is shown before you choose.
4. When the layout is ready, Mango goes on if you have been waiting for it; if you kept working, the run says the design is ready and waits until you choose **Use design … in the email**, so nothing interrupts your typing. Mango asks where the design's button should link (an HTTPS address) and, if the body already has content, whether to replace it. Your browser builds the email exactly as **Import 12ui design** does, and the same summary highlights every line that is not in your brief.

Nothing is saved until you choose **Save full draft**, and approval checks apply as usual. Each design run spends from your own 12ui account (about $0.03 per design and $0.05 per layout at 12ui's prices, or free within its daily allowance), and Mango records each paid request with the campaign's costs. The designs stay under the editor until you save the draft with one or choose **Discard designs**, so **Discard changes**, reloading the page or starting another run loses nothing you paid for: choose **Use this design** again to rebuild the email from the same layout, and find an earlier run's designs under **Earlier designs**. If 12ui asks Mango to wait, the run says when Mango asks again. If the layout step fails (for example your 12ui wallet is empty), the run says so and keeps the designs: **Try the layout again** buys a new layout, or **Choose a different design**. If 12ui refuses, your allowance or wallet is used up, it does not answer, or the run takes longer than 15 minutes, the run says so in plain words and your draft stays as it was; any designs already drawn stay on offer, a run with none is cleared with **Dismiss**, and **Design with 12ui** starts a new run. 12ui and the services it uses (OpenAI, fal.ai, Google and Cloudflare) may keep your brief and the chosen design to improve 12ui, until you ask 12ui to delete them.

## The unsubscribe and postal footer

You do not write the footer. When you save, Mango adds a rule, your postal address and an **Unsubscribe** link to the end of the message, once. If you already placed `{{unsubscribe_url}}` or `{{physical_address}}` in the body, Mango adds only what is missing. The plain-text version is generated from the HTML with the real link addresses, and it is shown read-only under **Plain-text email**.

## Personalization

Text may include a name token with a mandatory fallback, for example `{{displayName | fallback: "friend"}}`. A token without a fallback blocks approval. Only `displayName` is filled in when real messages go out. A contact with no saved name has their email address as their display name, so the token prints the address rather than the fallback.

## Who receives it

Under **Who should receive this?** the default is "Email subscription status is subscribed". You can add inclusion conditions and exclusions, such as an email address that contains a domain. Options that mention products, carts or orders need the optional store module and block approval without it. Consent, suppression and frequency protections always apply. A live line shows candidates, eligible contacts and excluded contacts. Contacts with no consent change or other activity in the last 12 months are excluded as "dormant". A contact who received a marketing email in the last 24 hours is excluded as "frequency-window".

To reuse conditions, select a **Saved segment** under **Start from a saved segment**, then choose **Copy segment into draft**. This replaces the draft's inclusion and exclusion conditions. Review the live counts and save the draft. Later edits or deletion of the segment cannot change that saved or approved revision. Create and manage segments in [Audience](./signup-and-consent.md#saved-segments).

## Preview and save

Press **Save full draft** (or **Save changes** at the top). Saving refreshes the preview and the approval checks, and it discards any earlier checks. Under "Saved revision content" you can switch between **Desktop email** and **Mobile email**. Links in the preview are inactive, the recipient is an example ("Alex Example"), and remote images stay blocked until you choose **Load N remote images**. Unsaved edits are flagged, and leaving the page asks first.

> **Tip:** Under **Send a test** you can send the saved draft to your own sign-in address (or any operator's), or to an address on the optional `MANGO_TEST_EMAIL_ALLOWLIST`. The subject is marked "[MANGO TEST — NOT A CAMPAIGN SEND]". It needs a configured mail provider.

## Publish a web version

After an email campaign completes, open **View schedule and results** and find **Public web version**. Choose **Publish web version**, then **Read public newsletter** to inspect the public copy. Only a saved approved email revision with a recorded hand-off can be published.

The reading copy replaces personalisation with neutral text and removes unsubscribe links, tracked redirects, tracking parameters and remote images. Your original sent revision stays unchanged. Review your wording: names or other information you typed directly become public. The archive at `/archive` includes an RSS feed and older-issue navigation. **Unpublish** removes the issue from the archive and feed, and its public page returns not found. Copies others have saved cannot be recalled.
