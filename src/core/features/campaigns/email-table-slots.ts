import type { EmailElement, EmailNode } from './email-html-parse';

/** Whether two cells of one table cover the same slot, as the HTML table processing model forms the table: a
 * cell spanning rows from an earlier row and a cell spanning columns in a later row can claim the same place.
 * Browsers then draw both cells there, and the one drawn later paints its background over the other's text
 * (MSG-012). Row spans end with their row group. */
export function overlappingCells(table: EmailElement) {
  const elements = (nodes: EmailNode[], tags: string[]) => nodes.filter((node): node is EmailElement => node.kind === 'element' && tags.includes(node.tag));
  const groups = elements(table.children, ['thead', 'tbody', 'tfoot']).map(group => elements(group.children, ['tr']));
  const loose = elements(table.children, ['tr']);
  if (loose.length) groups.push(loose);
  for (const rows of groups) {
    // The last row of the group each column is claimed through.
    const claimed: number[] = [];
    for (const [y, row] of rows.entries()) {
      let x = 0;
      for (const cell of elements(row.children, ['td', 'th'])) {
        while ((claimed[x] ?? -1) >= y) x++;
        // Out-of-grammar spans are refused elsewhere; here they are read within HTML's own limit, so the work stays bounded.
        const span = (name: string) => Math.min(1000, Math.max(1, Math.floor(Number(cell.attributes.get(name) ?? 1)) || 1));
        const columns = span('colspan'), through = Math.min(rows.length - 1, y + span('rowspan') - 1);
        for (let column = x; column < x + columns; column++) {
          if ((claimed[column] ?? -1) >= y) return true;
          claimed[column] = through;
        }
        x += columns;
      }
    }
  }
  return false;
}
