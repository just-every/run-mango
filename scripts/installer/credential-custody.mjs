import { open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { assertRegular } from '@runeditrun/rer/local/files';

// Retained Mango authority-read behavior: rotating authentication credentials
// must read the exact file inspected for the matching contact database.
export async function readUnchangedFile(path, expected) {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = await handle.stat();
    assertRegular(before);
    if (before.ino !== expected.ino || before.dev !== expected.dev || before.size !== expected.size || before.mtimeMs !== expected.mtimeMs || before.ctimeMs !== expected.ctimeMs) throw new Error('.dev.vars changed during setup; run again.');
    const text = await handle.readFile('utf8');
    const after = await handle.stat();
    if (after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs) throw new Error('.dev.vars changed during setup; run again.');
    return text;
  } finally { await handle.close(); }
}
