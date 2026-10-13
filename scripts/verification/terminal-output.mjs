import { fstatSync } from 'node:fs';
import { Socket } from 'node:net';

const terminals = new Map();

// Await injected sinks too: cancellation must release the producer even when
// its sink does not implement AbortSignal. Native writes receive the signal
// as well, so they retire the pending I/O rather than keeping the process alive.
export function awaitOutput(write, signal) {
 return new Promise((resolve, reject) => {
  const done = (settle, value) => { signal?.removeEventListener('abort', abort); settle(value); };
  const abort = () => done(reject, signal.reason);
  signal?.addEventListener('abort', abort, { once: true });
  Promise.resolve().then(() => { signal?.throwIfAborted(); return write(); }).then(value => done(resolve, value), error => done(reject, error));
 });
}

function terminal(descriptor) {
 if (terminals.has(descriptor)) return terminals.get(descriptor);
 if (![1, 2].includes(descriptor)) throw new TypeError('Terminal output requires stdout or stderr.');
 const status = fstatSync(descriptor), pipe = status.isFIFO() || status.isSocket();
 // Node's process stdio facade deliberately does not close its fd on destroy.
 // Own the pipe writer so abort can cancel a blocked write using public Socket
 // APIs. Files and terminals keep Node's normal descriptor-specific behavior.
 const stream = pipe ? new Socket({ fd: descriptor, readable: false, writable: true }) : descriptor === 1 ? process.stdout : process.stderr;
 if (pipe) stream.unref();
 let failure;
 const pending = new Set();
 const fail = error => { failure ??= error; for (const reject of pending) reject(failure); };
 stream.on('error', fail);
 stream.on('close', () => fail(Object.assign(new Error('Terminal output closed before writing completed.'), { code: 'ERR_STREAM_PREMATURE_CLOSE' })));
 const write = (text, signal) => new Promise((resolve, reject) => {
  if (failure) return reject(failure);
  let settled = false;
  const done = error => {
   if (settled) return; settled = true;
   pending.delete(done); signal?.removeEventListener('abort', abort);
   if (pipe && !pending.size) stream.unref();
   error ? reject(error) : resolve();
  };
  const abort = () => {
   fail(signal.reason instanceof Error ? signal.reason : new Error('Terminal output cancelled.'));
   if (pipe) stream.destroy();
  };
  pending.add(done); signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) return abort();
  if (pipe) stream.ref();
  try { stream.write(text, error => { if (error) fail(error); done(error); }); }
  catch (error) { fail(error); done(error); }
 });
 terminals.set(descriptor, write);
 return write;
}

// A full open pipe waits for libuv readiness, preserving complete ordered bytes.
// Only an explicit cancellation or sink failure can abandon pending output.
export function writeTerminal(text, descriptor = 1, { signal } = {}) {
 signal?.throwIfAborted();
 return terminal(descriptor)(text, signal);
}
