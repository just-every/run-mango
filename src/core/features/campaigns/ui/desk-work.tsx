import { Fragment } from 'react';
import { Link } from '@tanstack/react-router';
import type { CampaignCollection, CampaignListEntry } from '@/core/app/client/lib/types';
import { useDateFormatter } from '@/core/app/client/lib/use-date-formatter';
import { useHydrated } from '@/core/app/client/lib/time-zone';
import { EmptyState } from '@/core/app/client/ui/empty-state';
import { LoadState } from '@/core/app/client/ui/layout';
import { Envelope } from '@/core/features/site/drawings/Envelope';
import { CampaignStatusPill } from './campaign-status-pill';
import { deskGroup, handedOff, metaParts, type DeskGroupKey } from './desk-work-model';

const groups: Record<DeskGroupKey, { title: string; empty: string; counted: boolean; more: { label: string; state: string } | null }> = {
  waiting: { title: 'Waiting for approval', empty: 'Nothing waiting for approval.', counted: true, more: { label: 'All drafts', state: 'draft' } },
  scheduled: { title: 'Scheduled', empty: 'Nothing scheduled.', counted: true, more: { label: 'All scheduled', state: 'scheduled' } },
  sent: { title: 'Sent', empty: 'Nothing sent yet.', counted: false, more: { label: 'All sent', state: 'completed' } },
};

function DeskRow({ group, campaign }: { group: DeskGroupKey; campaign: CampaignListEntry }) {
  const formatDate = useDateFormatter();
  const hydrated = useHydrated();
  // "passed" is never decided before hydration, so the server HTML and the first client render agree.
  const passed = hydrated && campaign.plannedAt !== null && Date.parse(campaign.plannedAt) < Date.now();
  const parts = metaParts(group, campaign, passed);
  const pill = campaign.state === 'erasure-invalidated' || campaign.state === 'paused' || campaign.state === 'dispatching'
    || (campaign.state === 'completed' && !handedOff(campaign));
  const content = <>
    <span className="desk-row__text">
      <strong className="desk-row__name">{campaign.name ?? 'Untitled campaign'}</strong>
      <span className="desk-row__meta">{parts.map((part, index) => <Fragment key={index}>
        <span className="nowrap">
          {part.text ?? <>{part.before}<time dateTime={part.time}>{formatDate(part.time)}</time>{part.after}</>}{index < parts.length - 1 ? ' ·' : ''}
        </span>{index < parts.length - 1 ? ' ' : ''}
      </Fragment>)}</span>
    </span>
    {pill ? <CampaignStatusPill state={campaign.state} lastOutcome={campaign.lastOutcome} /> : null}
  </>;
  // A draft opens its review; every other state opens its campaign (the Campaigns list's rule).
  return <li>{campaign.state === 'draft'
    ? <Link className="desk-row" to="/app/campaigns/$id/review" params={{ id: campaign.id }}>{content}</Link>
    : <Link className="desk-row" to="/app/campaigns/$id" params={{ id: campaign.id }}>{content}</Link>}</li>;
}

function DeskGroup({ group, campaigns }: { group: DeskGroupKey; campaigns: CampaignListEntry[] }) {
  const { title, empty, counted, more } = groups[group];
  const { rows, total, overflow } = deskGroup(group, campaigns);
  const link = more && (group === 'sent' ? total > 0 : overflow);
  return <section className="panel desk-group" aria-labelledby={`desk-${group}-title`}>
    <div className="section-heading">
      <h2><span id={`desk-${group}-title`}>{title}</span>{counted && total > 0 ? <span className="desk-group__count"> · {total}</span> : null}</h2>
      {link ? <Link className="text-link" to="/app/campaigns" search={{ state: more.state }}>{more.label}</Link> : null}
    </div>
    {rows.length
      ? <ul className="desk-rows" role="list">{rows.map(campaign => <DeskRow key={campaign.id} group={group} campaign={campaign} />)}</ul>
      : <p className="desk-group__empty">{empty}</p>}
  </section>;
}

function NewInstall() {
  const art = <div className="empty-art art" aria-hidden="true"><div className="art-inner"><Envelope className="desk-empty__envelope" seed={41} cancelled={false} /></div></div>;
  return <EmptyState id="desk-empty-title" title="Write your first newsletter" className="desk-empty" art={art} action={<Link className="secondary-action" to="/app/campaigns">Write a campaign</Link>}>
    <p>Write a campaign, preview it on desktop and mobile, then approve the exact saved version.</p>
  </EmptyState>;
}

/** The work: the main column holds what waits for the owner; the rail holds what is scheduled and what went out. */
export function DeskWork({ data, loading }: { data?: CampaignCollection; loading: boolean }) {
  if (!data) {
    return loading ? <LoadState /> : <p className="inline-error" role="alert">Campaigns could not load. Reload the page to try again.</p>;
  }
  if (data.total === 0) return <NewInstall />;
  return <div className="desk-work">
    <DeskGroup group="waiting" campaigns={data.campaigns} />
    <div className="desk-rail">
      <DeskGroup group="scheduled" campaigns={data.campaigns} />
      <DeskGroup group="sent" campaigns={data.campaigns} />
    </div>
  </div>;
}
