export const propertyTypes = ['text','number','money','date','boolean','list'] as const;
export type PropertyType = typeof propertyTypes[number];
export type PropertyDefinition = {key:string;label:string;type:PropertyType;options:string[]};
export type PropertyValue = string | number | boolean | null;
export type PropertySource = {kind:'import'|'api'|'operator'|'merge';label:string;reference?:string;column?:string};
export type PropertyChange = {key:string;oldValue:unknown;newValue:PropertyValue;source:PropertySource};
export class PropertyError extends Error {
  constructor(readonly code:string,readonly key:string,readonly status:400|404|409=400){super(`${code}: ${key}`);}
}
