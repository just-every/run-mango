import { spawn } from 'node:child_process';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { evidenceDirectory } from '../../tests/support/artifacts.mjs';
import { createCommands } from '../base-onboarding/commands.mjs';
import { writePrivateFile } from '../base-onboarding/private-files.mjs';
import { writeTerminal } from './terminal-output.mjs';
import { attachPublicTiming } from './public-timing.mjs';

const [separator, command, ...args] = process.argv.slice(2);
if (separator !== '--' || !command) throw new Error('Usage: node scripts/verification/time-command.mjs -- COMMAND [ARGUMENTS]');
const root = evidenceDirectory('verify');
await mkdir(root, { recursive: true });
const directory = await mkdtemp(join(root, 'public-'));
const cancellation = new AbortController();
const handlers = new Map(['SIGINT', 'SIGTERM'].map(signal => [signal, () => cancellation.abort(new Error(`Cancelled by ${signal}.`))]));
for (const [signal, handler] of handlers) process.on(signal, handler);
let receipt, failure;
try {
  const store = await createCommands(directory, {}, {
    spawn(executable, arguments_, options) {
      const started = performance.now(), startedAt = new Date().toISOString();
      const child = spawn(executable, arguments_, options);
      child.once('close', (exitCode, signal) => { receipt = { startedAt, finishedAt: new Date().toISOString(),
        durationMs: performance.now() - started, exitCode, signal, boundary: 'public command launch through close' }; });
      return child;
    },
    onOutputError: error => { failure ??= error; cancellation.abort(error); },
  });
  store.setCommandSignal(cancellation.signal);
  try {
    await store.run('Public verification command', command, args, {
      env: { ...process.env, MANGO_VERIFY_REPORT_DIRECTORY: directory }, signal: cancellation.signal,
    });
  } catch (error) { failure ??= error; }
  finally { try { await store.closeCommands(); } catch (error) { failure ??= error; } }
  async function saveOutcome() {
    if (cancellation.signal.aborted) failure ??= cancellation.signal.reason;
    // A cancelled heading has no launch-to-close measurement to invent.
    const outcome = receipt ? { ...receipt, ...(failure ? { error: store.redact(failure.message) } : {}) }
      : { status: 'FAIL', boundary: 'public command not launched', error: store.redact(failure?.message ?? 'The public verification command did not launch.') };
    await writePrivateFile(join(directory, 'public-command.json'), store.redact(JSON.stringify(outcome, null, 2) + '\n'));
    if (!receipt) throw new Error('The public verification command did not launch.');
    return attachPublicTiming(directory, outcome, store.redact);
  }
  try {
    const report = await saveOutcome();
    await writeTerminal(store.redact(`VERIFY_PUBLIC_TOTAL ${JSON.stringify(report.fullCommand)}\n`), 1, { signal: cancellation.signal });
    await writeTerminal(store.redact(`Verification timing and diagnostics: ${directory}\n`), 1, { signal: cancellation.signal });
    if (report.status !== 'PASS') process.exitCode = 1;
  } catch (error) {
    failure ??= error;
    try { await saveOutcome(); } catch { /* Preserve the first diagnostic. */ }
  }
  if (failure) {
    process.exitCode = 1;
    try { await writeTerminal(store.redact(failure.message) + '\n', 2, { signal: cancellation.signal }); } catch { /* The saved outcome still records failure. */ }
  }
} finally { for (const [signal, handler] of handlers) process.off(signal, handler); }
