import { copy } from '../copy';
import { Paper } from '../../site/paper/Paper';
import { Art } from '../../site/drawings/Art';
import { Arrow } from './decor/Arrow';
import { CheckDot } from './glyphs';
import { SealedEnvelope } from './mail/SealedEnvelope';
import { sample } from './sample';

const { signup, record } = sample.consent;

/** The hosted signup card, the confirmation email it sends, and the consent record kept once the reader confirms. */
export function ConsentArt() {
  return (
    <Art label={copy.consent.art} className="band-art consent-art">
      <div className="c-confirm">
        <SealedEnvelope className="c-confirm-envelope" seed={45} />
      </div>
      <Arrow name="arc" className="c-arrow" />
      <Paper w={240} h={210} seed={41} className="c-signup">
        <span className="c-signup-title">{signup.title}</span>
        <span className="c-signup-tagline">{signup.tagline}</span>
        <span className="c-signup-field">{signup.email}</span>
        <span className="c-signup-button">{signup.button}</span>
      </Paper>
      <Paper w={170} h={112} seed={43} tone="warm" className="c-record">
        <span className="c-record-title">{record.title}</span>
        {record.rows.map(([label, value]) => (
          <span key={label} className="c-record-row"><span>{label}</span><b>{value}{label === 'Status' ? <CheckDot /> : null}</b></span>
        ))}
      </Paper>
    </Art>
  );
}
