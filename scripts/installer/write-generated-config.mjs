import { lstat, readFile, writeFile } from 'node:fs/promises';

// Re-running a generator with identical inputs must not touch its output.
export async function writeGeneratedConfig(path, text) {
  try {
    const current = await lstat(path);
    if (!current.isFile() || current.nlink !== 1) throw new Error(`Refusing linked or non-file generated configuration: ${path}`);
    if (await readFile(path, 'utf8') === text) return;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await writeFile(path, text);
}
