import { writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

export default class FileTimingReporter {
  files = new Map();
  onTestEnd(test, result) {
    // contract() gives locations in its wrapper. The public FILE suite title
    // is relative to the project's testDir and still names the declaring file.
    let file = test.location.file;
    for (let suite = test.parent; suite; suite = suite.parent) {
      if (suite.type === 'file') {
        const project = suite.project();
        if (!project?.testDir) throw new Error('File timing needs the declaring project testDir.');
        file = resolve(project.testDir, suite.title);
        break;
      }
    }
    file = relative(process.cwd(), file);
    const row = this.files.get(file) ?? { file, attempts: 0, durationMs: 0, statuses: {} };
    row.attempts++;
    row.durationMs += result.duration;
    row.statuses[result.status] = (row.statuses[result.status] ?? 0) + 1;
    this.files.set(file, row);
  }
  onEnd(result) {
    if (!process.env.MANGO_VERIFY_TIMING_FILE) return;
    writeFileSync(process.env.MANGO_VERIFY_TIMING_FILE, JSON.stringify({ status: result.status,
      files: [...this.files.values()].sort((a, b) => b.durationMs - a.durationMs) }, null, 2) + '\n', { mode: 0o600 });
  }
}
