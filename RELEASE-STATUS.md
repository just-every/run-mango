# Release status

Mango v0.3.0 has a release record dated 19 October 2026. Public source: https://github.com/just-every/run-mango. The record describes the release; the tag, the passing Verify run and any production deployment each have their own receipt for the exact revision.

Upgrade from 0.2.0 with matching source, D1/R2 and private-settings backups. Preserve your customizations and applied SQL, apply migrations 0058_base_provider_control through 0077_signup_refusal_hours in filename order, and run `rer build` before taking a fresh export. Migration 0076 makes the existing owner the product Owner and starts every other operator as Admin. The restore finalize route now requires the archive's `archiveHash`.

Managed RER mail sends sign-in and subscription confirmations. Newsletter delivery needs a separate SendGrid or Resend marketing connection that the owner supplies, plus a verified business sender. With your own provider, one SendGrid key covers both. Without a signed Event Webhook, a hosted send shows Accepted, not Delivered.

Open release obligations include live signed provider-webhook proof, built-in hosted backup and restore, flagship scale, and every partial or missing clause in CONTRACT.md's status table. See ACCEPTANCE.md, CONTRACT.md and CHANGELOG.md.

Pinned rer 0.2.66 prints a one-use owner grant for `rer signin`; the owner's no-printed-sign-in-link rule prohibits that recovery path. Correct hosted mail in Configure and use delivered email. Private CLI recovery awaits a Base change. Local `RER_OPEN` is a separate private development-key entry.
