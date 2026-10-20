import { parts, insist } from './storage.mjs';
import { checkPart, ContentVerifier, ArchiveVerifier } from './format.mjs';
import { canonicalJson } from './hash.mjs';
import { fence } from './journal.mjs';

/** Authenticate staged bytes before using the source identity for Mango's floor. */
export async function verifyStaged(context,row,{contentHash,archiveHash,laterJournal}={}) {
  const manifest=row.metadata.manifest,verifier=new ContentVerifier(manifest),archive=new ArchiveVerifier(manifest),binaryIndexes=new Map();
  let index=0;
  for await(const part of parts(context.db,row.id,row.completed)) {
    await checkPart(part,index,context.config.partBytes);archive.add(part);
    for(const item of part.items) {
      verifier.add(item);
      if(item.kind==='object'||item.kind==='payload') {
        const key=canonicalJson(item.bucket===undefined?['payload',item.name]:['object',item.bucket,item.key]);
        const selected=binaryIndexes.get(key)??[];
        if(selected.at(-1)!==index)selected.push(index);
        binaryIndexes.set(key,selected);
      }
    }
    index++;
  }
  const digest=verifier.digest();if(contentHash!==undefined)insist(contentHash===digest,'content_checksum');
  insist(archiveHash===archive.digest(),'archive_checksum',409);
  return {digest,binaryIndexes,checked:await fence(context.db,row.metadata.restoreManifest??manifest,laterJournal)};
}
