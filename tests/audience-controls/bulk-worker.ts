import authoringWorker from '../campaign-authoring/worker';
import {createFixturePlatform} from '../support/local-platform';
import {createAppServices} from '../../src/core/app/app';
import type {LocalAppBindings} from '../support/fixture-app';

export default {
  ...authoringWorker,
  async fetch(request:Request,bindings:LocalAppBindings,context:ExecutionContext) {
    if(new URL(request.url).pathname==='/_bulk/seed') {
      if(request.method!=='POST'||request.headers.get('X-Test-Token')!==bindings.LOCAL_BOOTSTRAP_TOKEN)return new Response(null,{status:403});
      const platform=createFixturePlatform(bindings,bindings.LOCAL_BOOTSTRAP_TOKEN),{audienceService}=createAppServices(platform);
      const people=[];
      for(const [index,name]of ['Amelia Rivera','Bennett Cole','Caroline Moore'].entries()) {
        const email=[`synthetic-mango-bulk-ui-${index}`,'example.test'].join('@');
        const {contact}=await audienceService.captureConsent({contact:{email,displayName:name},channel:'email',brandOrLegalSender:'Authoring test',messageCategory:index===1?'events':'harvest-news',frequencyDisclosure:'Weekly',destinationJurisdiction:'AU',captureMethod:'recorded-form',captureSource:'Synthetic harvest signup',consentText:'Send the weekly harvest letter.',consentVersion:'v1',occurredAt:new Date(Date.now()-60000),confirmationRequired:false});
        await bindings.DB.prepare("INSERT INTO integration_contact_profiles(contact_id,fields_json,tags_json) VALUES(?,?,'[]')").bind(contact.id,JSON.stringify({favourite:index===2?'Flowers':'Vegetables'})).run();
        people.push({id:contact.id,email,name});
      }
      return Response.json({people});
    }
    return authoringWorker.fetch(request,bindings,context);
  },
} satisfies ExportedHandler<LocalAppBindings>;
