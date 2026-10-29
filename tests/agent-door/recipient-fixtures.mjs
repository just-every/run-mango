import assert from 'node:assert/strict';

/** Import real source permission through Mango's reviewed, resumable CSV door.
 * Fresh recipients keep earlier phases' send history and restrictions intact. */
export async function recipients(http,suffix,consent){
 const marketing='marketing-'+suffix+'@example.test',publication='publication-'+suffix+'@example.test';
 const at=new Date(Date.now()-60000).toISOString();
 const scope=Object.fromEntries(['brandOrLegalSender','messageCategory','frequencyDisclosure','destinationJurisdiction','consentText','consentVersion']
  .map(key=>[key,consent[key]]));
 const preview=await http('/api/audience/import-preview',{files:[{name:'orchard-permission.csv',preset:'csv-subscribed',
  csv:'Email Address,OPTIN_TIME,CONFIRM_TIME\n'+[marketing,publication].map(email=>[email,at,at].join(',')).join('\n')}],consent:scope});
 let {job}=await http('/api/audience/imports',{fingerprint:preview.fingerprint});
 for(let count=0;['queued','applying'].includes(job.state)&&count<100;count++){
  ({job}=await http('/api/audience/imports/'+job.id+'/resume',{}));
 }
 assert.equal(job.state,'completed','Native reviewed CSV imports the phase recipients');
 for(const email of [marketing,publication]){
  const result=await http('/api/contacts/search?address='+encodeURIComponent(email));
  assert.equal(result.contacts.find(contact=>contact.email===email)?.emailStatus,'subscribed');
 }
 return {marketing,publication};
}
