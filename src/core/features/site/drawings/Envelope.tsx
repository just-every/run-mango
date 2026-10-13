import { Paper } from '../paper/Paper';
import { Postmark, Waves, type PostmarkText } from './Postmark';
import { Stamp } from '../paper/Stamp';

type EnvelopeProps = {
  className: string;
  seed: number;
  /** What the postmark says; omit for a letter not yet postmarked. */
  postmark?: PostmarkText;
  /** False for a letter stamped but not yet posted: no cancellation lines across its stamp. */
  cancelled?: boolean;
  /** False for a letter tucked behind something that covers its address: no address lines drawn. */
  lines?: boolean;
};

/** A letter in its envelope: the flap's seams showing faintly, three address lines, the mango stamp, its cancellation and the postmark. */
export function Envelope({ className, seed, postmark, cancelled = true, lines = true }: EnvelopeProps) {
  return (
    <div className={`envelope ${className}`}>
      <Paper w={380} h={210} seed={seed} tone="envelope" className="envelope-paper">
        <svg className="envelope-seams" viewBox="0 0 380 210" preserveAspectRatio="none" focusable="false">
          <path d="M4 6C70 58 132 98 190 122 248 98 310 58 376 6" />
        </svg>
        {lines ? <span className="envelope-lines"><i /><i /><i /></span> : null}
      </Paper>
      <Stamp className="envelope-stamp" />
      {cancelled ? <Waves className="envelope-cancel" /> : null}
      {postmark ? <Postmark {...postmark} className="envelope-postmark" /> : null}
    </div>
  );
}
