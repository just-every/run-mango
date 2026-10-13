# Sender evidence boundary

`createSenderVerification({database, config})` is composed into both production
mail adapters. The installation selects its trusted receipt connector with an authenticated
receipt URL and diagnostic recipient; without it observed authentication is missing and marketing cannot
be approved. Provider/DNS configuration alone never grants authority.
Transactional sign-in uses the existing direct mail path independently.

`inspect(serializedFrom)` performs one fresh provider/DNS check and reads the
current durable receiver observation. Its lease binds deployment origin, exact
serialized From (including display name), provider, exact domain ID and region,
transport version, DNS/key/policy bytes, connector identity, and a keyed opaque
fingerprint of the *actual* provider API and receipt credentials. This fingerprint
binds the provider credential's authenticated account scope and selected receiver; it is not a provider account ID. Neither
it nor challenge/receipt identities cross the Settings boundary. Rotations
invalidate old observations conservatively, including session-key rotation.

Authority lasts at most 24 hours from the original received time and at most
five minutes from configuration inspection, shortened by the minimum relevant
DNS TTL (including negative responses and CNAME chains). Each approval and
handoff re-inspects. A D1 state generation fences old snapshots; immutable
inspection associations commit in the same transaction as the existing revision
or recipient guard. SQL expiry uses database/server time as well as the sampled
clock. Historical approved revisions remain immutable. Revocation, new negative
observations, conflicting replay and changed configuration cannot reuse old
passes. A configuration transport outage invalidates outstanding leases and
blocks queued delivery recoverably without recording a delivery/provider failure.
External DNS/provider changes are bounded by inspection time; D1 cannot make a
remote service globally atomic with its transaction.

The internal `ReceiverConnector.acquire(challenge)` boundary is the sole source
of receiver material. There is no HTTP upload or attestation route. The
selected connector must authenticate to the configured mailbox API, fetch original
receiver material, choose the authoritative receiver-added authentication result,
reject forwarded/sender-injected results, verify original body/signature coverage
(including DKIM l=), and map its receipt to the exact saved sent message. Copied
headers, an authserv-id string, webhook delivery, a signed arbitrary upload, or
a provider API send ID alone are insufficient. Unsupported receiver semantics
remain blocked. Tests supply their connector exclusively in tests; no test
connector is exported by this feature or production composition.

`prepareChallenge` stores the explicitly approved diagnostic subject/text and
exact allowlisted connector recipient before any send. `sendChallenge` uses that
saved request and provider-effective idempotency key; an uncertain handoff only
reconciles on resume. `acquireObservation` fetches from the connector, checks the
binding, original timing, nonce, full signed body digest, provider sent record,
authentication identities and current key digest, and atomically stores the
receipt and updates authority. Changed receipt bytes reject and revoke; identical
replay returns the historical ID without extending expiry. These operations are available only through the protected deployment runner.

DNS configuration is independent from observed authentication. Provider listing
must complete, detail must match the exact list identity, and sending/records
must be verified. DNS verifies provider-returned SPF/MX/DKIM records, parses
policy tags, validates current public-key structure, and computes alignment by
RFC 9989's bounded DNS tree walk, never a guessed apex/public suffix. The parser
blocks ambiguous/malformed or unsupported structures conservatively. `p=none`
can be a valid policy; it cannot supply an authentication result. The observed
SPF, DKIM, DMARC results must **all** pass; at least one authenticated domain must
align. Settings exposes only check states, safe explanations and original times.

Primary references:
- https://resend.com/docs/api-reference/domains/list-domains
- https://resend.com/docs/api-reference/domains/get-domain
- https://www.rfc-editor.org/rfc/rfc9989.html (4.10 policy/alignment tree walk)
- https://www.rfc-editor.org/rfc/rfc8601.html (receiver trust boundary)
- https://www.rfc-editor.org/rfc/rfc6376.html (key and signature scope)
- https://www.rfc-editor.org/rfc/rfc7208.html (SPF identities and structure)

Tests use isolated native D1 and a bundled workerd entry, real production
services, test-only provider/DNS/receiver I/O, and wrappers around actual writes
for race barriers. Local success is not proof of a live receiver, sender domain,
provider scope, campaign delivery, unsubscribe delivery, or DKIM coverage of the
actual campaign's List-Unsubscribe headers. Those remain external acceptance.

Configure secret `MAILBOX_RECEIPT_URL` and variable `MAILBOX_RECEIPT_RECIPIENT`
together. The URL must be `https://<public-host>/receipts?token=<secret>` and the
recipient a bare diagnostic email address also present in
`MANGO_TEST_EMAIL_ALLOWLIST`. There is no default endpoint or recipient. The
connector implements the Cloudflare Email Routing receipt API semantics above;
a generic mailbox API with different trust semantics is unsupported.

The URL and recipient are privileged installation configuration, never HTTP or
operator-form inputs. Installing a connector explicitly trusts that service to
identify receiver-added authentication results and provide original MIME. Use a
public DNS host controlled by that trusted service: the connector rejects IP
literals, local/private hostnames, non-HTTPS schemes, nonstandard ports, embedded
credentials, fragments and additional query parameters. It does not resolve or
pin DNS addresses, so this configuration is not an untrusted-URL fetch facility;
the installer must not configure a host that resolves to a private service or can
be rebound by an untrusted party. Redirects fail closed. Raw fetches use only a
validated receipt ID on the same configured origin, and transport failures expose
only safe reason codes. Tokens are never connector identities or diagnostic
output. Changing the endpoint, recipient or receipt credential invalidates
existing observations. Owner QA services belong only in installation/proof
configuration, with the same policy as any other trusted connector. Both maintained provider adapters
use the same durable verification authority. SendGrid verifies its authenticated
domain records including both rotation selectors. The protected deployment runner
is `node scripts/sender-verification.mjs prepare|send|observe|inspect [id]` with
configured deployment environment and Cloudflare credentials. `prepare` persists
the diagnostic body shown in `scripts/sender-verification-entry.ts`; `send`
uses that exact stored request once. `observe` fetches trusted receiver results and
original MIME directly; it accepts no uploaded receipt. Run `inspect` before
campaign approval. Failures remain blocked. No public attestation route exists.

SendGrid reconciliation follows the [Activity message API](https://www.twilio.com/docs/sendgrid/api-reference/email-activity/filter-messages-by-message-id).
Activity subscription or API-scope absence preserves unresolved outcomes. Event
IDs are normalized to the submission ID before correlation; a prefix match alone
never imports evidence for another submission or recipient.
