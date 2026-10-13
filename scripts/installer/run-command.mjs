import { spawn } from 'node:child_process'
import { StringDecoder } from 'node:string_decoder'
import { stopOwnedGroup } from '../base-onboarding/process-cleanup.mjs'
import { createRedaction } from '../base-onboarding/redaction.mjs'

export function redact(text, values = []) {
  for (const value of values.filter(Boolean).sort((a, b) => b.length - a.length)) {
    text = text.split(value).join('[redacted]')
  }
  return text
}

// Keep output private and redact whole lines so a chunk boundary cannot expose
// half of a credential. The internal stdout result keeps the decoded bytes for
// machine-readable consumers; it must never be used as a diagnostic. No child
// output is included in a thrown error.
export async function runCommand(command, args, { cwd, env, write, secrets = [], signal, stdout }) {
  signal?.throwIfAborted()
  // A separate process group lets cancellation reach pnpm's build/migration
  // descendants without signalling the caller or unrelated processes.
  const grouped = process.platform !== 'win32'
  const child = spawn(command, args, { cwd, env, detached: grouped, stdio: ['ignore', 'pipe', 'pipe'] })
  const finishOutput = []
  const redaction = createRedaction({mask: '[redacted]'})
  redaction.addSecrets(secrets)
  for (const stream of [child.stdout, child.stderr]) {
    const filter = redaction.stream(text => write(text))
    const emit = text => {
      if (stream === child.stdout) stdout?.(text)
      filter.write(text)
    }
    const decoder = new StringDecoder('utf8')
    let pending = ''
    stream.on('data', (chunk) => {
      pending += decoder.write(chunk)
      const boundary = pending.lastIndexOf('\n')
      if (boundary >= 0) {
        emit(pending.slice(0, boundary + 1))
        pending = pending.slice(boundary + 1)
      }
    })
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      emit(pending + decoder.end())
      filter.end()
    }
    stream.on('end', finish)
    finishOutput.push(finish)
  }
  let startError
  let stopping
  let stopError
  let aborted
  const cancellation = new Promise((resolve) => { aborted = resolve })
  const closed = new Promise((resolve) => {
    child.on('error', () => { startError = new Error(`Could not start ${command}.`) })
    child.on('close', resolve)
  })
  const stop = () => {
    if (stopping || !child.pid) return
    const name = signal.reason?.signal === 'SIGINT' ? 'SIGINT' : 'SIGTERM'
    stopping = (grouped ? stopOwnedGroup(child, name) : new Promise((done) => {
      // Windows retains direct-child cancellation; POSIX tree handling is not
      // used on platforms without detached process groups.
      child.kill(name)
      setTimeout(() => { child.kill('SIGKILL'); done() }, 1000)
    })).catch((error) => { stopError = error })
    aborted()
  }
  signal?.addEventListener('abort', stop, { once: true })
  try {
    await Promise.race([closed, cancellation])
    await stopping
    let code
    if (!stopError && stopping) {
      let timer
      try {
        code = await Promise.race([closed, new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Command output did not close after cancellation.')), 1000)
        })])
      } catch (error) { stopError = error } finally { clearTimeout(timer) }
    } else if (!stopError) code = await closed
    if (stopError) {
      // Cleanup has a finite deadline even when a process cannot be reaped or
      // inspected. Report that failure together with the original cancellation.
      child.unref()
      for (const finish of finishOutput) finish()
      child.stdout.destroy()
      child.stderr.destroy()
      throw new Error(`${signal.reason?.message ?? 'Cancelled.'} ${stopError.message}`, { cause: signal.reason })
    }
    if (signal?.aborted) throw signal.reason
    if (startError) throw startError
    if (code !== 0) throw new Error(`${command} failed (exit ${code ?? 'signal'}).`)
  } finally {
    signal?.removeEventListener('abort', stop)
  }
}
