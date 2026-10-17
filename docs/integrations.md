# Connect another application

An integration credential lets an application such as Coffer keep contacts and email preferences in step with Mango. Open **Settings → Integration credentials**, give the connection a name and select its scopes. Only the owner can create or revoke it. Copy the credential when it appears: Mango shows it once and stores only its hash. Keep it in the other application's private settings, never in browser code or a repository.

| Scope | Access |
| --- | --- |
| `contacts:read` | Read contacts, fields, tags and integration lists. |
| `contacts:write` | Upsert contacts into its lists and suppress email. |
| `events:read` | Read unsubscribe, bounce, complaint and suppression changes. |
| `campaigns:send` | Dispatch a due campaign already approved by a person for the credential's exact saved segment. |

A credential grants no operator sign-in, campaign editing or approval. Every request is recorded in **Settings → Integration activity**, including refused requests. Revocation stops the next request. Create a replacement and update the client before revoking an old credential when rotating access.

## Send a contact to Mango

Run these commands on the client server. Set `MANGO_URL` to your installation and `MANGO_TOKEN` to its scoped credential in your private shell environment. Every request uses HTTPS outside local development.

```sh
curl --fail-with-body "$MANGO_URL/api/integrations/v1/contacts" \
  -X PUT -H "Authorization: Bearer $MANGO_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"email":"donor@example.test","displayName":"Alex River","segmentName":"Coffer donors","fields":{"cofferDonorId":"donor-42","lifetimeGifts":125},"tags":["donor"],"subscribe":true,"consent":{"source":"Coffer signup form","evidence":"I agree to receive the monthly fundraising newsletter from River Garden.","brandOrLegalSender":"River Garden","messageCategory":"fundraising","frequencyDisclosure":"Monthly","destinationJurisdiction":"US","consentVersion":"signup-v1","occurredAt":"2026-10-01T12:00:00Z"}}'
```

Use evidence the person actually gave, covering this sender, category and frequency. `subscribe: true` requires every consent field. A donor's gift alone is not email permission. Omit `subscribe` to sync a contact without subscribing them. Existing unsubscribes and suppressions always win; this API cannot remove them or resubscribe a person.

Email is normalized and identifies one contact. Repeating the request updates that contact rather than adding another. Fields and tags belong to the profile; they grant no consent. `segmentName` creates or reuses an integration's saved list. Lists remain available when you rotate a credential. The response includes `contact.segmentIds`. Later requests can use `segmentId` instead of `segmentName`; choose exactly one. The write scope can update integration lists, but cannot rewrite an operator's dynamic segment.

```sh
curl --fail-with-body "$MANGO_URL/api/integrations/v1/segments" \
  -H "Authorization: Bearer $MANGO_TOKEN"
curl --fail-with-body "$MANGO_URL/api/integrations/v1/contacts?email=donor%40example.test" \
  -H "Authorization: Bearer $MANGO_TOKEN"
```

## Stop email in both applications

When someone chooses no email in Coffer, record that refusal there first, then suppress the destination in Mango. Keep the same idempotency key when retrying the same refusal after a network failure. Suppressions work even before the contact arrives and block every marketing send through Mango's existing eligibility checks.

```sh
curl --fail-with-body "$MANGO_URL/api/integrations/v1/suppressions" \
  -X POST -H "Authorization: Bearer $MANGO_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"email":"donor@example.test","reason":"Email consent withdrawn in Coffer","idempotencyKey":"coffer:donor-42:consent-8","occurredAt":"2026-10-17T10:00:00Z"}'
```

To bring Mango refusals back, read the change feed. Start with cursor `0` and retain the returned `nextCursor` only after applying every event in that page.

```sh
curl --fail-with-body "$MANGO_URL/api/integrations/v1/events?cursor=0&limit=50" \
  -H "Authorization: Bearer $MANGO_TOKEN"
```

Each event has a stable `id`, increasing `sequence`, `type` (`unsubscribe`, `bounce`, `complaint` or `suppression`), `channel`, `email`, `contactId`, `cause` and `occurredAt` in milliseconds since the Unix epoch. An empty page keeps the cursor. Deduplicate by event ID, record no-email against the matching donor, and save the page cursor in the same durable client operation where possible. Re-reading a cursor gives the same events, so interruption is safe. Events erased with a contact disappear; sequence gaps are normal. An unmatched provider event can have no readable email, to preserve Mango's erasure protection; skip it when no destination is available. Email bounces are delivered as facts, including soft bounces: the client can conservatively mark no-email or use the cause to apply its own policy. Mango's own suppression policy still governs its sends.

This feed includes confirmed unsubscribe clicks, mailbox one-click unsubscribes and verified provider events. It is a pull API; Mango does not offer outbound signed webhooks here. Poll it before preparing an audience and before sending from the client. Do not reflect an imported refusal into an endless new refusal event.

## Dispatch an approved segment campaign

First a Mango operator saves the campaign against the integration's segment, reviews its exact content and approves its schedule. Then a credential with `campaigns:send` can request dispatch of a due step:

```sh
curl --fail-with-body "$MANGO_URL/api/integrations/v1/campaigns/CAMPAIGN_ID/send" \
  -X POST -H "Authorization: Bearer $MANGO_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"revisionId":"APPROVED_REVISION_ID","segmentId":"SEGMENT_ID"}'
```

This preserves approval, the frozen audience, schedule, provider readiness and last-moment suppression checks. It cannot approve, change a revision, bring a schedule forward or send to an arbitrary address. A request accepted for queueing is not a delivery receipt. See [Approval and sending](approval-and-sending.md).

## Errors and hosting

Missing or revoked credentials return `401`; missing scopes return `403`; invalid input returns `400`; a conflict with approval, consent or a segment returns `409`. Rate-limited requests return `429` with `Retry-After`. Wait before retrying. Do not retry a send with a changed campaign revision to bypass an approval conflict.

On RER Managed, outbound provider calls for seed integrations are **not available yet**. Subscriber writes and the inbound change feed need no outbound provider request. Self-hosted installations can use the scoped API with their configured sending connection. A connection cannot grant access to the hosting account or its operator session.
