/** Group the exact API counts into record kinds an operator can understand. */
export function receiptCounts(removed:Record<string,number>):Array<[string,number]>{
  const counts=new Map<string,number>();
  for(const [table,count] of Object.entries(removed)){
    if(count<=0)continue;
    const kind=table.startsWith('ik_')||table.startsWith('audience_import_')||table.startsWith('mango_import_')||table==='contact_import_rows'?'Import files and provenance'
      :table==='lifecycle_audit_entries'?'Audit entries anonymised'
      :table==='contact_history'?'Contact history'
      :table.startsWith('consent_')?'Consent records'
      :table.startsWith('source_')||table==='commerce_source_capabilities'?'Source records'
      :table.startsWith('campaign')||table.startsWith('proposal')||table==='audience_segments'?'Saved audiences and campaigns'
      :table.includes('token')||table.includes('rate_limit')||table==='oa_limits'||table==='audience_signup_requests'?'Signup requests, tokens and limits'
      :table==='transfer_artifacts'?'Archive and restore artifacts'
      :table==='stored_objects'?'Stored files'
      :table.startsWith('contact')||table==='mango_audience_hashes'?'Contact details and preferences'
      :'Messages, links and delivery records';
    counts.set(kind,(counts.get(kind)??0)+count);
  }
  return [...counts];
}
