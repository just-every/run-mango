import { useState } from 'react';
import { requestJson } from '@/core/app/client/lib/api';
import type { ApprovalBlocker, BlockedHost, RevisionLink } from '@/core/app/client/lib/types';

function HostEntry({entry, links, canAllow, disabled, allow}: {
  entry: BlockedHost; links: RevisionLink[]; canAllow: boolean; disabled: boolean;
  allow: (host: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState(entry.host);
  const parent = entry.host.split('.').slice(1).join('.');
  return <section className="panel blocked-link-host" aria-label={`Blocked host ${entry.host}`}>
    <h3>{entry.host}</h3>
    <p>This host is outside the allowed list. These links use it, directly or after a redirect:</p>
    <ul>{entry.links.map(destination => <li key={destination}>
      <strong>{links.find(link => link.destinationUrl === destination)?.label ?? 'Message destination'}</strong>
      <p className="muted-copy">{destination}</p>
    </li>)}</ul>
    {canAllow ? <div className="detail-actions">
      {parent.includes('.') ? <label>Host entry for {entry.host}<select value={selected} onChange={event => setSelected(event.target.value)} disabled={disabled}>
        <option value={entry.host}>{entry.host} only</option>
        <option value={`*.${parent}`}>All subdomains of {parent}</option>
      </select><small>A subdomain entry excludes the bare domain itself.</small></label> : null}
      <button className="secondary-action" type="button" disabled={disabled} onClick={() => void allow(selected)}>Allow this host</button>
    </div> : <p>A Manager, Admin or Owner can allow this host. Request approval above to share the blocked hosts with them.</p>}
  </section>;
}

export function BlockedLinkHosts({campaignId, blockedHosts, findings, links, canAllow, disabled, onAllowed}: {
  campaignId: string; blockedHosts?: BlockedHost[]; findings: ApprovalBlocker[]; links: RevisionLink[];
  canAllow: boolean; disabled: boolean; onAllowed: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false), [error, setError] = useState<string>();
  const groups = new Map<string, Set<string>>();
  for (const entry of [...(blockedHosts ?? []), ...findings.flatMap(finding => finding.blockedHosts ?? [])]) {
    const destinations = groups.get(entry.host) ?? new Set<string>();
    entry.links.forEach(link => destinations.add(link)); groups.set(entry.host, destinations);
  }
  if (!groups.size) return null;
  const allow = async (host: string) => {
    if (disabled || saving) return;
    setSaving(true); setError(undefined);
    try {
      const response = await requestJson(`/api/campaigns/${campaignId}/link-hosts`, {method:'POST', body:JSON.stringify({host})});
      if (response.status >= 300) {setError('The host could not be allowed. Reload review and check your approval permission.'); return;}
      await onAllowed();
    } catch {setError('The result could not be confirmed. Reload review before trying again.');}
    finally {setSaving(false);}
  };
  return <section aria-label="Blocked link hosts" className="page-flow">
    <h2>Blocked link hosts</h2>
    <p>Allowing a host saves it for this installation. Its links still need to pass every other safety check.</p>
    {error ? <p role="alert" className="inline-error">{error}</p> : null}
    {[...groups].map(([host, destinations]) => <HostEntry key={host} entry={{host,links:[...destinations]}} links={links} canAllow={canAllow} disabled={disabled || saving} allow={allow}/>)}
  </section>;
}
