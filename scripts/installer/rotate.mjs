import { guard } from './local.mjs'
import { localBindings } from '../../src/core/platform/local-bindings.ts'
import { localContactAuthorityVersion } from '../../src/core/platform/local-contact-authority.ts'
import { randomBytes } from 'node:crypto'
import { linkSync, unlinkSync } from 'node:fs'
import { link, lstat, mkdtemp, open, rename, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { assertRegular, inspect, privateDirectory, privateFile } from '@runeditrun/rer/local/files'
import { readUnchangedFile } from './credential-custody.mjs'
import { localOperation } from '@runeditrun/rer/local/operation'
import { localOptions } from './rotation-options.mjs'
import { buildEnvironment, localVariables, localAddress } from './environment.mjs'
import { contactSaltAssignment, retainedContactHashSalt } from './contact-authority.mjs'
import { runCommand } from './run-command.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
let operation
let logPath
let oldVars
let varsPath
let log
let phase = 'validation'
let pendingWrites = Promise.resolve()
let logError
const cancellation = new AbortController()
const cancel = (signal) => {
  const error = new Error(`Cancelled by ${signal}.`)
  error.signal = signal
  cancellation.abort(error)
}
const onInterrupt = () => cancel('SIGINT')
const onTerminate = () => cancel('SIGTERM')
process.on('SIGINT', onInterrupt)
process.on('SIGTERM', onTerminate)
try {
  cancellation.signal.throwIfAborted()
  await guard({root})
  operation = await localOperation(root)
  varsPath = join(root, '.dev.vars')
  const existing = await inspect(varsPath)
  assertRegular(existing)
  if (!existing) throw new Error('Run setup first. Credential rotation requires the matching .dev.vars and local database.')
  const previous = localBindings(localVariables(await readUnchangedFile(varsPath, existing)))
  const savedOrigin = localAddress(previous)
  const options = await localOptions(process.argv.slice(2), root, { email: previous.INITIAL_OPERATOR_EMAILS, port: savedOrigin.port })
  if (options.email !== previous.INITIAL_OPERATOR_EMAILS.toLowerCase()) throw new Error('Credential rotation keeps the existing owner. Restore the matching settings before proceeding.')
  if (existing && !options.force) throw new Error('.dev.vars already exists. Use --force to replace it with fresh local credentials.')
  const output = join(root, '.wrangler/local-setup')
  await privateDirectory(root, output)
  // Persistence must not escape through a pre-existing symlink either.
  await privateDirectory(root, join(root, '.wrangler/state'))
  const work = await mkdtemp(join(output, 'run-'))
  logPath = join(work, 'commands.log')
  log = await open(logPath, 'wx', 0o600)
  const write = (text) => {
    pendingWrites = pendingWrites.then(() => { if (!logError) return log.writeFile(text) })
      .catch(() => { logError = true })
  }
  // The Vite plugin copies .dev.vars into emitted assets. Hide the old file
  // only for an explicitly authorized --force run, and restore it on failure.
  if (existing) {
    const status = await lstat(varsPath)
    if (status.ino !== existing.ino || status.dev !== existing.dev || status.size !== existing.size || status.mtimeMs !== existing.mtimeMs || status.ctimeMs !== existing.ctimeMs) throw new Error('.dev.vars changed during setup; run again.')
    oldVars = join(work, 'previous.dev.vars')
    await rename(varsPath, oldVars)
  }
  const contactSalt = oldVars
    ? retainedContactHashSalt(previous, options.legacyAuthority)
    : randomBytes(32).toString('hex')
  const contactAssignment = contactSaltAssignment(contactSalt)
  const env = buildEnvironment()
  const command = async (args) => {
    cancellation.signal.throwIfAborted()
    write(`pnpm ${args.join(' ')}\n`)
    await runCommand('pnpm', args, { cwd: root, env, write, signal: cancellation.signal })
    await pendingWrites
    cancellation.signal.throwIfAborted()
    if (logError) throw new Error('Could not write the private command log.')
  }
  phase = 'local configuration'
  await command(['config:local'])
  phase = 'local migrations'
  await command(['exec', 'wrangler', 'd1', 'migrations', 'apply', 'mango-local', '--local', '--persist-to', '.wrangler/state', '--config', 'wrangler.toml'])
  phase = 'credential creation'
  const session = randomBytes(32).toString('hex')
  const setup = randomBytes(32).toString('hex')
  const nextVars = join(work, 'next.dev.vars')
  await privateFile(nextVars, `OWNER_EMAIL=${options.email}\nAUTH_ORIGIN=${options.origin}\nAUTH_LOCAL=true\nMANGO_LOCAL_CONFIG_VERSION=2\nSESSION_SECRET=${session}\nSETUP_TOKEN=${setup}\n${contactAssignment}MANGO_LOCAL_HASH_AUTHORITY=${localContactAuthorityVersion}\nMAIL_PROVIDER=development\n`)
  await log.close()
  log = undefined
  cancellation.signal.throwIfAborted()
  // Commit without an asynchronous gap where cancellation could discard the
  // backup after publishing new credentials. link refuses a concurrent file.
  linkSync(nextVars, varsPath)
  unlinkSync(nextVars)
  if (oldVars) { unlinkSync(oldVars); oldVars = undefined }
  console.log(`Local setup ready. Private command log: ${logPath}\nNext: pnpm dev\nOpen: ${options.origin}/signin`)
} catch (error) {
  if (oldVars) {
    // Never overwrite a file created concurrently while the build ran.
    try {
      await link(oldVars, varsPath)
      await rm(oldVars)
      oldVars = undefined
    } catch { /* Keep the original privately if recovery cannot claim the path. */ }
  }
  console.error(`Local setup failed during ${phase}: ${error.message}${logPath ? `\nPrivate command log: ${logPath}` : ''}${oldVars ? '\nOriginal .dev.vars retained privately beside the log; restore it after resolving the conflicting file.' : ''}`)
  process.exitCode = 1
} finally {
  await pendingWrites
  try { await log?.close() } catch {
    console.error('Could not close the private command log.')
    process.exitCode = 1
  }
  await operation?.release()
  process.removeListener('SIGINT', onInterrupt)
  process.removeListener('SIGTERM', onTerminate)
}
