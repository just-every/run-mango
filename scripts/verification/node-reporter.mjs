import { writeFile } from 'node:fs/promises';
import { relative } from 'node:path';

// File summaries identify the declaring file, including wrapper-registered tests.
// Their elapsed duration and counts exclude duplicate suite result aggregates.
export default async function* fileTimings(events) {
  const files = new Map();
  let failed = false;
  for await (const { type, data } of events) {
    if (type !== 'test:summary') continue;
    if (!data.success) failed = true;
    // The final summary has no file and includes startup/teardown for the run.
    if (!data.file) continue;
    const file = relative(process.cwd(), data.file);
    const row = files.get(file) ?? { file, attempts: 0, durationMs: 0, statuses: {} };
    row.attempts += data.counts.tests;
    row.durationMs += data.duration_ms;
    for (const status of ['passed', 'failed', 'cancelled', 'skipped', 'todo']) {
      const count = data.counts[status];
      if (count) row.statuses[status] = (row.statuses[status] ?? 0) + count;
    }
    files.set(file, row);
  }
  if (process.env.MANGO_VERIFY_TIMING_FILE) {
    await writeFile(process.env.MANGO_VERIFY_TIMING_FILE, JSON.stringify({ status: failed ? 'failed' : 'passed',
      files: [...files.values()].sort((a, b) => b.durationMs - a.durationMs) }, null, 2) + '\n', { mode: 0o600 });
  }
}
