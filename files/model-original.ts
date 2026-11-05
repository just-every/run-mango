/** Shared vocabulary of in-composer design generation (DESIGN-001 to DESIGN-003), used by the Worker and the editor. */

export const designJobStates = ['drafting', 'choosing', 'preparing', 'ready', 'applied', 'discarded', 'failed'] as const;
export type DesignJobState = typeof designJobStates[number];
/** States in which Mango is still waiting on the design service. */
export const workingStates: readonly DesignJobState[] = ['drafting', 'preparing'];

/** Why a working run is waiting before its next request to 12ui. */
export type DesignWaitCode = 'provider_quota' | 'provider_unavailable';

export const designFailureCodes = ['module_unavailable', 'provider_unauthorized', 'provider_rejected', 'provider_quota', 'provider_unavailable',
  'provider_invalid', 'provider_failed', 'provider_timeout', 'invalid_layout'] as const;
export type DesignFailureCode = typeof designFailureCodes[number];

/** Mango's own words for each failure. The design service's text is never stored or shown. */
export const designFailureReasons: Record<DesignFailureCode, string> = {
  module_unavailable: 'design generation is not configured on this deployment.',
  provider_unauthorized: '12ui refused the API key this deployment holds.',
  provider_rejected: '12ui refused the request.',
  provider_quota: "12ui's daily allowance or your 12ui wallet is used up.",
  provider_unavailable: '12ui could not be reached.',
  provider_invalid: '12ui answered with something Mango could not read.',
  provider_failed: '12ui could not finish the design.',
  provider_timeout: '12ui did not finish in time.',
  invalid_layout: 'the design came back as a layout Mango cannot build an email from.',
};

/** Mango's words for a failure of the layout step: the designs were drawn and stay on offer. */
export const layoutFailureReasons: Record<DesignFailureCode, string> = {
  ...designFailureReasons,
  provider_rejected: '12ui refused the layout request.',
  provider_quota: "12ui's daily layout allowance or your 12ui wallet is used up. Top up the wallet on 12ui, or wait for the allowance to renew, then try again.",
  provider_failed: '12ui could not finish the layout.',
  provider_timeout: '12ui did not finish the layout in time.',
  invalid_layout: 'the layout came back in a form Mango cannot build an email from.',
};

/** A run's designs that were drawn (and paid for) and can still be used. */
export const designsOnOffer = (job: DesignJobView) =>
  ['choosing', 'preparing', 'ready', 'failed'].includes(job.state) ? job.candidates.filter(candidate => candidate.state === 'succeeded') : [];

export type DesignCandidateView = { slot: string; state: 'succeeded' | 'failed'; imageUrl?: string; width?: number; height?: number; bytes?: number };
export type DesignJobView = {
  id: string; campaignId: string; state: DesignJobState; brief: string; candidateCount: number; chosenSlot?: string;
  errorCode?: DesignFailureCode; createdAt: number; updatedAt: number; deadlineAt: number;
  /** Present while a working run waits on 12ui, until 12ui answers again: why, and when Mango asks (or asked) again. */
  waiting?: { reason: DesignWaitCode; retryAt: number };
  candidates: DesignCandidateView[]; layerDocUrl?: string;
};
/** `job` is the draft's latest run; `earlier` are older runs whose paid designs are still on offer, newest first. */
export type DesignGenerationStatus = { enabled: boolean; detail?: string; job?: DesignJobView; earlier?: DesignJobView[] };

/** Candidate slots in the order the design service names them. */
export const candidateSlots = ['a', 'b', 'c', 'd'] as const;
export const minCandidates = 2, maxCandidates = 4, maxBriefCharacters = 4000;

/** 12ui list prices and free daily allowance as published on 12 October 2026, for the estimate shown before each paid
 * step. Mango never charges or caps anything: spend happens on the owner's own 12ui account. */
export const designPrices = { candidateUsd: 0.03, layoutUsd: 0.05, freeImagesPerDay: 20, freeLayoutsPerDay: 50 } as const;
const dollars = (value: number) => `$${value.toFixed(2)}`;
export const draftEstimate = (candidates: number) =>
  `About ${dollars(candidates * designPrices.candidateUsd)} on your 12ui account (${candidates} designs at about ${dollars(designPrices.candidateUsd)} each), or free within 12ui's daily allowance of ${designPrices.freeImagesPerDay} images.`;
export const layoutEstimate = () =>
  `About ${dollars(designPrices.layoutUsd)} on your 12ui account for the layout, or free within 12ui's daily allowance of ${designPrices.freeLayoutsPerDay} layouts.`;

/** Removes `{{…}}` personalisation and managed tokens: a brief never carries one to the design service (DESIGN-003). */
export function briefWithoutTokens(text: string) {
  return text.replace(/\{\{[^{}]*\}\}/g, ' ').replace(/[{}]/g, '').replace(/[ \t]+/g, ' ').replace(/ ([,.;:!?])/g, '$1').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
