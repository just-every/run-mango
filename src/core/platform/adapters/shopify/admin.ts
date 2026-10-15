import {connection, object, text, type Node} from './values';
import {querySpecs, pageInfo, lineFields, refundLineFields, levelFields, returnFields, returnLineFields, transactionFields, type AdminSource} from './queries';

export function createShopifyAdmin(options: {storeUrl: URL; accessToken: string}) {
  const endpoint = new URL('/admin/api/2026-07/graphql.json', options.storeUrl);
  async function query(document: string, variables: Record<string, unknown> = {}, progress?:()=>Promise<void>) {
    await progress?.();
    const response = await fetch(endpoint, {method: 'POST', signal: AbortSignal.timeout(15000), headers: {'Content-Type': 'application/json', 'X-Shopify-Access-Token': options.accessToken}, body: JSON.stringify({query: document, variables})});
    if (!response.ok) throw new Error(`Shopify Admin request failed (${response.status}). Check scopes and protected customer access.`);
    const root = object(await response.json(), 'GraphQL response');
    await progress?.();
    if (root.errors !== undefined && (!Array.isArray(root.errors) || root.errors.length)) throw new Error('Shopify GraphQL returned errors; the source is incomplete. Check scopes and schema.');
    return object(root.data, 'GraphQL data');
  }
  async function nested(node: Node, kind: string, field: string, fields: string, progress?:()=>Promise<void>) {
    let page = connection(node[field], field); const nodes = [...page.nodes], seen = new Set<string>();
    while (page.cursor) {
      if (seen.has(page.cursor)) throw new Error(`Shopify ${field} repeated a cursor.`);
      seen.add(page.cursor);
      const data = await query(`query MangoNested($id: ID!, $cursor: String!) { node(id: $id) { ... on ${kind} { ${field}(first: 10, after: $cursor) { nodes { ${fields} } ${pageInfo} } } } }`, {id: text(node.id, 'nested parent ID'), cursor: page.cursor},progress);
      page = connection(object(data.node, 'nested node')[field], field); nodes.push(...page.nodes);
    }
    node[field] = nodes;
  }
  async function hydrate(type: AdminSource, node: Node, progress?:()=>Promise<void>) {
    if (type === 'inventory') await nested(node, 'InventoryItem', 'inventoryLevels', levelFields,progress);
    if (type === 'order' || type === 'refund') {
      await nested(node, 'Order', 'lineItems', lineFields,progress);
      await nested(node, 'Order', 'returns', returnFields,progress);
      for (const item of node.returns as Node[]) await nested(item,'Return','returnLineItems',returnLineFields,progress);
      if (!Array.isArray(node.refunds)) throw new Error('Shopify order refunds are missing.');
      for (const item of node.refunds) {
        await nested(object(item), 'Refund', 'refundLineItems', refundLineFields,progress);
        await nested(object(item), 'Refund', 'transactions', transactionFields,progress);
      }
    }
    return node;
  }
  return {
    query,
    async page(type: AdminSource, cursor?: string, progress?:()=>Promise<void>) {
      const spec = querySpecs[type];
      // Bound requested cost for nested orders and inventory; all child cursors still drain.
      const size = type === 'order' || type === 'refund' ? 1 : type === 'inventory' ? 10 : 50;
      const data = await query(`query MangoSource($cursor: String) { ${spec.connection}(first: ${size}, after: $cursor) { nodes { ${spec.fields} } ${pageInfo} } }`, {cursor: cursor ?? null},progress);
      const page = connection(data[spec.connection], spec.connection);
      const nodes: Node[] = [];
      for (const node of page.nodes) nodes.push(await hydrate(type, node,progress));
      return {nodes, nextCursor: page.cursor};
    },
    async node(type: AdminSource, id: string) {
      const spec = querySpecs[type];
      const data = await query(`query MangoNode($id: ID!) { node(id: $id) { ... on ${spec.kind} { ${spec.fields} } } }`, {id});
      return hydrate(type, object(data.node, 'requested node (possibly deleted or inaccessible)'));
    },
  };
}
