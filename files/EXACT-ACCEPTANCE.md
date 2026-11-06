# Pinned CONT-010 acceptance

Source: c0e6fc6380af7c9c4fa6247698839918d93089c2, CONTRACT.md. Text below is unchanged.

**Requirement.** An operator reviews and imports CSV contact rows independently, preserving canonical identities, consent and restrictions. CONT-024 owns named-source attestation and SCALE-001 owns the review-size floor.

**Acceptance.**
1. Rows carry email or phone identity and may carry consent evidence under CONT-003; each row is validated independently.
2. A matching canonical identity updates one contact, and rerunning the same file changes nothing further.
3. The report reconciles created, updated and rejected counts and names a reason for each rejected row.
4. Import never subscribes an identity restricted by CONT-004.
5. A named incumbent export may use incumbent-held consent only under the owner’s once-per-source attestation; an unnamed file remains under the per-row consent rule.
6. Import undo preserves restrictions and the reviewed capacity meets SCALE-001.
