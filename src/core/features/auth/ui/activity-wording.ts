/** What a log row says in people's words. The stored action names stay as they are for filters and the CSV. */
const known: Record<string, string> = {
  'integration.settings.credentials.post': 'Created an integration credential',
  'integration.settings.credentials.delete': 'Revoked an integration credential',
  'integration.api.contacts.get': 'Read contacts',
  'integration.api.contacts.put': 'Added or updated a contact',
  'integration.api.segments.get': 'Read segments',
  'integration.api.events.get': 'Read events',
  'integration.api.events.post': 'Recorded an event',
  'integration.api.suppressions.post': 'Recorded an opt-out',
  'integration.api.campaigns.send.post': 'Sent a campaign',
  'draft.saved': 'Saved a draft',
  'campaign.approval-requested': 'Asked for approval',
  approved: 'Approved a campaign',
  cancelled: 'Cancelled a campaign',
  'test-send': 'Sent a test',
  'consent.entered': 'Recorded permission by hand',
  'import.applied': 'Imported contacts',
  'audience.exported': 'Exported contacts',
  'campaigns.exported': 'Exported campaigns',
  'link-host.added': 'Added a link host',
  'link-host.removed': 'Removed a link host',
  'link-host.allowed': 'Allowed a link host',
  'newsletter.published': 'Published a letter to the archive',
  'newsletter.unpublished': 'Took a letter off the archive',
};

export function activityWords(action: string) {
  const text = known[action] ?? action.replace(/[._-]+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const refusals: Record<string, string> = {denied: 'Refused', rate_limited: 'Slowed down', error: 'Failed'};

/** The one thing worth saying beside the action: a name, an address, a host, or that a request was turned away. */
export function activityDetail(detail: unknown) {
  const value = (detail && typeof detail === 'object' ? detail : {}) as Record<string, unknown>;
  if (typeof value.outcome === 'string') return refusals[value.outcome] ?? '';
  for (const key of ['name', 'destination', 'host', 'subject']) if (typeof value[key] === 'string' && value[key]) return value[key] as string;
  return '';
}
