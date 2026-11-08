# Exact-candidate Verify diagnosis

Candidate: c25389df22188f2da7b4abde3d71ed08bc823b6c
Run: 42484470495, push, completed failure.
Reports job: 128743646795, success, containing the existing registered shared signup journey and the new allowance refusal assertions.
Failed matrix job: 128743646905, shards (move-in).
Failed aggregate job: 128746534365, verify; its shell gate correctly refused failed upstream coverage.

The sole failed test assertion was tests/move-in/held.journeys.ts:6, “[CONT-002][CONT-004][CONT-006][CONT-010] restrictive move-in states win across held imports, retry, undo and rejected archives”. At tests/move-in/held.flow.ts:84, confirmedContact expected HTTP 201 and received HTTP 409:

```json
{"error":"consent_capture_failed","detail":"Confirmation delivery is uncertain; the attempt will not be repeated automatically."}
```

Both failed-job archives were read exactly once through gh run view with the run, repository, job and --log-failed arguments. Job environment blocks were omitted from the selected non-secret logs; the command, failed assertion and error remain intact. No blob redirect was retried.

Before any repair edit, the exact failed command `node scripts/verification/ci.mjs move-in` ran once on the clean candidate with the original complete matrix selection, Node 22.20.0, CPU budget 4 and two Playwright workers. All four tests passed, exit 0. This is a failed reproduction, not proof of a repaired test. The cloud uses its required system Chromium and isolated external artifact storage.

The current-main comparison runs the original move-in member, both original move-in journeys and two workers, on the same physical cloud runner with frozen dependencies and fresh fixture storage. It passed both move-in journeys, exit 0, on main eceb55d9eca66cf4a2702f69e23109d2266b1560. Its receipt records that real result. No product code has changed after the candidate push. No speculative fix, test weakening, workflow edit, empty commit or workflow rerun has been made.

The brief's Verify-repair rule states: “If it does not reproduce, stop BLOCKED with that output; do not guess a fix.” A local pass does not turn the recorded red exact-head workflow green. No VERIFY_REPRODUCED line with a fabricated nonzero exit is emitted.

Terminal disposition: BLOCKED, as the brief requires for an unreproduced failure. No repair round or workflow rerun was attempted. The product branch remains pushed at the original exact candidate.
