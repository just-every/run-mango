import type {AdvisorySizeOptions} from './advisory-acknowledgements';
import type {LifecycleRuntime} from './types';
import {evaluateAudience} from './evaluate-audience';
import {createLifecycleRepository} from './repository';

/** Acknowledgements recheck the same eligible email identities as approval. */
export function advisorySizeOptions(runtime:LifecycleRuntime):AdvisorySizeOptions{
  return {publicBaseUrl:runtime.platform.config.publicBaseUrl.toString(),openTrackingEnabled:true,
    resolveAudience:async revision=>{
      const result=await evaluateAudience(runtime,createLifecycleRepository(runtime.platform.database),{...revision,channels:['email']},new Date());
      if(result.audience.status!=='ok'||result.blockingEligibility.size)return undefined;
      return result.candidates.filter(candidate=>candidate.channels.email).map(candidate=>candidate.contactId);
    }};
}
