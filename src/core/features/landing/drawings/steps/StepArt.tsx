import { Paper } from '../../../site/paper/Paper';
import { CheckDot, OpenDot, Padlock, Toolbar } from '../glyphs';
import { SealedEnvelope } from '../mail/SealedEnvelope';
import { sample } from '../sample';

const { steps } = sample;

// One small drawing per step of "How a letter leaves Mango", each a 230 x 185 scene placed in steps.css.

export function CollectArt() {
  return (
    <Paper w={176} h={150} seed={31} className="s-card s-collect">
      <span className="s-title">{steps.collect.title}</span>
      <span className="s-list">
        {steps.collect.rows.map(([name, confirmed]) => (
          <span key={name} className="s-row">
            {confirmed ? <CheckDot /> : <OpenDot />}
            <span>{name}</span>
            {confirmed ? null : <em>{steps.collect.waiting}</em>}
          </span>
        ))}
      </span>
    </Paper>
  );
}

export function WriteArt() {
  return (
    <Paper w={196} h={128} seed={33} className="s-card s-write">
      <span className="s-serif">{steps.write}</span>
      <span className="s-lines"><i /><i /></span>
      <Toolbar className="s-toolbar" />
    </Paper>
  );
}

export function ApproveArt() {
  return (
    <Paper w={170} h={140} seed={35} className="s-card s-approve">
      <CheckDot className="glyph-checkdot s-approve-check" />
      <span className="s-serif">{steps.approve.title}</span>
      <span className="s-approve-status"><Padlock />{steps.approve.status}</span>
    </Paper>
  );
}

export function ScheduleArt() {
  const cells = Array.from({ length: 15 }, (_, index) => index);
  return (
    <Paper w={172} h={150} seed={37} className="s-card s-schedule">
      <span className="s-serif">{steps.schedule.title}</span>
      <span className="s-calendar">
        {cells.map((cell) => <i key={cell} className={cell === 7 ? 'is-picked' : undefined} />)}
      </span>
    </Paper>
  );
}

export function DeliverArt() {
  return <SealedEnvelope className="s-sealed" seed={39} />;
}
