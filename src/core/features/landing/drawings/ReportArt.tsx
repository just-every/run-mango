import { copy } from '../copy';
import { Icon } from '../icons/Icon';
import { Paper } from '../../site/paper/Paper';
import { Art } from '../../site/drawings/Art';
import { CheckDot } from './glyphs';
import { sample } from './sample';

const { title, rows, stamp } = sample.delivery;
const rowIcon = { handoff: 'send', delivered: 'delivered', bounced: 'bounce', complaint: 'flag' } as const;

/** A delivery report of what the provider confirmed, with the "confirmed by provider" slip stamped across it. */
export function ReportArt() {
  return (
    <Art label={copy.delivery.art} className="band-art report-art">
      <Paper w={290} h={214} seed={71} className="d-card">
        <span className="d-title">{title}</span>
        {rows.map(({ kind, label, value }) => (
          <span key={kind} className={`d-row d-row--${kind}`}>
            {kind === 'delivered' ? <CheckDot /> : <span className="d-mark"><Icon name={rowIcon[kind]} className="d-icon" /></span>}
            <span className="d-label">{label}</span>
            <b className="d-value">{value}</b>
          </span>
        ))}
      </Paper>
      <Paper w={190} h={70} seed={73} tone="leaf" className="d-slip">
        <CheckDot />
        <span className="d-slip-text"><b>{stamp[0]}</b>{stamp[1]}</span>
      </Paper>
    </Art>
  );
}
