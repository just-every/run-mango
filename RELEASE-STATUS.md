# Release status

Mango v0.2.0 has a release record dated 16 October 2026. Public source: https://github.com/just-every/run-mango. The record describes the candidate; a tag, passing Verify wall and production deployment each require their own exact-revision receipt.

Upgrade from 0.1.0 with matching source, D1/R2 and private-settings backups, preserve customizations and applied SQL, apply migrations in order through 0059 and run `rer build` before a fresh post-upgrade export. Migration 0044 retires legacy journals and advances erasure floors. After 0057, add each embedding site under Audience → Allowed embed origins so existing iframes load again.

Managed RER mail provides sign-in and subscription confirmations. Newsletter delivery requires a separate owner-supplied SendGrid/Resend marketing connection and verified business sender. Test sends may reach every active operator plus explicit extra destinations. Routine release verification has no capacity profile; push Verify is sharded and slow install/README clone journeys run on tags and nightly. A measured passing wall is evidence, not a claim implied by this plan.

Open release obligations include live signed provider-webhook proof, full flagship proposal/commerce/SMS/AI and contract coverage, hosted backup/restore, flagship scale, and destination-jurisdiction evidence for public signup. Local verification cannot certify these outcomes. Hosted provider activation also awaits the corresponding platform support. See ACCEPTANCE.md and CONTRACT.md.

Pinned rer 0.2.22 prints a one-use owner grant for `rer signin`; the owner’s no-printed-sign-in-link rule prohibits that recovery path. Correct hosted mail in Configure and use delivered email. Private CLI recovery awaits a Base change. Local `RER_OPEN` is a separate private development-key entry.
