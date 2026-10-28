import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { DocsSection } from '../types.ts';
import type { LinkContext, PathKind } from './links.ts';
import { manifestPath, readManifest } from './manifest.ts';
import type { ManifestPage } from './manifest.ts';
import { renderPage } from './render.ts';
import type { RenderedPage } from './render.ts';
import { startLine, runRequirements } from '../../../../base/run-site';
import { run } from '../../../../site/run';

// The whole docs site from the tree as it is: every page listed in docs/site.json rendered, every link and anchor
// checked across pages, and nothing that names a build machine's paths. The Vite plugin and the tests share this.

export type SitePage = ManifestPage & RenderedPage;
export type Site = { sections: DocsSection[]; pages: SitePage[]; problems: string[]; files: string[] };

/** An absolute path on the build machine (a home or temp directory) must never reach a published page. */
export const absolutePath = /(?<![\w.@~-])\/(?:Users|home|private|tmp|var\/folders|root)\/[^\s"'`\\]*/g;

export const pathKind = (root: string) => (path: string): PathKind => {
  const full = join(root, path);
  if (!existsSync(full)) return null;
  return statSync(full).isDirectory() ? 'directory' : 'file';
};

export function buildSite(root: string): Site {
  const manifest = readManifest(root);
  const published = new Map(manifest.pages.map(page => [page.source, page.href]));
  const kind = pathKind(root);
  const context = (source: string): LinkContext => ({ source, published, kind });
  const files = [join(root, manifestPath)];
  const read = (source: string) => {
    files.push(join(root, source));
    return readFileSync(join(root, source), 'utf8');
  };
  const pages: SitePage[] = manifest.pages.map(page => {
    let markdown = read(page.source);
    if (page.source === 'docs/getting-started.md') {
      const recipe = `\`\`\`bash\n${startLine(run)}\n\`\`\`\n\n${runRequirements} Already have Node 22 or later? \`${run.clone}\` does the same.`;
      markdown = markdown.replace(/<!-- run-recipe -->[\s\S]*?<!-- \/run-recipe -->/, recipe);
    }
    const rendered = renderPage(markdown, context(page.source));
    return { ...page, ...rendered, description: page.description ?? rendered.description };
  });
  const problems: string[] = [];
  const ids = new Map(pages.map(page => [page.source, new Set(page.ids)]));
  for (const page of pages) {
    const report = (problem: string) => problems.push(`${page.source}: ${problem}`);
    page.problems.forEach(report);
    for (const anchor of page.anchors) {
      if (!ids.get(anchor.source)?.has(anchor.id)) report(`#${anchor.id} (no such heading in ${anchor.source})`);
    }
    for (const leak of new Set(page.html.match(absolutePath) ?? [])) report(`${leak} (an absolute machine path would leak into the build)`);
  }
  const sections = manifest.sections.map(section => ({
    title: section.title,
    pages: section.pages.filter(page => !page.hidden).map(({ slug, label, href, source }) => ({ slug, label, href, source })),
  }));
  return { sections, pages, problems, files: [...new Set(files)] };
}
