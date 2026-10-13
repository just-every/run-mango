import type { DeliveryRequest } from '@/core/shared/platform';

export type EvidenceState = 'passed' | 'missing' | 'unknown' | 'failed' | 'stale' | 'revoked';
export type EvidenceStatus = { state: EvidenceState; reason: string; observedAt?: number; expiresAt?: number };
export type SenderLease = {
  id: string; stateId: string; generation: number; bindingDigest: string;
  configurationDigest: string; observationId: string; expiresAt: number;
};
export type SenderInspection = {
  ready: boolean; reason: string; checkedAt: number; expiresAt: number;
  provider: EvidenceStatus; dns: EvidenceStatus; observation: EvidenceStatus;
  authentication: { spf: boolean; dkim: boolean; dmarc: boolean; aligned: boolean };
  lease?: SenderLease;
};
export type SenderBinding = {
  deployment: string; from: string; mailbox: string; domain: string;
  provider: 'resend' | 'sendgrid'; accountScope: string; credentialGeneration: string;
  transport: string; connectorId: string | null;
};
export type DomainRecord = { record: 'SPF' | 'DKIM'; name: string; type: 'TXT' | 'MX' | 'CNAME'; value: string; priority?: number };
export type ProviderDomain = { id: string; name: string; region: string; records: DomainRecord[]; settings: string };
export type DnsAnswer = { name: string; type: number; TTL: number; data: string };
export type DnsSnapshot = { answers: DnsAnswer[]; expiresAt: number };
export type Challenge = {
  id: string; stateId: string; generation: number; bindingDigest: string; configurationDigest: string;
  recipient: string; connectorId: string; nonce: string; request: DeliveryRequest;
  requestDigest: string; reconciliationCursor?: string; providerMessageId?: string; sentAt?: number; createdAt: number; expiresAt: number;
};
/** Internal receiver connector contract. It MUST fetch original material through its
 * authenticated mailbox API and identify the receiver-added result, never accept
 * uploaded headers. No implementation is configured before receiver selection. */
export interface ReceiverConnector {
  readonly id: string;
  readonly recipient: string;
  acquire(challenge: Readonly<Challenge>): Promise<ReceiverMaterial>;
}
export type ReceiverMaterial = {
  receiptId: string; originalDigest: string; receivedAt: number; from: string; to: string;
  providerMessageId: string; requestDigest: string; nonce: string;
  // The connector verifies original signed body coverage (no DKIM l= truncation),
  // authoritative receiver result provenance, and the API's authenticated account.
  signedBody: { digest: string; complete: boolean; nonce: string };
  authentication: {
    spf: { result: string; mailFromDomain: string };
    dkim: { result: string; domain: string; selector: string; keyDigest: string };
    dmarc: { result: string; fromDomain: string; semantics: 'rfc9989' };
  };
};
export class VerificationError extends Error {
  providerVerified = false;
  constructor(readonly reason: string, readonly state: 'unknown' | 'failed' = 'failed') { super(reason); }
}
