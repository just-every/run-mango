import type { EvidenceState } from '@/core/features/sender-verification/types';
import type { SenderIdentity } from './sender-validation';
type PublicEvidence = { state: EvidenceState; reason: string; observedAt?: string; expiresAt?: string };
export type ReadinessState = 'observed' | 'not-observed' | 'unavailable' | 'built-in' | 'owner';
export type ReadinessItem = { key: string; label: string; state: ReadinessState; detail: string };
/** Only these public sender fields cross the settings boundary. */
export type SenderStatus = {
  identity: SenderIdentity;
  evidence?: { provider: PublicEvidence; dns: PublicEvidence; observation: PublicEvidence };
  readiness: ReadinessItem[];
  validation: {
    state: 'ready' | 'blocked' | 'unavailable' | 'error';
    ready: boolean;
    detail: string;
    checkedAt: string;
  };
};
