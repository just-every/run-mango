import { MangoMark } from '../../../site/brand/MangoMark';
import { Paper } from '../../../site/paper/Paper';

/**
 * The back of a sealed letter, on the same envelope paper as the front (Envelope): the top flap folded down to a point,
 * and a round mango sticker sealing it.
 */
export function SealedEnvelope({ className, seed }: { className: string; seed: number }) {
  return (
    <div className={`sealed ${className}`}>
      <Paper w={160} h={104} seed={seed} tone="envelope" className="sealed-paper">
        <svg className="sealed-folds" viewBox="0 0 160 104" preserveAspectRatio="none" focusable="false">
          <g className="sealed-flap">
            <path className="sealed-flap-fill" d="M0 0 1.5 2C30 26 56 46 80 60 104 46 130 26 158.5 2L160 0Z" />
            <path className="sealed-flap-edge" d="M1.5 2C30 26 56 46 80 60 104 46 130 26 158.5 2" />
          </g>
        </svg>
        <span className="sealed-seal"><MangoMark className="sealed-fruit" /></span>
      </Paper>
    </div>
  );
}
