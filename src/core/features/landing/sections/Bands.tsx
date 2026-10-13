import type { ReactNode } from 'react';
import { copy, type Feature } from '../copy';
import { AccountArt } from '../drawings/AccountArt';
import { ApprovalArt } from '../drawings/ApprovalArt';
import { ConsentArt } from '../drawings/ConsentArt';
import { ReportArt } from '../drawings/ReportArt';
import { TimetableArt } from '../drawings/TimetableArt';
import { FeatureList } from '../parts/FeatureList';
import { SectionHead } from '../parts/SectionHead';

type Band = {
  id: 'consent' | 'approval' | 'schedule' | 'delivery' | 'own';
  title: string;
  sub: string;
  features: readonly Feature[];
  art: ReactNode;
  tone?: 'leaf';
};

const bands: Band[] = [
  { id: 'consent', ...copy.consent, art: <ConsentArt />, tone: 'leaf' },
  { id: 'approval', ...copy.approval, art: <ApprovalArt /> },
  { id: 'schedule', ...copy.schedule, art: <TimetableArt /> },
  { id: 'delivery', ...copy.delivery, art: <ReportArt /> },
  { id: 'own', ...copy.own, art: <AccountArt /> },
];

/**
 * One idea per band: consent, approval, scheduling, delivery reports and ownership, each its own full-width section with
 * its heading and points beside its drawing. The drawing alternates sides down the page (every second band is flipped)
 * and sits above the words once the bands stack (bands.css).
 */
export function Bands() {
  return bands.map(({ id, title, sub, features, art, tone }, index) => (
    <section key={id} className={index % 2 ? 'band feature-band feature-band--flip' : 'band feature-band'} id={id} aria-labelledby={`${id}-title`}>
      <div className="band-copy">
        <SectionHead id={id} title={title} sub={sub} />
        <FeatureList items={features} tone={tone} />
      </div>
      {art}
    </section>
  ));
}
