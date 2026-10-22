import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthVariables} from '@/core/features/auth/routes';
import type {Platform} from '@/core/shared/platform';
import {activityStatement} from '@/core/features/auth/activity-record';
import {sha256} from '@/core/shared/ids';
import {readWooConnection, type WooConnection} from './connection';
import type {PluginEvent} from './plugin-events';

/** A concrete tag-and-exit starter. The visual graph editor and message nodes
 * retain their own FLOW-* obligations; this revision never sends a message. */
export function wooFlowRoutes(platform: Platform) {
  const db = platform.database.$client, routes = new Hono<{Variables: AuthVariables}>();
  routes.get('/flows', async context => {
    const flows = (await db.prepare(`SELECT f.*, (SELECT count(*) FROM woocommerce_flow_enrollments e WHERE e.revision_id=f.id) AS enrollments
      FROM woocommerce_flows f ORDER BY created_at DESC LIMIT 100`).all()).results;
    return context.json({flows});
  });
  routes.post('/flows', async context => {
    const input = z.object({kind: z.literal('woocommerce-abandoned-checkout'), name: z.string().trim().min(1).max(100), tag: z.string().trim().min(1).max(100)}).strict().safeParse(await context.req.json().catch(() => null));
    if (!input.success) return context.json({error: 'invalid_flow'}, 400);
    const connection = await readWooConnection(platform);
    if (!connection?.pluginEnabled) return context.json({error: 'woocommerce_plugin_required'}, 409);
    const id = crypto.randomUUID(), now = Date.now(), actor = context.get('operator').id;
    await db.batch([db.prepare("INSERT INTO woocommerce_flows(id,connection_id,name,tag,state,created_by,created_at) VALUES(?,?,?,?,'draft',?,?)").bind(id, connection.id, input.data.name, input.data.tag, actor, now),
      activityStatement(db, {key: crypto.randomUUID(), action: 'flow-draft-saved', entityType: 'flow', entityId: id, actorId: actor, detail: {kind: input.data.kind}, at: now})]);
    return context.json({id, revisionId: id, state: 'draft'}, 201);
  });
  for (const action of ['activate','pause'] as const) routes.post('/flows/:id/' + action, async context => {
    const input = z.object({revisionId: z.string().uuid()}).strict().safeParse(await context.req.json().catch(() => null));
    if (!input.success || input.data.revisionId !== context.req.param('id')) return context.json({error: 'revision_mismatch'}, 409);
    const flow = await db.prepare('SELECT * FROM woocommerce_flows WHERE id=?').bind(input.data.revisionId).first<{id: string; connection_id: string; state: string; created_by: string}>();
    if (!flow) return context.json({error: 'flow_not_found'}, 404);
    const connection = await readWooConnection(platform);
    if (!connection?.pluginEnabled || connection.id !== flow.connection_id) return context.json({error: 'trigger_source_unavailable'}, 409);
    const actor = context.get('operator').id, now = Date.now();
    // Only the exact saved tag action is activated; a new draft has a new id.
    await db.batch([db.prepare('UPDATE woocommerce_flows SET state=?,activated_by=?,activated_at=? WHERE id=?').bind(action === 'activate' ? 'live' : 'paused', actor, now, flow.id),
      activityStatement(db, {key: crypto.randomUUID(), action: 'flow-' + action, entityType: 'flow', entityId: flow.id, actorId: actor, detail: {revisionId: flow.id}, at: now})]);
    return context.json({revisionId: flow.id, state: action === 'activate' ? 'live' : 'paused'});
  });
  return routes;
}

