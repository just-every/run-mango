import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, lstat, readlink, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

const hash = (bytes, algorithm = 'sha256') => createHash(algorithm).update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, {encoding: 'utf8'}).trim();
function child(root, name) {
  const result = resolve(root, name);
  if (!name || isAbsolute(name) || relative(root, result).startsWith(`..${sep}`) || result === root) throw new Error(`Unsafe package path: ${name}`);
  return result;
}
async function bytesAt(root, file) {
  const path = child(root, file.path);
  const stat = await lstat(path);
  if (file.mode === '120000') {
    if (!stat.isSymbolicLink()) throw new Error(`Expected source symlink: ${file.path}`);
    return Buffer.from(await readlink(path));
  }
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Expected source file: ${file.path}`);
  if ((file.mode === '100755') !== Boolean(stat.mode & 0o111)) throw new Error(`Source executable mode changed: ${file.path}`);
  return readFile(path);
}
async function verify(root) {
  const receipt = JSON.parse(await readFile(resolve(root, 'source-receipt.json'), 'utf8'));
  if (receipt.schema !== 'mango-local-source-v1') throw new Error('Unsupported source receipt.');
  const archive = await readFile(resolve(root, 'source.tar'));
  if (hash(archive) !== receipt.archive.sha256) throw new Error('Source archive digest changed.');
  for (const file of receipt.files) {
    if (hash(await bytesAt(resolve(root, 'source'), file)) !== file.sha256) throw new Error(`Source digest changed: ${file.path}`);
  }
  console.log(JSON.stringify({sourceCommit: receipt.source.commit, files: receipt.files.length, verification: 'archive and tracked source bytes/modes match receipt; generated state and dependency cache are separate'}));
}

const [argument, destination] = process.argv.slice(2);
if (argument === '--verify') {
  if (!destination) throw new Error('Usage: node scripts/package-local-source.mjs --verify <package-directory>');
  await verify(resolve(destination));
} else {
  if (!argument || destination) throw new Error('Usage: node scripts/package-local-source.mjs <new-package-directory>');
  const checkout = await realpath(git('rev-parse', '--show-toplevel'));
  const output = resolve(argument);
  if (!relative(checkout, output).startsWith(`..${sep}`)) throw new Error('Package must live outside its author checkout.');
  if (git('status', '--porcelain')) throw new Error('Commit or preserve checkout changes before freezing source.');
  const commit = git('rev-parse', 'HEAD');
  const tree = git('rev-parse', 'HEAD^{tree}');
  const objectFormat = git('rev-parse', '--show-object-format');
  await mkdir(dirname(output), {recursive: true});
  await mkdir(output); // Deliberately refuses an existing package directory.
  const source = resolve(output, 'source');
  await mkdir(source);
  const archive = resolve(output, 'source.tar');
  execFileSync('git', ['archive', '--format=tar', '--output', archive, commit]);
  execFileSync('tar', ['-xf', archive, '-C', source]);
  const entries = execFileSync('git', ['ls-tree', '-rz', '--full-tree', commit], {encoding: 'utf8'}).split('\0').filter(Boolean);
  const files = [];
  for (const entry of entries) {
    const [header, path] = entry.split('\t');
    const [mode, type, blob] = header.split(' ');
    if (type !== 'blob') throw new Error(`Unsupported nested source object: ${path}`);
    const bytes = await bytesAt(source, {path, mode});
    const actualBlob = hash(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]), objectFormat);
    if (actualBlob !== blob) throw new Error(`Archive bytes differ from Git source: ${path}`);
    files.push({path, mode, gitBlob: blob, bytes: bytes.length, sha256: hash(bytes)});
  }
  const receipt = {
    schema: 'mango-local-source-v1', createdAt: new Date().toISOString(),
    source: {commit, tree, objectFormat, repository: git('remote', 'get-url', 'origin')},
    archive: {file: 'source.tar', sha256: hash(await readFile(archive))},
    packageLock: {file: 'pnpm-lock.yaml', sha256: hash(await readFile(resolve(source, 'pnpm-lock.yaml')))},
    licence: 'LICENSE retained verbatim', guide: 'Author AGENTS.md retained verbatim; no consumer-guide substitution or release claim',
    tool: {path: 'scripts/package-local-source.mjs', sha256: hash(await readFile(resolve(source, 'scripts/package-local-source.mjs'))), node: process.version},
    boundaries: ['All tracked product inputs, migrations, tests and recorded evidence included', 'No Git directory, ignored credentials, local data, dependencies or generated build output included', 'Source integrity only; install, startup, runtime acceptance and hosted release require separate evidence'], files,
  };
  await writeFile(resolve(output, 'source-receipt.json'), JSON.stringify(receipt, null, 2) + '\n', {flag: 'wx'});
  await verify(output);
}
