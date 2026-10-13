import { mapFieldErrors, mapIssueTree, type FieldErrors } from '@/core/app/client/ui/field-errors';
import type { DraftComposition } from './draft-composition';

/** Schema wall-clock names target the same controls as their resolved instant fields. */
export function compositionFieldErrors(fields: unknown, issues: unknown, draft: DraftComposition): FieldErrors {
  const allowed = [...Object.keys(draft), ...draft.steps.flatMap((_step, index) =>
    ['timezone', 'scheduledAt', 'sendByAt', 'localScheduledAt', 'localSendByAt', 'whyThisTime'].map(field => `steps.${index}.${field}`)),
    ...draft.links.flatMap((_link, index) => ['label', 'destinationUrl'].map(field => `links.${index}.${field}`))];
  const errors = {...mapFieldErrors(fields, allowed), ...mapIssueTree(issues, Object.keys(draft))};
  const mapped: FieldErrors = {};
  for (const [path, message] of Object.entries(errors)) {
    const field = path.replace(/^(steps\.\d+\.)localScheduledAt$/, '$1scheduledAt').replace(/^(steps\.\d+\.)localSendByAt$/, '$1sendByAt');
    mapped[field] = mapped[field] ? `${mapped[field]} ${message}` : message;
  }
  return mapped;
}
