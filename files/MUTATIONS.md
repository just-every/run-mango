# Runtime fault checks

All faults were temporary, applied separately, and restored. Each ran the registered AUD-010 journey through the native Worker and browser. They are proof of the journey's ability to detect wrong behavior, not permanent test registrations. No assertion was removed or weakened.

| Outcome | Independent fault | Observed assertion | Result |
| --- | --- | --- | --- |
| Acceptance 1, approval checks retain saved meaning | Replace only the approval check's derived detail with a generic valid-conditions message | `meaning` in `./tests/audience-controls/audience-summary-journey.ts` finds no exclusion section in the authenticated checks response | exit 1; expected 2 sections, received 1 |
| Acceptance 2, explicit nested matching | Force the nested summary operator to all while saved selection remains any | The journey sees the wrong nested matching operator for the independently specified garden fixture | exit 1; expected any, received all |
| Restricted-role confidentiality | Disable only masking of the derived audience check in the read response | Analyst campaign read contains the private vegetables condition, violating its negative assertion | exit 1; private condition exposed |

The corresponding actual command logs accompany this report. The final candidate is rerun with the faults restored. The later additions to the same journey cover imported condition labels and signed-out session refusal; neither changes these production paths or negative assertions.
