import { formatEmailSize, type EmailSize } from './email-size';

export function emailSizeAdvisory(size: EmailSize) {
  return !size.exceedsLimit && Math.max(size.htmlBytes,size.textBytes) >= size.limitBytes * .9
    ? {kind:'message.email-size-advisory',status:'advisory' as const,blocking:false,
      detail:`The sent-size upper bound is close to the per-part limit; Gmail can clip large emails. ${formatEmailSize(size)}`}
    : undefined;
}
