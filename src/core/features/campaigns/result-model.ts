/** Stored dispositions are exclusive. Acceptance and handoff timestamps are not extra buckets. */
export type DispositionCount = { disposition: string; reason: string | null; count: number };
export type StepResult = {
  stepId: string;
  state: 'Scheduled' | 'Sending' | 'Sent' | 'Cancelled' | 'Failed' | 'Missed' | 'Paused' | 'Completed';
  startedAt: string | null;
  completedAt: string | null;
  estimatedCompletionAt?:string|null;
  pauses?:Array<{reason:string;detail:string;resumedAt:string|null;nextProbeAt:string|null}>;
  outageNotices?:Array<{state:string;count:number;code:string|null}>;
  counts: DispositionCount[];
  failures: Array<{ code: string; detail: string; count: number }>;
  stoppableCount: number;
  expiredQueuedCount: number;
  inFlightCount: number;
  complainedCount: number;
  suppressedCount: number;
};
export type CampaignResults = { asOf: string; cancellable: boolean; steps: StepResult[] };
export type CampaignFilters = { state?: string; channel?: 'email' | 'sms' };
export const campaignStates = ['draft', 'erasure-invalidated', 'scheduled', 'dispatching', 'paused', 'completed', 'cancelled', 'failed'] as const;
export function campaignStateLabel(state: string) {
  if(state==='erasure-invalidated')return 'Review required after erasure';
  return state === 'dispatching' ? 'Sending' : state.charAt(0).toUpperCase() + state.slice(1);
}
export function stepResultState(input: {
  campaignState: string; startedAt: number | null; sendByAt: number; now: number;
  counts: DispositionCount[]; pendingBeforeDeadline: number; inFlightCount?: number;
}): StepResult['state'] {
  const count = (disposition: string) => input.counts.filter(row => row.disposition === disposition).reduce((sum, row) => sum + row.count, 0);
  const cancelled = input.counts.some(row => row.reason === 'campaign-cancelled');
  if (input.campaignState === 'cancelled' && (cancelled || input.startedAt === null)) return 'Cancelled';
  if (input.campaignState === 'paused' && input.pendingBeforeDeadline) return 'Paused';
  if (input.inFlightCount || count('handoff-unknown')) return 'Sending';
  if (input.pendingBeforeDeadline) return input.startedAt === null ? 'Scheduled' : 'Sending';
  if (count('handed-off') + count('accepted') + count('delivered') + count('bounced')) return 'Sent';
  if (count('failed')) return 'Failed';
  if (input.startedAt === null && input.sendByAt <= input.now) return 'Missed';
  if (cancelled) return 'Cancelled';
  if (input.startedAt !== null) return 'Completed';
  return 'Scheduled';
}
