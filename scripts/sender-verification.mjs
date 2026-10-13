import { createRequire } from 'node:module';
import { remoteD1 } from './remote-d1.mjs';
import { senderVerificationBindings, SenderVerificationInputError } from './sender-verification-config.mjs';
import { resolve } from 'node:path';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

let directory;
try {
  const [action, challengeId, ...extra] = process.argv.slice(2);
  if (!['prepare', 'send', 'observe', 'inspect'].includes(action) || extra.length) {
    throw new SenderVerificationInputError('Usage: sender-verification.mjs prepare|send|observe|inspect [challenge-id]');
  }
  if (['send', 'observe'].includes(action) && !challengeId) throw new SenderVerificationInputError('A prepared challenge ID is required.');
  const { bindings, databaseId } = await senderVerificationBindings();
  const require = createRequire(import.meta.url);
  const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
  directory = await mkdtemp(resolve(tmpdir(), 'mango-sender-check-'));
  const bundle = await build({ entryPoints: [resolve('scripts/sender-verification-entry.ts')], bundle: true, write: false,
    format: 'esm', platform: 'node', alias: { '@': resolve('src') }, logLevel: 'silent' });
  const path = resolve(directory, 'runner.mjs');
  await writeFile(path, bundle.outputFiles[0].text, { flag: 'wx', mode: 0o600 });
  const { senderVerificationCommand, senderVerificationInputError } = await import(pathToFileURL(path));
  const inputError = senderVerificationInputError(bindings);
  if (inputError) throw new SenderVerificationInputError(inputError);
  const DB = remoteD1({ accountId: bindings.CLOUDFLARE_ACCOUNT_ID, token: bindings.CLOUDFLARE_API_TOKEN, databaseId });
  console.log(JSON.stringify(await senderVerificationCommand({ ...bindings, DB }, action, challengeId)));
} catch (error) {
  console.error(error instanceof SenderVerificationInputError ? error.message
    : 'Sender verification command failed. Inspect configured provider/DNS/receiver availability without exposing credential values.');
  process.exitCode = 1;
} finally {
  if (directory) await rm(directory, { recursive: true, force: true });
}
