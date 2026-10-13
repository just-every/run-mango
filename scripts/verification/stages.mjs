import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createCommands } from '../base-onboarding/commands.mjs';
import { openPrivateLog } from '../base-onboarding/private-files.mjs';
import { createRedaction, credentialValues } from '../base-onboarding/redaction.mjs';
import { inheritedScopeTokens } from '../base-onboarding/process-scope.mjs';
import { awaitOutput, writeTerminal } from './terminal-output.mjs';
import { validateFileTimings, writeReport } from './report.mjs';

// Independent stages overlap within each group, with a barrier between groups.
// The maintained command store owns
// scoped descendants (including detached groups) and redacts before every sink.
export async function runStages(groups, { directory, env = process.env, write = writeTerminal, signal, schedule } = {}) {
  const started = Date.now(), cancellation = new AbortController();
  const redaction = createRedaction();
  redaction.addSecrets([...credentialValues(process.env), ...credentialValues(env), ...inheritedScopeTokens(env), ...inheritedScopeTokens(process.env)]);
  const stages = groups.flat().map(({ name }) => ({ name, status: 'SKIPPED', startedAt: null, durationMs: 0, exitCode: null, signal: null }));
  let failure, outputError, reportQueue = Promise.resolve();
  const fail = (error, row) => {
    failure ??= new Error(redaction.redact(error.message));
    if (row) { row.status = 'FAIL'; row.error ??= redaction.redact(error.message); }
    cancellation.abort(failure);
  };
  const emit = async text => {
    if (outputError) throw outputError;
    try { await awaitOutput(() => write(redaction.redact(text), 1, { signal: cancellation.signal }), cancellation.signal); }
    catch (error) { outputError ??= error; throw outputError; }
  };
  const cancel = () => cancellation.abort(signal.reason);
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) cancel();
  const report = status => ({ startedAt: new Date(started).toISOString(), finishedAt: new Date().toISOString(),
    durationMs: Date.now() - started, status, ...(failure ? { error: failure.message } : {}), fullCommand: null, stages });
  const save = status => {
    const next = reportQueue.then(() => writeReport(directory, report(status), redaction.redact));
    reportQueue = next.catch(() => {});
    return next;
  };
  async function stage({ name, command, args, timingRequired = false }, row) {
    if (cancellation.signal.aborted) return;
    const start = Date.now(), timingFile = join(directory, `${name}.files.json`);
    let store, log;
    row.status = 'RUNNING'; row.startedAt = new Date(start).toISOString();
    try {
      // Refuse an unusable stage log before starting the command. Streaming
      // writes fail inside the command store's output boundary, not at teardown.
      log = await openPrivateLog(join(directory, `${name}.log`));
      await rm(timingFile, { force: true });
      const commandDirectory = join(directory, name);
      await mkdir(commandDirectory, { recursive: true, mode: 0o700 });
      store = await createCommands(commandDirectory, {}, {
        terminal: async text => { log.write(text); await emit(text); },
        onOutputError: error => fail(error, row),
      });
      store.setCommandSignal(cancellation.signal);
      await emit(`VERIFY_STAGE ${JSON.stringify({ name, event: 'start', at: row.startedAt })}\n`);
      const child = await store.run(name, command, args, {
        cwd: process.cwd(), env: { ...env, MANGO_VERIFY_TIMING_FILE: timingFile }, signal: cancellation.signal,
      });
      row.exitCode = child.exitCode; row.signal = child.signalCode;
      if (timingRequired) {
        row.files = validateFileTimings(JSON.parse(await readFile(timingFile, 'utf8')));
        if (row.files.status !== 'passed') throw new Error(`Per-file timing reporter ended ${row.files.status}.`);
      }
      if (row.status !== 'FAIL') row.status = 'PASS';
    } catch (error) {
      row.exitCode ??= error.exitCode ?? null; row.signal ??= error.signal ?? null;
      if (row.status !== 'FAIL' && cancellation.signal.aborted) row.status = 'CANCELLED';
      else fail(error, row);
    } finally {
      try { await store?.closeCommands(); }
      catch (error) { fail(error, row); }
      try { await log?.close(); }
      catch (error) { fail(error, row); }
      row.durationMs = Date.now() - start;
      // A failed or cancelled runner may still have emitted useful timings.
      if (!row.files) try { row.files = validateFileTimings(JSON.parse(await readFile(timingFile, 'utf8'))); }
      catch (error) { if (error.code !== 'ENOENT' && row.status === 'PASS') fail(error, row); }
      try { await save('RUNNING'); } catch (error) { fail(error, row); }
      try { await emit(`VERIFY_STAGE ${JSON.stringify({ ...row, files: undefined, event: 'end' })}\n`); }
      catch (error) { fail(error, row); }
    }
  }
  try {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await save('RUNNING');
    if (schedule) await emit(`VERIFY_SCHEDULE ${JSON.stringify(schedule)}\n`);
    await emit(`Verification timing and diagnostics: ${directory}\n`);
    let offset = 0;
    for (const group of groups) {
      const results = await Promise.allSettled(group.map((item, index) => stage(item, stages[offset + index])));
      for (const result of results) if (result.status === 'rejected') fail(result.reason);
      offset += group.length;
      if (failure || cancellation.signal.aborted) break;
    }
  } catch (error) { fail(error); }
  finally {
    const status = failure || cancellation.signal.aborted ? 'FAIL' : 'PASS';
    try { await save(status); } catch (error) { fail(error); }
    try { await emit(`VERIFY_TOTAL ${JSON.stringify({ status: failure ? 'FAIL' : status, durationMs: Date.now() - started, boundary: 'coordinator' })}\n`); }
    catch (error) {
      fail(error);
      // The total is part of the outcome. Repair an already-persisted PASS,
      // retaining the original output diagnostic if storage also fails.
      try { await save('FAIL'); } catch (repairError) { fail(repairError); }
    } finally { signal?.removeEventListener('abort', cancel); }
  }
  if (failure) throw failure;
  cancellation.signal.throwIfAborted();
}
