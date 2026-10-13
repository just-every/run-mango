import { generateKeyPairSync, sign, type KeyObject } from 'node:crypto';

// A locally generated Event Webhook key pair. SendGrid signs the timestamp
// header followed by the unchanged body with ECDSA P-256/SHA-256 (DER, base64).
export function eventSigner() {
  const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' }), other = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const headers = (body: Buffer, timestamp = String(Math.floor(Date.now() / 1000)), key: KeyObject = pair.privateKey) => ({
    'Content-Type': 'application/json', 'X-Twilio-Email-Event-Webhook-Timestamp': timestamp,
    'X-Twilio-Email-Event-Webhook-Signature': sign('sha256', Buffer.concat([Buffer.from(timestamp), body]), key).toString('base64') });
  return { publicKey: pair.publicKey.export({ type: 'spki', format: 'der' }).toString('base64'), headers, forgingKey: other.privateKey };
}

// One SendGrid event as the Event Webhook posts it: custom_args are top-level
// fields, sg_message_id extends the X-Message-Id returned at hand-off.
export function event(kind: string, email: string, at: number, messageId: string, args: Record<string, string>, extra: Record<string, unknown> = {}) {
  return { email, timestamp: Math.floor(at / 1000), event: kind, sg_event_id: `${kind}-${email}-${at}`,
    sg_message_id: `${messageId}.recvd-5f8c-1-0`, ...args, ...extra };
}
