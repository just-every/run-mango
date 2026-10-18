/** Capture, imports and store sync historically use a destination as the contact's
 * display label when no name was supplied. That label is useful in contact lists,
 * but it is not a recorded name and must not displace an authored fallback. */
export function contactPersonalisation(contact: {displayName: string; email?: string | null}, destination: string) {
  const name = contact.displayName.trim();
  const identities = [contact.email, destination].filter((value): value is string => Boolean(value));
  return {displayName: name && !identities.some(identity => identity.toLowerCase() === name.toLowerCase()) ? name : undefined};
}
