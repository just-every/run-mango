import {Buffer} from 'node:buffer';
const escape=(text:string)=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const word=(text:string|undefined)=>Boolean(text&&/[\p{L}\p{N}_@]/u.test(text));
// Only letters, digits, '_', '@', '.', '+' and '-' continue an address: lee@x.test
// is not inside ann.lee@x.test or lee@x.test.example, but URL and path delimiters
// ('/', '=', '?', '&', '#', '%', ':') end it, so ?email=lee@x.test and u/lee@x.test/ match.
const addressBefore=(text:string|undefined)=>Boolean(text&&/[\p{L}\p{N}_@.+-]/u.test(text));
const addressAfter=(text:string)=>/^(?:[\p{L}\p{N}_@-]|\.[\p{L}\p{N}_-])/u.test(text);
const decoded=(text:string)=>text.replace(/(?:%[\da-f]{2})+/gi,part=>{try{return decodeURIComponent(part);}catch{return part;}});
export type LiteralKind='text'|'email'|'phone';
export const literalKind=(literal:string,phones:string[]):LiteralKind=>phones.includes(literal)?'phone':literal.includes('@')?'email':'text';
export function identityBoundary(source:string,offset:number,length:number,kind:LiteralKind='text'){
 const before=Array.from(decoded(source.slice(0,offset))).at(-1),after=decoded(source.slice(offset+length));
 if(kind==='email')return !addressBefore(before)&&!addressAfter(after);
 return !word(before)&&!word(Array.from(after)[0])&&!(kind==='phone'&&/^[\s().-]*\d/.test(after));
}
/** Replace a known literal even when a URL mixes raw and percent-encoded bytes.
 * Preserve every unmatched byte, including other query parameters and escapes. */
export function redactEncodedLiterals(value:string,literals:string[],phones:string[]){
 if(!/%[\da-f]{2}/i.test(value))return value;
 let result=value;
 for(const literal of literals){
  if(!literal)continue;
  const separator=phones.includes(literal)?'(?:[\\s().-]|%(?:20|28|29|2e|2d))*':'';
  const pattern=Array.from(literal,char=>{
   const encoded=[...new Set([char,char.toLowerCase(),char.toUpperCase()])].map(form=>[...Buffer.from(form)].map(byte=>`%${byte.toString(16).padStart(2,'0')}`).join(''));
   return `(?:${escape(char)}|${encoded.join('|')})`;
  }).join(separator);
  result=result.replace(new RegExp(pattern,'giu'),(match:string,offset:number,source:string)=>{
   return identityBoundary(source,offset,match.length,literalKind(literal,phones))?'%5Berased%5D':match;
  });
 }
 return result;
}
/** Formatting separators are allowed only between the exact known E.164 digits. */
export function redactEmbeddedPhones(value:string,phones:string[]){
 let result=value;
 for(const phone of phones){
  const pattern=Array.from(phone).map(escape).join('[\\s().-]*');
  result=result.replace(new RegExp(`(?<![\\p{L}\\p{N}_+])${pattern}(?![\\p{L}\\p{N}_]|[\\s().-]*\\d)`,'gu'),'[erased]');
 }
 return result;
}
