import { createHash } from 'node:crypto';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const checkout = fileURLToPath(new URL('../..', import.meta.url));
// Set this once in the verification environment so nested copies retain the
// same external evidence root. It is test-only, never product configuration.
process.env.MANGO_TEST_WORK_DIR ??= resolve(checkout, '..');

export function artifactPaths(suite, { workDir = process.env.MANGO_TEST_WORK_DIR, checkoutDir = checkout } = {}) {
  if (!workDir || !isAbsolute(workDir)) throw new Error('MANGO_TEST_WORK_DIR must be an absolute external directory.');
  if (!/^[a-z0-9-]+$/.test(suite)) throw new Error('Invalid test artifact suite.');
  const root = resolve(workDir), source = resolve(checkoutDir);
  const inside = relative(source, root);
  if (!inside || (!inside.startsWith(`..${sep}`) && inside !== '..' && !isAbsolute(inside))) {
    throw new Error('Test artifacts must be outside the source checkout.');
  }
  const identity = createHash('sha256').update(source).digest('hex').slice(0, 12);
  return { evidence: join(root, 'evidence', identity, suite), scratch: join(root, 'tmp', 'mango-tests', identity, suite) };
}

export function evidenceDirectory(suite, requested) {
  const defaultDirectory = artifactPaths(suite).evidence;
  if (!requested) return defaultDirectory;
  const root = resolve(process.env.MANGO_TEST_WORK_DIR, 'evidence');
  const destination = resolve(requested), path = relative(root, destination);
  if (path === '..' || path.startsWith(`..${sep}`) || isAbsolute(path)) {
    throw new Error('Capture directory must remain inside the configured evidence directory.');
  }
  return destination;
}

export const scratchDirectory = suite => artifactPaths(suite).scratch;
