import { useEffect, useState } from 'react';
import { requestJson } from '@/core/app/client/lib/api';
import type { DraftComposition } from './draft-composition';
import type { EmailSize } from '../email-size';

export function EmailSizeMeter({draft}:{draft:DraftComposition}) {
  const [report,setReport]=useState<EmailSize>(),[error,setError]=useState(false),[pending,setPending]=useState(true);
  const input=JSON.stringify({emailSubject:draft.emailSubject,emailBody:draft.emailBody,preheader:draft.preheader,physicalAddress:draft.physicalAddress,trackingEnabled:draft.trackingEnabled,inclusionRuleJson:draft.inclusionRuleJson,exclusionRulesJson:draft.exclusionRulesJson});
  useEffect(()=>{
    let current=true;setPending(true);setError(false);
    const timer=setTimeout(async()=>{
      try {
        const response=await requestJson<EmailSize>('/api/campaign-authoring/email-size',{method:'POST',body:input});
        if(current) {setReport(response.status<300?response.data:undefined);setError(response.status>=300);}
      } catch {if(current)setError(true);}
      finally {if(current)setPending(false);}
    },400);
    return ()=>{current=false;clearTimeout(timer);};
  },[input]);
  return <p className={report?.exceedsLimit?'inline-error':'muted-copy'} role="status" aria-label="Email sent size">
    {pending?'Measuring email size…':error?'Email size could not be measured. Save will check it again.':report?`Sent size upper bound: ${(report.htmlBytes/1024).toFixed(1)} KB HTML · ${(report.textBytes/1024).toFixed(1)} KB plain text · ${(report.limitBytes/1024).toFixed(1)} KB limit per part. Includes the longest saved name, footer, tracked links and room for an open-estimate pixel. ${report.exceedsLimit?'Reduce the email before saving.':''}`:''}
  </p>;
}
