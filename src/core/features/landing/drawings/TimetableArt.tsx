import { copy } from '../copy';
import { Icon } from '../icons/Icon';
import { Paper } from '../../site/paper/Paper';
import { Art } from '../../site/drawings/Art';
import { Envelope } from '../../site/drawings/Envelope';
import { sample } from './sample';

const { title, zone, steps } = sample.schedule;

/** A campaign's two steps, each at a local time in the newsletter's zone with its exact UTC moment, the letter they will send, stamped and waiting, tucked behind. */
export function TimetableArt() {
  return (
    <Art label={copy.schedule.art} className="band-art timetable-art">
      <Envelope className="t-envelope" seed={63} cancelled={false} lines={false} />
      <Paper w={300} h={218} seed={61} className="t-card">
        <span className="t-title">{title}</span>
        <span className="t-zone"><Icon name="clock" className="t-zone-icon" />{zone}</span>
        {steps.map((step) => (
          <span key={step.day} className="t-step">
            <span className="t-when"><b>{step.day} · {step.time}</b><small>{step.utc}</small></span>
            <span className="t-state">{step.state}</span>
          </span>
        ))}
      </Paper>
    </Art>
  );
}
