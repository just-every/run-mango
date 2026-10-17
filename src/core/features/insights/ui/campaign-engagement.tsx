import './report-tables.css';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useDateFormatter } from '@/core/app/client/lib/use-date-formatter';
import { useResource } from '@/core/app/client/lib/use-resource';
import { requestJson } from '@/core/app/client/lib/api';
import { sanitizeEmailPreview, previewDocument } from '@/core/features/campaigns/ui/sanitize-email-preview';
import { escapeHtml } from '@/core/features/campaigns/email-html-policy';
import type { CampaignEngagement as Engagement } from '../campaign-engagement';
import type { CampaignLinkClickers } from '../campaign-engagement-clickers';

export function CampaignEngagement({campaignId,revisionId,emailBody}:{campaignId:string;revisionId:string;emailBody?:string}) {
  const base=`/api/campaigns/${campaignId}`,query=`revisionId=${encodeURIComponent(revisionId)}`;
  const {data,error}=useResource<Engagement>(`${base}/engagement?${query}`),[destination,setDestination]=useState('');
  if(!data)return <section className="panel"><h2>Link engagement</h2><p>{error?'Link engagement could not be loaded.':'Loading recorded clicks…'}</p></section>;
  let html=emailBody===undefined?'':sanitizeEmailPreview(emailBody,false,true).html;
  for(const link of data.links) {
    const title=`title="${escapeHtml(link.destinationUrl)}"`;
    html=html.replaceAll(`${title}>`,`${title}><mark style="background:#fff1ac;color:#242821"><strong>[${link.totalClicks} clicks · ${link.uniqueClicks} people]</strong></mark> `);
  }
  return <section className="panel" aria-labelledby="link-engagement-title"><h2 id="link-engagement-title">Link engagement</h2><p>Human clicks and people are separate from automated requests. Repeated positions using the same destination share one count.</p><p>{data.coverage}</p>
    <a className="text-link" href={`${base}/engagement?${query}&format=csv`}>Export link totals CSV</a>
    {data.links.length?<><div className="table-scroll" tabIndex={0} role="region" aria-label="Link click totals"><table className="responsive-table report-table" aria-label="Clicks by link"><thead><tr><th>Link</th><th>Clicks</th><th>People</th><th>Automated</th><th>Details</th></tr></thead><tbody>{data.links.map(link=><tr key={link.destinationUrl}><th scope="row">{link.label}<small style={{display:'block',overflowWrap:'anywhere'}}>{link.destinationUrl}</small></th><td data-label="Clicks">{link.totalClicks}</td><td data-label="People">{link.uniqueClicks}</td><td data-label="Automated">{link.automatedRequests}</td><td data-label="Details"><button type="button" className="text-link" onClick={()=>setDestination(link.destinationUrl)}>View clickers: {link.label}</button></td></tr>)}</tbody></table></div>
      {emailBody===undefined?null:<><h3>Click map</h3><p>Counts over the saved revision. Images stay blocked and links are inactive.</p><iframe title="Campaign click map" sandbox="" referrerPolicy="no-referrer" srcDoc={previewDocument(html,false)} style={{width:'100%',height:400,border:'1px solid #c8c5b9',borderRadius:8}}/></>}
    </>:<p>No saved tracked links for this revision.</p>}
    {destination?<Clickers key={destination} campaignId={campaignId} revisionId={revisionId} destinationUrl={destination}/>:null}
  </section>;
}
function Clickers({campaignId,revisionId,destinationUrl}:{campaignId:string;revisionId:string;destinationUrl:string}) {
  const formatDate=useDateFormatter();
  const query=new URLSearchParams({revisionId,destinationUrl}),url=`/api/campaigns/${campaignId}/clickers?${query}`;
  const {data,error}=useResource<CampaignLinkClickers>(url),[notice,setNotice]=useState('');
  const segment=async()=>{
    try {
      const response=await requestJson<{error?:string;detail?:string}>(`/api/campaigns/${campaignId}/report-segment`,{method:'POST',body:JSON.stringify({revisionId,destinationUrl,name:'Clickers: '+destinationUrl.slice(0,140)})});
      setNotice(response.status===201?'Saved clicker segment. Current consent and suppression still apply.':response.data.detail??response.data.error??'Segment could not be saved.');
    } catch {setNotice('Segment could not be confirmed. Check saved segments before retrying.');}
  };
  return <section aria-label="Link clickers"><h3>People who clicked</h3><p style={{overflowWrap:'anywhere'}}>{destinationUrl}</p>{!data?<p>{error?'Clickers could not be loaded.':'Loading clickers…'}</p>:<><p>{data.total} identified people</p><div className="detail-actions"><a className="text-link" href={`${url}&format=csv`}>Export clickers CSV</a><button type="button" className="secondary-action" disabled={!data.total} onClick={()=>void segment()}>Save clickers as segment</button></div><ul>{data.rows.map(row=><li key={row.contactId}><Link to="/app/audience/$id" params={{id:row.contactId}}>{row.displayName}</Link> · {row.clicks} clicks · first {formatDate(row.firstClickedAt)} · last {formatDate(row.lastClickedAt)}</li>)}</ul></>}{notice?<p role="status">{notice}</p>:null}</section>;
}
