import {attestationKeys,attestationWording,type AttestationInput,type AttestationScope} from '../../move-in/incumbent-policy';

type Source={sourceKey:string;sourceName:string;accepted:boolean;reason?:string};
type Props={sources:Source[];scope:AttestationScope;values:AttestationInput[];onChange:(value:AttestationInput)=>void;disabled:boolean;title?:string};
/** Every statement starts unanswered; source consent is never inferred from a file. */
export function IncumbentAttestations({sources,scope,values,onChange,disabled,title='Mailchimp-held consent'}:Props) {
  return <section className="panel audience-import-panel" aria-labelledby="incumbent-title">
    <h2 id="incumbent-title">{title}</h2>
    <p>Review each moved audience separately. An unanswered statement or “not sure” keeps its rows non-subscribed. Restrictions always win. This records your attestation and sends no confirmation message.</p>
    {sources.map((source,index)=>{
      const wording=attestationWording(scope,source.sourceName.includes(' — ')?source.sourceName.split(' — ')[0]:'Mailchimp');
      const value=values.find(row=>row.sourceKey===source.sourceKey);
      const update=(change:Partial<AttestationInput>)=>onChange({...value??{nonce:crypto.randomUUID(),sourceKey:source.sourceKey,typedSource:'',answers:{brand:'',category:'',frequency:'',jurisdiction:'',wording:'',notPurchased:''}},...change});
      return <fieldset className="audience-import-mapping-file" key={source.sourceKey} disabled={disabled}><legend>{source.sourceName}</legend>
        {attestationKeys.map(key=><fieldset key={key}><legend>{wording[key]}</legend>
          <label><input type="radio" name={`attest-${index}-${key}`} checked={value?.answers[key]==='yes'} onChange={()=>update({answers:{brand:'',category:'',frequency:'',jurisdiction:'',wording:'',notPurchased:'',...value?.answers,[key]:'yes'}})}/> I attest</label>{' '}
          <label><input type="radio" name={`attest-${index}-${key}`} checked={value?.answers[key]==='not-sure'} onChange={()=>update({answers:{brand:'',category:'',frequency:'',jurisdiction:'',wording:'',notPurchased:'',...value?.answers,[key]:'not-sure'}})}/> Not sure</label>
        </fieldset>)}
        <div className="audience-import-consent-grid">
          <label>Type the source name to confirm: {source.sourceName}<input value={value?.typedSource??''} onChange={event=>update({typedSource:event.currentTarget.value})}/></label>
          <label>Export creation time (UTC, for rows with no recorded time)<input type="datetime-local" value={value?.exportCreatedAt?.slice(0,16)??''} onChange={event=>update({exportCreatedAt:event.currentTarget.value?event.currentTarget.value+':00Z':undefined})}/></label>
        </div>
        <p className="quiet-caption">{source.accepted?'Attestation affirmed in the current preview.':`Preview reason: ${source.reason??'attestation-missing'}.`} Preview again after changing answers.</p>
      </fieldset>;
    })}
  </section>;
}
