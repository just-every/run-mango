import {createApp} from '@/core/app/app';
import type {AppBindings,Platform} from '@/core/shared/platform';
import {loadSenderSettings} from '@/core/features/settings/sender-persistence';
import {createSenderRenewal} from '@/core/features/sender-verification/renewal';
import {recordActivity} from '@/core/features/auth/activity-record';
import {createReportScheduler} from './report-scheduler';
/** One registration on the existing minute Cron; restore mode never sends. */
export async function runScheduledReports(controller:ScheduledController,environment:AppBindings,platformFor:(environment:AppBindings)=>Platform) {
  if(environment.MANGO_RESTORE_MODE==='1')return;
  const platform=platformFor(environment);await loadSenderSettings(platform);createApp(environment,platform);
  await createReportScheduler(platform).run(controller.scheduledTime);
  const confirmed=await platform.database.$client.prepare("SELECT 1 FROM sender_verification_observations WHERE json_extract(result_json,'$.reason')='owner-confirmed' LIMIT 1").first();
  try {if(confirmed)await createSenderRenewal(platform).run();}
  catch {await recordActivity(platform.database.$client,{key:`sender-renewal-cron:${controller.scheduledTime}`,action:'sender-renewal.refused',entityType:'sender-renewal',entityId:'current',actorId:'sender-evidence-renewal',actorType:'system',detail:{reason:'renewal-unavailable'}});}
}
