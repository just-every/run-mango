import type { CommerceStore, SourceRecordInput, VerifiedCommerceWebhook } from '@/core/shared/platform';

import { hmacSha256Base64, timingSafeEqual } from '@/core/platform/crypto';

import { asRecord, responseJson, stringValue } from './http';

const supportedTypes = ['customer', 'product', 'variant', 'inventory', 'order', 'refund'] as const;
type SupportedSourceType = (typeof supportedTypes)[number];

type ShopifyNode = Record<string, unknown>;

function adminEndpoint(storeUrl: URL): string {
  const url = new URL(storeUrl);
  url.pathname = '/admin/api/2026-07/graphql.json';
  url.search = '';
  return url.toString();
}

function sourceTypeForTopic(topic: string): SupportedSourceType {
  if (topic.startsWith('customers/')) return 'customer';
  if (topic.startsWith('products/')) return 'product';
  if (topic.startsWith('inventory_levels/')) return 'inventory';
  if (topic.startsWith('orders/')) return 'order';
  if (topic.startsWith('refunds/')) return 'refund';
  throw new Error(`Shopify webhook topic ${topic} is not a declared Mango source type.`);
}

function occurredAt(node: ShopifyNode): Date {
  const raw = node.updatedAt ?? node.updated_at ?? node.createdAt ?? node.created_at;
  const parsed = new Date(typeof raw === 'string' ? raw : Date.now());
  if (Number.isNaN(parsed.valueOf())) throw new Error('Shopify source record has an invalid occurrence time.');
  return parsed;
}

function sourceId(node: ShopifyNode): string {
  const value = node.id ?? node.admin_graphql_api_id;
  return stringValue(value, 'Shopify source record has no identifier.');
}

function record(sourceType: SourceRecordInput['sourceType'], node: ShopifyNode): SourceRecordInput {
  return { sourceType, sourceId: sourceId(node), occurredAt: occurredAt(node), payload: node };
}

function page(data: unknown, key: string): { nodes: ShopifyNode[]; nextCursor?: string } {
  const root = asRecord(data, 'Shopify returned an invalid GraphQL response.');
  const result = asRecord(root.data, 'Shopify GraphQL response has no data.');
  const connection = asRecord(result[key], `Shopify GraphQL response has no ${key} connection.`);
  const nodes = Array.isArray(connection.nodes)
    ? connection.nodes.map((node) => asRecord(node, `Shopify ${key} node is invalid.`))
    : [];
  const pageInfo = asRecord(connection.pageInfo, `Shopify ${key} page information is missing.`);
  return {
    nodes,
    nextCursor: pageInfo.hasNextPage === true ? stringValue(pageInfo.endCursor, `Shopify ${key} page cursor is missing.`) : undefined,
  };
}

const queries: Record<SupportedSourceType, { connection: string; document: string }> = {
  customer: {
    connection: 'customers',
    document: `query MangoCustomers($cursor: String) { customers(first: 50, after: $cursor) { nodes { id updatedAt createdAt email firstName lastName } pageInfo { hasNextPage endCursor } } }`,
  },
  product: {
    connection: 'products',
    document: `query MangoProducts($cursor: String) { products(first: 50, after: $cursor) { nodes { id updatedAt createdAt title handle status } pageInfo { hasNextPage endCursor } } }`,
  },
  variant: {
    connection: 'productVariants',
    document: `query MangoVariants($cursor: String) { productVariants(first: 50, after: $cursor) { nodes { id updatedAt createdAt title sku inventoryQuantity product { id } } pageInfo { hasNextPage endCursor } } }`,
  },
  inventory: {
    connection: 'inventoryItems',
    document: `query MangoInventory($cursor: String) { inventoryItems(first: 50, after: $cursor) { nodes { id updatedAt sku tracked variant { id } } pageInfo { hasNextPage endCursor } } }`,
  },
  order: {
    connection: 'orders',
    document: `query MangoOrders($cursor: String) { orders(first: 50, after: $cursor) { nodes { id updatedAt createdAt name displayFinancialStatus displayFulfillmentStatus } pageInfo { hasNextPage endCursor } } }`,
  },
  refund: {
    connection: 'orders',
    document: `query MangoRefunds($cursor: String) { orders(first: 50, after: $cursor) { nodes { id refunds { id createdAt updatedAt note } } pageInfo { hasNextPage endCursor } } }`,
  },
};

export function createShopifyAdapter(options: { storeUrl: URL; accessToken: string; webhookSecret: string }): CommerceStore {
  return {
    capabilities() {
      return {
        provider: 'shopify', sourceTypes: [...supportedTypes],
        detail: 'Shopify Admin GraphQL provides customers, products, variants, inventory items, orders, and refunds. Carts and browsing events are deliberately not declared because this adapter cannot retrieve them.',
      };
    },

    async verifyWebhook(request): Promise<VerifiedCommerceWebhook> {
      const signature = request.headers.get('X-Shopify-Hmac-Sha256');
      const topic = request.headers.get('X-Shopify-Topic');
      if (!signature || !topic) throw new Error('Shopify webhook signature or topic is missing.');
      const rawBody = await request.text();
      const expected = await hmacSha256Base64(options.webhookSecret, rawBody);
      if (!timingSafeEqual(signature, expected)) throw new Error('Shopify webhook signature is invalid.');
      let payload: ShopifyNode;
      try {
        payload = asRecord(JSON.parse(rawBody), 'Shopify webhook body is invalid.');
      } catch {
        throw new Error('Shopify webhook body is not JSON.');
      }
      const sourceType = sourceTypeForTopic(topic);
      return {
        providerEventId: request.headers.get('X-Shopify-Webhook-Id') ?? undefined,
        rawBody,
        receivedAt: new Date(),
        sourceType,
        sourceId: sourceId(payload),
        occurredAt: occurredAt(payload),
        payload,
      };
    },

    async synchronize(type, cursor) {
      if (!supportedTypes.includes(type as SupportedSourceType)) {
        throw new Error(`Shopify does not support Mango source type ${type}.`);
      }
      const query = queries[type as SupportedSourceType];
      const response = await fetch(adminEndpoint(options.storeUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': options.accessToken,
        },
        body: JSON.stringify({ query: query.document, variables: { cursor: cursor ?? null } }),
      });
      const data = await responseJson(response);
      const result = page(data, query.connection);
      const records = type === 'refund'
        ? result.nodes.flatMap((order) => {
            const refunds = Array.isArray(order.refunds) ? order.refunds : [];
            return refunds.map((refund) => record('refund', asRecord(refund, 'Shopify refund is invalid.')));
          })
        : result.nodes.map((node) => record(type, node));
      return { records, nextCursor: result.nextCursor };
    },
  };
}
