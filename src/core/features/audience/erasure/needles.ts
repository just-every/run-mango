import type {ErasureScope} from './types';
export type Needles=Pick<ErasureScope,'emails'|'phones'>&{literals:string[]};
/** "Mark" or "Ann" also spell ordinary words; only a multi-token value of four
 * or more characters is specific enough to match as free text. */
export const safeFreeText=(value:string)=>value.trim().length>=4&&value.trim().split(/\s+/).length>=2;
export function splitFreeText(values:unknown[]){
 const text=[...new Set(values.filter((value):value is string=>typeof value==='string'&&Boolean(value.trim())))];
 return {freeText:text.filter(safeFreeText),unsafeText:text.filter(value=>!safeFreeText(value))};
}
/** Whole-table sweeps: exact identity values only. */
export const identifierNeedles=(scope:ErasureScope):Needles=>({emails:scope.emails,phones:scope.phones,literals:scope.identifiers});
/** Rows reached through the contact's scope or attributed by an exact identifier. */
export const scopedNeedles=(scope:ErasureScope):Needles=>({emails:scope.emails,phones:scope.phones,literals:[...scope.identifiers,...scope.ips,...scope.freeText]});
/** Stored objects are owned through ids, emails or phones, never names or shared IPs. */
export const ownershipNeedles=(scope:ErasureScope):Needles=>({emails:scope.emails,phones:scope.phones,literals:[...scope.ids,...scope.emails,...scope.phones]});
export const unsafeNeedles=(scope:ErasureScope):Needles=>({emails:[],phones:[],literals:scope.unsafeText});
