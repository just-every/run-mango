import { Buffer } from 'node:buffer';
import { canonicalEmail, canonicalPhone } from '../identity';
import type { Needles } from './needles';
import {identityBoundary,literalKind,redactEncodedLiterals,redactEmbeddedPhones} from './encoded-literals';

/** Match literal values or bounded words. "Ann" must never rewrite "annual".
 * JSON and Base64 are decoded before comparison, including nested payloads. */
export function redactLiteral(value: string, scope: Needles): string {
  try { const parsed: unknown=JSON.parse(value); if(typeof parsed==='object' && parsed!==null) { const next=walk(parsed,scope); return JSON.stringify(next)===JSON.stringify(parsed)?value:JSON.stringify(next); } } catch { /* Ordinary prose. */ }
  return redactText(value,scope);
}
function walk(value:unknown,scope:Needles):unknown {
  if(typeof value==='string')return redactLiteral(value,scope);
  if(Array.isArray(value))return value.map(item=>walk(item,scope));
  if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[redactText(key,scope),walk(item,scope)]));
  return value;
}
function redactText(value:string,scope:Needles):string {
  try { if(scope.emails.includes(canonicalEmail(value)??''))return '[erased]'; } catch {}
  try { if(scope.phones.includes(canonicalPhone(value)??''))return '[erased]'; } catch {}
  // Authored HTML/prose may surround encoded payload tokens. Decode each whole
  // valid token, not just a field whose entire value happens to be Base64.
  const encoded=value.replace(/[A-Za-z0-9+/]{4,}={0,2}/g,token=>{
    if(token.length%4!==0)return token;
    const decoded=Buffer.from(token,'base64').toString('utf8');
    if(Buffer.from(decoded).toString('base64')!==token)return token;
    const next=redactLiteral(decoded,scope);
    return next===decoded?token:Buffer.from(next).toString('base64');
  });
  let result=redactEncodedLiterals(redactEmbeddedPhones(encoded,scope.phones),scope.literals,scope.phones);
  for(const literal of scope.literals) {
    if(!literal)continue;
    const pattern=literal.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    result=result.replace(new RegExp(pattern,'giu'),(match:string,offset:number,source:string)=>identityBoundary(source,offset,match.length,literalKind(literal,scope.phones))?'[erased]':match);
  }
  return result;
}
export function hasLiteral(row:Record<string,unknown>,scope:Needles) {
  return Object.values(row).some(value=>typeof value==='string'&&redactLiteral(value,scope)!==value);
}

export function containsLiteral(value:unknown,scope:Needles):boolean {
  if(typeof value==='string')return redactLiteral(value,scope)!==value;
  if(Array.isArray(value))return value.some(item=>containsLiteral(item,scope));
  if(value&&typeof value==='object')return Object.entries(value).some(([key,item])=>containsLiteral(key,scope)||containsLiteral(item,scope));
  return false;
}
