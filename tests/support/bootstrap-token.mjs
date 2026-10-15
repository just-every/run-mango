import { randomBytes } from 'node:crypto';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';

const localTokenPath = './.seed/local-bootstrap-token';
const tokenPattern = /^[a-f0-9]{64}$/;

async function readToken() {
  const token = (await readFile(localTokenPath, 'utf8')).trim();
  if (!tokenPattern.test(token)) {
    throw new Error(`${localTokenPath} must contain one 256-bit hexadecimal token.`);
  }
  await chmod(localTokenPath, 0o600);
  return token;
}

export async function ensureLocalBootstrapToken() {
  try {
    return await readToken();
  } catch (error) {
    if (error && error.code !== 'ENOENT') throw error;
  }

  await mkdir('.seed', { recursive: true, mode: 0o700 });
  const token = randomBytes(32).toString('hex');
  try {
    await writeFile(localTokenPath, `${token}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    return token;
  } catch (error) {
    if (error && error.code !== 'EEXIST') throw error;
    return readToken();
  }
}
