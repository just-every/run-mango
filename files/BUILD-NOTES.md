# Build notes

The pinned base already carries the 503 safe-provider-error proof selected by the planner. This continuation preserves it and closes native gaps that the base still names: the five-minute transient trigger and current eligibility on recovery. SMS and live-provider qualifications remain held, so there is no DONE promotion.

The first local fixture run observed a second recipient's ordinary initial refusal during the late pre-threshold tick. The fixture now gives both initial refusals their own shared allowance before observing the threshold. The next local run reached the threshold but a held clock prevented ordinary send allowance from becoming available after operator notices. The final scenario drives subsequent scheduled ticks while preserving the shared allowance. No production behavior, existing assertion or refusal was changed to make these fixture refinements pass.

The time proof uses the existing test-only elapsed clock; all production scheduling, eligibility, pacing, transport, persistence, queue consumers and health probing run normally. It is not a real-provider or wall-clock soak receipt.

The registered journey count remains one. The helper is not independently registered. There are no new migrations, no dependency or Base pin changes, and no workflow edits.

The cloud cannot perform the fleet's publication scan or landing. Evidence publication is separate from product custody. Run site and publication-scan completion on the final landed commit belong to the maintained lander.

One exact-commit invocation printed a passing journey but returned outer command exit 1, with no failing assertion in its log. The confirming run captured both the direct Playwright process and subreaper exits as 0. This was an execution-status investigation, with no product repair or CI rerun.

The first evidence attempt stopped before push because an extra local audit fetch requested missing historical blobs from the partial clone. The report tree has independent history, so its complete-ancestry identity audit now reads report ancestors directly. No product checkout, product ref or published history changed; the packet remained intact. See evidence-first-attempt-failure.txt.
