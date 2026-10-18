# Mango claims → code

This inventory records Mango’s scoped integration and daily-use capabilities against the code in this repository. The wider product requirements and their acceptance status remain in CONTRACT.md and ACCEPTANCE.md.

**Totals: 14 claims · 14 in code.**

## Mango integration claims

These rows describe the scoped integration delivered in Mango. The broader target clauses retain their own partial status in CONTRACT.md.

| Row | Claim | Status | Evidence |
| --- | --- | --- | --- |
| M1 | An owner can create a named credential with selected scopes, copy it once, inspect activity and revoke it; it cannot sign in as an operator. | in code | `src/core/features/integrations/credentials.ts`, `src/core/features/integrations/routes.ts`, `src/core/features/store/ui/settings-integrations.tsx`, `tests/go-live/integrations.journeys.ts` |
| M2 | A scoped client upserts by normalized email, keeps fields/tags in a saved list, records consent source and cannot lift an opt-out. | in code | `src/core/features/integrations/contacts.ts`, `tests/go-live/integrations.journeys.ts` |
| M3 | A no-email suppression blocks an approved send at handoff; unsubscribe, bounce and complaint events have replayable cursors. | in code | `migrations/core/0069_scoped_integrations.sql`, `src/core/features/integrations/service.ts`, `tests/go-live/integrations.journeys.ts` |
| M4 | One integrator page explains credentials, contact sync, suppression, event replay and approved-segment sending with curl examples. | in code | `docs/integrations.md`, `docs/site.json` |
| M5 | RER Managed integration provider calls say “not available yet”; self-hosted approved-segment dispatch retains ordinary sender and consent gates. | in code | `src/core/features/integrations/service.ts`, `scripts/installer/deploy-declaration.mjs`, `docs/integrations.md`, `tests/go-live/integrations.journeys.ts` |

## Mango daily-use claims

| Clause | Claim | Status | Evidence |
| --- | --- | --- | --- |
| MSG-013 | Operators insert Web, Email, Phone and Text links, inspect decoded contact destinations in review, and deliver contact links unchanged without click tracking. Invalid contact destinations block approval; images remain HTTPS-only. | in code | `src/core/features/campaigns/contact-links.ts`, `src/core/features/campaigns/ui/message-link-tool.tsx`, `tests/go-live/contact-links.journeys.ts` |
| AUD-006 | Every later step rechecks saved inclusion, custom exclusions and current consent; skipped contacts have a named reason and newly matching contacts stay outside the frozen audience. | in code | `src/core/features/audience/eligibility.ts`, `tests/go-live/multistep.journeys.ts` |
| PUB-001 | Operators publish sent email revisions as neutral public issues, with an archive index, RSS, search metadata and withdrawal. Draft and unsent campaigns cannot publish; recipient personalisation, unsubscribe links, tracked redirects and remote images do not enter the public copy. | in code | `src/core/features/archive/`, `tests/campaign-results/archive.journeys.ts`, `tests/audience-import/erasure.spec.ts` |
| DELIV-005 | Insights groups signed delivered, bounced and complained outcomes and human clicks by the mailbox domain recorded for each send, with six bounce categories. Replays do not add counts, scanners are excluded, custom domains stay Other and missing historical diagnostics are labelled. | in code | `src/core/features/insights/mailbox-report.ts`, `src/core/features/insights/mailbox-taxonomy.ts`, `tests/go-live/mailbox-provider.journeys.ts` |
| MSG-007 | Review distinguishes advisory findings from blockers. Acknowledgements record the operator and time for the exact saved revision, survive replay and reload, and never bypass safety checks; changed content needs a new acknowledgement. | done | `src/core/features/lifecycle/advisory-acknowledgements.ts`, `src/core/features/campaigns/ui/approval-check-list.tsx`, `tests/go-live/content-checks.journeys.ts` |
| MSG-008 | Review counts eligible contacts using fallback text, invalid tokens block approval, and escaped names and saved fallbacks reach the provider. Destination-only display labels do not substitute for names; preview uses the same supported fields and fallbacks. | done | `src/core/features/audience/contact-personalisation.ts`, `src/core/features/campaigns/message-content.ts`, `tests/go-live/personalisation.journeys.ts` |
| STORE-003 | Decision Desk shows every source’s last successful sync and later failure, retains the completion through partial-page failure, and marks it fresh only after recovery completes. Unstarted sources are visible and operational diagnostics stay on Store. | done | `src/core/features/campaigns/ui/source-freshness.tsx`, `src/core/features/store/service.ts`, `tests/go-live/source-freshness.journeys.ts` |
| STORE-005 | Campaign inclusion and exclusion rules cannot approve against stale or failed sources. Review names the safe cause with a sync link and recheck; unavailable counts stay unknown, and completed recovery still needs ordinary exact-revision approval. | done | `src/core/features/audience/eligibility.ts`, `src/core/features/lifecycle/evaluate-approval.ts`, `src/core/features/campaigns/ui/campaign-review.tsx`, `tests/go-live/stale-sources.journeys.ts` |
| BUILD-012 | Newsletter saves measure UTF-8 sent-size bounds and retain oversize edits; approval, test send and actual delivery enforce the per-part limit. Full builder, product, flow and imported-blueprint acceptance remain outstanding. | partial | `src/core/features/campaigns/email-size.ts`, `src/core/features/campaigns/saved-email-size.ts`, `tests/go-live/email-size.journeys.ts` |
