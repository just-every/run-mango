import { z } from 'zod';

const header = z.string().refine(value => !/[\u0000-\u001f\u007f<>"\\{}]/u.test(value), 'Use plain text without control characters or markup.').trim().min(1, 'Enter your business name.').max(200);
const email = z.string().refine(value => !/[\u0000-\u001f\u007f]/u.test(value), 'Email addresses cannot contain control characters.').trim().max(254).email('Enter a valid email address.');
export const senderIdentitySchema = z.object({
  displayName: header,
  fromEmail: email,
  replyToEmail: email,
  physicalAddress: z.string().trim().min(5, 'Enter your complete physical postal address.').max(500)
    .refine(value => !/[\u0000-\u0009\u000b-\u001f\u007f<>{}]/u.test(value) && /\p{L}/u.test(value), 'Use a postal address without markup or control characters.'),
}).strict();
export type SenderIdentity = z.infer<typeof senderIdentitySchema>;

export function revisionMatchesSender(revision: {senderName: string; fromEmail: string; replyToEmail: string; physicalAddress: string}, identity: SenderIdentity) {
  return senderIdentitySchema.safeParse(identity).success && revision.senderName === identity.displayName
    && revision.fromEmail.toLowerCase() === identity.fromEmail.toLowerCase()
    && revision.replyToEmail.toLowerCase() === identity.replyToEmail.toLowerCase()
    && revision.physicalAddress === identity.physicalAddress;
}
