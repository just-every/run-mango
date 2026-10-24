import type {Database} from '@/core/platform/db/client';
import {authoredBody} from './authoring-content';
import {readEmailBlocks} from './email-blocks';
import {blockKey,ReusableBlockError} from './reusable-block-model';
/** A stale editor or local override cannot silently replace linked source content. */
export async function assertReusableDraft(database:Database,revisionId:string,body:string){
  const uses=(await database.$client.prepare("SELECT position,block_json FROM reusable_email_block_placements WHERE target_kind='campaign' AND target_id=? ORDER BY position").bind(revisionId).all<{position:number;block_json:string}>()).results;
  if(!uses.length)return;
  const keys=readEmailBlocks(authoredBody(body)).map(blockKey),occupied=new Set<number>();
  for(const use of uses){
    const at=keys[use.position]===use.block_json&&!occupied.has(use.position)?use.position:keys.findIndex((key,index)=>key===use.block_json&&!occupied.has(index));
    if(at<0)throw new ReusableBlockError('This email still links to a reusable block. Choose Keep independent copy before saving local changes, or update its reusable source.');
    occupied.add(at);
  }
}
