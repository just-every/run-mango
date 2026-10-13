import {Buffer} from 'node:buffer';
import type {BlobStore} from '@/core/shared/platform';
import type {ErasureScope} from './types';
import {containsLiteral} from './literals';
import {ownershipNeedles,type Needles} from './needles';

type ObjectScan={bucket:number;cursor?:string;next?:string;key?:string;etag?:string;size?:number;offset?:number;complete?:boolean};
const pageBytes=256*1024,overlapBytes=64*1024;
function personalText(text:string,scope:Needles){
 if(containsLiteral(text,scope))return true;
 // A range can start inside a JSON document or Base64 token. Inspect complete
 // quoted values and all four Base64 alignments, retaining overlap across ranges.
 for(const token of text.matchAll(/"(?:[^"\\]|\\.)*"/g)){try{if(containsLiteral(JSON.parse(token[0]),scope))return true;}catch{}}
 for(const token of text.matchAll(/[A-Za-z0-9+/]{16,}={0,2}/g))for(let start=0;start<4;start++){
  const raw=token[0].slice(start),body=raw.slice(0,raw.length-raw.length%4);
  if(body){const bytes=Buffer.from(body,'base64'),decoded=bytes.toString('utf8');if(Buffer.from(decoded).equals(bytes)&&containsLiteral(decoded,scope))return true;}
 }
 return false;
}
// File extensions a stored object's name may carry after an identity. A segment like
// ann@x.test.example is another address, not ann@x.test with an extension, so only these count.
const fileExtensions=new Set(['json','jsonl','ndjson','csv','tsv','txt','md','html','htm','xml','pdf','eml','msg','vcf','ics',
 'zip','gz','tgz','tar','bz2','zst','rer','bin','log','png','jpg','jpeg','gif','webp','avif','heic','svg','mp3','mp4','mov','wav',
 'doc','docx','xls','xlsx','ppt','pptx','odt','ods','rtf']);
function withoutExtensions(segment:string){
 let name=segment.toLowerCase(),match;
 while((match=/\.([a-z0-9]+)$/.exec(name))&&fileExtensions.has(match[1]))name=name.slice(0,match.index);
 return name;
}
/** A key segment that is exactly an erased id, email or phone once its file extensions are removed. */
function keyNamesIdentity(key:string,scope:Needles){
 const identities=new Set(scope.literals.map(value=>value.toLowerCase()));
 return key.split('/').some(segment=>{
  let decoded=segment;try{decoded=decodeURIComponent(segment);}catch{}
  return identities.has(withoutExtensions(decoded));
 });
}
/** One bounded object range per continuation; ownership is discovered from an
 * exact contact id, email or phone in the key, metadata or readable payload, never
 * from a name and never from an unrelated restore job. */
export async function scanObject(buckets:Record<string,BlobStore>,encoded:string,erased:ErasureScope){
 const scope=ownershipNeedles(erased);
 const scan: ObjectScan=JSON.parse(encoded),names=Object.keys(buckets).sort();scan.bucket??=0;
 if(scan.complete)return {scan};
 if(scan.bucket>=names.length){scan.complete=true;return {scan};}
 const bucketName=names[scan.bucket],bucket=buckets[bucketName];
 if(!scan.key){
  const page=await bucket.list({limit:1,cursor:scan.cursor,include:['httpMetadata','customMetadata']});
  const object=page.objects[0];if(!object){scan.bucket++;delete scan.cursor;return {scan};}
  Object.assign(scan,{key:object.key,etag:object.etag,size:object.size,offset:0,next:page.truncated?page.cursor:undefined});
 }
 const key=scan.key!,offset=scan.offset??0,begin=Math.max(0,offset-overlapBytes);
 const object=await bucket.get(key,scan.size?{range:{offset:begin,length:pageBytes+offset-begin}}:undefined);
 if(!object)throw new Error('An object disappeared during erasure inventory.');
 if(object.etag!==scan.etag)throw new Error('An object changed during erasure inventory.');
 const body='body' in object&&object.body?new TextDecoder().decode(await object.arrayBuffer()):'';
 const found=keyNamesIdentity(key,scope)||containsLiteral({key,metadata:object.customMetadata,http:object.httpMetadata},scope)||personalText(body,scope);
 scan.offset=offset+pageBytes;
 if(found||scan.offset>=(scan.size??0)){
  if(scan.next)scan.cursor=scan.next;else{scan.bucket++;delete scan.cursor;}
  delete scan.key;delete scan.etag;delete scan.size;delete scan.offset;delete scan.next;
 }
 return {scan,...(found?{remove:{bucket:bucketName,key}}:{})};
}
