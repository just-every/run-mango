import type { ImportSummary } from './import-summary';

/** One import as the editor received it: the compiled body and the saved body at that moment. */
export type ImportedDesign = { summary: ImportSummary; body: string; savedBefore: string };
/** Where an import stands against the editor and the saved revision (DESIGN-004):
 * `unsaved` and `saved` hold the imported body as compiled; `edited` and `edited-saved` hold the operator's
 * later edits of it; `discarded` means the editor is back to the body saved before the import. */
export type ImportState = 'unsaved' | 'saved' | 'edited' | 'edited-saved' | 'discarded';

export function importState(imported: Pick<ImportedDesign, 'body' | 'savedBefore'>, body: string, saved: string): ImportState {
  if (body === saved && saved === imported.savedBefore && body !== imported.body) return 'discarded';
  const isSaved = body === saved;
  if (body === imported.body) return isSaved ? 'saved' : 'unsaved';
  return isSaved ? 'edited-saved' : 'edited';
}