export async function enrollWooFlows(platform: Platform, connection: WooConnection, event: PluginEvent) {
  if (event.kind !== 'abandoned_checkout') return;
  const db = platform.database.$client, now = Date.now();
  const sourceId = `woocommerce:${connection.id}:cart:${event.checkoutId}`;
  const contact = await db.prepare(`SELECT c.email FROM source_records s JOIN contacts c ON c.id=s.contact_id WHERE s.provider=? AND s.source_type='cart' AND s.provider_source_id=? AND json_extract(s.payload,'$.eventId')=?`).bind('woocommerce:' + connection.id, sourceId, event.id).first<{email: string}>();
  if (!contact?.email) return;
  const destinationHash = await sha256(platform.config.contactHashSalt + ':' + contact.email);

  const flows = (await db.prepare("SELECT id,tag FROM woocommerce_flows WHERE connection_id=? AND state='live'").bind(connection.id).all<{id: string; tag: string}>()).results;
  for (const flow of flows) {
    const id = await sha256(flow.id + ':' + event.id);
    const eligible = `SELECT s.id AS source_id,s.contact_id FROM source_records s JOIN contacts c ON c.id=s.contact_id
      WHERE s.provider=? AND s.source_type='cart' AND s.provider_source_id=? AND json_extract(s.payload,'$.eventId')=?
      AND c.email_status='subscribed' AND c.merge_lock IS NULL AND c.email=?
      AND EXISTS(SELECT 1 FROM contact_email_addresses a JOIN consent_evidence e ON e.contact_id=a.contact_id AND e.destination=a.email
        WHERE a.contact_id=c.id AND a.email=c.email AND a.channel_status='subscribed' AND e.channel='email' AND e.confirmed_at IS NOT NULL AND e.confirmed_at<=?)
      AND NOT EXISTS(SELECT 1 FROM contact_suppressions x WHERE x.contact_id=c.id OR (x.channel='email' AND x.destination_hash=?))
      AND EXISTS(SELECT 1 FROM woocommerce_connection WHERE id=? AND generation=?)
      AND EXISTS(SELECT 1 FROM woocommerce_flows WHERE id=? AND state='live' AND activated_at<=?)
      AND NOT EXISTS(SELECT 1 FROM commerce_orders o WHERE o.contact_id=c.id AND o.qualifying=1 AND o.purchased_at>=?)`;
    const bindings = ['woocommerce:' + connection.id, sourceId, event.id, contact.email, now, destinationHash, connection.id, connection.generation, flow.id, Date.parse(event.occurredAt), Date.parse(event.checkoutStartedAt!)];
    await db.batch([
      db.prepare(`INSERT INTO woocommerce_flow_enrollments(id,revision_id,event_id,contact_id,source_record_id,current_node,state,occurred_at)
        SELECT ?,?,?,contact_id,source_id,'tag','entered',? FROM (${eligible}) WHERE 1 ON CONFLICT(revision_id,event_id) DO NOTHING`).bind(id, flow.id, event.id, Date.parse(event.occurredAt), ...bindings),
      db.prepare(`INSERT INTO integration_contact_profiles(contact_id,tags_json)
        SELECT contact_id,json_array(?) FROM woocommerce_flow_enrollments WHERE id=? AND state='entered'
        ON CONFLICT(contact_id) DO UPDATE SET tags_json=CASE WHEN EXISTS(SELECT 1 FROM json_each(tags_json) WHERE value=?) THEN tags_json ELSE json_insert(tags_json,'$[#]',?) END`).bind(flow.tag, id, flow.tag, flow.tag),
      db.prepare(`INSERT INTO contact_history(id,contact_id,kind,detail,occurred_at,created_at,updated_at)
        SELECT ?,contact_id,'flow-completed',?,?,?,? FROM woocommerce_flow_enrollments WHERE id=? AND state='entered'
        ON CONFLICT(id) DO NOTHING`).bind('flow:' + id, JSON.stringify({flowRevisionId: flow.id, trigger: 'abandoned_checkout', action: 'tag', tag: flow.tag, currentNode: 'exit'}), Date.parse(event.occurredAt), now, now, id),
      db.prepare("UPDATE woocommerce_flow_enrollments SET state='completed',current_node='exit',completed_at=? WHERE id=? AND state='entered'").bind(now, id),
    ]);
  }
}
