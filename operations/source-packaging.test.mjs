import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, cp, writeFile, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
function command(cwd, executable, args) {
  return spawnSync(executable, args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 'Packaging test', GIT_AUTHOR_EMAIL: 'packaging@example.test', GIT_COMMITTER_NAME: 'Packaging test', GIT_COMMITTER_EMAIL: 'packaging@example.test' } });
}
function succeeds(result) { assert.equal(result.status, 0, result.stderr); return result.stdout; }

test('real authoring commands freeze source, reject changed bytes/dirty source, and verify subsequent clone', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'mango-source-'));
  const source = join(scratch, 'author');
  try {
    await mkdir(source);
    await cp(join(root, 'scripts/edition-authoring'), join(source, 'scripts/edition-authoring'), { recursive: true });
    await writeFile(join(source, 'input.txt'), 'authoritative test source\n');
    await writeFile(join(source, 'edition.json'), JSON.stringify({ schemaVersion: 1, id: 'tests/source', toolchain: { id: 'runeditrun/edition-authoring', version: '1.1.0' }, parent: null, components: [{ id: 'tests/source', role: 'edition', source: { kind: 'local', paths: ['input.txt'] } }] }));
    const git = (...args) => command(source, 'git', args);
    const run = (...args) => command(source, process.execPath, ['scripts/edition-authoring/cli.mjs', ...args]);
    succeeds(git('init')); succeeds(git('add', '.')); succeeds(run('lock')); succeeds(git('add', 'sources.lock.json')); succeeds(git('commit', '-m', 'Test source'));
    succeeds(run('check'));
    await writeFile(join(source, 'input.txt'), 'changed test source\n');
    assert.notEqual(run('check').status, 0);
    assert.notEqual(run('release', join(scratch, 'dirty')).status, 0);
    await writeFile(join(source, 'input.txt'), 'authoritative test source\n');
    const frozen = join(scratch, 'frozen');
    const receipt = JSON.parse(succeeds(run('release', frozen)));
    assert.equal(receipt.source.commit, succeeds(git('rev-parse', 'HEAD')).trim());
    assert.match(receipt.verification, /source integrity only/);
    const clone = join(scratch, 'clone'); succeeds(command(scratch, 'git', ['clone', frozen, clone]));
    const verify = () => command(clone, process.execPath, ['scripts/edition-authoring/cli.mjs', 'receipt', `${frozen}.release.json`]);
    assert.equal(JSON.parse(succeeds(verify())).ok, true);
    const sidecar = JSON.parse(await readFile(`${frozen}.release.json`, 'utf8'));
    sidecar.source.commit = '0'.repeat(40); await writeFile(`${frozen}.release.json`, JSON.stringify(sidecar));
    assert.notEqual(verify().status, 0);
    assert.notEqual(run('release', frozen).status, 0);
  } finally { await rm(scratch, { recursive: true, force: true }); }
});
