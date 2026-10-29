import {actorType,actorId as nativeActorId} from '../agent-door/custody';
import {graphSchema} from '../flows/graph';
import type {Platform} from '@/core/shared/platform';
import {authoredBody,normalizeAuthoredContent} from './authoring-content';
import {readEmailBlocks,writeEmailBlocks} from './email-blocks';
import {blockKey,reusableBlock,replacePlacedBlocks,ReusableBlockError,type PlacementTarget,type ReusableBlock} from './reusable-block-model';
import {checkReusableSize,readReusableTarget,targetSnapshot,targetSnapshotGuard,targetWrites,type ReusableTarget} from './reusable-block-targets';
import {copyReusableRevision} from './reusable-block-copy';
type LibraryRow={id:string;name:string;block_json:string;version:number};
type Use={id:string;block_id:string;target_kind:PlacementTarget['kind'];target_id:string;node_id:string;position:number;block_json:string;replacement_revision_id:string|null};
const entry=(row:LibraryRow)=>({id:row.id,name:row.name,version:row.version,block:JSON.parse(row.block_json) as ReusableBlock});
const quote=(value:string)=>"'"+value.replaceAll("'","''")+"'";
export function reusableBlockService(platform:Platform){
  const db=platform.database.$client;
  const read=(id:string)=>db.prepare('SELECT id,name,block_json,version FROM reusable_email_blocks WHERE id=?').bind(id).first<LibraryRow>();
  const tokenGuard=(id:string,token:string)=>`EXISTS(SELECT 1 FROM reusable_email_blocks WHERE id=${quote(id)} AND edit_token=${quote(token)})`;
  return {
    async list(){return {blocks:(await db.prepare('SELECT id,name,block_json,version FROM reusable_email_blocks ORDER BY name,id').all<LibraryRow>()).results.map(entry)};},
    async create(name:string,value:unknown,actor:string){
      const block=reusableBlock(value),id=crypto.randomUUID(),now=Date.now();
      await db.batch([db.prepare('INSERT INTO reusable_email_blocks(id,name,block_json,version,edit_token,created_by,updated_by,created_at,updated_at) VALUES(?,?,?,1,?,?,?,?,?)').bind(id,name,blockKey(block),crypto.randomUUID(),actor,actor,now,now),
        db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at) VALUES(?,?,'reusable-email-block',?,'reusable-block.created','${actorType()}',?,'{}',?,?)`).bind(crypto.randomUUID(),crypto.randomUUID(),id,nativeActorId(actor),now,now)]);
      return entry((await read(id))!);
    },
    async place(id:string,version:number,target:PlacementTarget,actor:string,body?:string){
      const source=await read(id);if(!source||source.version!==version)throw new ReusableBlockError('This reusable block changed. Reload the library before placing it.');
      const value=await readReusableTarget(platform,target);
      if(target.kind==='campaign'&&value.row.state!=='draft')throw new ReusableBlockError('Approved revisions are immutable. Open a draft before placing a reusable block.');
      const blocks=readEmailBlocks(authoredBody(body??value.body)),position=blocks.length;
      blocks.push({id:crypto.randomUUID(),...JSON.parse(source.block_json)});
      const content=normalizeAuthoredContent({emailBody:writeEmailBlocks(blocks)});await checkReusableSize(platform,value,content);
      const operation=crypto.randomUUID(),guard=tokenGuard(id,operation),now=Date.now();
      const writes=[db.prepare(`UPDATE reusable_email_blocks SET edit_token=? WHERE id=? AND version=? AND ${targetSnapshotGuard}`).bind(operation,id,version,JSON.stringify([targetSnapshot(value)])),...targetWrites(platform,value,content,guard,actor,now),
        db.prepare(`INSERT INTO reusable_email_block_placements(id,block_id,target_kind,target_id,node_id,position,block_json) SELECT ?,?,?,?,?,?,? WHERE ${guard}`).bind(crypto.randomUUID(),id,target.kind,target.id,target.nodeId,position,source.block_json)];
      const result=await db.batch(writes);if(!result[0].meta.changes)throw new ReusableBlockError('The draft or reusable block changed. Reload before placing it.');
      return {emailBody:content.emailBody!,target};
    },
    async detach(id:string,target:PlacementTarget,actor:string){
      if(target.kind==='campaign'){
        const value=await readReusableTarget(platform,target);if(value.row.state!=='draft')throw new ReusableBlockError('Only editable drafts can detach a reusable block.');
      }
      const now=Date.now(),editable=target.kind==='campaign'?`EXISTS(SELECT 1 FROM campaign_revisions WHERE id=${quote(target.id)} AND state='draft')`:'1';
      await db.batch([db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at) SELECT ?,?,'reusable-email-block',?,'reusable-block.detached','${actorType()}',?,?,?,? WHERE ${editable}`).bind(crypto.randomUUID(),crypto.randomUUID(),id,nativeActorId(actor),JSON.stringify(target),now,now),
        db.prepare(`DELETE FROM reusable_email_block_placements WHERE block_id=? AND target_kind=? AND target_id=? AND node_id=? AND ${editable}`).bind(id,target.kind,target.id,target.nodeId)]);
      return {kind:'independent-copy'};
    },
    async update(id:string,version:number,name:string,value:unknown,actor:string){
      const source=await read(id);if(!source||source.version!==version)throw new ReusableBlockError('This reusable block changed. Reload the library before editing it.');
      const next=reusableBlock(value),json=blockKey(next),uses=(await db.prepare('SELECT * FROM reusable_email_block_placements WHERE block_id=? ORDER BY target_kind,target_id,node_id,position').bind(id).all<Use>()).results;
      const groups=new Map<string,Use[]>();
      for(const use of uses){const key=JSON.stringify([use.target_kind,use.target_id,use.node_id]);groups.set(key,[...(groups.get(key)??[]),use]);}
      const targets=await Promise.all([...groups.values()].map(async uses=>({uses,value:await readReusableTarget(platform,{kind:uses[0].target_kind,id:uses[0].target_id,nodeId:uses[0].node_id})})));
      const now=Date.now(),operation=crypto.randomUUID(),guard=tokenGuard(id,operation),writes:D1PreparedStatement[]=[],created:Array<{campaignId:string;revisionId:string}>=[];
      const flows=new Map<string,{value:ReusableTarget;graph:any}>();
      for(const group of targets){
        const {value,uses:placements}=group;
        if(value.target.kind==='campaign'&&!['draft','approved'].includes(value.row.state))continue;
        if(value.target.kind==='campaign'&&value.row.state==='approved'){
          const linkedDraft=targets.find(other=>other.value.target.kind==='campaign'&&other.value.row.state==='draft'&&other.value.row.campaign_id===value.row.campaign_id);
          const active=await db.prepare('SELECT active_revision_id FROM campaigns WHERE id=?').bind(value.row.campaign_id).first<{active_revision_id:string}>();
          if(active?.active_revision_id!==value.target.id||linkedDraft)continue;
          const pending=await db.prepare("SELECT id FROM campaign_revisions WHERE campaign_id=? AND state='draft'").bind(value.row.campaign_id).first();
          if(pending)throw new ReusableBlockError('This approved campaign already has an independent draft. Review that draft before editing its reusable source.');
          const changed=replacePlacedBlocks(value.body,placements,next);await checkReusableSize(platform,value,changed.content);
          const copy=await copyReusableRevision(platform,value,changed.content,id,json,guard,actor,now);writes.push(...copy.writes);created.push({campaignId:copy.campaignId,revisionId:copy.id});
          continue;
        }
        const changed=replacePlacedBlocks(value.body,placements,next);await checkReusableSize(platform,value,changed.content);
        if(value.target.kind==='flow'){
          const flow=flows.get(value.target.id)??{value,graph:structuredClone(value.container)},node=flow.graph.nodes.find((node:any)=>node.id===value.target.nodeId);
          node.email.html=changed.content.emailBody;node.email.text=changed.content.emailText;flows.set(value.target.id,flow);
        }else writes.push(...targetWrites(platform,value,changed.content,guard,actor,now));
        for(const [index,use] of placements.entries())writes.push(db.prepare(`UPDATE reusable_email_block_placements SET position=?,block_json=? WHERE id=? AND ${guard}`).bind(changed.positions[index],json,use.id));
      }
      for(const flow of flows.values())writes.push(db.prepare(`UPDATE flow_draft_revisions SET graph_json=? WHERE id=? AND ${guard}`).bind(JSON.stringify(graphSchema.parse(flow.graph)),flow.value.target.id));
      // Both the target snapshots and the complete placement set are fenced in
      // the source CAS. D1 executes this and every dependent write atomically.
      const useGuard=`(SELECT COUNT(*) FROM reusable_email_block_placements WHERE block_id=?)=? AND NOT EXISTS(SELECT 1 FROM json_each(?) p WHERE NOT EXISTS(SELECT 1 FROM reusable_email_block_placements u WHERE u.id=json_extract(p.value,'$.id') AND u.block_json=json_extract(p.value,'$.block_json') AND u.position=json_extract(p.value,'$.position'))) `;
      const first=db.prepare(`UPDATE reusable_email_blocks SET name=?,block_json=?,version=version+1,edit_token=?,updated_by=?,updated_at=MAX(updated_at+1,?) WHERE id=? AND version=? AND ${targetSnapshotGuard} AND ${useGuard}`).bind(name,json,operation,actor,now,id,version,JSON.stringify(targets.map(group=>targetSnapshot(group.value))),id,uses.length,JSON.stringify(uses));
      writes.push(db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at) SELECT ?,?,'reusable-email-block',?,'reusable-block.updated','${actorType()}',?,?,?,? WHERE ${guard}`).bind(operation,operation,id,nativeActorId(actor),JSON.stringify({placements:uses.length,draftRevisions:created}),now,now));
      const result=await db.batch([first,...writes]);if(!result[0].meta.changes)throw new ReusableBlockError('A linked draft or reusable block changed. Reload and review it before editing the reusable source.');
      return {...entry((await read(id))!),draftRevisions:created,updatedTargets:targets.length};
    },
  };
}
