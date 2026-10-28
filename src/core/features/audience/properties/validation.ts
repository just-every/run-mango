import {PropertyError,type PropertyDefinition,type PropertyValue} from './types';

export function calendarDate(value:unknown):value is string {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const date=new Date(value+'T00:00:00.000Z');
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
/** Decimal input is converted with integer arithmetic only. API numbers are USD minor units. */
export function moneyMinor(value:unknown):number|undefined {
  if(typeof value==='number')return Number.isSafeInteger(value)?value:undefined;
  if(typeof value!=='string')return undefined;
  const match=/^(-)?\$?((?:\d{1,3}(?:,\d{3})+|\d+))(?:\.(\d{1,2}))?$/.exec(value.trim());
  if(!match)return undefined;
  const minor=BigInt(match[2].replaceAll(',',''))*100n+BigInt((match[3]??'').padEnd(2,'0'));
  const signed=match[1]?-minor:minor;
  return signed>=BigInt(Number.MIN_SAFE_INTEGER)&&signed<=BigInt(Number.MAX_SAFE_INTEGER)?Number(signed):undefined;
}
export function validateProperty(definition:PropertyDefinition,value:unknown,mode:'api'|'import'|'read'='api'):PropertyValue {
  const {key,type}=definition;
  if(value===null||value===undefined||(mode==='import'&&value===''))return null;
  if(type==='text'&&typeof value==='string'&&value.length<=2000)return value;
  if(type==='number') {
    const number=mode!=='api'&&typeof value==='string'&&/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value.trim())?Number(value):value;
    if(typeof number==='number'&&Number.isFinite(number))return number;
  }
  if(type==='money'){const minor=moneyMinor(value);if(minor!==undefined)return minor;}
  if(type==='date'&&calendarDate(value))return value;
  if(type==='boolean') {
    if(typeof value==='boolean')return value;
    if(mode!=='api'&&typeof value==='string'&&/^(true|false)$/i.test(value.trim()))return value.trim().toLowerCase()==='true';
  }
  if(type==='list'&&typeof value==='string'&&definition.options.includes(value))return value;
  throw new PropertyError(`property_invalid_${type}`,key);
}
export function formatProperty(definition:PropertyDefinition,value:PropertyValue):string|undefined {
  if(value===null)return undefined;
  if(definition.type==='money'){
    const minor=BigInt(value as number),absolute=minor<0n?-minor:minor;
    return `${minor<0n?'-':''}$${(absolute/100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',')}.${(absolute%100n).toString().padStart(2,'0')}`;
  }
  return String(value);
}
