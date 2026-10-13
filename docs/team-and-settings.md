# Team and settings

A Mango deployment is run by one or more operators. They all have the same powers, they sign in with a one-time email link, and the sender identity they save in Settings is what your newsletters carry. All of this is under **Settings** in the app.

## Operators are equals

There are no roles. Every operator can write and approve campaigns, manage contacts and change settings. Campaigns and approvals are attributed to the operator who made them, and that attribution stays in the history even after the operator is removed.

## Invite an operator

Under **Operators** in Settings, enter the person's address in **Operator email** and press **Add operator**. Mango emails an invitation. The person must open it and press **Confirm** before they have access, and until then the list shows "Invitation pending". If the address already has access, Mango tells you so.

## Remove an operator

Press **Remove** next to a name, then **Confirm removal**. Removal revokes that person's active sessions, and the campaigns, approvals and other history attributed to them are preserved. Removing someone with a pending invitation cancels the invitation, and its links stop working. If you remove yourself, you are signed out immediately.

Two protections apply:

- The owner created at setup, the address in `OWNER_EMAIL`, is marked "Setup operator". Only they can remove their own access.
- Mango will not remove the last active operator.

Removing an operator revokes their open sessions and unused invitation and sign-in links. Campaigns, saved revisions, approvals and audit entries retain their attribution. These invitation and removal controls are covered by the local native sign-in and outbox journey; that proof does not establish hosted mail delivery.

## Sign in with an email link

There are no passwords. Go to `/signin`, enter your address and press **Email sign-in link**. If the address has access, a link is on its way; the page says the same thing either way, so it does not reveal who has access. Open the link and press **Confirm**. Opening the link alone signs nobody in, which stops mail scanners from using it up.

By default a link works once and expires after 15 minutes, and a session lasts 7 days. Requests for links are rate limited, and the page shows "Too many requests. Try again later." when you hit the limit. **Sign out** is in the main menu.

On a deployment, if sign-in mail never arrives, check your mail inputs and your provider's sender verification (see [Install and deploy](./install.md)), then request a new link. Locally, links appear in the development outbox instead.

## Sender identity

Settings has a **Sender identity** panel with four required fields: **Business display name**, **From email**, **Reply-to email** and **Physical postal address**. Press **Save sender details**. Every email carries these details, and the postal address goes into the footer. The environment values `MAIL_SENDER_NAME`, `MAIL_REPLY_TO` and `MAIL_PHYSICAL_ADDRESS` only provide the starting values; once you save, the saved identity is what counts. Hosted signup will not work until a complete valid identity exists, whether saved here or supplied by those environment values. Until it exists, signing in opens **Set up your sender identity** instead of the app; save your details there to continue.

Changing these details clears the current sender authentication evidence, and campaigns must then match the new identity. Existing drafts keep what they were created with, so update their sender fields to match. An approved campaign keeps its original identity but must still match Settings before it can send, so avoid changing the identity while a campaign is scheduled.

The same panel shows **Email authentication**: one of "Sender check passed", "Sending requirements not met", "Sender check unavailable" or "Sender check failed", with rows for **Provider domain**, **DNS configuration** and **Observed message authentication**, including when each was observed and when it expires. Press **Check again** to refresh. How to produce the observation is in [Approval and sending](./approval-and-sending.md).

> **Tip:** Save your sender identity before you create your first draft. New drafts start with these details filled in.
