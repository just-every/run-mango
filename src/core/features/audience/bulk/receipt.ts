import type {BulkJob} from './types';
export async function readBulkReceipt(db:D1Database,id:string) {
  const job=await db.prepare('SELECT * FROM contact_bulk_jobs WHERE id=?').bind(id).first<BulkJob>();if(!job)return null;
  const counts=(await db.prepare('SELECT state,count(*) n FROM contact_bulk_items WHERE job_id=? GROUP BY state').bind(id).all<{state:string;n:number}>()).results;
  const count=(state:string)=>counts.find(row=>row.state===state)?.n??0;
  const refusals=(await db.prepare("SELECT i.contact_id contactId,c.display_name displayName,i.reason FROM contact_bulk_items i LEFT JOIN contacts c ON c.id=i.contact_id WHERE i.job_id=? AND i.state='refused' ORDER BY i.ordinal").bind(id).all()).results;
  return {id:job.id,action:job.action,value:job.value,channel:job.channel,createdAt:job.created_at,state:job.state,total:job.total,processed:count('succeeded')+count('refused'),succeeded:count('succeeded'),refused:count('refused'),error:job.error,refusals};
}
