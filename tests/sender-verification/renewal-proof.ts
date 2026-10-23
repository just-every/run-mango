import {testIdentity} from '../support/test-identity';
import {createSenderVerification} from '../../src/core/features/sender-verification/service';
import {createSenderRenewal} from '../../src/core/features/sender-verification/renewal';
import {composeFixture} from './test-runtime';

export async function proveRenewal(f:ReturnType<typeof composeFixture>) {
  const initial=Date.now(),day=86400000;let now=initial;
  const verification=createSenderVerification({database:f.platform.database,config:f.platform.config,clock:()=>now});
  f.platform.senderVerification=verification;
  const owner=await f.db.prepare("SELECT n.id,n.email FROM oa_operators n JOIN operators p ON p.id=n.id WHERE n.status='active' ORDER BY n.created_at LIMIT 1").first<{id:string;email:string}>();
  if(!owner)throw new Error('Renewal fixture owner missing.');
  await testIdentity(f.platform).importLocalDemoOperator({id:'renewal-second-owner',email:'renewal-owner@example.test',displayName:'Renewal owner'},new Date(initial));
  await f.db.prepare("INSERT INTO operator_product_roles(operator_id,role,unmasked_contacts,updated_by,updated_at) VALUES('renewal-second-owner','owner',0,?,?)").bind(owner.id,initial).run();
  await verification.sendOwnerConfirmation(owner.email,f.platform.mailer);
  const text=f.outbound.at(-1)!.text as string,link=new URL(text.match(/https:\/\/\S+\/sender-check\/\S+/)![0]);
  await verification.confirmOwnerReceipt(link.pathname.split('/').at(-1)!,link.searchParams.get('key')!);
  const renewal=createSenderRenewal(f.platform,()=>now),before=f.outbound.length;
  now=initial+22*day;const day22=await renewal.read();await renewal.run();const sends22=f.outbound.length-before;
  now=initial+23*day;const day23=await renewal.read();await renewal.run();const first=f.outbound.length;await renewal.run();
  const replay=f.outbound.length-first,delivered23=f.outbound.slice(before).map(row=>({subject:row.subject,to:row.to}));
  now=initial+29*day;await renewal.run();const sends29=f.outbound.length-first;
  now=initial+31*day;const day31=await renewal.read();
  now=initial+day;f.status('not_started');const changed=await renewal.read();
  const rows=(await f.db.prepare('SELECT kind,stage,state,count(*) count FROM sender_renewal_deliveries GROUP BY kind,stage,state ORDER BY kind,stage,state').all()).results;
  return {day22,sends22,day23,delivered23,replay,sends29,day31,changed,rows};
}
