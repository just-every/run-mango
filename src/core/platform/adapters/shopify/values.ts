export type Node = Record<string, unknown>;
export function object(value: unknown, label = 'record'): Node {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Shopify ${label} is missing or malformed.`);
  return value as Node;
}
export function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Shopify ${label} is missing.`);
  return value;
}
export function date(value: unknown, label: string): Date {
  const result = new Date(text(value, label));
  if (!Number.isFinite(result.getTime())) throw new Error(`Shopify ${label} is invalid.`);
  return result;
}
export function integer(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value)) throw new Error(`Shopify ${label} is invalid.`);
  return value as number;
}
export function list(value: unknown, label: string): Node[] {
  if (!Array.isArray(value)) throw new Error(`Shopify ${label} is missing.`);
  return value.map(item => object(item, label));
}
export function gid(kind: string, value: unknown): string {
  const id = typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : text(value, `${kind} ID`);
  if (new RegExp(`^gid://shopify/${kind}/[0-9]+$`).test(id)) return id;
  if (!/^[0-9]+$/.test(id)) throw new Error(`Shopify ${kind} ID is invalid.`);
  return `gid://shopify/${kind}/${id}`;
}
/** JSON numeric IDs must never first pass through IEEE754. Only integer tokens
 * outside quoted strings are rewritten. Quantities remain numbers when safe. */
export function losslessJson(raw: string): unknown {
  const converted = raw.replace(/"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g, token => {
    if (token[0] === '"' || (/^-?\d+$/.test(token) && Number.isSafeInteger(Number(token)))) return token;
    return JSON.stringify(token);
  });
  return JSON.parse(converted);
}
export function connection(value: unknown, label: string) {
  const node = object(value, label), info = object(node.pageInfo, `${label} pagination`);
  if (typeof info.hasNextPage !== 'boolean') throw new Error(`Shopify ${label} pagination is incomplete.`);
  return { nodes: list(node.nodes, label), cursor: info.hasNextPage ? text(info.endCursor, `${label} cursor`) : undefined };
}
export function money(value: unknown): {amount: string; currency: string} {
  const m = object(value, 'money');
  const amount = text(m.amount, 'amount'), currency = text(m.currencyCode, 'currency');
  if (!/^-?\d+(\.\d+)?$/.test(amount) || !/^[A-Z]{3}$/.test(currency)) throw new Error('Shopify money is malformed.');
  return {amount, currency};
}
export function moneyBag(value: unknown) {
  const bag = object(value, 'money bag');
  return {shop: money(bag.shopMoney), presentment: money(bag.presentmentMoney)};
}
