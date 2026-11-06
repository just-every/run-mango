# Preserved historical audit rows at the exact source

These are historical context, not fresh execution receipts. Duplicate AP5 line retained verbatim. No exact-source CT verdict is named here. Current registered names and locations are in PLAN.md.

| CONT-012 | “[STORE-005] [STORE-006][AUD-003] sources recover only after completed sync and review counts commerce and dormancy exclusions” (`tests/go-live/stale-sources.journeys.ts:29`); “[CONT-012][AUD-008][MOVE-009] imported engagement governs review and immutable dispatch policy without changing consent” (`tests/move-in/archive.journeys.ts:370`) | Browser 390/1440; authenticated HTTP | Partial evidence: Native aged order causes dormant exclusion; Dormancy never removes current eligible order; Imported click retains original time; Imported opens cannot prevent dormancy; No-history grace label and inclusion; Grace ends only after a full window; Open-only label visible; Inactivity leaves all existing contacts and their consent/suppression states unchanged Missing journey: “Dormancy without deletion — complete acceptance”, covering the unasserted outcomes in the Gap and the outcome references below. | none |
| CONT-012 | 1 | Native aged order causes dormant exclusion | `tests/go-live/stale-sources.journeys.ts:163` | asserted |
| CONT-012 | 1 | Dormancy never removes current eligible order | `tests/go-live/stale-sources.journeys.ts:161` | asserted |
| CONT-012 | 2 | Imported click retains original time | `tests/move-in/archive.journeys.ts:424` | asserted |
| CONT-012 | 2 | Imported opens cannot prevent dormancy | `tests/move-in/archive.journeys.ts:402` | asserted |
| CONT-012 | 2 | Imported order and consent changes retain original times for dormancy | none | none |
| CONT-012 | 3 | No-history grace label and inclusion | `tests/move-in/archive.journeys.ts:402` | asserted |
| CONT-012 | 3 | Grace ends only after a full window | `tests/move-in/archive.journeys.ts:464` | asserted |
| CONT-012 | 4 | Open-only label visible | `tests/move-in/archive.journeys.ts:406` | asserted |
| CONT-012 | 5 | Inactivity leaves all existing contacts and their consent/suppression states unchanged | `tests/move-in/archive.journeys.ts:442` | asserted |
| CONT-012 | 5 | Inactivity leaves all existing contacts and their consent/suppression states unchanged | `tests/move-in/archive.journeys.ts:442` | asserted |
