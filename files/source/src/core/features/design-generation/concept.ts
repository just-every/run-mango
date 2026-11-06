import { briefWithoutTokens } from './model';

/** The one text Mango sends to the design service for a draft (DESIGN-003): Mango's fixed description of an email
 * layout, then the operator's brief. Nothing else from the campaign, and never a contact or a token, is added. */
export function designConcept(brief: string) {
  return 'A marketing email newsletter design: one column about 600 pixels wide on a tall portrait page, with a header, photos, '
    + 'short text sections, one call-to-action button and a footer with an unsubscribe link. No navigation bar and no web app chrome. '
    + `Use these words where they fit:\n${briefWithoutTokens(brief)}`;
}
