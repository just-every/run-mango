import type { ImportPreview } from './audience-import-types';
import { resolveHeaderMapping } from '../import-mapping';

/** Resolve server field suggestions to the spelling in this particular CSV. */
export function resolveImportMappings(columns: ImportPreview['columns']) {
  return Object.fromEntries(columns.map((column) => [column.name,
    resolveHeaderMapping(column.headers, column.mapping),
  ]));
}
