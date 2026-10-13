import { Paper } from '../../../site/paper/Paper';
import { CheckDot, MailGlyph, Padlock, Tick, Toolbar } from '../glyphs';
import { sample } from '../sample';

const { hero } = sample;

export function EditorCard() {
  return (
    <Paper w={318} h={180} seed={3} className="h-card h-editor">
      <span className="h-editor-title">{hero.editor}</span>
      <span className="h-rule" />
      <span className="h-lines"><i /><i /><i /></span>
      <Toolbar className="h-toolbar" />
    </Paper>
  );
}

export function ApprovedCard() {
  return (
    <Paper w={232} h={78} seed={11} tone="leaf" className="h-card h-approved">
      <Padlock />
      <span className="h-approved-text">{hero.approved}</span>
    </Paper>
  );
}

export function SubscriberCard() {
  const { subscriber } = hero;
  return (
    <Paper w={222} h={176} seed={5} className="h-card h-subscriber">
      <span className="h-card-title">{subscriber.title}</span>
      <span className="h-field">{subscriber.email}</span>
      <span className="h-confirmed"><CheckDot />{subscriber.status}</span>
    </Paper>
  );
}

export function AudienceCard() {
  const { audience } = hero;
  return (
    <Paper w={284} h={206} seed={8} className="h-card h-audience">
      <span className="h-card-title">{audience.title}</span>
      <span className="h-rows">
        {audience.emails.map((email) => (
          <span key={email} className="h-row"><i className="h-dot" />{email}<Tick /></span>
        ))}
      </span>
    </Paper>
  );
}

export function DeliveredCard() {
  const { delivered } = hero;
  return (
    <Paper w={255} h={115} seed={14} className="h-card h-delivered">
      <MailGlyph />
      <span className="h-delivered-text"><b>{delivered.count}</b>{delivered.note}</span>
    </Paper>
  );
}
