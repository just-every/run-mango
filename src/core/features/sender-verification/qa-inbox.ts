// @ts-expect-error Base mail validates and decodes identity headers at the MIME boundary.
import { parseAddress } from '@/vendor/base/mail/src/core/validation.mjs';
// @ts-expect-error Portable Base mail header decoder.
import { words } from '@/vendor/base/mail/src/inbound/headers.mjs';
// @ts-expect-error Base mail exposes portable MIME normalization as ESM.
import { normalizeInbound } from '@/vendor/base/mail/src/inbound/index.mjs';
import { digest } from './identity';
import { receiptConfiguration } from './receipt-configuration';
import { createDnsInspection, tags } from './dns';
import { signedBodyCoverage, headersFromMime } from './qa-inbox-mime';
import { VerificationError, type ReceiverConnector, type Challenge, type ReceiverMaterial } from './types';

export function createReceiptConnector(receiptUrl: string, configuredRecipient?: string, transport: typeof fetch = fetch): ReceiverConnector {
  const { base, recipient, id } = receiptConfiguration(receiptUrl, configuredRecipient);
  const get = async (url: URL) => {
    try {
      if (url.origin !== base.origin) throw new Error('origin');
      const response = await transport(url, { redirect: 'error', signal: AbortSignal.timeout(10_000) });
      if (!response.ok || response.redirected || (response.url && new URL(response.url).origin !== base.origin)) throw new Error('response');
      return response;
    } catch { throw new VerificationError('receiver-unavailable', 'unknown'); }
  };
  return { id, recipient, async acquire(challenge: Readonly<Challenge>): Promise<ReceiverMaterial> {
    try {
      if (!challenge.sentAt || !challenge.providerMessageId || challenge.recipient !== this.recipient) throw new VerificationError('receiver-correlation-mismatch');
      const query = new URL(base); query.searchParams.set('since',String(challenge.sentAt)); query.searchParams.set('to',this.recipient); query.searchParams.set('contains',challenge.nonce);
      const data = await (await get(query)).json() as { receipts: Array<Record<string, any>> };
      if (!data || !Array.isArray(data.receipts) || data.receipts.length !== 1) throw new VerificationError('receiver-message-missing','unknown');
      const receipt = data.receipts[0], auth = receipt?.auth;
      if (auth?.trusted !== 'authentication-results' || !auth.headers || !Array.isArray(auth.headers.authenticationResults)) throw new VerificationError('receiver-authentication-missing');
      const trusted = auth.headers.authenticationResults.filter((h: {trusted: boolean}) => h?.trusted === true);
      if (trusted.length !== 1 || typeof trusted[0].value !== 'string' || !trusted[0].value.startsWith('mx.cloudflare.net;') || !auth.dkimDomain) throw new VerificationError('receiver-authentication-missing');
      if (typeof receipt.id !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(receipt.id) || receipt.rawUrl !== `/receipts/${receipt.id}/raw`) throw new VerificationError('receiver-raw-missing');
      const url = new URL(base); url.pathname = receipt.rawUrl;
      const raw = await (await get(url)).text();
      if (new TextEncoder().encode(raw).length !== receipt.size || receipt.size > 1024*1024) throw new VerificationError('receiver-raw-incomplete');
      const {headers} = headersFromMime(raw);
      const fromHeaders = headers.filter(h => h.name === 'from');
      if (fromHeaders.length !== 1 || JSON.stringify(parseAddress(words(fromHeaders[0].value))) !== JSON.stringify(parseAddress(challenge.request.sender))) throw new VerificationError('receiver-from-mismatch');
      const trustedHeaders = headers.filter(h=>h.name==='authentication-results');
      if (!trustedHeaders.some(h=>h.value === trusted[0].value)) throw new VerificationError('receiver-raw-auth-mismatch');
      const dkim = trusted[0].value.split(';').find((v: string)=>/\bdkim=pass\b/.test(v) && v.includes(`header.d=${auth.dkimDomain}`));
      const selector = /\bheader\.s=([^\s;]+)/.exec(dkim ?? '')?.[1];
      if (!selector) throw new VerificationError('receiver-signature-missing');
      await signedBodyCoverage(raw, auth.dkimDomain, selector);
      const parsed = await normalizeInbound({ provider:'cloudflare', message: { headers: new Headers(headers.map(h=>[h.name,h.value] as [string,string])),
        from: receipt.from, to: this.recipient, rawSize: receipt.size, raw: new Blob([raw]).stream() } }, { maxRawBytes: 1024*1024, maxBodyBytes: 1024*1024, maxAttachments: 10, maxAttachmentBytes: 1024*1024, maxTotalAttachmentBytes: 1024*1024 });
      const expectedText = challenge.request.content.text.replace(/\r\n/g,'\n').trimEnd();
      if (parsed.text?.replace(/\r\n/g,'\n').trimEnd() !== expectedText || parsed.subject !== challenge.request.content.subject
        || parsed.from !== /<([^>]+)>$/.exec(challenge.request.sender)?.[1]
        || parsed.messageId !== receipt.messageId || !parsed.to.includes(this.recipient)) throw new VerificationError('receiver-correlation-mismatch');
      const spf = trusted[0].value.split(';').find((v: string)=>/\bspf=pass\b/.test(v) && /smtp\.mailfrom=/.test(v));
      const mailFrom = /smtp\.mailfrom=([^\s;]+)/.exec(spf ?? '')?.[1];
      const fromDomain = /\bdmarc=pass\b[^;]*\bheader\.from=([^\s;]+)/.exec(trusted[0].value)?.[1];
      if (!mailFrom?.includes('@') || !fromDomain) throw new VerificationError('receiver-path-missing');
      const dns = createDnsInspection(Date.now(),transport);
      const keys = await dns.resolve(`${selector}._domainkey.${auth.dkimDomain}`,'TXT');
      if (keys.length !== 1) throw new VerificationError('dkim-key-conflict');
      return { receiptId:receipt.id,originalDigest:await digest(raw), receivedAt:Date.parse(receipt.receivedAt),
        from:challenge.request.sender,to:this.recipient,providerMessageId:challenge.providerMessageId,requestDigest:challenge.requestDigest,nonce:challenge.nonce,
        signedBody:{digest:await digest(challenge.request.content.text),complete:true,nonce:challenge.nonce},
        authentication:{spf:{result:auth.spf,mailFromDomain:mailFrom.split('@').at(-1)!},dkim:{result:auth.dkim,domain:auth.dkimDomain,selector,keyDigest:await digest(tags(keys[0]))},
          dmarc:{result:auth.dmarc,fromDomain,semantics:'rfc9989'}} };
    } catch (error) {
      if (error instanceof VerificationError) throw error;
      throw new VerificationError('receiver-unavailable', 'unknown');
    }
  } };
}
