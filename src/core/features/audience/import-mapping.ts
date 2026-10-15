import { defaultMapping } from './import-types';

function headerKey(value: string) {
  return value.trim().toLowerCase().replace(/[_\s]+/g, '');
}

/** Resolve aliases to the original header spelling; explicit choices, including
 * Do not map, take precedence. Record creation dates are never consent aliases. */
export function resolveHeaderMapping(headers: string[], selected: Record<string, string> = {}) {
  return Object.fromEntries([...new Set([...Object.keys(defaultMapping), ...Object.keys(selected)])].map(field => {
    const candidates = Object.hasOwn(selected, field) ? [selected[field]] : defaultMapping[field];
    const header = candidates.map(alias => alias && headers.find(value => headerKey(value) === headerKey(alias))).find(Boolean);
    return [field, header || ''];
  }));
}

export function isStatusHeader(header: string) {
  // Keep the historical subscription-status restriction, but never suggest an
  // ambiguous (possibly SMS) column as the email marketing field.
  return [...defaultMapping.status, 'subscription status'].some(alias => headerKey(alias) === headerKey(header));
}

export function isSmsStatusHeader(header: string) {
  return defaultMapping.sms_status.some(alias => headerKey(alias) === headerKey(header));
}
