/** What an import step was doing when the import kit refused it. */
export type ImportAction = 'start' | 'resume' | 'undo' | 'continue' | 'abandon';

const changed: Record<ImportAction, string> = {
  start: 'A contact in this import changed in Mango since Preview, so nothing was changed. Preview the file again.',
  resume: 'A contact in this import changed in Mango since Preview, so this step wrote nothing.',
  continue: 'A contact in this import changed in Mango since Preview, so this step wrote nothing.',
  undo: 'A contact in this import changed in Mango after the import, so it was kept and nothing was undone: this import cannot be undone as a whole.',
  abandon: 'A contact this import wrote changed in Mango during this step, so it rolled nothing back. Continue abandoning: that contact will be kept as it is now.',
};
const sentences: Record<string, (action: ImportAction, message: string) => string> = {
  NATIVE_EDIT_CONFLICT: action => changed[action],
  TARGET_REVISION_CONFLICT: action => changed[action],
  IMPORT_ATOMIC_GUARD: action => changed[action],
  IMPORT_SUPERSEDED: () => 'A later import changed the same contacts, so this one cannot be undone before it. Undo the later import first.',
  UNDO_REQUIRES_COMPLETED_IMPORT: () => 'This import has not finished, so it cannot be undone yet. Resume it first.',
  ABANDON_REQUIRES_UNFINISHED_IMPORT: () => 'This import has finished, so there is nothing to abandon. Use Undo import to reverse it.',
  IMPORT_NOT_ABANDONABLE: () => 'This import is already being reversed, so it cannot be abandoned. Continue that step instead.',
  CONTACT_ERASURE_PENDING: () => 'A contact deletion is still in progress, so nothing was changed. Try again when it has finished.',
};
const fallbacks: Record<ImportAction, string> = {
  start: 'The import could not be started, so nothing was changed. Preview the file again.',
  resume: 'The import could not be resumed. Review its status before trying again.',
  continue: 'The archive step could not be completed. Continue it again from Archive imports.',
  undo: 'The import could not be undone. Review its status before trying again.',
  abandon: 'The import could not be abandoned. Review its status before trying again.',
};

/** The kit's code becomes a sentence for this action; the code stays in its own field for
 * diagnosis. A database error never reaches the page as text; Mango's own sentences do. */
export function importConflict(error: unknown, action: ImportAction) {
  const message = error instanceof Error ? error.message : '';
  const known = Object.keys(sentences).find(code => new RegExp(`\\b${code}\\b`).test(message));
  if (known) return { code: known, detail: sentences[known](action, message) };
  const raw = /^([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)(?::|$)/.exec(message)?.[1] ?? (/D1_|SQLITE/.test(message) ? 'D1_ERROR' : undefined);
  return raw ? { code: raw, detail: fallbacks[action] } : { detail: message || fallbacks[action] };
}
