import { join } from 'node:path';
import { writePrivateFile } from '@runeditrun/rer/private-files';

export function markdown(report) {
  const seconds = value => (value / 1000).toFixed(3);
  const lines = [`Verification coordinator: ${report.status}, ${seconds(report.durationMs)} seconds.`,
    report.fullCommand
      ? `Full public command: ${report.fullCommand.status}, ${seconds(report.fullCommand.durationMs)} seconds (launch through process close, including CLI startup and cleanup).`
      : 'Full public command: not measured by this inner coordinator. Use the public command timer or attach an outer receipt.',
    '', '| Stage | Status | Exit | Signal | Wall seconds |', '| --- | --- | ---: | --- | ---: |',
    ...report.stages.map(row => `| ${row.name} | ${row.status} | ${row.exitCode ?? '—'} | ${row.signal ?? '—'} | ${seconds(row.durationMs)} |`),
    '', '| Stage / file | Attempts | Reported seconds |', '| --- | ---: | ---: |'];
  for (const row of report.stages) for (const file of row.files?.files ?? []) {
    lines.push(`| ${row.name} / ${file.file} | ${file.attempts} | ${seconds(file.durationMs)} |`);
  }
  lines.push('', 'Browser file durations sum test attempts, including retries; Node file durations use elapsed file summaries. Parallel files overlap in both. Stage wall time includes startup and teardown. SKIPPED stages never launched.', '');
  return lines.join('\n');
}

export async function writeReport(directory, report, redact = text => text) {
  await writePrivateFile(join(directory, 'timings.json'), redact(JSON.stringify(report, null, 2) + '\n'));
  await writePrivateFile(join(directory, 'timings.md'), redact(markdown(report)));
}

export function validateFileTimings(value) {
  if (!value || !['passed', 'failed', 'timedout', 'interrupted'].includes(value.status)
    || !Array.isArray(value.files) || !value.files.length
    || value.files.some(file => typeof file.file !== 'string' || !file.file
      || !Number.isInteger(file.attempts) || file.attempts < 1
      || !Number.isFinite(file.durationMs) || file.durationMs < 0)) {
    throw new Error('Missing or invalid per-file timing results.');
  }
  return value;
}
