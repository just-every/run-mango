import { Hono } from 'hono';
import { z } from 'zod';

import { readParams } from '@/core/api/input';
import type { CommerceStore } from '@/core/shared/platform';
import type { CommerceSourceType } from '@/core/features/store/service';

import type { createAudienceService } from './service';

const providerParams = z.object({ provider: z.literal('shopify') });

function stringField(payload: Record<string, unknown>, field: string) {
  const value = payload[field];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function contactFromShopifyPayload(payload: Record<string, unknown>) {
  const email = stringField(payload, 'email');
  const phone = stringField(payload, 'phone');
  if (!email && !phone) return undefined;
  const firstName = stringField(payload, 'firstName') ?? stringField(payload, 'first_name');
  const lastName = stringField(payload, 'lastName') ?? stringField(payload, 'last_name');
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || undefined;
  return { email, phone, displayName };
}

export function createCommerceWebhookRoutes(service: ReturnType<typeof createAudienceService>, commerce: CommerceStore) {
  const routes = new Hono();
  routes.post('/webhooks/commerce/:provider', async (context) => {
    const params = readParams(context, providerParams);
    if ('error' in params) return context.notFound();
    let verified;
    try {
      verified = await commerce.verifyWebhook(context.req.raw);
    } catch {
      return context.json({ error: 'invalid_webhook' }, 401);
    }
    try {
      await service.ingestCommerceWebhook({
        provider: params.data.provider,
        completion: 'delta',
        adapterCompleted: true,
        sourceTypes: [verified.sourceType as CommerceSourceType],
        records: [{
          sourceType: verified.sourceType as CommerceSourceType,
          providerSourceId: verified.sourceId,
          occurredAt: verified.occurredAt,
          payload: verified.payload,
          contact: contactFromShopifyPayload(verified.payload),
        }],
      });
    } catch (error) {
      return context.json({ error: 'commerce_ingestion_failed', detail: error instanceof Error ? error.message : 'Commerce ingestion failed.' }, 422);
    }
    return context.body(null, 204);
  });
  return routes;
}
