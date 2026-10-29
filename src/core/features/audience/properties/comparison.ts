import type {AudiencePredicate} from '@/core/features/lifecycle/rules';
import type {PropertyDefinition} from './types';
import {readTypedProperty} from './read';
import {calendarDate} from './validation';
import {matchesComparator} from '../rule-values';
export const propertyComparisons:Record<PropertyDefinition['type'],ReadonlyArray<AudiencePredicate['comparator']>>={
  text:['eq','neq','contains'],number:['eq','neq','gt','gte','lt','lte'],money:['eq','neq','gt','gte','lt','lte'],date:['on','before','after','within_last','not_within_last'],boolean:['eq','neq'],list:['contains'],
};
export function validPropertyPredicate(definition:PropertyDefinition,predicate:AudiencePredicate) {
  if(!propertyComparisons[definition.type].includes(predicate.comparator))return false;
  if(definition.type==='date')return ['within_last','not_within_last'].includes(predicate.comparator)?typeof predicate.value==='number'&&Number.isInteger(predicate.value)&&predicate.value>=0&&predicate.value<=3650:calendarDate(predicate.value);
  if(definition.type==='money')return typeof predicate.value==='number'&&Number.isSafeInteger(predicate.value);
  if(definition.type==='number')return typeof predicate.value==='number'&&Number.isFinite(predicate.value);
  if(definition.type==='boolean')return typeof predicate.value==='boolean';
  if(definition.type==='list')return typeof predicate.value==='string'&&definition.options.includes(predicate.value);
  return typeof predicate.value==='string';
}
export function matchesProperty(definition:PropertyDefinition,fields:Record<string,unknown>,predicate:AudiencePredicate,now:Date) {
  if(!validPropertyPredicate(definition,predicate))return false;
  const {value,error}=readTypedProperty(definition,fields);if(error||value===null)return false;
  if(definition.type==='date'){
    const actual=value as string,expected=predicate.value as string;
    if(predicate.comparator==='on')return actual===expected;
    if(predicate.comparator==='before')return actual<expected;
    if(predicate.comparator==='after')return actual>expected;
    const today=now.toISOString().slice(0,10),from=new Date(Date.parse(today+'T00:00:00Z')-Number(predicate.value)*86400000).toISOString().slice(0,10);
    const within=actual>=from&&actual<=today;
    return predicate.comparator==='within_last'?within:!within;
  }
  if(definition.type==='list')return Array.isArray(value)&&value.includes(String(predicate.value));
  return matchesComparator(value,predicate.comparator,predicate.value);
}
