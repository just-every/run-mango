import { audienceRuleComparisons } from '../audience-rule-labels';
import type { Predicate } from './audience-predicate-fields';

export function EventPropertyFilters({predicate,label,onChange}: {predicate:Predicate;label:string;onChange:(value:Predicate)=>void}) {
  const filters=predicate.filters??[];
  return <fieldset className="composition-fieldset"><legend>{label} event property filters</legend>
    <p className="muted-copy">Count only orders matching every filter below. Each order counts once.</p>
    {filters.map((filter,index)=><div className="rule-editor-group" key={index}>
      <div className="rule-editor-row">
        <label>{label} filter {index+1} property<select aria-label={`${label} filter ${index+1} property`} value={filter.field} onChange={event=>onChange({...predicate,filters:filters.map((item,i)=>i===index?{...item,field:event.target.value}:item)})}>
          <option value="total.shop.amount">Order value</option><option value="total.shop.currency">Order currency</option><option value="financialStatus">Financial status</option><option value="customer.location.provinceCode">Customer state</option>
        </select></label>
        <label>{label} filter {index+1} comparison<select aria-label={`${label} filter ${index+1} comparison`} value={filter.comparator} onChange={event=>onChange({...predicate,filters:filters.map((item,i)=>i===index?{...item,comparator:event.target.value as Predicate['comparator']}:item)})}>{audienceRuleComparisons.filter(([value])=>value!=='in').map(([value,title])=><option key={value} value={value}>{title}</option>)}</select></label>
        <label>{label} filter {index+1} value<input aria-label={`${label} filter ${index+1} value`} value={String(filter.value)} onChange={event=>onChange({...predicate,filters:filters.map((item,i)=>i===index?{...item,value:filter.field==='total.shop.amount'&&event.target.value.trim()&&Number.isFinite(Number(event.target.value))?Number(event.target.value):event.target.value}:item)})}/></label>
      </div>
      <button type="button" className="text-link" onClick={()=>onChange({...predicate,filters:filters.filter((_,i)=>i!==index)})}>Remove {label} event filter {index+1}</button>
    </div>)}
    <button type="button" className="text-link edit-action edit-action--add" onClick={()=>onChange({...predicate,filters:[...filters,{field:'total.shop.amount',comparator:'gt',value:50}]})}>Add {label} event filter</button>
  </fieldset>;
}
