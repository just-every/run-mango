# DIVERGENCE.md

Friction found in the shared, non-editable seed-spec documents while defining Mango. These are recorded here rather than changed locally because `AGENTS.md`, `BASELINE.md`, and `AGENTS.consumer.md` are planted documents owned by seed-spec.

## 1. `BASE-DATA-003` cascading erasure destroys unsubscribe integrity

`BASE-DATA-003` requires deletion to cascade to dependent records. For an outbound-message product, deleting the contact's opt-out record allows a later store sync or import to make the same address eligible again.

CONT-013 therefore supersedes only that part of the baseline for contact erasure. It preserves the five-minute completion bound, completion confirmation, and audit anonymisation, but retains one secret-keyed, non-readable destination hash per opted-out channel identity, including known aliases so a re-import cannot silently restore eligibility. All other `BASE-DATA-003` behaviour stands.

**Suggested central fix:** explicitly permit records whose sole purpose is preventing future contact to survive erasure in a non-readable form.

## 2. `BASE-INPUT-002` does not distinguish displaying HTML from transmitting it

The baseline correctly requires sanitisation when user-supplied HTML is displayed by the product. A campaign product must also transmit operator-authored email HTML; stripping all remote images and tracking markup from the outbound document is a different operation from safely previewing it.

Mango makes that distinction in MSG-009: outbound HTML is constrained to a declared safe tag and attribute set, while previews are sanitised under the baseline.

**Suggested central fix:** scope the current display rule to product-controlled rendering surfaces and define a separate boundary for outbound authored HTML.

## 3. No baseline clause bounds scheduled-work punctuality

Idempotency and visible failure are covered, but no planted clause says how close to its scheduled instant a job must begin. Mango had to choose a product-specific 60-second bound in CAMP-011.

**Suggested central fix:** add a shared scheduled-action clause with an explicit tolerance and exactly-once requirement, while allowing a product contract to choose a tighter bound.

## 4. `seed.json` has no specified field for baseline supersessions

`AGENTS.md` defines how a contract names a superseded `BASE-` clause, but not how the catalog, CLI, or buyer agent discovers the same fact from the manifest. Mango uses `supersededBaselineClauses` so the security-relevant exception is not hidden in prose.

**Suggested central fix:** add that field to the seed-spec schema and validate it against contract supersessions in both directions.

## 5. Estimated limits have no sanctioned provenance shape

The manifest must carry limits, while the instructions say those values are produced by load tests. A bootstrap has no load-tested backend yet. Mango uses `limits.status: estimated-until-load-tested`, an otherwise unspecified field, to avoid presenting guesses as measured capacity.

**Suggested central fix:** define `limits.measurement` as `estimated` or `load-tested`, and require the verifying tag and date for load-tested values.

## 6. Clause formatting examples conflict

`AGENTS.md` illustrates one level-two heading per clause, while the deleted bootstrap exemplar grouped clauses under area headings and represented each clause as a bullet. Mango followed the exemplar's grouped form.

**Suggested central fix:** choose one canonical form and state exactly what `seed-spec validate` parses.


## 7. Erasure can invalidate immutable campaign content

Saved and approved campaign rules, summaries and message payloads can contain a contact literal. CONT-013 removes or redacts that literal, including JSON and Base64 representations, and appends an audit entry with a random anonymised reference. The historical approval digest is retained unchanged as a history identifier; it is no longer a digest authorising the changed content. Affected revisions enter `erasure-invalidated`, their approval authority is revoked and queued recipients are excluded. Historical approver and approval time remain as attribution; each later erasure that changes an already-invalidated revision appends its own anonymised audit event. The operator must review the redacted material in a new draft and obtain a new approval. Ordinary segment editing still cannot change a copied campaign revision.

Mango declares this cascade in `src/core/features/audience/erasure/declaration.ts`. Its current Base target-erasure API leaves source-only records that produced no target change. Mango therefore withdraws complete affected import jobs and all their retained source copies, preserving surviving contact state while invalidating undo and replay custody. Each removed primary key is fenced through the public Base portability API in the deletion transaction. No shared journal internals or vendored files are changed. Shared-helper adoption belongs to a later verified Base refresh with source/job-level erasure authority.

Known contact names are kept in the existing contact history before a rename or merge discards them. Erasure reads those names and removes that history through the declared cascade.

Erasure never rewrites or deletes another person's data because it spells the erased contact's name. Exact ids, addresses, phones and IPs are matched in every declared store and stored object; an address is matched whole, with `.`, `-` and `+` part of it, so an address directly followed by `.` and a letter (for example a file named with the address followed by `.csv`) reads as a longer address and is not matched there. Names and personal notes are matched only in rows reached through the contact's own scope or naming the contact by an exact identifier. Free text shorter than four characters or a single word is never matched; if a kept record in that scope would still hold it after erasure, admission answers 409 with the store's name and changes nothing. Only raw identifier copies are checked at admission: a record that names the contact only through an encoded identifier keeps such unsafe free text. Stored objects are removed only through an exact id, address or phone in their key, metadata or readable content. File names and capture sources are never learned from import plans, so they cannot pull another contact's import into erasure. Names already discarded by older installations cannot be reconstructed or reliably linked from unrelated saved text; operators must review any such known historical literals explicitly. Mango does not guess those identities or delete unrelated campaigns.
