import {createAppServices} from '../../src/core/app/app';
import {fixture} from '../prior-approval/fixture';
import {createAudienceImportService} from '../../src/core/features/audience/import-service';
import {createAudienceImportTarget} from '../../src/core/features/audience/import-target';
import type {D1ImportContext} from '../../src/vendor/base/import-kit/src/d1/index';
import {readFile} from 'node:fs/promises';
export const consent={brandOrLegalSender:'Mango',messageCategory:'newsletter',frequencyDisclosure:'Weekly',destinationJurisdiction:'AU',consentText:'I agree to receive weekly newsletters.',consentVersion:'original-v1'};
export async function native(salt?:string){
 const harness=await fixture(false);const f=harness.current;if(salt){f.platform.config.contactHashSalt=salt;f.services=createAppServices(f.platform);}
 await f.db.prepare('CREATE TABLE test_import_authority(id TEXT PRIMARY KEY,active INTEGER NOT NULL)').run();
 await f.db.prepare("INSERT INTO test_import_authority VALUES('operator',1)").run();
 const context:D1ImportContext={destination:'mango',namespace:'mango-audience-v1',mappingVersion:'mango-audience-v1',batchSize:1,maxBatches:1,
 storage:{database:f.db,targets:createAudienceImportTarget(f.platform.config.contactHashSalt)},authorization:{principalId:'operator',predicate:()=>({sql:"EXISTS(SELECT 1 FROM test_import_authority WHERE id='operator' AND active=1)"})}};
 return {f,context,service:createAudienceImportService(f.platform),restart:()=>harness.restart(),close:()=>harness.dispose()};
}
export async function files(){return Promise.all(['subscribed','unsubscribed','cleaned'].map(async status=>({name:`${status}.csv`,preset:`csv-${status}`,csv:await readFile(`tests/audience-import/fixtures/mailchimp-${status}.csv`,'utf8')})));}
export async function finish(h:Awaited<ReturnType<typeof native>>,id:string){let job=await h.service.read(id,h.context);while(['queued','applying','undoing'].includes(job.state))job=await h.service.resume(id,h.context);return job;}
