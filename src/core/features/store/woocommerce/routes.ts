import {pluginRecord, verifyPluginEvent} from './plugin-events';
import {enrollWooFlows} from './flows';
import {Hono} from 'hono';
import type {Platform} from '@/core/shared/platform';
import type {AuthVariables} from '@/core/features/auth/routes';
import type {createAudienceService} from '@/core/features/audience/service';
import type {createStoreService} from '../service';
import {activityStatement} from '@/core/features/auth/activity-record';
import {sha256} from '@/core/shared/ids';
import {commerceProjection} from '../commerce-projection';
import {CommerceWebhookUnreadable} from '../webhook-unreadable';
import {connectionSchema, encryptCredentials, readWooConnection} from './connection';
import {createWooCommerceAdapter, wooSources} from './adapter';

export function wooCommerceRoutes(platform: Platform, audience: ReturnType<typeof createAudienceService>, store: ReturnType<typeof createStoreService>) {
  const db = platform.database.$client, settings = new Hono<{Variables: AuthVariables}>(), webhooks = new Hono();
  const retire = () => db.prepare("UPDATE source_sync_runs SET state='superseded',lease_token=NULL,lease_expires_at=NULL,updated_at=? WHERE provider LIKE 'woocommerce:%' AND state IN ('queued','running','failed')").bind(Date.now());
  settings.get('/settings/woocommerce', async context => {
    const connection = await db.prepare('SELECT id,url,connected_by AS connectedBy,connected_at AS connectedAt,plugin_enabled AS pluginEnabled FROM woocommerce_connection WHERE slot=1').first<{id: string}>();
    return context.json({connection, sourceTypes: wooSources, webhookUrl: connection ? new URL('/webhooks/commerce/woocommerce/' + connection.id, platform.config.publicBaseUrl).href : null});
  });
  settings.put('/settings/woocommerce', async context => {
    const operator = context.get('operator');
    if (operator.role !== 'owner') return context.json({error: 'owner_required'}, 403);
    if (platform.commerce && !platform.commerce.capabilities().provider?.startsWith('woocommerce:')) return context.json({error: 'another_store_connected'}, 409);
    let input;
    try {input = connectionSchema.parse(await context.req.json());} catch {return context.json({error: 'invalid_woocommerce_connection'}, 400);}
    const id = await sha256(input.url), generation = crypto.randomUUID();
    const adapter = createWooCommerceAdapter({...input, id, generation});
    try {await adapter.refreshHealth?.();} catch {return context.json({error: 'woocommerce_connection_refused'}, 422);}
    const now = Date.now();
    await db.batch([retire(), db.prepare(`INSERT INTO woocommerce_connection(slot,id,url,credentials,generation,connected_by,connected_at,plugin_enabled) VALUES(1,?,?,?,?,?,?,?)
      ON CONFLICT(slot) DO UPDATE SET id=excluded.id,url=excluded.url,credentials=excluded.credentials,generation=excluded.generation,connected_by=excluded.connected_by,connected_at=excluded.connected_at,plugin_enabled=excluded.plugin_enabled`)
      .bind(id, input.url, await encryptCredentials(input, platform.config.sessionSigningKey), generation, operator.id, now, Number(input.pluginEnabled)),
      db.prepare("UPDATE woocommerce_flows SET state='paused' WHERE state='live'"),
      db.prepare("UPDATE source_syncs SET last_successful_at=NULL,last_error='WooCommerce connection changed; complete a fresh sync.',updated_at=?").bind(now),
      activityStatement(db, {key: crypto.randomUUID(), action: 'woocommerce-connected', entityType: 'integration', entityId: id, actorId: operator.id, detail: {host: new URL(input.url).hostname}, at: now})]);
    return context.json({connected: true});
  });
  settings.delete('/settings/woocommerce', async context => {
    const operator = context.get('operator');
    if (operator.role !== 'owner') return context.json({error: 'owner_required'}, 403);
    await db.batch([retire(), db.prepare("UPDATE woocommerce_flows SET state='paused' WHERE state='live'"), db.prepare('DELETE FROM woocommerce_connection WHERE slot=1'),
      db.prepare("UPDATE commerce_source_capabilities SET available=0,detail='WooCommerce disconnected.'"),
      db.prepare("UPDATE source_syncs SET last_error='WooCommerce disconnected.',updated_at=?").bind(Date.now()),
      activityStatement(db, {key: crypto.randomUUID(), action: 'woocommerce-disconnected', entityType: 'integration', entityId: 'woocommerce', actorId: operator.id})]);
    return context.json({disconnected: true});
  });
  webhooks.post('/webhooks/commerce/woocommerce/:connectionId', async context => {
    const connection = await readWooConnection(platform);
    if (!connection || context.req.param('connectionId') !== connection.id) return context.json({error: 'woocommerce_not_connected'}, 409);
    let verified;
    try {verified = await createWooCommerceAdapter(connection).verifyWebhook(context.req.raw);}
    catch (error) {
      if (error instanceof CommerceWebhookUnreadable) {
        await store.syncRuns.recordFailedOperation({operation: 'webhook', provider: 'woocommerce:' + connection.id, sourceType: error.sourceType, deliveryKey: error.deliveryKey, error: error.message, now: new Date()});
        return context.json({error: 'woocommerce_read_failed'}, 422);
      }
      return context.json({error: 'invalid_woocommerce_signature'}, 401);
    }
    try {
      const prior = await db.prepare('SELECT digest FROM commerce_receipts WHERE id=?').bind(await sha256(verified.receipt!.ids[0])).first<{digest: string}>();
      if (prior && prior.digest !== verified.receipt!.digest) return context.json({error: 'woocommerce_event_conflict'}, 409);
      const records = (verified.records ?? [verified]).map(commerceProjection);
      await audience.ingestCommerceWebhook({provider: 'woocommerce:' + connection.id, completion: 'delta', adapterCompleted: false,
        sourceTypes: [...new Set(records.map(row => row.sourceType))], records,
        receipt: {...verified.receipt!, wooConnection: {id: connection.id, generation: connection.generation}}});
      await store.syncRuns.recoverDeliveries(verified.receipt!.ids, new Date());
      return context.body(null, 204);
    } catch {return context.json({error: 'woocommerce_ingestion_failed'}, 422);}
  });
  webhooks.post('/webhooks/commerce/woocommerce/:connectionId/plugin', async context => {
    const connection = await readWooConnection(platform);
    if (!connection?.pluginEnabled || connection.id !== context.req.param('connectionId')) return context.json({error: 'plugin_not_connected'}, 409);
    let verified;
    try {verified = await verifyPluginEvent(context.req.raw, connection);} catch {return context.json({error: 'plugin_event_refused'}, 401);}
    try {
      const prior = await db.prepare('SELECT digest FROM commerce_receipts WHERE id=?').bind(await sha256(verified.receipt.ids[0])).first<{digest: string}>();
      if (prior && prior.digest !== verified.receipt.digest) return context.json({error: 'plugin_event_conflict'}, 409);
      const record = commerceProjection(await pluginRecord(verified.event, connection));
      await audience.ingestCommerceWebhook({provider: 'woocommerce:' + connection.id, completion: 'delta', adapterCompleted: false,
        sourceTypes: [record.sourceType], records: [record], receipt: verified.receipt});
      await enrollWooFlows(platform, connection, verified.event);
      return context.body(null, 204);
    } catch {return context.json({error: 'plugin_ingestion_failed'}, 422);}
  });
  return {settings, webhooks};
}
