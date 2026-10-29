import {z} from 'zod';
import {mobileBlockSchema} from './email-mobile';
import {readEmailBlocks,writeEmailBlocks,type EditorBlock} from './email-blocks';
import {authoredBody,normalizeAuthoredContent} from './authoring-content';
import {inspectEmailHtml} from './email-html-policy';
export class ReusableBlockError extends Error {}
export const reusableBlockSchema=z.object({html:z.string().min(1).max(102400),mobile:mobileBlockSchema.omit({block:true}).optional()}).strict();
export type ReusableBlock=z.infer<typeof reusableBlockSchema>;
export const placementTargetSchema=z.object({kind:z.enum(['campaign','template','flow']),id:z.string().min(1).max(200),nodeId:z.string().max(64).default('')}).strict().refine(target=>target.kind==='flow'?Boolean(target.nodeId):target.nodeId==='', 'Only flow placements name an email node.');
export type PlacementTarget=z.infer<typeof placementTargetSchema>;
/** `demoOrigin` is a demo's own origin, whose pages its blocks may link to (demo-links.ts). */
export function reusableBlock(value:unknown,demoOrigin?:string):ReusableBlock {
  const parsed=reusableBlockSchema.parse(value),source=writeEmailBlocks([{id:'reusable',...parsed}]);
  const issues=inspectEmailHtml(source,undefined,demoOrigin).issues;
  if(issues.length)throw new ReusableBlockError(issues.join(' '));
  const blocks=readEmailBlocks(authoredBody(normalizeAuthoredContent({emailBody:source}).emailBody!));
  if(blocks.length!==1)throw new ReusableBlockError('Save one complete block at a time.');
  return blockValue(blocks[0]);
}
export function blockValue(block:EditorBlock):ReusableBlock {return {html:block.html,...(block.mobile?{mobile:block.mobile}:{})};}
export const blockKey=(block:EditorBlock|ReusableBlock)=>JSON.stringify(blockValue({...block,id:'reusable'}));
export function replacePlacedBlocks(body:string,uses:Array<{position:number;block_json:string}>,next:ReusableBlock){
  const blocks=readEmailBlocks(authoredBody(body)),positions=new Set<number>();
  for(const use of uses){
    let at=use.position;
    if(!blocks[at]||blockKey(blocks[at])!==use.block_json){
      const matches=blocks.flatMap((block,index)=>blockKey(block)===use.block_json?[index]:[]);
      if(matches.length!==1)throw new ReusableBlockError('A linked block was edited locally. Keep an independent copy or restore the saved block before editing its reusable source.');
      at=matches[0];
    }
    if(positions.has(at))throw new ReusableBlockError('Reusable block placements overlap. Keep an independent copy and place the block again.');
    positions.add(at);blocks[at]={id:blocks[at].id,...next};
  }
  return {content:normalizeAuthoredContent({emailBody:writeEmailBlocks(blocks)}),positions:[...positions]};
}
