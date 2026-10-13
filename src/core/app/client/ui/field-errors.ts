export type FieldErrors = Record<string, string>;
/** Accept only explicit, allow-listed field keys; never guess fields from prose. */
export function mapFieldErrors(value: unknown, fields: readonly string[]): FieldErrors {
  if (!value || typeof value !== 'object') return {};
  const source = value as Record<string, unknown>, result: FieldErrors = {};
  for (const field of fields) {
    const message = source[field];
    if (typeof message === 'string' && message.trim()) result[field] = message;
    else if (Array.isArray(message)) {const text = message.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).join(' '); if (text) result[field] = text;}
  }
  return result;
}
export const emailError = (value: string) => !value.trim() ? 'Enter an email address.' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? undefined : 'Enter a valid email address.';
/** Zod's response tree carries field names and array indexes separately from prose. */
export function mapIssueTree(value: unknown, allowedRoots: readonly string[]): FieldErrors {
  const result: FieldErrors = {};
  const visit = (node: unknown, path: string[]) => {
    if (!node || typeof node !== 'object') return;
    const tree = node as {errors?:unknown;properties?:Record<string,unknown>;items?:unknown[]};
    if (path.length && allowedRoots.includes(path[0]) && Array.isArray(tree.errors)) {
      const message = tree.errors.filter((entry): entry is string => typeof entry === 'string' && Boolean(entry.trim())).join(' ');
      if (message) result[path.join('.')] = message;
    }
    for (const [name, child] of Object.entries(tree.properties ?? {})) visit(child, [...path,name]);
    tree.items?.forEach((child,index) => visit(child,[...path,String(index)]));
  };
  visit(value,[]); return result;
}
