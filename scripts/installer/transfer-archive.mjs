import { open,link,unlink,mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { readArchive } from '../../src/vendor/base/portability/index.mjs';

async function* records(path) {
  const file=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);
  const stream=file.createReadStream({autoClose:false});
  try {yield* readArchive(Readable.toWeb(stream));}finally{stream.destroy();await file.close();}
}
/** File custody around Base's service, without another archive format or restore engine. */
export async function transferArchive(service,direction,path,signal) {
  let id,manifest,closing,file,temporary,complete=false;
  try {
    if(direction==='export') {
      await mkdir(dirname(path),{recursive:true,mode:0o700});temporary=path+'.'+randomUUID()+'.partial';file=await open(temporary,'wx',0o600);
      id=await service.exports.create();
      while((await service.exports.advance(id,{maxParts:16})).phase==='building')signal?.throwIfAborted();
      for await(const chunk of await service.exports.download(id)){signal?.throwIfAborted();let offset=0;while(offset<chunk.length)offset+=(await file.write(chunk,offset)).bytesWritten;}
      await file.sync();await file.close();file=undefined;
      for await(const record of records(temporary)){if(record.kind==='manifest')manifest=record;else if(record.kind==='closing')closing=record;}
      await link(temporary,path);complete=true;
    } else {
      for await(const record of records(path))signal?.throwIfAborted();
      for await(const record of records(path)) {
        signal?.throwIfAborted();
        if(record.kind==='manifest'){manifest=record;id=await service.imports.create(manifest);}
        else if(record.kind==='part')await service.imports.uploadPart(id,record.index,record);
        else closing=record;
      }
      await service.imports.finalize(id,{contentHash:closing.contentHash});complete=true;
    }
    return {target:'local',contentHash:closing.contentHash,tables:manifest.tables.map(({name,count})=>({name,count})),objects:manifest.objects.length,payloads:manifest.payloads.length,requiredConfiguration:manifest.requiredConfiguration,exclusions:{tables:manifest.excludedTables,columns:manifest.excludedColumns,configuration:true,transient:['local caches and logs']}};
  } finally {
    await file?.close();if(temporary)await unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});
    if(id&&(direction==='export'||!complete))await (direction==='export'?service.exports:service.imports).abort(id);
  }
}
