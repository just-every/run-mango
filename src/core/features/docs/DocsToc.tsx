import { Paper } from '../site/paper/Paper';
import { docsCopy } from './copy';
import type { DocsTocEntry } from './types';

type Group = DocsTocEntry & { children: DocsTocEntry[] };

/** h3 entries nest under the h2 before them. Pages without an h2 get no contents list. */
function groups(toc: DocsTocEntry[]) {
  if (!toc.some(entry => entry.depth === 2)) return [];
  return toc.reduce<Group[]>((list, entry) => {
    if (entry.depth === 3 && list.length) list[list.length - 1].children.push(entry);
    else list.push({ ...entry, children: [] });
    return list;
  }, []);
}

function TocList({ toc }: { toc: DocsTocEntry[] }) {
  return <ul>
    {groups(toc).map(group => <li key={group.id}>
      <a href={`#${group.id}`}>{group.text}</a>
      {group.children.length > 0 && <ul>{group.children.map(entry => <li key={entry.id}><a href={`#${entry.id}`}>{entry.text}</a></li>)}</ul>}
    </li>)}
  </ul>;
}

/** The contents rail beside the page, from 1200px: a full-height column, like the sidebar, whose list stays in view while the page scrolls. */
export function DocsToc({ toc }: { toc: DocsTocEntry[] }) {
  if (!groups(toc).length) return null;
  return <div className="docs-toc-rail">
    <nav className="docs-toc" aria-label={docsCopy.onThisPage}>
      <p className="docs-toc-title">{docsCopy.onThisPage}</p>
      <TocList toc={toc} />
    </nav>
  </div>;
}

/** The same list above the page body below 1200px, folded away on a paper card until asked for. */
export function DocsTocCompact({ toc }: { toc: DocsTocEntry[] }) {
  if (!groups(toc).length) return null;
  return <details className="docs-toc-compact">
    <summary>{docsCopy.onThisPage}</summary>
    <Paper w={360} h={300} seed={23} className="docs-toc-compact-list"><TocList toc={toc} /></Paper>
  </details>;
}
