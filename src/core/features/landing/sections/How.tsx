import type { ReactNode } from 'react';
import { copy } from '../copy';
import { Arrow } from '../drawings/decor/Arrow';
import { ApproveArt, CollectArt, DeliverArt, ScheduleArt, WriteArt } from '../drawings/steps/StepArt';
import { BodyText } from '../../site/BodyText';
import { SectionHead } from '../parts/SectionHead';

const { how } = copy;
const drawings: ReactNode[] = [<CollectArt />, <WriteArt />, <ApproveArt />, <ScheduleArt />, <DeliverArt />];

/** How a letter leaves Mango: five numbered steps, each with a small decorative drawing, joined by pen arrows. */
export function How() {
  return (
    <section className="band how" id="how" aria-labelledby="how-title">
      <SectionHead id="how" title={how.title} sub={how.sub} />
      <ol className="steps">
        {how.steps.map(({ title, text }, index) => (
          <li key={title} className="step">
            <div className="art step-art" aria-hidden="true">
              <div className="art-inner">{drawings[index]}</div>
            </div>
            {index < how.steps.length - 1 ? <Arrow name="across" className="step-arrow" /> : null}
            <h3 className="step-title"><span className="step-num" aria-hidden="true">{index + 1}</span>{title}</h3>
            <p className="step-text"><BodyText text={text} /></p>
          </li>
        ))}
      </ol>
    </section>
  );
}
