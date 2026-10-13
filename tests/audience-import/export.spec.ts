import {test,expect} from '@playwright/test';
import {native,files,consent,finish} from './native';
import {parseCsv} from '../../src/core/features/audience/csv';
test('CONT-003/004/006/010 CSV roundtrip into a fresh differently salted D1 preserves all statuses and consent',async()=>{
 const first=await native('first-salt');let exported:string;try{const preview=await first.service.preview({files:await files(),consent},first.context);const job=await first.service.create(preview.fingerprint,first.context);await finish(first,job.id);
  await first.f.services.audienceService.captureConsent({contact:{email:'native@example.test'},channel:'email',...consent,captureMethod:'original-form',captureSource:'https://example.test/signup',captureIp:'192.0.2.99',occurredAt:new Date(),confirmationRequired:false});
  await first.f.services.audienceService.recordProviderSuppression({destination:'native@example.test',channel:'email',cause:'hard',occurredAt:new Date(),providerEventId:'native-bounce'});
  await first.f.services.audienceService.captureConsent({contact:{phone:'+61400111222'},channel:'sms',...consent,smsProgram:'Newsletter',captureMethod:'original-sms-form',captureSource:'https://example.test/sms',occurredAt:new Date(),confirmationRequired:false});
  await first.f.services.audienceService.recordChannelOptOut({destination:'+61400111222',channel:'sms',reason:'STOP',occurredAt:new Date()});
  exported=await first.service.exportCsv();
 }finally{await first.close();}
 const second=await native('second-salt');try{const preview=await second.service.preview({files:[{name:'audience.csv',preset:'mango',csv:exported!}]},second.context);expect(preview.rows.filter(row=>row.reason)).toEqual([]);const job=await second.service.create(preview.fingerprint,second.context);await finish(second,job.id);
  const restored=await second.service.exportCsv();
  expect(restored).toBe(exported!);
  const projection=(csv:string)=>parseCsv(csv).map(({ledger_json,...row})=>({row,consent:JSON.parse(ledger_json).tables.consent_evidence,metadata:JSON.parse(ledger_json).tables.consent_capture_metadata,observations:JSON.parse(ledger_json).tables.audience_import_observations})).sort((a,b)=>a.row.email.localeCompare(b.row.email));
  expect(projection(restored)).toEqual(projection(exported!));
  const native=(await second.f.services.audienceService.list()).find(row=>row.email==='native@example.test');expect(native?.emailStatus).toBe('suppressed');
  expect(await second.f.db.prepare("SELECT count(*) AS count FROM contact_suppressions WHERE destination_hash IN (SELECT destination_hash FROM surviving_opt_outs)").first()).toEqual({count:2});
 }finally{await second.close();}
});
