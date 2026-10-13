import {createD1ImportStream,planD1ImportStream,readD1ImportStream,resumeD1ImportStream,undoD1ImportStream,type D1ImportContext} from '@/vendor/base/import-kit/src/d1/index';
import type {ImportPlan} from '@/vendor/base/import-kit/src/types';

// Large reviewed files use Base's compressed, normalized pages. Mango retains
// the exact reviewed original bytes in audience_import_plan_chunks. Base's
// normalized stream deliberately receives only artifact metadata, not originals.
export async function createAudienceStream(plan:ImportPlan,context:D1ImportContext){
  const entries=new Map(plan.entries.map(entry=>[entry.source.sourceId,entry]));
  const source={...plan.source,artifacts:plan.source.artifacts.map(({original,...artifact})=>artifact)};
  const stream=await planD1ImportStream(source,{version:context.mappingVersion,map:record=>{
    const entry=entries.get(record.sourceId);
    if(!entry)throw new Error('Reviewed audience source is missing.');
    return {effects:entry.effects,unmapped:entry.unmapped,...(entry.rejection?{rejection:entry.rejection}:{})};
  }},context);
  return createD1ImportStream(stream,{...context,reviewedFingerprint:stream.fingerprint,operationKey:plan.fingerprint});
}
export async function isAudienceStream(id:string,context:D1ImportContext){
  return Boolean(await context.storage.database.prepare('SELECT id FROM ik_d1_streams WHERE id=?').bind(id).first());
}
export const audienceStreamActions={read:readD1ImportStream,resume:resumeD1ImportStream,undo:undoD1ImportStream};
