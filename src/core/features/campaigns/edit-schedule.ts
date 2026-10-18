import type { EmailSizeOptions } from './email-size';
import {sql,eq,and} from 'drizzle-orm';
import type {Database} from '@/core/platform/db/client';
import {createDraft} from './create-draft';
import {campaigns,campaignRevisions,campaignStateTransitions} from './campaign-schema';
import type {DraftComposition} from './draft-composition';

/** Ownership is decided in the same transaction as the editable copy, against
 * the durable dispatch-start record used by replacement approval. */
export async function editSchedule(database:Database,campaignId:string,composition:DraftComposition,operatorId:string,sizeOptions:EmailSizeOptions={}) {
  const created=await createDraft(database,composition,operatorId,({campaignId:temporary,revisionId})=>[
    database.update(campaignRevisions).set({campaignId,version:sql`(SELECT COALESCE(MAX(version),0)+1 FROM campaign_revisions WHERE campaign_id=${campaignId})`})
      .where(and(eq(campaignRevisions.id,revisionId),sql`EXISTS(SELECT 1 FROM campaigns c WHERE c.id=${campaignId} AND c.state='scheduled'
        AND NOT EXISTS(SELECT 1 FROM step_dispatches d WHERE d.revision_id=c.active_revision_id AND d.started_at IS NOT NULL))`)),
    database.update(campaignStateTransitions).set({campaignId,reason:'scheduled-edit-created'})
      .where(and(eq(campaignStateTransitions.campaignId,temporary),sql`EXISTS(SELECT 1 FROM campaign_revisions WHERE id=${revisionId} AND campaign_id=${campaignId})`)),
    database.delete(campaigns).where(and(eq(campaigns.id,temporary),sql`EXISTS(SELECT 1 FROM campaign_revisions WHERE id=${revisionId} AND campaign_id=${campaignId})`)),
  ],sizeOptions);
  const owner=await database.$client.prepare('SELECT campaign_id FROM campaign_revisions WHERE id=?').bind(created.revisionId).first<{campaign_id:string}>();
  return {...created,campaignId:owner!.campaign_id,kind:owner!.campaign_id===campaignId?'replacement':'fork'};
}
