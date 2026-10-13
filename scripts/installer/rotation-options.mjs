import { parseAddress } from '../../src/vendor/base/mail/src/core/validation.mjs'

export async function localOptions(args, root, defaults = {}) {
  const options = { port: defaults.port || '15660', email: defaults.email, force: false }
  for (let i = 0; i < args.length; i++) {
    const flag = args[i]
    if (flag === '--') continue // pnpm accepts package forwarding -- --port …
    if (['--legacy-session-authority', '--legacy-contact-authority'].includes(flag)) {
      if (options.legacyAuthority) throw new Error('Select exactly one verified legacy contact authority.')
      options.legacyAuthority = flag === '--legacy-session-authority' ? 'session' : 'contact'; continue
    }
    if (flag === '--force') { options.force = true; continue }
    if (!['--owner-email', '--port'].includes(flag) || !args[i + 1] || args[i + 1].startsWith('--')) {
      throw new Error('Use pnpm run auth:rotate -- --force [--owner-email EMAIL] [--port PORT] [--legacy-session-authority | --legacy-contact-authority].')
    }
    options[flag === '--port' ? 'port' : 'email'] = args[++i]
  }
  if (options.legacyAuthority && !options.force) throw new Error('Legacy authority conversion requires --force and a verified legacy backup; see OPERATIONS.md.')
  if (!options.email) throw new Error('Restore the saved owner settings or provide --owner-email EMAIL for credential rotation.')
  try {
    // Use the delivery validator, with a narrower dotenv-safe plain mailbox.
    const address = parseAddress(options.email)
    if (address.name || address.email !== options.email ||
        !/^[a-zA-Z0-9.!+_%\-]+@[a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)+$/.test(options.email)) {
      throw new Error('Invalid plain mailbox')
    }
  } catch {
    throw new Error('Invalid --owner-email; provide a plain email address.')
  }
  if (!/^\d+$/.test(options.port) || Number(options.port) < 1 || Number(options.port) > 65535) {
    throw new Error('Invalid --port; use an integer from 1 to 65535.')
  }
  options.email = options.email.toLowerCase()
  options.port = String(Number(options.port))
  options.origin = new URL(`http://127.0.0.1:${options.port}`).origin
  return options
}
