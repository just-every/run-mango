import type {AudiencePredicate} from '@/core/features/lifecycle/rules';
export function asRecord(value:string):Record<string,unknown> {
  try {
    const parsed:unknown=JSON.parse(value);
    return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed as Record<string,unknown>:{};
  } catch { return {}; }
}
export function fieldValue(payload:Record<string,unknown>,field:string):unknown {
  return field.split('.').reduce<unknown>((current,key)=>current&&typeof current==='object'&&!Array.isArray(current)?(current as Record<string,unknown>)[key]:undefined,payload);
}
export function matchesComparator(actual:unknown,comparator:AudiencePredicate['comparator'],expected:AudiencePredicate['value']):boolean {
  if(typeof actual!=='string'&&typeof actual!=='number'&&typeof actual!=='boolean')return false;
  if(comparator==='eq')return actual===expected;
  if(comparator==='neq')return actual!==expected;
  if(comparator==='contains')return typeof actual==='string'&&typeof expected==='string'&&actual.includes(expected);
  if(comparator==='in')return Array.isArray(expected)&&expected.includes(String(actual));
  if(typeof actual!=='number'||typeof expected!=='number')return false;
  if(comparator==='gt')return actual>expected;
  if(comparator==='gte')return actual>=expected;
  if(comparator==='lt')return actual<expected;
  if(comparator==='lte')return actual<=expected;
  return false;
}
/** Only declared monetary fields normalize decimal source strings. Other
 * properties preserve their recorded types, including legacy rules. */
export function eventFieldValue(payload:Record<string,unknown>,field:string):unknown {
  const path=field==='value'||field==='total'?'total.shop.amount':field;
  const value=fieldValue(payload,path);
  if(/^(total|currentTotal|received|refunded)\.(?:(?:shop|presentment)\.)?amount$/.test(path)&&typeof value==='string'&&value.trim()&&Number.isFinite(Number(value)))return Number(value);
  if(value===undefined&&(field==='value'||field==='total')&&typeof payload.total==='number')return payload.total;
  return value;
}
