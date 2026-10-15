import type {AppConfig} from '@/core/shared/platform';
import {smsProgrammeSchema} from '@/core/features/sms/policy';
import type { Channel } from './types';

const hourMs = 60 * 60_000;

export function marketingFrequencyWindowMs(channel: Channel, config?:AppConfig) {
  if(channel==='email')return 24*hourMs;
  const module=config?.modules.sms,policy=module?.enabled?smsProgrammeSchema.safeParse(module.config.programme):undefined;
  if(!policy?.success)return Number.POSITIVE_INFINITY;
  const days={Daily:1,Weekly:7,Monthly:31}[policy.data.frequency];
  return Math.max(72*hourMs,days*24*hourMs);
}
