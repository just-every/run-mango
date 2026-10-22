import type { InclusionRule } from '@/core/features/lifecycle/rules';
import { PredicateFields, newPredicate } from './audience-predicate-fields';

type Group = Omit<InclusionRule, 'version'>;

export function AudienceGroupEditor({group, label, onChange, depth = 0}: {
  group: Group; label: string; onChange: (group: Group) => void; depth?: number;
}) {
  return <fieldset className="composition-fieldset audience-condition-group">
    <legend>{depth ? `${label} group` : 'Included contacts'}</legend>
    <label>{depth ? `${label} match conditions` : 'Match conditions'}<select value={group.operator}
      onChange={event=>onChange({...group,operator:event.target.value as 'all'|'any'})}>
      <option value="all">All conditions</option><option value="any">Any condition</option>
    </select></label>
    {group.predicates.map((predicate,index)=><div className="rule-editor-group" key={index}>
      <PredicateFields predicate={predicate} label={`${label} ${index+1}`} onChange={value=>onChange({...group,predicates:group.predicates.map((item,i)=>i===index?value:item)})}/>
      {group.predicates.length+(group.groups?.length??0)>1?<button type="button" className="text-link edit-action" onClick={()=>onChange({...group,predicates:group.predicates.filter((_,i)=>i!==index)})}>Remove {depth ? label : 'inclusion'} {index+1}</button>:null}
    </div>)}
    {group.groups?.map((child,index)=><div className="rule-editor-group" key={`group-${index}`}>
      <AudienceGroupEditor group={child} label={`${label} group ${index+1}`} depth={depth+1}
        onChange={value=>onChange({...group,groups:group.groups!.map((item,i)=>i===index?value:item)})}/>
      <button type="button" className="text-link" onClick={()=>onChange({...group,groups:group.groups!.filter((_,i)=>i!==index)})}>Remove {label} group {index+1}</button>
    </div>)}
    <div className="edit-actions">
      <button type="button" className="text-link edit-action edit-action--add" onClick={()=>onChange({...group,predicates:[...group.predicates,newPredicate()]})}>{depth ? `Add ${label} condition` : 'Add inclusion condition'}</button>
      {depth<4?<button type="button" className="text-link edit-action edit-action--add" onClick={()=>onChange({...group,groups:[...group.groups??[],{operator:'any',predicates:[newPredicate()]}]})}>Add {label} group</button>:null}
    </div>
  </fieldset>;
}
