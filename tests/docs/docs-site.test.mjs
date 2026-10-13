import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contract } from '../contract.js';

// DOCS-001. The /docs pages are built from the repository Markdown that docs/site.json lists
// (src/core/features/docs/build). The tree checks import the same build modules the Vite plugin runs and need no build;
// the artifact check reads the output of `pnpm build` and fails, loudly, when there is none.
const root = fileURLToPath(new URL('../..', import.meta.url));
const { readManifest } = await import('../../src/core/features/docs/build/manifest.ts');
const { buildSite } = await import('../../src/core/features/docs/build/site.ts');

const manifest = readManifest(root);
const site = buildSite(root);
const contractIds = [...new Set(['CONTRACT.md', 'BASELINE.md'].flatMap(file => {
  const ids = [...readFileSync(join(root, file), 'utf8').matchAll(/^- \*\*([A-Z]+(?:-[A-Z]+)*-\d+)\b/gm)].map(match => match[1]);
  assert.ok(ids.length, `${file} declares contract clauses`);
  return ids;
}))];
const contractClause = new RegExp(`\\b(?:${contractIds.join('|')})\\b`);

contract('DOCS-001', 'every Markdown file in scope is published or listed as not published with a reason', () => {
  const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '*.md'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
  const inScope = tracked.filter(file => /^([^/]+\.md|docs\/.+\.md|[^./][^/]*\/README\.md)$/.test(file));
  const listed = new Set([...manifest.pages, ...manifest.githubOnly].map(entry => entry.source));
  assert.deepEqual(inScope.filter(file => !listed.has(file)), [], 'add each of these to docs/site.json, published or with a reason');
  for (const entry of manifest.githubOnly) assert.ok(entry.reason.length > 10, `${entry.source} says why it is not published`);
  assert.equal(manifest.pages[0].slug, '', 'the first page is the docs home');
});

contract('DOCS-001', 'the repository docs render with no problems, one title each, and no maintainer material', () => {
  assert.deepEqual(site.problems, []);
  assert.equal(site.pages.length, manifest.pages.length);
  for (const page of site.pages) {
    assert.ok(page.title && page.html.length > 100, `${page.source} renders`);
    assert.ok(!/<h1[\s>]/.test(page.html), `${page.source}: the title is the page's only h1, outside the body`);
    assert.ok(!contractClause.test(page.html) && !/source:(?:lock|check)/.test(page.html), `${page.source} names no contract clause or maintainer command`);
    assert.ok(page.description.length > 20, `${page.source} has a description`);
  }
});

contract('DOCS-001', 'a broken link or anchor, an unpublished target or a bad image fails the build naming file and link', async () => {
  const fixture = await realpath(await mkdtemp(join(tmpdir(), 'mango-docs-fixture-')));
  try {
    await mkdir(join(fixture, 'docs/media'), { recursive: true });
    await writeFile(join(fixture, 'private.md'), '# Private\n');
    const write = (name, body) => writeFile(join(fixture, name), body);
    const manifestOf = pages => writeFile(join(fixture, 'docs/site.json'), JSON.stringify({
      sections: [{ title: 'S', pages: pages.map(([slug, source]) => ({ slug, source, label: source })) }],
      githubOnly: [{ source: 'private.md', reason: 'Kept in the repository only' }],
    }));
    await manifestOf([['', 'docs/home.md'], ['other', 'docs/other.md']]);
    await write('docs/other.md', '# Other\n\n## Part\n\nSome words that make a paragraph long enough to describe.\n');
    const build = async body => { await write('docs/home.md', `# Home\n\n${body}\n`); return buildSite(fixture).problems.join('\n'); };
    assert.equal(await build('[ok](./other.md#part) and [outside](https://example.com)'), '');
    assert.match(await build('[gone](./missing.md)'), /docs\/home\.md: \.\/missing\.md/);
    assert.match(await build('[no heading](./other.md#nowhere)'), /docs\/home\.md: #nowhere/);
    assert.match(await build('[private](../private.md)'), /docs\/home\.md: \.\.\/private\.md/);
    assert.match(await build('[script](javascript:alert(1))'), /javascript:alert/);
    assert.match(await build('![no alt](./media/x.png)'), /docs\/home\.md: \.\/media\/x\.png/);
    await build('<div onclick="x()">raw</div>');
    assert.match(buildSite(fixture).pages[0].html, /&lt;div/, 'raw HTML renders as text');
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

contract('DOCS-001', 'the built Worker and client contain each docs page as its own chunk and no Markdown or highlighting library', () => {
  const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : entry.name.endsWith('.js') ? [join(directory, entry.name)] : []);
  for (const side of ['dist/server', 'dist/client']) {
    assert.ok(existsSync(join(root, side)), `${side} is missing: run pnpm build before pnpm test:docs`);
  }
  const bundles = ['dist/server', 'dist/client'].map(side => walk(join(root, side)).map(file => [file, readFileSync(file, 'utf8')]));
  const banned = /registerLanguage|micromark|mdast-util|remark-parse|remark-gfm|react-markdown|unified\(|hast-util|highlight\.js/;
  for (const files of bundles) {
    assert.deepEqual(files.filter(([, code]) => banned.test(code)).map(([file]) => file), [], 'no Markdown or highlighting code is bundled');
    for (const page of site.pages) {
      const holders = files.filter(([, code]) => code.includes(page.description));
      assert.equal(holders.length, 1, `${page.source} is in exactly one chunk`);
      for (const other of site.pages.filter(candidate => candidate !== page)) assert.ok(!holders[0][1].includes(other.description), `${page.source}'s chunk holds only that page`);
    }
  }
});
