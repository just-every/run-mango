import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { writeReport } from './report.mjs';

// Also accepts an independently measured remote-run receipt. Its boundary must
// enclose the whole coordinator, including the public CLI's startup and cleanup.
export async function attachPublicTiming(directory, receipt, redact) {
  const report = JSON.parse(await readFile(join(directory, 'timings.json'), 'utf8'));
  const start = Date.parse(receipt.startedAt), finish = Date.parse(receipt.finishedAt);
  if (!Number.isFinite(start) || !Number.isFinite(finish) || finish < start
    || !Number.isFinite(receipt.durationMs) || receipt.durationMs < report.durationMs
    || start > Date.parse(report.startedAt) || finish < Date.parse(report.finishedAt)
    || !(Number.isInteger(receipt.exitCode) || receipt.exitCode === null)
    || !(typeof receipt.signal === 'string' || receipt.signal === null)
    || !(receipt.error === undefined || typeof receipt.error === 'string' && receipt.error.length > 0)
    || (receipt.exitCode === null && receipt.signal === null)) {
    throw new Error('Public command receipt must record an actual enclosing launch-to-close boundary and exit outcome.');
  }
  report.fullCommand = { startedAt: new Date(start).toISOString(), finishedAt: new Date(finish).toISOString(),
    durationMs: receipt.durationMs, exitCode: receipt.exitCode, signal: receipt.signal,
    ...(receipt.error ? { error: receipt.error } : {}),
    boundary: 'public command launch through close', status: receipt.exitCode === 0 && !receipt.signal && !receipt.error && report.status === 'PASS' ? 'PASS' : 'FAIL' };
  if (report.fullCommand.status === 'FAIL') report.status = 'FAIL';
  await writeReport(directory, report, redact);
  return report;
}
