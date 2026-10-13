/** The visible link: a confirmation page that unsubscribes only on its confirming POST. */
export function confirmationUnsubscribePath(token: string) {
  return `/unsubscribe/${encodeURIComponent(token)}`;
}

/** The List-Unsubscribe URL: accepts the RFC 8058 `List-Unsubscribe=One-Click` POST. */
export function oneClickUnsubscribePath(token: string) {
  return `/unsubscribe/one-click/${encodeURIComponent(token)}`;
}
