import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { createCommands } from '@runeditrun/rer/commands';

// The shared command store owns rer and its application descendants.
export async function startNativeDev({ checkout, directory, url, env, secrets = [], write, signal, timeoutMs = 900000, verb = 'dev' }) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new TypeError('Startup deadline must be positive.');
  if (signal?.aborted) throw new Error('Starting native development: cancelled before readiness.');
  const work = await mkdtemp(join(directory, 'dev-'));
  let output = '', observe = () => {}, rejectStartup, child;
  const marker = Buffer.from(`RER_READY ${url}`);
  let prefixLength = 0, discardedLine = false, ready = false;
  const readLines = chunk => {
    for (const byte of chunk) {
      if (byte === 10) {
        if (!discardedLine && prefixLength === marker.length) ready = true;
        prefixLength = 0; discardedLine = false;
      } else if (!discardedLine) {
        if (byte === marker[prefixLength]) prefixLength++;
        else discardedLine = true;
      }
    }
  };
  const commands = await createCommands(work, { logs: [] }, {
    terminal: text => { output = (output + text).slice(-65536); write(text); },
    onOutputError: error => rejectStartup?.(error),
  });
  commands.addSecrets(secrets);
  try {
    child = commands.spawn(`Starting native ${verb}`, process.execPath, ['node_modules/@runeditrun/rer/bin/rer.mjs', verb], { cwd: checkout, env: {...env, RER_SERVER_JOURNEY: '1'}, signal });
    await new Promise((resolve, reject) => {
      let settled = false;
      const finish = error => {
        if (settled) return;
        settled = true;
        clearTimeout(deadline);
        child.stdout.removeListener('data', stdout);
        child.removeListener('exit', exited);
        child.removeListener('error', failed);
        signal?.removeEventListener('abort', cancelled);
        observe = () => {};
        rejectStartup = undefined;
        if (error) reject(error); else resolve();
      };
      const exited = (code, terminationSignal) => finish(Object.assign(
        new Error(`Starting native development: exited before readiness (exit ${code ?? 'none'}, signal ${terminationSignal ?? 'none'}).`),
        { exitCode: code, signal: terminationSignal },
      ));
      const failed = error => finish(new Error(`Starting native development: could not start (${commands.redact(error.message)}).`));
      const cancelled = () => finish(new Error('Starting native development: cancelled before readiness.'));
      const stdout = chunk => { readLines(chunk); observe(); };
      const deadline = setTimeout(() => finish(new Error('Starting native development: readiness deadline exceeded.')), timeoutMs);
      rejectStartup = finish;
      child.once('exit', exited);
      child.once('error', failed);
      signal?.addEventListener('abort', cancelled, { once: true });
      // Only stdout carries the CLI protocol; merged redacted diagnostics can
      // join unrelated stderr fragments to its lines. Compare bytes without
      // retaining raw output, and require a real stdout newline. Bounded line
      // state keeps discarded long prefixes independent of the diagnostic tail.
      observe = () => {
        if (signal?.aborted) cancelled();
        else if (child.exitCode != null || child.signalCode != null) exited(child.exitCode, child.signalCode);
        else if (ready) finish();
      };
      child.stdout.on('data', stdout);
      observe();
    });
    return { stop: () => commands.closeCommands() };
  } catch (error) {
    let cleanupError;
    try { await commands.closeCommands(); } catch (failure) { cleanupError = failure; }
    const tail = output.trimEnd().split('\n').slice(-40).join('\n');
    throw Object.assign(new Error(commands.redact([
      error.message,
      `Last output (up to 40 lines):\n${tail || '(no output)'}`,
      `Log: ${commands.logPath}`,
      ...(cleanupError && cleanupError.message !== error.message ? [`Cleanup: ${cleanupError.message}`] : []),
    ].join('\n'))), { exitCode: error.exitCode ?? child?.exitCode ?? null, signal: error.signal ?? child?.signalCode ?? null });
  }
}
