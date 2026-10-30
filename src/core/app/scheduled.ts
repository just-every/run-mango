import {expireRecreatedContacts} from '@/core/features/audience/resubscription-expiry';
import { runLifecycleCron, type LifecycleRuntime } from '@/core/features/lifecycle';
import { summariseSignupRefusals } from '@/core/features/audience/signup-refusals';
import { schedulerObservation } from '@/core/features/lifecycle/scheduler-observation';

/** Records the production Worker scheduler entry, never an HTTP read or a deployment. */
export async function runScheduled<Environment extends {DB:D1Database; MANGO_RESTORE_MODE?:string}>(
  controller:ScheduledController, environment:Environment, runtime:(environment:Environment)=>Promise<LifecycleRuntime>,
) {
  const observations=schedulerObservation(environment.DB);
  const runId=await observations.enter(controller.scheduledTime);
  try {
    if(environment.MANGO_RESTORE_MODE==='1') {await observations.finish(runId,'blocked-restore');return;}
    await expireRecreatedContacts(environment.DB,controller.scheduledTime);
    const outcome=await runLifecycleCron(controller,await runtime(environment));
    await summariseSignupRefusals(environment.DB,controller.scheduledTime);
    await observations.finish(runId,outcome);
  } catch(error) {
    await observations.finish(runId,'failed');
    throw error;
  }
}
